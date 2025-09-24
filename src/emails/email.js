// src/emails/email.js
import { resolveFrom } from "./from.js";
import { buildTemplateData } from "../emails/appointmentTemplates.js";
import { buildICS } from "../utils/datetime.js";
import { sendMail } from "./transport.js";
import { resolveBrand, resolveBrandFromDB } from "../config/brand.js";

const subjects = {
  created: "Tu cita ha sido creada",
  updated: "Tu cita fue actualizada",
  cancelled: "Tu cita fue cancelada",
  deleted: "Tu cita fue eliminada",
  reactivated: "Tu cita fue reactivada",
  completed: "Cita completada",
};

/**
 * Envía un email de cita usando la configuración de marca del tenant.
 *
 * @param {Object} params
 * @param {"created"|"updated"|"cancelled"|"deleted"|"reactivated"|"completed"} params.type
 * @param {string} params.to                    - Email destino
 * @param {Object} params.user                  - Usuario (para saludo)
 * @param {Object} params.appointment           - Cita (date, duration, notes, _id, totalPrice)
 * @param {Array}  [params.services=[]]         - Lista de servicios (name, price, duration)
 * @param {Object} [params.settings={}]         - (Compat) Marca ya resuelta desde el frontend (brandName, brandDomain, contactEmail, timezone, frontendUrl, logo)
 * @param {mongoose.Model} [params.BrandSettingsModel] - Modelo inyectado por tenantMiddleware (req.BrandSettings)
 * @param {string} [params.tenantId]            - Tenant actual (req.tenantId)
 */
export const sendAppointmentEmail = async ({
  type,
  to,
  user,
  appointment,
  services = [],
  settings = {},
  BrandSettingsModel,
  tenantId,
}) => {
  // 1) Compatibilidad: si te pasan settings, intenta usarlo
  let brand = resolveBrand(settings);

  // 2) Si la marca está incompleta, resuélvela desde la BD del tenant
  if (!brand.name || !brand.timezone || !brand.contactEmail) {
    if (BrandSettingsModel && tenantId) {
      const b = await resolveBrandFromDB(BrandSettingsModel, tenantId);
      brand = {
        name: b.name || "Mi Negocio",
        domain: b.domain || "local",
        contactEmail: b.contactEmail || "no-reply@local",
        timezone: b.timezone || "Europe/Madrid",
        frontendUrl: b.frontendUrl || "",
        logoUrl: b.logoUrl || null,
      };
    } else {
      // Fallback suave si aún no migraste a BD en este punto del flujo
      brand = {
        name: brand.name || "Mi Negocio",
        domain: brand.domain || "local",
        contactEmail: brand.contactEmail || "no-reply@local",
        timezone: brand.timezone || "Europe/Madrid",
        frontendUrl: brand.frontendUrl || "",
        logoUrl: brand.logoUrl || null,
      };
    }
  }

  const subject = subjects[type] || "Actualización de cita";

  // 3) Construir HTML (plantilla usa brand.name y brand.timezone)
  const html = buildTemplateData({
    type,
    user,
    appointment,
    services,
    brand,
  });

  // 4) Adjuntar ICS cuando corresponda
  const needsICS = ["created", "updated", "cancelled", "deleted"].includes(
    type
  );
  const attachments = [];
  const alternatives = [];
  let headers = {};

  if (needsICS) {
    const start = new Date(appointment.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (appointment.duration || 30));

    const method = ["cancelled", "deleted"].includes(type)
      ? "CANCEL"
      : "REQUEST";
    const summary = `Cita - ${brand.name || "Mi Negocio"}`;
    const description = (appointment?.notes || "").slice(0, 200);

    // Usa inviteSeq si existe; si no, 0 para "created" y 1 para otras
    const sequence =
      typeof appointment?.inviteSeq === "number"
        ? appointment.inviteSeq
        : type === "created"
        ? 0
        : 1;

    const ics = buildICS({
      uid: `${appointment._id}@${brand.domain || "local"}`,
      start,
      end,
      summary,
      description,
      method,
      organizerEmail: brand.contactEmail || "no-reply@local",
      organizerName: brand.name || "",
      attendeeEmail: user?.email || to || "",
      attendeeName: user?.name || "Invitado",
      sequence,
      url: brand.frontendUrl
        ? `${brand.frontendUrl}/appointments/my-appointments`
        : "",
    });

    const contentType = `text/calendar; method=${method}; charset=UTF-8`;

    attachments.push({
      filename: "cita.ics",
      content: Buffer.from(ics, "utf8"),
      contentType,
    });
    alternatives.push({ content: ics, contentType });
    headers = { "Content-Class": "urn:content-classes:calendarmessage" };
  }
  // 5) Remitente y reply-to
  const from = resolveFrom();
  const replyTo = brand.contactEmail || from.match(/<(.+)>/)?.[1] || from;

  // 6) Enviar
  return sendMail({ from, to, subject, html, attachments, alternatives, headers, replyTo });
};

export default sendAppointmentEmail;
