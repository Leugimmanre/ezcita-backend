// src/config/brand.js
// -- Configuración centralizada de marca --
// ⚠️ Aquí definimos la única "fuente de verdad" para nombre, dominio, email de contacto, tz y frontend.

export const BRAND_DEFAULTS = {
  // Nombre visible de la marca (puedes poner un valor por defecto vía ENV)
  name: process.env.BRAND_NAME || "Mi Negocio",
  // Dominio usado en UID del .ics, etc.
  domain: process.env.BRAND_DOMAIN || "ezcita",
  // Email de contacto por defecto (cae al SMTP_USER si no hay otro)
  contactEmail: process.env.BRAND_CONTACT_EMAIL || process.env.SMTP_USER || "",
  // Zona horaria por defecto
  timezone: process.env.DEFAULT_TZ || "Europe/Madrid",
  // URL del frontend (para CTAs)
  frontendUrl: process.env.FRONTEND_URL || "",
};

/**
 * resolveBrand - mezcla settings dinámicos (por cliente/tenant) con defaults
 * @param {Object} settings - puede venir de BD o runtime
 * @returns {{name:string, domain:string, contactEmail:string, timezone:string, frontendUrl:string}}
 */
export function resolveBrand(settings = {}) {
  return {
    name: settings.brandName || settings.businessName || BRAND_DEFAULTS.name,
    domain: settings.brandDomain || BRAND_DEFAULTS.domain,
    contactEmail: settings.contactEmail || BRAND_DEFAULTS.contactEmail,
    timezone: settings.timezone || BRAND_DEFAULTS.timezone,
    frontendUrl: settings.frontendUrl || BRAND_DEFAULTS.frontendUrl,
  };
}
