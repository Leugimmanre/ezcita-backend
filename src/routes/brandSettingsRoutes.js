// src/routes/brandSettingsRoutes.js
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";
import { BrandSettingsController } from "../controllers/brandSettingsController.js";
import { uploadMemory } from "../middlewares/upload.js"; // 👈 memoryStorage

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

// GET/PUT (sin archivos)
router.get("/", BrandSettingsController.get);
router.put("/", BrandSettingsController.upsert);

// ⬇️ SUBIDAS: cada endpoint acepta SOLO un campo file con ese nombre
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
