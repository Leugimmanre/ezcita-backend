// src/middlewares/uploadLogo.disk.js
import multer from "multer";
import fs from "fs";
import path from "path";

// ⚙️ Tipos permitidos y límite de tamaño (2MB)
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

// 📦 Storage en disco por tenant
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      // tenantId lo inyecta tu tenantMiddleware
      const tenantId = req.tenantId;
      if (!tenantId)
        return cb(new Error("tenantId is required for logo upload"));

      const dir = path.resolve("uploads", "tenants", tenantId, "brand");
      // Crea la carpeta si no existe (modo recursivo)
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    // Fuerza un nombre fijo: logo.<ext>
    const ext =
      (file.mimetype === "image/png" && "png") ||
      (file.mimetype === "image/jpeg" && "jpg") ||
      (file.mimetype === "image/webp" && "webp") ||
      (file.mimetype === "image/gif" && "gif") ||
      "png";
    cb(null, `logo.${ext}`);
  },
});

// 🧪 Filtro de archivo
function fileFilter(_req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(new Error("Formato no permitido (png, jpg, webp, gif)"));
  }
  cb(null, true);
}

export const uploadLogoDisk = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});
