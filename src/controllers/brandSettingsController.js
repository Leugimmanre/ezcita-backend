// Código en inglés; comentarios en español
import cloudinary from "../config/cloudinary.js";
import { invalidateBrandCache } from "../config/brand.js";
import { cloudFolder } from "../utils/cloudinaryFolders.js";

// helper: filtra solo claves definidas
function pickDefined(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

// helper: subida Cloudinary usando buffer (memoryStorage) vía stream
function uploadFromBuffer(buffer, { folder, publicId }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export const BrandSettingsController = {
  // Obtener ajustes de marca del tenant
  async get(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).lean();
      return res.json({ success: true, data: doc || null });
    } catch (e) {
      next(e);
    }
  },

  // Crear/actualizar ajustes de marca
  async upsert(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const setDoc = pickDefined(req.body, [
        "brandName",
        "brandDomain",
        "contactEmail",
        "timezone",
        "frontendUrl",
      ]);

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: setDoc, $setOnInsert: { tenantId } }, // 👈 aseguramos tenantId en upsert
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.json({ success: true, data: doc });
    } catch (e) {
      next(e);
    }
  },

  // Subir/Sobrescribir logo (campo 'logo' en multipart/form-data con memoryStorage)
  async uploadLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "Logo file is required" });
      }

      // Borrar logo previo si existe (tolerante a fallos)
      const prev = await BrandSettings.findOne({ tenantId }).select("logo");
      if (prev?.logo?.publicId) {
        try {
          await cloudinary.uploader.destroy(prev.logo.publicId);
        } catch {}
      }

      // Carpeta por tenant (normalizada)
      const folder = cloudFolder(tenantId, "brand");
      const uploaded = await uploadFromBuffer(file.buffer, {
        folder,
        publicId: "logo",
      });

      const payload = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        provider: "cloudinary",
        filename: file.originalname || null,
        mimetype: file.mimetype || null,
        size: file.size || 0,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { logo: payload }, $setOnInsert: { tenantId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.status(201).json({ success: true, data: doc.logo });
    } catch (e) {
      next(e);
    }
  },

  // Borrar logo
  async deleteLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).select("logo");
      if (!doc?.logo?.publicId) {
        return res
          .status(404)
          .json({ success: false, message: "No logo to delete" });
      }

      try {
        await cloudinary.uploader.destroy(doc.logo.publicId);
      } catch {}
      doc.logo = null;
      await doc.save();

      invalidateBrandCache(tenantId);
      res.json({ success: true, message: "Logo eliminado" });
    } catch (e) {
      next(e);
    }
  },

  // Subir/Sobrescribir hero (campo 'hero' en multipart/form-data con memoryStorage)
  async uploadHero(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "Hero file is required" });
      }

      // Borrar hero previo si existe
      const prev = await BrandSettings.findOne({ tenantId }).select("hero");
      if (prev?.hero?.publicId) {
        try {
          await cloudinary.uploader.destroy(prev.hero.publicId);
        } catch {}
      }

      const folder = cloudFolder(tenantId, "brand");
      const uploaded = await uploadFromBuffer(file.buffer, {
        folder,
        publicId: "hero",
      });

      const payload = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        provider: "cloudinary",
        filename: file.originalname || null,
        mimetype: file.mimetype || null,
        size: file.size || 0,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { hero: payload }, $setOnInsert: { tenantId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.status(201).json({ success: true, data: doc.hero });
    } catch (e) {
      next(e);
    }
  },

  // Borrar hero
  async deleteHero(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).select("hero");
      if (!doc?.hero?.publicId) {
        return res
          .status(404)
          .json({ success: false, message: "No hero to delete" });
      }

      try {
        await cloudinary.uploader.destroy(doc.hero.publicId);
      } catch {}
      doc.hero = null;
      await doc.save();

      invalidateBrandCache(tenantId);
      res.json({ success: true, message: "Hero eliminado" });
    } catch (e) {
      next(e);
    }
  },
};
