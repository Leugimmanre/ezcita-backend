import { Router } from "express";
import { AppointmentSettingsController } from "../controllers/appointmentSettingsController.js";
import { body } from "express-validator";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();
// Primero validamos JWT
router.use(authMiddleware);
// Luego resolvemos el tenant
router.use(tenantMiddleware);

router.get("/", AppointmentSettingsController.getSettings);

router.post(
  "/",
  adminMiddleware,
  [
    body("startHour").isFloat({ min: 0, max: 23.5 }),
    body("endHour").isFloat({ min: 0, max: 23.5 }),
    body("interval").isInt({ min: 1 }),
    body("lunchStart").isFloat({ min: 0, max: 23.5 }),
    body("lunchEnd").isFloat({ min: 0, max: 23.5 }),
    body("maxMonthsAhead").isInt({ min: 1, max: 24 }),
    body("workingDays.*").isInt({ min: 0, max: 6 }),
    handleInputErrors,
  ],
  AppointmentSettingsController.saveOrUpdateSettings
);

export default router;
