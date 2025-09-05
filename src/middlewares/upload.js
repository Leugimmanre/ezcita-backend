// src/middlewares/upload.js
import multer from "multer";

// Almacenamiento temporal en disco (Cloudinary luego borraremos el tmp)
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes comunes
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }
    cb(null, true);
  },
});

export default upload;
