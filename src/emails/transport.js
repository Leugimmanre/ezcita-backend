// src/emails/transport.js
import resend from "../config/resend.js"; // SDK oficial
import transporter from "../config/nodemailer.js"; // SMTP (fallback)

const MODE = (process.env.EMAIL_TRANSPORT || "resend").toLowerCase();

/**
 * sendMail - interfaz común para ambos transportes
 * @param {Object} p
 * @param {string} p.from        'Nombre <remitente@dominio>'
 * @param {string|string[]} p.to
 * @param {string} p.subject
 * @param {string} p.html
 * @param {Array<{filename:string, content:Buffer|string, contentType?:string}>} [p.attachments]
 * @param {string} [p.replyTo]
 */
export async function sendMail({
  from,
  to,
  subject,
  html,
  attachments = [],
  replyTo,
}) {
  if (MODE === "smtp") {
    // 📨 SMTP via Nodemailer
    return transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType, // opcional
      })),
    });
  }

  // 🚀 Resend SDK (por defecto)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      // Resend acepta Buffer o string; normalizamos a Buffer
      content: Buffer.isBuffer(a.content)
        ? a.content
        : Buffer.from(String(a.content), "utf8"),
    })),
  });

  if (error) throw new Error(error.message || "Resend send failed");
  return data;
}
