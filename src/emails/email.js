// src/emails/email.js
import { buildTemplateData } from "../emails/appointmentTemplates.js";
import transporter from "../config/nodemailer.js";
import { buildICS } from "../utils/datetime.js";

const fromName = process.env.MAIL_FROM_NAME || "defaultName";
const fromAddress = process.env.MAIL_FROM_ADDRESS || "no-reply@barbershop.test";

const subjects = {
  created: "Tu cita ha sido creada",
  updated: "Tu cita fue actualizada",
  cancelled: "Tu cita fue cancelada",
  deleted: "Tu cita fue eliminada",
  reactivated: "Tu cita fue reactivada",
  completed: "Cita completada",
};


export const sendAppointmentEmail = async ({
  type, // "created" | "updated" | "cancelled" | "deleted" | "reactivated" | "completed"
  to, // email del cliente
  user, // { name, ... }
  appointment, // cita (date, duration, totalPrice, notes, _id)
  services = [], // [{name, price, duration}]
  settings = {}, // { brandName, timezone, contactEmail, ... }
}) => {
  const subject = subjects[type] || "Actualización de cita";

  // HTML
  const html = buildTemplateData({
    type,
    user,
    appointment,
    services,
    settings,
  });

  // ICS adjunto (REQUEST en create/update, CANCEL en cancel/delete)
  const needsICS = ["created", "updated", "cancelled", "deleted"].includes(
    type
  );
  const attachments = [];

  if (needsICS) {
    const start = new Date(appointment.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (appointment.duration || 30));

    const method = ["cancelled", "deleted"].includes(type)
      ? "CANCEL"
      : "REQUEST";
    const summary = `Cita - ${settings?.brandName || "BarberShop"}`;
    const description = (appointment?.notes || "").slice(0, 200);

    const ics = buildICS({
      uid: `${appointment._id}@${settings?.brandDomain || "ezcita"}`,
      start,
      end,
      summary,
      description,
      method,
    });

    attachments.push({
      filename: "cita.ics",
      content: ics,
      contentType: "text/calendar; charset=utf-8",
    });
  }

  const from = `"${fromName}" <${fromAddress}>`;
  const replyTo = settings?.contactEmail || fromAddress;

  return transporter.sendMail({
    from,
    to,
    replyTo,
    subject,
    html,
    attachments,
  });
};

export default sendAppointmentEmail;

