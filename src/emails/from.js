// src/emails/from.js
const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_ADDR_REG = /^.+\s<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

export function resolveFrom() {
  const raw = (process.env.MAIL_FROM || "").trim();
  if (raw) {
    if (!EMAIL_REG.test(raw) && !NAME_ADDR_REG.test(raw)) {
      throw new Error(
        `MAIL_FROM has invalid format: "${raw}". Use "name <email@domain>" or "email@domain".`
      );
    }
    return raw; // ✅ ya viene formateado
  }

  const name = (process.env.MAIL_FROM_NAME || "").trim();
  const addr = (process.env.MAIL_FROM_ADDRESS || "").trim();

  if (!addr) {
    throw new Error(
      "Missing sender. Set MAIL_FROM or MAIL_FROM_ADDRESS (optionally MAIL_FROM_NAME)."
    );
  }
  if (!EMAIL_REG.test(addr)) {
    throw new Error(`MAIL_FROM_ADDRESS is not a valid email: "${addr}"`);
  }
  return name ? `${name} <${addr}>` : addr;
}
