// src/controllers/brandSettingsController.js
import path from "path";
import fs from "fs/promises";
import { invalidateBrandCache } from "../config/brand.js";

// Toma sólo claves definidas (sin pisar con undefined)
function pickDefined(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

// URL pública relativa /static/...
function buildPublicUrl(fileRelativePath) {
  // fileRelativePath debe ser relativo a 'uploads' (ej: tenants/<tenantId>/brand/logo.png)
  return `/static/${fileRelativePath.replace(/\\/g, "/")}`;
}

// (Opcional) URL absoluta, útil en emails si el cliente abre fuera de tu dominio
function buildAbsoluteUrl(req, relativeUrl) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  if (!host) return relativeUrl; // fallback
  return `${proto}://${host}${relativeUrl}`;
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

      // Sólo guardamos lo que venga definido en el body
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

  // Subir/Sobrescribir logo (una sola imagen)
  async uploadLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const file = req.file;
      if (!file)
        return res.status(400).json({ message: "Logo file is required" });

      // Ruta relativa respecto a 'uploads'
      const relative = path.join(
        "tenants",
        tenantId,
        "brand",
        path.basename(file.path)
      );

      // Si existía un logo con otra extensión, eliminarlo para no dejar huérfanos
      const prev = await BrandSettings.findOne({ tenantId }).select("logo");
      if (
        prev?.logo?.filename &&
        prev.logo.filename !== path.basename(file.path)
      ) {
        const prevAbs = path.resolve(
          "uploads",
          "tenants",
          tenantId,
          "brand",
          prev.logo.filename
        );
        try {
          await fs.unlink(prevAbs);
        } catch {} // ignore si no existe
      }

      const relativeUrl = buildPublicUrl(relative);
      const absoluteUrl = buildAbsoluteUrl(req, relativeUrl);

      const payload = {
        url: relativeUrl, // conserva la relativa para frontend
        filename: path.basename(file.path),
        mimetype: file.mimetype,
        size: file.size,
        // opcional: absoluteUrl si quieres guardarla también
        // absoluteUrl,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { logo: payload } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);

      // Devuelvo ambas URLs por comodidad del cliente
      res.json({
        success: true,
        data: { ...doc.logo, absoluteUrl },
      });
    } catch (e) {
      next(e);
    }
  },

  async deleteLogo(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId }).select("logo");
      if (!doc?.logo?.filename) {
        return res.status(404).json({ message: "No logo to delete" });
      }

      const abs = path.resolve(
        "uploads",
        "tenants",
        tenantId,
        "brand",
        doc.logo.filename
      );
      try {
        await fs.unlink(abs);
      } catch {} // si ya no existe, ignorar

      doc.logo = null;
      await doc.save();

      invalidateBrandCache(tenantId);
      res.json({ success: true, message: "Logo eliminado" });
    } catch (e) {
      next(e);
    }
  },
};
