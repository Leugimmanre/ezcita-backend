// Código en inglés; comentarios en español
import path from "path";
import fs from "fs/promises";
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

// ─────────────────────────────────────────────────────────────
// Helpers para soportar logos/hero legacy en /static (sin publicId)
// ─────────────────────────────────────────────────────────────
function isLocalStatic(url = "") {
  return typeof url === "string" && url.startsWith("/static/");
}

// Resuelve la ruta física del archivo servido bajo /static
function resolveStaticFilePath(staticUrl) {
  // Si usas otra carpeta para servir /static, ajusta STATIC_DIR
  const baseDir = process.env.STATIC_DIR || "public";
  const relative = String(staticUrl).replace(/^\/static\//, "");
  return path.resolve(process.cwd(), baseDir, relative);
}

async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {
    // noop
  }
}

async function safeDestroy(publicId) {
  try {
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch {
    // noop
  }
}

// ─────────────────────────────────────────────────────────────

export const BrandSettingsController = {
  // Obtener ajustes de marca del tenant
  async get(req, res, next) {
    try {
      const tenant = req.query.tenant || req.headers["x-tenant-id"] || null;

      if (!tenant) {
        return res.status(400).json({
          success: false,
          error: "tenant required",
          message: "Provide ?tenant=<id> or x-tenant-id",
        });
      }

      // No uses req.BrandSettings aquí, usa tenantManager
      const BrandSettings = await tenantManager.getBrandSettingsModel(tenant);
      const doc = await BrandSettings.findOne({ tenantId: tenant }).lean();

      return res.json({ success: true, data: doc || null });
    } catch (err) {
      console.error("GET /api/brand failed:", err?.message, err?.stack);
      next(err);
    }
  },

  // Desde aquí en adelante, mantiene tu lógica actual (usa tenantMiddleware)
  async upsert(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      if (!tenantId || !BrandSettings) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing",
          message: "Ensure tenantMiddleware runs before this endpoint",
        });
      }

      const setDoc = pickDefined(req.body, [
        "brandName",
        "brandDomain",
        "contactEmail",
        "timezone",
        "frontendUrl",
      ]);

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: setDoc, $setOnInsert: { tenantId } },
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

      if (!tenantId || !BrandSettings) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing",
          message: "Ensure tenantMiddleware runs before this endpoint",
        });
      }

      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "Logo file is required" });
      }

      // Borrar logo previo si existe (Cloudinary o archivo local legacy)
      const prev = await BrandSettings.findOne({ tenantId }).select("logo");
      if (prev?.logo) {
        if (prev.logo.publicId) {
          await safeDestroy(prev.logo.publicId);
        } else if (isLocalStatic(prev.logo.url)) {
          await safeUnlink(resolveStaticFilePath(prev.logo.url));
        }
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

  // Borrar logo (soporta Cloudinary y legacy /static)
  async deleteLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;

      if (!tenantId || !BrandSettings) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing",
          message: "Ensure tenantMiddleware runs before this endpoint",
        });
      }

      const doc = await BrandSettings.findOne({ tenantId }).select("logo");
      if (!doc?.logo) {
        return res
          .status(404)
          .json({ success: false, message: "No logo to delete" });
      }

      const { publicId, url } = doc.logo || {};
      if (publicId) {
        await safeDestroy(publicId);
      } else if (isLocalStatic(url)) {
        await safeUnlink(resolveStaticFilePath(url));
      }

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

      if (!tenantId || !BrandSettings) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing",
          message: "Ensure tenantMiddleware runs before this endpoint",
        });
      }

      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "Hero file is required" });
      }

      // Borrar hero previo si existe (Cloudinary o archivo local legacy)
      const prev = await BrandSettings.findOne({ tenantId }).select("hero");
      if (prev?.hero) {
        if (prev.hero.publicId) {
          await safeDestroy(prev.hero.publicId);
        } else if (isLocalStatic(prev.hero.url)) {
          await safeUnlink(resolveStaticFilePath(prev.hero.url));
        }
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

  // Borrar hero (soporta Cloudinary y legacy /static)
  async deleteHero(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;

      if (!tenantId || !BrandSettings) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing",
          message: "Ensure tenantMiddleware runs before this endpoint",
        });
      }

      const doc = await BrandSettings.findOne({ tenantId }).select("hero");
      if (!doc?.hero) {
        return res
          .status(404)
          .json({ success: false, message: "No hero to delete" });
      }

      const { publicId, url } = doc.hero || {};
      if (publicId) {
        await safeDestroy(publicId);
      } else if (isLocalStatic(url)) {
        await safeUnlink(resolveStaticFilePath(url));
      }

      doc.hero = null;
      await doc.save();

      invalidateBrandCache(tenantId);
      res.json({ success: true, message: "Hero eliminado" });
    } catch (e) {
      next(e);
    }
  },
};
