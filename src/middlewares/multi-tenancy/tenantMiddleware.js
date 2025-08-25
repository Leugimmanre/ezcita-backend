// src/middlewares/multi-tenancy/tenantMiddleware.js
import tenantManager from "./tenantManager.js";

const INVALID_TENANTS = new Set(["", "default", "null", "undefined"]);

function normalizeTenant(raw) {
  // 🇪🇸 Solo letras, números, guion y guion bajo; pasa a minúsculas
  const safe = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return safe;
}

export const tenantMiddleware = async (req, res, next) => {
  try {
    // 🇪🇸 1) Prioriza header; luego param de ruta; luego query
    const fromHeader = req.headers["x-tenant-id"];
    const fromParam = req.params?.tenant; // si usas rutas /:tenant/*
    const fromQuery = req.query?.tenant;

    const headerTenant = normalizeTenant(fromHeader);
    const routeTenant = normalizeTenant(fromParam);
    const queryTenant = normalizeTenant(fromQuery);

    // 🇪🇸 2) Resuelve candidato (header > param > query)
    const tenantId = headerTenant || routeTenant || queryTenant;

    // 🇪🇸 3) Validaciones estrictas
    if (!tenantId || INVALID_TENANTS.has(tenantId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tenantId",
        message:
          "Provide a valid X-Tenant-ID header or tenant param (not 'default').",
      });
    }

    // 🇪🇸 4) Si viene param de ruta, exige que coincida con el header cuando ambos existan
    if (routeTenant && headerTenant && routeTenant !== headerTenant) {
      return res.status(400).json({
        success: false,
        error: "Tenant mismatch",
        message: `Route tenant '${routeTenant}' does not match header tenant '${headerTenant}'.`,
      });
    }

    // 🇪🇸 5) Inyecta modelos por tenant (una sola vez por request)
    req.tenantId = tenantId;
    req.User = await tenantManager.getUserModel(tenantId);
    req.Services = await tenantManager.getServiceModel(tenantId);
    req.AppointmentSettings = await tenantManager.getAppointmentSettingsModel(
      tenantId
    );
    req.Appointments = await tenantManager.getAppointmentModel(tenantId);
    req.BrandSettings = await tenantManager.getBrandSettingsModel(tenantId);

    return next();
  } catch (error) {
    console.error(
      `Tenant middleware error for '${req?.tenantId || "unknown"}':`,
      error
    );
    return res.status(500).json({
      success: false,
      error: "Database connection error",
      message: error.message,
    });
  }
};
