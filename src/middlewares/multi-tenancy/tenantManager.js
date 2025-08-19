// middlewares/multi-tenancy/tenantManager.js
import mongoose from "mongoose";
import ServicesSchema from "../../models/ServicesModel.js";
import { appointmentSettingsSchemaDefinition } from "../../models/AppointmentSettingsModel.js";
import { appointmentSchemaDefinition } from "../../models/AppointmentModel.js";
import { userSchemaDefinition } from "../../models/UserModel.js";

class TenantManager {
  constructor() {
    this.connections = new Map();
    this.userModels = new Map();
    this.serviceModels = new Map();
    this.appointmentSettingsModels = new Map();
    this.appointmentModels = new Map();
  }

  async getTenantConnection(tenantId) {
    if (!tenantId) throw new Error("Tenant ID is required");
    // 1. Si ya existe conexión, la retorna
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId);
    }
    // 2. Construye nombre de BD: ezcita_<tenantId>
    const dbName = `ezcita_${tenantId}`;
    // 3. Construye URI usando la base de MONGO_URI
    const baseURI =
      process.env.MONGO_URI.replace(/(.*)\/.*?(\?.*)?$/, "$1") ||
      "mongodb://localhost/";

    const dbURI = `${baseURI}/${dbName}`;
    // 4. Crea nueva conexión
    const conn = await mongoose
      .createConnection(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    // 5. Almacena y retorna la conexión
    this.connections.set(tenantId, conn);
    // console.log(`New connection created for tenant: ${tenantId}`);

    return conn;
  }

  // Obtiene o crea el modelo de usuario para un tenant
  async getUserModel(tenantId) {
    if (this.userModels.has(tenantId)) {
      return this.userModels.get(tenantId);
    }

    const conn = await this.getTenantConnection(tenantId);
    const model = conn.model("User", userSchemaDefinition);
    this.userModels.set(tenantId, model);
    return model;
  }

  // Obtiene o crea el modelo de servicios para un tenant
  async getServiceModel(tenantId) {
    // 1. Si ya existe modelo, lo retorna
    if (this.serviceModels.has(tenantId)) {
      return this.serviceModels.get(tenantId);
    }
    // 2. Obtiene conexión para el tenant
    const conn = await this.getTenantConnection(tenantId);
    // 3. Crea modelo específico para esta conexión
    const model = conn.model("Services", ServicesSchema);
    // 4. Almacena y retorna el modelo
    this.serviceModels.set(tenantId, model);
    return model;
  }

  // Obtiene o crea el modelo de configuración de citas para un tenant
  async getAppointmentSettingsModel(tenantId) {
    if (this.appointmentSettingsModels.has(tenantId)) {
      return this.appointmentSettingsModels.get(tenantId);
    }

    const conn = await this.getTenantConnection(tenantId);
    const model = conn.model("AppointmentSettings", appointmentSettingsSchemaDefinition );
    this.appointmentSettingsModels.set(tenantId, model);
    return model;
  }

  // Obtiene o crea el modelo de citas para un tenant
  async getAppointmentModel(tenantId) {
    if (this.appointmentModels.has(tenantId)) {
      return this.appointmentModels.get(tenantId);
    }

    const conn = await this.getTenantConnection(tenantId);
    const model = conn.model("Appointment", appointmentSchemaDefinition);
    this.appointmentModels.set(tenantId, model);
    return model;
  }

  // Obtiene o crea el modelo de configuración de citas para un tenant
  async closeAllConnections() {
    for (const [tenantId, conn] of this.connections) {
      await conn.close();
      console.log(`Connection closed for tenant: ${tenantId}`);
    }
    this.connections.clear();
    this.serviceModels.clear();
    this.appointmentSettingsModels.clear();
  }
}
// Singleton para gestionar todas las conexiones
const tenantManager = new TenantManager();

// Cierre elegante en caso de terminación de proceso
process.on("SIGINT", async () => {
  await tenantManager.closeAllConnections();
  process.exit(0);
});

export default tenantManager;

/**
 * Este módulo es el núcleo del sistema multi-tenant, responsable de gestionar conexiones a bases de datos y modelos para cada inquilino (salón de belleza). El diseño sigue el patrón Singleton para asegurar una única instancia global.

 * Propiedades:
  connections: Mapa que almacena conexiones a MongoDB por tenantId
  serviceModels: Mapa que almacena modelos de Mongoose por tenantId
  Objetivo: Mantener en caché las conexiones y modelos para optimizar el rendimiento

  * getTenantConnection(tenantId)
  Proceso detallado:
  Validación: Verifica que se proporcionó un tenantId
  Caché: Retorna conexión existente si está disponible
  Construcción de URI:
  Extrae la parte base de MONGO_URI (ej: mongodb://localhost:27017)
  Combina con el nombre de BD específico (ezcita_<tenantId>)
  Creación de conexión:
  Usa mongoose.createConnection para conexión independiente
  Configura opciones importantes:
  useNewUrlParser: Analizador moderno de URLs
  useUnifiedTopology: Motor de topología unificada
  Timeouts para evitar conexiones colgadas
  Almacenamiento: Guarda la nueva conexión en el mapa
  Log: Registro informativo para depuración

  * getServiceModel(tenantId)
  Flujo:
  Verificación de caché: Retorna modelo existente si está disponible
  Obtención de conexión: Usa getTenantConnection para asegurar conexión
  Creación de modelo:
  Registra el modelo "Services" en la conexión específica
  Utiliza el esquema compartido (ServicesSchema)
  Almacenamiento: Guarda el modelo en caché para futuras solicitudes.

  * closeAllConnections()
  Funcionalidad:
  Itera todas las conexiones almacenadas
  Cierra cada conexión de manera ordenada
  Limpia los mapas de caché
  Proporciona logs informativos

  * Instancia Singleton y Gestión de Procesos
  Características clave:
  Patrón Singleton: Garantiza una única instancia global
  Manejo de señales: Captura SIGINT (Ctrl+C) para cierre ordenado
  Secuencia de terminación:
  Cierra todas las conexiones a bases de datos
  Finaliza el proceso con código 0 (éxito)

  * Flujo de Operación Completo
  Primera solicitud de un tenant:
  Middleware solicita modelo → tenantManager.getServiceModel(tenantId)
  Verifica caché de modelos → no existe
  Solicita conexión → getTenantConnection(tenantId)
  Verifica caché de conexiones → no existe
  Crea nueva conexión a BD específica
  Crea modelo asociado a la conexión
  Almacena en caché ambos recursos
  Retorna modelo al middleware
  Solicitudes posteriores del mismo tenant:
  Middleware solicita modelo
  tenantManager encuentra modelo en caché
  Retorna inmediatamente sin crear nueva conexión
  Apagado del servidor:
  Usuario presiona Ctrl+C → señal SIGINT
  Manejador cierra todas las conexiones activas
  Limpia cachés
  Termina proceso ordenadamente

  * Principios de Diseño
  Conexiones bajo demanda:
  Solo se crean conexiones cuando son necesarias
  Evita conexiones innecesarias a tenants inactivos
  Caché inteligente:
  Reduce sobrecarga de crear conexiones repetidas
  Optimiza rendimiento en operaciones frecuentes
  Aislamiento total:
  Cada tenant tiene su propia conexión a BD
  Modelos específicos por conexión garantizan separación
  Gestión de recursos:
  Cierre ordenado libera recursos correctamente
  Previene fugas de memoria y conexiones huérfanas
  Resistencia a fallos:
  Timeouts evitan bloqueos por conexiones lentas
  Validaciones prevén errores comunes

  * Ventajas Clave
  Escalabilidad: Maneja miles de tenants eficientemente
  Rendimiento: Caché reduce latencia en solicitudes repetidas
  Confiabilidad: Conexiones dedicadas previenen conflictos
  Mantenibilidad: Código claro y autocontenido
  Portabilidad: Funciona con cualquier implementación de MongoDB
  Observabilidad: Logs detallados para monitoreo
 */
