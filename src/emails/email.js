// src/emails/email.js
import { resolveFrom } from "./from.js";
import { buildTemplateData } from "../emails/appointmentTemplates.js";
import { buildICS } from "../utils/datetime.js";
import { sendMail } from "./transport.js";
import { resolveBrand } from "../config/brand.js";

const subjects = {
  created: "Tu cita ha sido creada",
  updated: "Tu cita fue actualizada",
  cancelled: "Tu cita fue cancelada",
  deleted: "Tu cita fue eliminada",
  reactivated: "Tu cita fue reactivada",
  completed: "Cita completada",
};

export const sendAppointmentEmail = async ({
  type,
  to,
  user,
  appointment,
  services = [],
  settings = {},
}) => {
  // -- Marca centralizada (sin hardcodeo) --
  const brand = resolveBrand(settings); // { name, domain, contactEmail, timezone, frontendUrl }

  const subject = subjects[type] || "Actualización de cita";

  // HTML usando marca y tz centralizados
  const html = buildTemplateData({
    type,
    user,
    appointment,
    services,
    brand,
  });

  // Adjuntar ICS según el tipo
  const needsICS = ["created", "updated", "cancelled", "deleted"].includes(type);
  const attachments = [];

  if (needsICS) {
    const start = new Date(appointment.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (appointment.duration || 30));

    const method = ["cancelled", "deleted"].includes(type) ? "CANCEL" : "REQUEST";
    const summary = `Cita - ${brand.name}`;
    const description = (appointment?.notes || "").slice(0, 200);

    const ics = buildICS({
      uid: `${appointment._id}@${brand.domain}`,
      start,
      end,
      summary,
      description,
      method,
    });

    attachments.push({
      filename: "cita.ics",
      content: Buffer.from(ics, "utf8"),
      contentType: "text/calendar; charset=utf-8",
    });
  }

  const from = resolveFrom();
  const replyTo = brand.contactEmail || from.match(/<(.+)>/)?.[1] || from;

  return sendMail({ from, to, subject, html, attachments, replyTo });
};

export default sendAppointmentEmail;
