// src/emails/emailReminderService.js
import { addMinutes, subMinutes, isWithinInterval } from "date-fns";

/**
 * Envía recordatorios por email.
 * options:
 *  - sendNow: boolean (ignora ventana temporal)
 *  - appointmentId: string|null (limita a una cita)
 *  - toleranceMin: number (± minutos alrededor del target) default 1
 *  - defaultOffsets: number[] (si la cita no trae offsets)
 *  - overrideOffsets: number[]|null (si quieres ignorar lo que trae la cita)
 *  - now: string|Date|null (para pruebas)
 */
export async function runEmailReminders({
  Appointments,
  Services,
  BrandSettings,
  AppointmentSettings,
  buildEmailUser,
  sendAppointmentEmail,
  tenantId,
  User,
  options = {},
}) {
  const {
    sendNow = false,
    appointmentId = null,
    toleranceMin = 1,
    defaultOffsets = [1440, 60],
    overrideOffsets = null,
    now: nowOverride = null,
  } = options;

  const nowUtc = nowOverride ? new Date(nowOverride) : new Date();
  const endWindowUtc = addMinutes(nowUtc, 60 * 26);

  const baseFilter = {
    tenantId,
    status: { $in: ["pending", "confirmed"] },
  };

  const finalFilter = {
    ...baseFilter,
    ...(appointmentId
      ? { _id: appointmentId }
      : { date: { $gte: nowUtc, $lte: endWindowUtc } }),
  };

  const appts = await Appointments.find(finalFilter)
    .select("user services date duration reminders status")
    .lean();

  let sentCount = 0;
  const details = [];

  for (const a of appts) {
    // 1) Offsets finales
    const rawOffsets =
      overrideOffsets && overrideOffsets.length
        ? overrideOffsets
        : Array.isArray(a.reminders?.emailOffsets) &&
          a.reminders.emailOffsets.length
        ? a.reminders.emailOffsets
        : defaultOffsets;

    const emailOffsets = [
      ...new Set(
        rawOffsets.map(Number).filter((n) => Number.isFinite(n) && n >= 0)
      ),
    ];
    const already = new Set(a.reminders?.sentEmailOffsets || []);
    const dueOffsets = emailOffsets.filter((off) => !already.has(off));

    for (const off of dueOffsets) {
      const targetUtc = subMinutes(new Date(a.date), off);

      const due = sendNow
        ? true
        : isWithinInterval(targetUtc, {
            start: subMinutes(nowUtc, toleranceMin),
            end: addMinutes(nowUtc, toleranceMin),
          });

      if (!due) continue;

      // 2) Resolver destinatario
      const reqLike = { User, tenantId, user: null };
      const user = await buildEmailUser(reqLike, a, a.user);
      if (!user?.email) {
        details.push({
          appointmentId: String(a._id),
          off,
          to: null,
          accepted: 0,
          messageId: null,
          response: "no-user-email",
          reason: "no-user-email",
        });
        continue;
      }

      // 3) Servicios
      const svcs = await Services.find({ _id: { $in: a.services } })
        .select("name price duration durationUnit")
        .lean();

      // 4) Enviar
      let info = null;
      try {
        info = await sendAppointmentEmail({
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
      } catch (err) {
        details.push({
          appointmentId: String(a._id),
          off,
          to: user.email,
          accepted: 0,
          messageId: null,
          response: err?.message || "send-error",
          reason: "send-error",
        });
        continue;
      }

      // Criterio de éxito para Resend (id) o messageId/response
      const acceptedCount = Array.isArray(info?.accepted)
        ? info.accepted.length
        : 0;

      // Resend devolvió id, o hay messageId/response, o (legacy) accepted>0
      const success =
        Boolean(info?.id) || // ← Resend
        Boolean(info?.messageId) ||
        Boolean(info?.response) ||
        acceptedCount > 0;

      details.push({
        appointmentId: String(a._id),
        off,
        to: user.email,
        accepted: acceptedCount,
        // guarda algo trazable; en Resend es .id:
        messageId: info?.messageId || info?.id || null,
        response: info?.response || null,
        ...(success ? {} : { reason: "not-confirmed" }),
      });

      if (success) {
        await Appointments.updateOne(
          { _id: a._id },
          { $addToSet: { "reminders.sentEmailOffsets": off } }
        );
        sentCount++;
      }
    }
  }

  return { sent: sentCount, checked: appts.length, details };
}

export default runEmailReminders;
