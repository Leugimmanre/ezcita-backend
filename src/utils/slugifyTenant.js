// src/utils/slugifyTenant.js
// Normaliza: sin acentos, minúsculas, solo [a-z0-9._-], colapsa separadores
export const slugifyTenant = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
