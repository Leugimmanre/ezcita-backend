// src/routes/brandSettingsRoutes.js
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { BrandSettingsController } from "../controllers/brandSettingsController.js";
import { uploadMemory } from "../middlewares/upload.js";

const router = Router();

router.get("/", tenantMiddleware, BrandSettingsController.get);

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

router.put("/", BrandSettingsController.upsert);

router.post("/logo", uploadMemory.single("logo"), BrandSettingsController.uploadLogo);
router.delete("/logo", BrandSettingsController.deleteLogo);

router.post("/hero", uploadMemory.single("hero"), BrandSettingsController.uploadHero);
router.delete("/hero", BrandSettingsController.deleteHero);

export default router;
