// src/routes/brandSettingsRoutes.js
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";
import { BrandSettingsController } from "../controllers/brandSettingsController.js";
import { uploadMemory } from "../middlewares/upload.js";

const router = Router();

// Obtener ajustes (puede ir sin auth si quieres público)
router.get("/", BrandSettingsController.get);

// A partir de aquí, requiere tenant y auth
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

// Crear/actualizar ajustes
router.put("/", BrandSettingsController.upsert);

// Subir logo/hero con memoryStorage (necesario para .buffer)
router.post(
  "/logo",
  uploadMemory.single("logo"),
  BrandSettingsController.uploadLogo
);
router.delete("/logo", BrandSettingsController.deleteLogo);

router.post(
  "/hero",
  uploadMemory.single("hero"),
  BrandSettingsController.uploadHero
);
router.delete("/hero", BrandSettingsController.deleteHero);

export default router;
