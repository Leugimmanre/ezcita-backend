// src/controllers/brandSettingsController.js
import path from "path";
import fs from "fs/promises";
import { invalidateBrandCache } from "../config/brand.js";

// 🧩 Helper: construye la URL pública /static/...
function buildPublicUrl(req, fileRelativePath) {
  // fileRelativePath debe ser relativo a 'uploads' (ej: tenants/<tenantId>/brand/logo.png)
  return `/static/${fileRelativePath.replace(/\\/g, "/")}`;
}

export const BrandSettingsController = {
  async get(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const doc = await BrandSettings.findOne({ tenantId });
      return res.json({ success: true, data: doc || null });
    } catch (e) {
      next(e);
    }
  },

  async upsert(req, res, next) {
    try {
      const { tenantId, BrandSettings } = req;
      const { brandName, brandDomain, contactEmail, timezone, frontendUrl } =
        req.body;

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        {
          $set: { brandName, brandDomain, contactEmail, timezone, frontendUrl },
        },
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

      const payload = {
        url: buildPublicUrl(req, relative),
        filename: path.basename(file.path),
        mimetype: file.mimetype,
        size: file.size,
      };

      const doc = await BrandSettings.findOneAndUpdate(
        { tenantId },
        { $set: { logo: payload } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      invalidateBrandCache(tenantId);
      res.json({ success: true, data: doc.logo });
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
