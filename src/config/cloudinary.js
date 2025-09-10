// src/config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Si existe CLOUDINARY_URL, el SDK ya la lee; aseguramos 'secure'
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// (Opcional) Log mínimo para verificar en Render (no imprime secretos)
const cfg = cloudinary.config();
console.log(
  `[Cloudinary] cloud_name=${
    cfg.cloud_name || "N/A"
  } api_key_set=${!!cfg.api_key}`
);

export default cloudinary;
