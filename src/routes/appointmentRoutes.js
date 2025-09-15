// src/routes/appointmentRoutes.js
import { Router } from "express";
import { body, param, query } from "express-validator";
import { AppointmentController } from "../controllers/appointmentController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import mongoose from "mongoose";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";

const router = Router();

// Autenticación y tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// Disponibilidad por fecha (YYYY-MM-DD)
router.get(
  "/availability",
  [
    query("date")
      .notEmpty()
      .withMessage("date es obligatorio (YYYY-MM-DD)")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("date debe ser YYYY-MM-DD"),
    query("excludeId")
      .optional()
      .custom((v) => mongoose.isValidObjectId(v)),
    handleInputErrors,
  ],
  AppointmentController.availability
);

// Histórico de citas completadas (usuario o admin)
router.get(
  "/history",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    handleInputErrors,
  ],
  AppointmentController.getCompletedHistory
);

// LISTADO ADMIN con filtros y paginación (page, limit, status, startDate, endDate)
router.get(
  "/statistics",
  [
    (req, res, next) =>
      req.user?.role === "admin"
        ? next()
        : res.status(403).json({ error: "No autorizado" }),
    query("status").optional().isString(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    handleInputErrors,
  ],
  (req, res) => AppointmentController.adminListAppointments(req, res)
);

// Validadores
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
  .custom((services) =>
    services.every((id) => mongoose.Types.ObjectId.isValid(id))
  )
  .withMessage("Cada servicio debe tener un ID válido");

const statusValidation = body("status")
  .optional()
  .isIn(["pending", "confirmed", "cancelled", "completed"])
  .withMessage("Estado no válido");

// Crear cita (usuario)
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

// Crear cita como ADMIN
router.post(
  "/admin",
  [
    (req, res, next) =>
      req.user?.role === "admin"
        ? next()
        : res.status(403).json({ error: "No autorizado" }),
    body("userId")
      .notEmpty()
      .custom((v) => mongoose.isValidObjectId(v))
      .withMessage("userId inválido"),
    dateValidation,
    servicesValidation,
    statusValidation,
    body("notes").optional().isLength({ max: 500 }),
    handleInputErrors,
  ],
  AppointmentController.createAppointmentByAdmin
);

// Listado con filtros
router.get(
  "/",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "completed"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    handleInputErrors,
  ],
  AppointmentController.getAppointments
);

// Obtener por ID
router.get(
  "/:id",
  [param("id").custom((v) => mongoose.isValidObjectId(v)), handleInputErrors],
  AppointmentController.getAppointmentById
);

// Actualizar cita
router.put(
  "/:id",
  [
    param("id").custom((v) => mongoose.isValidObjectId(v)),
    dateValidation.optional(),
    servicesValidation.optional(),
    statusValidation,
    body("notes").optional().isLength({ max: 500 }),
    handleInputErrors,
  ],
  AppointmentController.updateAppointment
);

// Cancelar
router.patch(
  "/:id/cancel",
  [param("id").custom((v) => mongoose.isValidObjectId(v)), handleInputErrors],
  AppointmentController.cancelAppointment
);

// Reactivar
router.patch(
  "/:id/reactivate",
  [param("id").custom((v) => mongoose.isValidObjectId(v)), handleInputErrors],
  AppointmentController.reactivateAppointment
);

// Completar (admin)
router.patch("/:id/complete", (req, res, next) =>
  AppointmentController.completeAppointment(req, res, next)
);

// Eliminar (admin)
router.delete("/:id", (req, res, next) =>
  AppointmentController.deleteAppointment(req, res, next)
);

export default router;
