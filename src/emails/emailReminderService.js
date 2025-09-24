// src/emails/emailReminderService.js
// Revisa citas próximas y envía recordatorios según offsets no enviados.
// Trabaja 100% en UTC (sin date-fns-tz). Los offsets son en minutos antes de la cita.

import { addMinutes, subMinutes, isWithinInterval } from "date-fns";

/**
 * Ejecuta el envío de recordatorios de email para un tenant.
 *
 * @param {Object} deps
 * @param {mongoose.Model} deps.Appointments              // Modelo de Citas (inyectado por tenant)
 * @param {mongoose.Model} deps.Services                  // Modelo de Servicios (inyectado por tenant)
 * @param {mongoose.Model} [deps.BrandSettings]           // Modelo de Brand (opcional)
 * @param {mongoose.Model} [deps.AppointmentSettings]     // Modelo de Settings (opcional)
 * @param {Function} deps.buildEmailUser                  // (reqLike, appointment, userId) => { name, email }
 * @param {Function} deps.sendAppointmentEmail            // función existente para enviar email
 * @param {String} deps.tenantId                          // ID del tenant
 *
 * @returns {Promise<{sent:number}>}
 */
export async function runEmailReminders({
  Appointments,
  Services,
  BrandSettings, // no usado aquí (renderizado ya maneja TZ en plantillas)
  AppointmentSettings, // no usado aquí
  buildEmailUser,
  sendAppointmentEmail,
  tenantId,
}) {
  // "Ahora" en UTC
  const nowUtc = new Date();

  // Ventana: próximas 26h para cubrir offset de 24h con margen
  const endWindowUtc = addMinutes(nowUtc, 60 * 26);

  // Trae citas activas del tenant dentro de la ventana
  const appts = await Appointments.find({
    tenantId,
    status: { $in: ["pending", "confirmed"] },
    date: { $gte: nowUtc, $lte: endWindowUtc },
  })
    .select("user services date duration reminders status")
    .lean();

  let sentCount = 0;

  for (const a of appts) {
    // Offsets en minutos (por defecto: 24h y 1h antes)
    const emailOffsets = Array.isArray(a.reminders?.emailOffsets)
      ? a.reminders.emailOffsets
      : [1440, 60];

    const already = new Set(a.reminders?.sentEmailOffsets || []);

    // Solo los que no hayan sido enviados
    const dueOffsets = emailOffsets.filter((off) => !already.has(off));

    for (const off of dueOffsets) {
      // Momento objetivo = fecha cita - offset (siempre UTC)
      const targetUtc = subMinutes(new Date(a.date), off);

      // Ventana de tolerancia ±1 minuto
      const due = isWithinInterval(targetUtc, {
        start: subMinutes(nowUtc, 1),
        end: addMinutes(nowUtc, 1),
      });
      if (!due) continue;

      // Construir datos del email: usuario + servicios
      const user = await buildEmailUser({ tenantId }, a, a.user);
      if (!user?.email) continue;

      const svcs = await Services.find({ _id: { $in: a.services } })
        .select("name price duration durationUnit")
        .lean();

      // Enviar correo usando tu pipeline/plantillas existentes
      // Sugerencia: crea un "type: reminder" si quieres asunto/copy específicos.
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
        // BrandSettingsModel/tenantId se resolverán dentro del mailer
        BrandSettingsModel: BrandSettings,
        tenantId,
      });

      // Idempotencia: marca offset como enviado
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
