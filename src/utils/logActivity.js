// src/utils/logActivity.js
// Helper para registrar actividad sin romper el flujo si falla
import Activity from "../models/ActivityModel.js";

function resolveUserName(user) {
  if (!user) return "System";
  const first =
    user.name ||
    user.firstName ||
    user.firstname ||
    user.given_name ||
    user.givenName ||
    user.displayName ||
    user.username;
  const last =
    user.lastname || user.lastName || user.family_name || user.familyName;
  if (first && last) return `${first} ${last}`.trim();
  if (first) return String(first);
  return user.email || "System";
}

function resolveTenantId(req) {
  return (
    req.tenantId ||
    req.headers["x-tenant-id"] ||
    req.query?.tenant ||
    req.body?.tenantId ||
    null
  );
}

export async function logActivity(req, payload) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      console.warn("[logActivity] missing tenantId – activity skipped");
      return; // evita meter docs huérfanos
    }
    const user = req.user;
    await Activity.create({
      tenantId,
      userId: user?._id || user?.id || null,
      userName: payload.userName ?? resolveUserName(user),
      ...payload, // { category, action, entityId?, metadata? }
    });
  } catch (err) {
    console.error("[logActivity] failed:", err?.message);
  }
}
