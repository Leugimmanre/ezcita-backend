// src/routes/appointmentSettingsRoutes.js
import { Router } from "express";
import { AppointmentSettingsController } from "../controllers/appointmentSettingsController.js";
import { body } from "express-validator";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

// Autenticación y tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// Obtener settings
router.get("/", AppointmentSettingsController.getSettings);

// Validador fuerte para dayBlocks avanzado
const dayBlocksValidator = body("dayBlocks")
  .custom((db) => {
    if (!db || typeof db !== "object") {
      throw new Error("dayBlocks es obligatorio y debe ser objeto");
    }
    const keys = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    for (const k of keys) {
      if (!Array.isArray(db[k])) {
        throw new Error(`dayBlocks.${k} debe ser un array`);
      }
      for (const b of db[k]) {
        if (!b || typeof b !== "object") {
          throw new Error(`Bloque inválido en ${k}`);
        }
        if (
          typeof b.start !== "string" ||
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(b.start)
        ) {
          throw new Error(`dayBlocks.${k}.start debe ser HH:mm`);
        }
        if (
          typeof b.end !== "string" ||
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(b.end)
        ) {
          throw new Error(`dayBlocks.${k}.end debe ser HH:mm`);
        }
      }
    }
    return true;
  })
  .withMessage("dayBlocks inválido");

// Validadores
const validators = [
  adminMiddleware,
  dayBlocksValidator,
  body("interval").isInt({ min: 5, max: 240 }),
  body("maxMonthsAhead").isInt({ min: 1, max: 24 }),
  body("staffCount").isInt({ min: 1, max: 50 }),
  body("timezone").optional().isString(),
  body("closedDates")
    .optional()
    .isArray()
    .custom((arr) => arr.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))
    .withMessage("closedDates debe ser array de YYYY-MM-DD"),
  handleInputErrors,
];

// Guardar/actualizar settings (solo modo avanzado)
router.post(
  "/",
  validators,
  AppointmentSettingsController.saveOrUpdateSettings
);
router.put("/", validators, AppointmentSettingsController.saveOrUpdateSettings);

export default router;
