// src/controllers/brandSettingsController.js
import cloudinary from "../config/cloudinary.js";
import { invalidateBrandCache } from "../config/brand.js";

// helper para filtrar solo keys definidas en un objeto
function pickDefined(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

// helper para subir desde buffer (si lo necesitas en otro sitio)
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
  async get(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).lean();
      return res.json({ success: true, data: doc || null });
    } catch (e) {
      next(e);
    }
  },

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
        { $set: setDoc },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.json({ success: true, data: doc });
    } catch (e) {
      next(e);
    }
  },

  // Subir/Sobrescribir logo a Cloudinary (campo 'logo' en multipart/form-data)
  async uploadLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Logo file is required" });
      }

      // 1) Si existía logo previo, lo borramos de Cloudinary
      const prev = await BrandSettings.findOne({ tenantId }).select("logo");
      if (prev?.logo?.publicId) {
        try {
          await cloudinary.uploader.destroy(prev.logo.publicId);
        } catch {
          // ignorar errores de borrado
        }
      }

      // 2) Subir a Cloudinary usando el buffer
      const folder = `ezcita/${tenantId}/brand`;
      const publicId = "logo"; // nombre fijo por tenant
      const uploaded = await new Promise((resolve, reject) => {
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
        stream.end(file.buffer);
      });

      // 3) Guardar datos en BD (respetando tu shape)
      const payload = {
        url: uploaded.secure_url, // ahora es absoluta https://res.cloudinary.com/...
        publicId: uploaded.public_id, // ezcita/<tenant>/brand/logo
        provider: "cloudinary",
        filename: null, // legacy: dejamos null al usar CDN
        mimetype: file.mimetype || null,
        size: file.size || 0,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { logo: payload } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);

      // Devolvemos doc.logo (con secure_url), tal y como espera tu frontend
      res.json({ success: true, data: doc.logo });
    } catch (e) {
      next(e);
    }
  },

  // Borrar logo en Cloudinary
  async deleteLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).select("logo");
      if (!doc?.logo?.publicId) {
        return res.status(404).json({ message: "No logo to delete" });
      }

      // Borrar en Cloudinary
      try {
        await cloudinary.uploader.destroy(doc.logo.publicId);
      } catch {
        // ignorar errores de borrado
      }

      // Limpiar en BD
      doc.logo = null;
      await doc.save();

      invalidateBrandCache(tenantId);
      res.json({ success: true, message: "Logo eliminado" });
    } catch (e) {
      next(e);
    }
  },

  // Subir/Sobrescribir hero (campo 'hero' en form-data)
  async uploadHero(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const file = req.file;
      if (!file)
        return res.status(400).json({ message: "Hero file is required" });

      // Borrar previo si existe
      const prev = await BrandSettings.findOne({ tenantId }).select("hero");
      if (prev?.hero?.publicId) {
        try {
          await cloudinary.uploader.destroy(prev.hero.publicId);
        } catch {}
      }

      const folder = `ezcita/${tenantId}/brand`;
      const uploaded = await uploadFromBuffer(file.buffer, {
        folder,
        publicId: "hero",
      });

      const payload = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        provider: "cloudinary",
        filename: null,
        mimetype: file.mimetype || null,
        size: file.size || 0,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { hero: payload }, $setOnInsert: { tenantId } }, // 👈 asegura tenantId en upsert
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.json({ success: true, data: doc.hero });
    } catch (e) {
      next(e);
    }
  },

  // Eliminar hero
  async deleteHero(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).select("hero");
      if (!doc?.hero?.publicId)
        return res.status(404).json({ message: "No hero to delete" });

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
