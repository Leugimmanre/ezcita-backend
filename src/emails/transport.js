// src/emails/transport.js
import resend from "../config/resend.js";

/**
 * sendMail - interfaz de envío con Resend
 */
export async function sendMail({
  from,
  to,
  subject,
  html,
  attachments = [],
  replyTo,
}) {
  if (!resend) {
    throw new Error("[MAIL] RESEND_API_KEY is missing.");
  }

  const toList = Array.isArray(to) ? to : [to];

  const rsdAttachments = attachments?.length
    ? attachments.map((a) => ({
        filename: a.filename,
        // Resend recomienda base64
        content: Buffer.isBuffer(a.content)
          ? a.content.toString("base64")
          : Buffer.from(String(a.content), "utf8").toString("base64"),
      }))
    : undefined;

  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    html,
    replyTo,
    attachments: rsdAttachments,
  });

  if (error) throw new Error(error.message || "Resend send failed");
  return data;
}
