// src/emails/transport.js
import resend from "../config/resend.js"; // Instancia de Resend SDK

// Expresión simple para validar emails básicos
const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * parseAddress - admite "email@dom.com" o "Nombre <email@dom.com>"
 * Devuelve string normalizada o null si inválida
 */
function parseAddress(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();

  // Caso "Nombre <email@dom.com>"
  const matchAngle = s.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (matchAngle) {
    const name = matchAngle[1].trim().replace(/(^"|"$)/g, "");
    const email = matchAngle[2].trim();
    if (!SIMPLE_EMAIL_RE.test(email)) return null;
    return name ? `${name} <${email}>` : email;
  }

  // Caso "email@dom.com"
  if (SIMPLE_EMAIL_RE.test(s)) return s;

  return null;
}

/**
 * normaliza direcciones a array válido
 */
function normalizeAddresses(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(parseAddress).filter(Boolean);
}

/**
 * sendMail usando solo Resend
 */
export async function sendMail({
  from,
  to,
  subject,
  html,
  attachments = [],
  alternatives = [],
  headers = {},
  replyTo,
}) {
  // Normalizar direcciones
  const fromNorm = parseAddress(from);
  const toList = normalizeAddresses(to);
  const replyList = normalizeAddresses(replyTo);

  if (!fromNorm) throw new Error("Invalid 'from' address.");
  if (!toList.length) throw new Error("No valid recipients in 'to'.");

  // Construir payload para Resend
  const payload = {
    from: fromNorm,
    to: toList,
    subject,
    html,
    attachments,
    alternatives,
    headers,
    replyTo,
  };

  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content:
        typeof a.content === "string" ? Buffer.from(a.content) : a.content,
      content_type: a.contentType || "application/octet-stream",
    }));
  }

  if (replyList.length > 0) {
    payload.reply_to = replyList.length === 1 ? replyList[0] : replyList;
  }

  const res = await resend.emails.send(payload);

  if (res.error) {
    throw new Error(res.error?.message || "Resend send error");
  }

  return res;
}

export default sendMail;
