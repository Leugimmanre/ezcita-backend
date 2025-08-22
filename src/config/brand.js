// src/config/brand.js
const BRAND_CACHE = new Map(); // { tenantId: { data, expiresAt } }
const TTL_MS = 60_000;

function getCached(tenantId) {
  const item = BRAND_CACHE.get(tenantId);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    BRAND_CACHE.delete(tenantId);
    return null;
  }
  return item.data;
}
function setCached(tenantId, data) {
  BRAND_CACHE.set(tenantId, { data, expiresAt: Date.now() + TTL_MS });
}

/**
 * Lee marca desde BD por tenant (asíncrono)
 */
export async function resolveBrandFromDB(BrandSettingsModel, tenantId) {
  if (!BrandSettingsModel || !tenantId) {
    throw new Error("BrandSettingsModel and tenantId are required");
  }
  const cached = getCached(tenantId);
  if (cached) return cached;

  const doc = await BrandSettingsModel.findOne({ tenantId }).lean();
  const data = {
    name: doc?.brandName ?? null,
    domain: doc?.brandDomain ?? null,
    contactEmail: doc?.contactEmail ?? null,
    timezone: doc?.timezone ?? null,
    frontendUrl: doc?.frontendUrl ?? null,
    logoUrl: doc?.logo?.url ?? null,
  };
  setCached(tenantId, data);
  return data;
}

/**
 * Igual que arriba pero exige mínimos
 */
export async function resolveBrandStrict(BrandSettingsModel, tenantId) {
  const b = await resolveBrandFromDB(BrandSettingsModel, tenantId);
  const missing = [];
  if (!b.name) missing.push("brandName");
  if (!b.contactEmail) missing.push("contactEmail");
  if (!b.timezone) missing.push("timezone");
  if (missing.length) {
    const error = new Error(
      `Missing brand settings: ${missing.join(", ")} (tenantId=${tenantId})`
    );
    error.code = "BRAND_SETTINGS_INCOMPLETE";
    throw error;
  }
  return b;
}

/**
 * Invalidar caché tras PUT/POST/DELETE
 */
export function invalidateBrandCache(tenantId) {
  BRAND_CACHE.delete(tenantId);
}

/**
 * 🔁 COMPAT: versión síncrona con la MISMA firma anterior.
 * Usa datos ya cargados (por ejemplo desde el frontend o req.brand).
 * No consulta BD. No usa ENV. Devuelve null si falta.
 *
 * Esto permite que el código existente que hacía:
 *   const brand = resolveBrand(settings)
 * siga funcionando mientras migras a la versión asíncrona.
 */
export function resolveBrand(settings = {}) {
  return {
    name: settings.brandName ?? settings.businessName ?? null,
    domain: settings.brandDomain ?? null,
    contactEmail: settings.contactEmail ?? null,
    timezone: settings.timezone ?? null,
    frontendUrl: settings.frontendUrl ?? null,
    logoUrl: settings.logo?.url ?? settings.logoUrl ?? null,
  };
}
