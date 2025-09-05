// src/routes/brandSettingsRoutes.js
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { BrandSettingsController } from "../controllers/brandSettingsController.js";
import { uploadLogoDisk } from "../middlewares/uploadLogo/disk.js";

const router = Router();

// Obtener ajustes
router.get("/", BrandSettingsController.get);

// Orden recomendado
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

// Crear/Actualizar ajustes
router.put("/", BrandSettingsController.upsert);


// Subir logo (campo 'logo')
router.post(
  "/logo",
  uploadLogoDisk.single("logo"),
  BrandSettingsController.uploadLogo
);

// Borrar logo
router.delete("/logo", BrandSettingsController.deleteLogo);

export default router;
