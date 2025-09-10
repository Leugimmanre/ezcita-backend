// src/utils/slugifyTenant.js
export function slugifyTenant(tenantId = "") {
  // Normaliza: minúsculas, quita tildes, deja solo [a-z0-9-]
  let s = String(tenantId)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return s || "unknown";
}
