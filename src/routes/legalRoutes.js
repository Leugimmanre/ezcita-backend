// src/routes/legalRoutes.js
import { Router } from "express";
import { LegalController } from "../controllers/legalController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

// Público: ver documentos
router.get("/:type", LegalController.getDoc);

// Admin: crear/editar
router.put(
  "/:type",
  authMiddleware,
  adminMiddleware,
  LegalController.upsertDoc
);

export default router;
