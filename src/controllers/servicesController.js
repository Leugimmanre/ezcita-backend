// src/controllers/servicesController.js
import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import { slugifyTenant } from "../utils/slugifyTenant.js";

// Normaliza datos del servicio
const normalizeServiceData = (data) => {
  if (data.category && typeof data.category === "string") {
    data.category = data.category.toLowerCase();
  }
  return data;
};

// Helper: borra un path temporal si existe
const safeUnlink = (p) => {
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {}
};

// Carpeta Cloudinary por tenant
const cloudinaryFolderForTenant = (tenantId) =>
  `ezcita/${slugifyTenant(tenantId || "unknown")}/services`;

export const ServicesController = {
  // Crea un nuevo servicio
  async createService(req, res, next) {
    try {
      const normalizedData = normalizeServiceData({ ...req.body });

      const service = new req.Services({
        ...normalizedData,
        tenantId: req.tenantId,
        // Permitir crear con imágenes iniciales si vienen (no obligatorio)
        images: Array.isArray(normalizedData.images)
          ? normalizedData.images
          : [],
      });

      await service.save();

      res.status(201).json({
        success: true,
        data: service,
        msg: "Servicio creado correctamente",
      });
    } catch (error) {
      if (error.code === 26) {
        try {
          await req.Services.createCollection();
          const retryService = new req.Services({
            ...req.body,
            tenantId: req.tenantId,
          });
          await retryService.save();
          res.status(201).json({
            success: true,
            data: retryService,
            msg: "Servicio creado correctamente",
          });
        } catch (retryError) {
          next(retryError);
        }
      } else {
        next(error);
      }
    }
  },

  // Obtiene todos los servicios
  async getAllServices(req, res, next) {
    try {
      const { active, category } = req.query;
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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "ID no válido",
          message: `Formato de ID inválido: ${req.params.id}`,
        });
      }

      const service = await req.Services.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Servicio no encontrado",
          message: `No existe un servicio con ID ${req.params.id} para este tenant`,
        });
      }

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
        return res.status(400).json({
          success: false,
          error: "ID no válido",
        });
      }

      const cleanedData = normalizeServiceData({ ...req.body });
      if (cleanedData.category === "") delete cleanedData.category;

      const updated = await req.Services.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        cleanedData,
        { new: true, runValidators: true }
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

  // Elimina un servicio por ID (y borra imágenes de Cloudinary)
  async deleteService(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "ID no válido",
        });
      }

      // Recuperar primero para conocer imágenes
      const service = await req.Services.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Servicio no encontrado",
          message: `No existe un servicio con ID ${req.params.id} para eliminar`,
        });
      }

      // Borrar imágenes en Cloudinary (si las hay)
      if (Array.isArray(service.images) && service.images.length) {
        const deletions = service.images.map((img) =>
          cloudinary.uploader.destroy(img.publicId).catch(() => null)
        );
        await Promise.all(deletions);
      }

      await req.Services.deleteOne({
        _id: service._id,
        tenantId: req.tenantId,
      });

      res.json({
        success: true,
        data: null,
        message: "Servicio e imágenes eliminados correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  // Subir UNA imagen a Cloudinary y agregarla al servicio
  async addServiceImage(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        safeUnlink(req.file?.path);
        return res.status(400).json({ success: false, error: "ID no válido" });
      }

      const service = await req.Services.findOne({
        _id: id,
        tenantId: req.tenantId,
      });

      if (!service) {
        safeUnlink(req.file?.path);
        return res
          .status(404)
          .json({ success: false, error: "Servicio no encontrado" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No se encontró el archivo" });
      }

      // Subida a Cloudinary en carpeta por tenant
      const folder = cloudinaryFolderForTenant(req.tenantId);
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder,
        // Opcional: transformation, calidad, etc.
        // transformation: [{ width: 1600, crop: "limit" }],
      });

      // Borrar archivo temporal
      safeUnlink(req.file.path);

      // Añadir al array de imágenes
      const imageDoc = {
        url: result.secure_url,
        publicId: result.public_id,
        alt: req.body?.alt?.trim() || "",
      };

      service.images.push(imageDoc);
      await service.save();

      res.status(201).json({
        success: true,
        data: imageDoc,
        msg: "Imagen subida y asociada correctamente",
      });
    } catch (error) {
      // Intento de limpieza si algo falla tras la subida
      safeUnlink(req.file?.path);
      next(error);
    }
  },

  // Eliminar UNA imagen del servicio y Cloudinary
  async removeServiceImage(req, res, next) {
    try {
      const { id } = req.params;
      const publicId = (req.query.publicId || req.body?.publicId || "").trim();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "ID no válido" });
      }
      if (!publicId) {
        return res
          .status(400)
          .json({ success: false, error: "publicId no proporcionado" });
      }

      const service = await req.Services.findOne({
        _id: id,
        tenantId: req.tenantId,
      });
      if (!service) {
        return res
          .status(404)
          .json({ success: false, error: "Servicio no encontrado" });
      }

      await cloudinary.uploader.destroy(publicId);

      service.images = service.images.filter(
        (img) => img.publicId !== publicId
      );
      await service.save();

      res.json({
        success: true,
        data: service.images,
        msg: "Imagen eliminada correctamente",
      });
    } catch (error) {
      next(error);
    }
  },
};
