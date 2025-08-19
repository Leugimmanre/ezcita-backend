// controllers/servicesController.js
import mongoose from "mongoose";

// Función para normalizar datos antes de guardar
const normalizeServiceData = (data) => {
  if (data.category && typeof data.category === "string") {
    data.category = data.category.toLowerCase();
  }
  return data;
};

export const ServicesController = {
  // Crea un nuevo servicio
  async createService(req, res, next) {
    try {
      // Normalizar datos antes de crear
      const normalizedData = normalizeServiceData({ ...req.body });
      // 1. Crear instancia del servicio con datos combinados
      const service = new req.Services({
        ...normalizedData,
        tenantId: req.tenantId,
      });
      // 2. Intentar guardar el servicio directamente
      await service.save();
      // 3. Respuesta exitosa si se guarda correctamente
      res.status(201).json({
        success: true,
        data: service,
        msg: "Servicio creado correctamente",
      });
    } catch (error) {
      // 4. Manejo específico de error de colección faltante
      if (error.code === 26) {
        try {
          // 5. Crear la colección explícitamente
          await req.Services.createCollection();
          // 6. Reintentar crear el servicio
          const retryService = new req.Services({
            ...req.body,
            tenantId: req.tenantId,
          });
          await retryService.save();
          // 7. Respuesta exitosa después del reintento
          res.status(201).json({
            success: true,
            data: retryService,
            msg: "Servicio creado correctamente",
          });
        } catch (retryError) {
          // 8. Manejo de errores en el reintento
          next(retryError);
        }
      } else {
        // 9. Pasar otros errores al middleware de errores
        next(error);
      }
    }
  },

  // Obtiene todos los servicios con filtros opcionales
  async getAllServices(req, res, next) {
    try {
      const { active, category } = req.query;
      // Filtra por tenantId y parámetros de query
      const filter = { tenantId: req.tenantId };

      if (active) filter.active = active === "true";
      if (category) filter.category = category;

      const services = await req.Services.find(filter);
      res.json({
        success: true,
        count: services.length,
        data: services,
        msg: "Servicios obtenidos correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtiene un servicio por ID
  async getServiceById(req, res, next) {
    try {
      // 1. Validar formato del ID primero
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return handleInvalidIdResponse(res);
      }
      // 2. Buscar servicio solo si el ID es válido
      const service = await req.Services.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });
      // 3. Manejar servicio no encontrado
      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Servicio no encontrado",
          message: `No existe un servicio con ID ${req.params.id} para este tenant`,
        });
      }
      // 4. Respuesta exitosa
      res.json({
        success: true,
        data: service,
        msg: "Servicio obtenido correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  // Actualiza un servicio por ID
  async updateService(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return handleInvalidIdResponse(res);
      }

      // Normalizar datos antes de actualizar
      const normalizedData = normalizeServiceData({ ...req.body });
      // Limpiar datos: convertir campos vacíos a null
      const cleanedData = normalizeServiceData({ ...req.body });
      if (cleanedData.category === "") delete cleanedData.category;

      const updated = await req.Services.findOneAndUpdate(
        {
          _id: req.params.id,
          tenantId: req.tenantId,
        },
        cleanedData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Servicio no encontrado",
        });
      }

      res.json({
        success: true,
        data: updated,
        msg: "Servicio actualizado correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  // Elimina un servicio por ID
  async deleteService(req, res, next) {
    try {
      // 1. Validar formato del ID primero
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return handleInvalidIdResponse(res);
      }
      // 2. Eliminar solo si el ID es válido
      const deleted = await req.Services.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.tenantId,
      });
      // 3. Manejar servicio no encontrado
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Servicio no encontrado",
          message: `No existe un servicio con ID ${req.params.id} para eliminar`,
        });
      }
      // 4. Respuesta exitosa
      res.json({
        success: true,
        data: null,
        message: "Servicio eliminado correctamente",
      });
    } catch (error) {
      next(error);
    }
  },
};
