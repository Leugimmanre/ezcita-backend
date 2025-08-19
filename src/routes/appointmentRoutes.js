import { Router } from "express";
import { body, param, query } from "express-validator";
import { AppointmentController } from "../controllers/appointmentController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import mongoose from "mongoose";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
const router = Router();

// Primero validamos JWT
router.use(authMiddleware);
// Luego resolvemos el tenant
router.use(tenantMiddleware);

// Validaciones comunes
const dateValidation = body("date")
  .notEmpty()
  .withMessage("La fecha es obligatoria")
  .isISO8601()
  .withMessage("Formato de fecha inválido")
  .custom((value) => {
    const date = new Date(value);
    return date > new Date();
  })
  .withMessage("La fecha debe ser futura");

const servicesValidation = body("services")
  .isArray({ min: 1 })
  .withMessage("Debe seleccionar al menos un servicio")
  .custom((services) => {
    return services.every((id) => mongoose.Types.ObjectId.isValid(id));
  })
  .withMessage("Cada servicio debe tener un ID válido");

const statusValidation = body("status")
  .optional()
  .isIn(["pending", "confirmed", "cancelled", "completed"])
  .withMessage("Estado no válido");

// Crear cita
router.post(
  "/",
  [
    dateValidation,
    servicesValidation,
    body("notes").optional().isLength({ max: 500 }),
    handleInputErrors,
  ],
  AppointmentController.createAppointment
);

// Obtener citas con filtros
router.get(
  "/",
  [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Fecha de inicio inválida"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("Fecha de fin inválida"),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "completed"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    handleInputErrors,
  ],
  AppointmentController.getAppointments
);

// Obtener cita por ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  AppointmentController.getAppointmentById
);

// Actualizar cita
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    dateValidation.optional(),
    servicesValidation.optional(),
    statusValidation,
    body("notes").optional().isLength({ max: 500 }),
    handleInputErrors,
  ],
  AppointmentController.updateAppointment
);

// Cancelar cita
router.patch(
  "/:id/cancel",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  AppointmentController.cancelAppointment
);

// Reactivar cita cancelada
router.patch(
  "/:id/reactivate",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  AppointmentController.reactivateAppointment
);

// Marcar cita como completada
router.patch(
  "/:id/complete",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  AppointmentController.completeAppointment
);

// Eliminar cita (solo admin)
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  AppointmentController.deleteAppointment
);

export default router;
