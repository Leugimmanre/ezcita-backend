// Revisa citas próximas y envía recordatorios según offsets no enviados.
// Trabaja 100% en UTC.

import { addMinutes, subMinutes, isWithinInterval } from "date-fns";

/**
 * Ejecuta el envío de recordatorios de email para un tenant.
 *
 * @param {Object} deps
 * @param {mongoose.Model} deps.Appointments
 * @param {mongoose.Model} deps.Services
 * @param {mongoose.Model} [deps.BrandSettings]
 * @param {mongoose.Model} [deps.AppointmentSettings]
 * @param {mongoose.Model} [deps.User]                       // <-- nuevo
 * @param {Function} deps.buildEmailUser
 * @param {Function} deps.sendAppointmentEmail
 * @param {String} deps.tenantId
 * @param {Object} [deps.options]
 * @param {Boolean} [deps.options.sendNow=false]             // <-- nuevo
 * @param {String}  [deps.options.appointmentId=null]        // <-- nuevo
 * @param {Number}  [deps.options.toleranceMin=1]            // <-- nuevo
 * @param {String}  [deps.options.now=null]                  // ISO, para simular "ahora"
 * @param {Number[]} [deps.options.defaultOffsets=[1440,60]] // <-- nuevo
 *
 * @returns {Promise<{sent:number, checked:number}>}
 */
export async function runEmailReminders({
  Appointments,
  Services,
  BrandSettings,
  AppointmentSettings,
  User, // no lo usamos directamente aquí, pero puede usarse si prefieres no pasar buildEmailUser
  buildEmailUser,
  sendAppointmentEmail,
  tenantId,
  options = {},
}) {
  const {
    sendNow = false,
    appointmentId = null,
    toleranceMin = 1,
    now = null,
    defaultOffsets = [1440, 60],
  } = options;

  // "Ahora" en UTC (o el simulado)
  const nowUtc = now ? new Date(now) : new Date();

  // Query base
  const q = {
    tenantId,
    status: { $in: ["pending", "confirmed"] },
  };

  // Si pruebas 1 cita concreta, no limitamos por ventana de 26h
  if (appointmentId) {
    q._id = appointmentId;
  } else {
    // Ventana: próximas 26h para cubrir offset de 24h
    const endWindowUtc = addMinutes(nowUtc, 60 * 26);
    q.date = { $gte: nowUtc, $lte: endWindowUtc };
  }

  const appts = await Appointments.find(q)
    .select("user services date duration reminders status")
    .lean();

  let sentCount = 0;
  let checked = appts.length;

  for (const a of appts) {
    // Offsets en minutos: usa los de la cita o los por defecto (importante para docs antiguos)
    const rawOffsets =
      Array.isArray(a.reminders?.emailOffsets) &&
      a.reminders.emailOffsets.length
        ? a.reminders.emailOffsets
        : defaultOffsets;

    // normaliza a enteros únicos >=0
    const emailOffsets = [
      ...new Set(
        rawOffsets
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n >= 0)
      ),
    ];

    const already = new Set(a.reminders?.sentEmailOffsets || []);

    // Solo los que no hayan sido enviados
    const dueOffsets = emailOffsets.filter((off) => !already.has(off));

    for (const off of dueOffsets) {
      // Momento objetivo = fecha cita - offset (UTC)
      const targetUtc = subMinutes(new Date(a.date), off);

      // Due: si sendNow => true, si no, ventana de tolerancia ±toleranceMin
      const due = sendNow
        ? true
        : isWithinInterval(targetUtc, {
            start: subMinutes(nowUtc, toleranceMin),
            end: addMinutes(nowUtc, toleranceMin),
          });

      if (!due) continue;

      // Usuario (vía wrapper que le pasa {User, tenantId})
      const user = await buildEmailUser({ User, tenantId }, a, a.user);
      if (!user?.email) {
        // No email => saltar este offset
        continue;
      }

      const svcs = await Services.find({ _id: { $in: a.services } })
        .select("name price duration durationUnit")
        .lean();

      await sendAppointmentEmail({
        type: "reminder",
        to: user.email,
        user,
        appointment: a,
        services: svcs.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })),
        BrandSettingsModel: BrandSettings,
        tenantId,
      });

      // Marcar offset como enviado (idempotente)
      await Appointments.updateOne(
        { _id: a._id },
        { $addToSet: { "reminders.sentEmailOffsets": off } }
      );

      sentCount++;
    }
  }

  return { sent: sentCount, checked };
}

export default runEmailReminders;
