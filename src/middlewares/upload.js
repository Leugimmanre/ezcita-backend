// src/middlewares/upload.js
import multer from "multer";

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Solo se permiten imágenes"));
    cb(null, true);
  },
});

export const uploadDisk = multer({
  dest: "uploads/",
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Solo se permiten imágenes"));
    cb(null, true);
  },
});

export default uploadMemory;
