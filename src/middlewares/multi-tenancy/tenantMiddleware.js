// src/middlewares/multi-tenancy/tenantMiddleware.js
import tenantManager from "./tenantManager.js";

// Solo letras, números, punto, guion y guion_bajo
const isValidTenantId = (s = "") => /^[a-zA-Z0-9._-]+$/.test(String(s));

export const tenantMiddleware = async (req, res, next) => {
  // 1) Lee header (case-insensitive), query o usuario autenticado
  const headerId = req.get("X-Tenant-ID") || req.get("x-tenant-id");
  const tenantId = headerId || req.query.tenant || req.user?.tenantId;
  // 2. Valida presencia de tenantId
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: "Tenant ID required",
      message:
        "Please provide X-Tenant-ID header, ?tenant=, or ensure your user has tenantId.",
    });
  }

  if (!isValidTenantId(tenantId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Tenant ID",
      message: "Use only letters, numbers, '.', '_' or '-'.",
    });
  }

  try {
    // 3. Obtiene modelo de servicios específico del tenant
    req.User = await tenantManager.getUserModel(tenantId);
    req.Services = await tenantManager.getServiceModel(tenantId);
    req.AppointmentSettings = await tenantManager.getAppointmentSettingsModel(
      tenantId
    );
    req.Appointments = await tenantManager.getAppointmentModel(tenantId);
    req.BrandSettings = await tenantManager.getBrandSettingsModel(tenantId);

    // 4. Añade tenantId al request para uso posterior
    req.tenantId = tenantId;
    // 5. Continúa con el siguiente middleware/ruta
    next();
  } catch (error) {
    console.error(`Tenant middleware error for ${tenantId}:`, error);
    // 6. Manejo de errores de conexión a la base de datos
    res.status(500).json({
      error: "Database connection error",
      message: error.message,
    });
  }
};

/**
 Este middleware es un componente fundamental en la arquitectura multi-tenant, actuando como puente entre las solicitudes entrantes y el sistema de gestión de inquilinos. Su función principal es identificar el inquilino (tenant) asociado a cada solicitud y preparar el entorno para operaciones específicas de ese inquilino.

* const tenantId = req.headers["x-tenant-id"] || req.query.tenant;
* Busca el identificador del inquilino en dos lugares:
Encabezados HTTP: X-Tenant-ID
Parámetros de consulta: ?tenant=
Proporciona flexibilidad para diferentes métodos de integración


if (!tenantId) {
  return res.status(400).json({...});
}
Rechaza solicitudes sin tenantId con error 400 (Bad Request)
Proporciona mensaje claro sobre cómo solucionar el problema
Previene operaciones sin contexto definido

req.Services = await tenantManager.getServiceModel(tenantId);
Usa el TenantManager para obtener el modelo de servicios
El modelo está configurado para la base de datos específica del inquilino
Adjunta el modelo al objeto req para acceso en controladores

req.tenantId = tenantId;
Añade el tenantId al objeto de solicitud
Permite acceso directo en controladores sin necesidad de reconsultar
Facilita auditoría y logging posterior

next();
Pasa el control al siguiente middleware o controlador
La solicitud ahora tiene todo el contexto necesario

} catch (error) {
  console.error(...);
  res.status(500).json({...});
}
Captura errores de conexión a la base de datos
Registra errores detallados con identificación del tenant
Devuelve respuesta estandarizada de error 500 (Internal Server Error)

Características Clave
Centralización de Lógica Tenant:
Encapsula toda la gestión de multi-tenancy en un solo punto
Evita duplicación de código en controladores
Flexibilidad en Identificación:
Soporta múltiples métodos para especificar el tenant
Compatible con diferentes esquemas de autenticación
Inyección de Dependencias:
Proporciona a los controladores:
req.Services: Modelo específico del tenant
req.tenantId: Identificador del inquilino
Gestión de Errores Robusta:
Maneja casos de:
Tenant no especificado
Conexión fallida a base de datos
Errores inesperados del sistema
Aislamiento de Datos:
Garantiza que cada solicitud opere solo sobre su tenant
Previene acceso cruzado entre clientes

Flujo de Solicitud con el Middleware
Llegada de solicitud HTTP:
Ejemplo: GET /api/services
Header: X-Tenant-ID: salon123
Procesamiento del Middleware:
Extrae tenantId = "salon123"
Obtiene modelo para ezcita_salon123
Adjunta modelo a req.Services
Pasaje a Controlador:

// En servicesController.js
const services = await req.Services.find({...});
Operación en Base de Datos:
Todas las consultas usan la conexión específica
Automáticamente filtradas por tenantId

 */
