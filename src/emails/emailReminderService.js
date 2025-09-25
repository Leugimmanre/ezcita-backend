// src/emails/emailReminderService.js
// Revisa citas próximas y envía recordatorios según offsets no enviados.
// Trabaja 100% en UTC (sin date-fns-tz).

import { addMinutes, subMinutes, isWithinInterval } from "date-fns";

/**
 * Ejecuta el envío de recordatorios de email para un tenant.
 *
 * @param {Object} deps
 * @param {mongoose.Model} deps.Appointments
 * @param {mongoose.Model} deps.Services
 * @param {mongoose.Model} [deps.BrandSettings]
 * @param {mongoose.Model} [deps.AppointmentSettings]
 * @param {Function} deps.buildEmailUser
 * @param {Function} deps.sendAppointmentEmail
 * @param {String} deps.tenantId
 * @param {Boolean} [deps.sendNow=false]          // manda YA (si no enviados)
 * @param {String}  [deps.appointmentId=null]     // limita a una cita
 * @param {Number}  [deps.toleranceMin=2]         // tolerancia en minutos
 * @param {Number}  [deps.windowHours=26]         // ventana hacia delante
 * @param {Date}    [deps.now]                    // ahora override (tests)
 *
 * @returns {Promise<{sent:number}>}
 */
export async function runEmailReminders({
  Appointments,
  Services,
  BrandSettings,
  AppointmentSettings,
  buildEmailUser,
  sendAppointmentEmail,
  tenantId,

  // nuevos parámetros
  sendNow = false,
  appointmentId = null,
  toleranceMin = 2,
  windowHours = 26,
  now,
}) {
  const nowUtc = now instanceof Date && !isNaN(now) ? now : new Date();
  const endWindowUtc = addMinutes(nowUtc, 60 * windowHours);

  // Query base
  const baseFilter = {
    tenantId,
    status: { $in: ["pending", "confirmed"] },
  };

  let appts = [];
  if (appointmentId) {
    // Traer SOLO esa cita (ignora ventana, pero respeta estado)
    appts = await Appointments.find({ ...baseFilter, _id: appointmentId })
      .select("user services date duration reminders status")
      .lean();
  } else {
    // Ventana normal
    appts = await Appointments.find({
      ...baseFilter,
      date: { $gte: nowUtc, $lte: endWindowUtc },
    })
      .select("user services date duration reminders status")
      .lean();
  }

  let sentCount = 0;

  for (const a of appts) {
    const emailOffsets = Array.isArray(a.reminders?.emailOffsets)
      ? a.reminders.emailOffsets
      : [1440, 60];

    const already = new Set(a.reminders?.sentEmailOffsets || []);

    // Consideramos solo offsets no enviados
    const candidateOffsets = emailOffsets.filter((off) => !already.has(off));

    for (const off of candidateOffsets) {
      const targetUtc = subMinutes(new Date(a.date), off);

      // ¿Está “debido”?
      let due = false;
      if (sendNow) {
        // Forzado: si la cita es futura (o muy próxima), disparamos sin mirar tolerancia
        due = new Date(a.date).getTime() >= nowUtc.getTime();
      } else {
        // Normal: ventana de tolerancia configurable
        due = isWithinInterval(targetUtc, {
          start: subMinutes(nowUtc, toleranceMin),
          end: addMinutes(nowUtc, toleranceMin),
        });
      }

      if (!due) continue;

      // Usuario
      const user = await buildEmailUser({ tenantId }, a, a.user);
      if (!user?.email) continue;

      // Servicios
      const svcs = await Services.find({ _id: { $in: a.services } })
        .select("name price duration durationUnit")
        .lean();

      // Enviar
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

      // Marcar offset como enviado (idempotencia)
      await Appointments.updateOne(
        { _id: a._id },
        { $addToSet: { "reminders.sentEmailOffsets": off } }
      );

      sentCount++;
    }
  }

  return { sent: sentCount };
}

export default runEmailReminders;
