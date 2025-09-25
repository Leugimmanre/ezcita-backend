// src/routes/internalCronRoutes.js
import { Router } from "express";
import { CronController } from "../controllers/cronController.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Autenticación y tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// El tenantMiddleware se monta en server.js (a nivel de /api/cron)
router.post("/email-reminders", CronController.emailReminders);

export default router;
