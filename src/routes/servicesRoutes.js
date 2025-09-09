import { Router } from "express";
import { body, param } from "express-validator";
import { ServicesController } from "../controllers/servicesController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { uploadDisk } from "../middlewares/upload.js";

const router = Router();

/**
 * Orden de middlewares:
 * 1) auth: exige JWT para todas las rutas de este router
 * 2) tenant: inyecta modelos específicos y req.tenantId
 */
router.use(authMiddleware);
router.use(tenantMiddleware);

// Validaciones reutilizables
const nameValidation = body("name")
  .notEmpty()
  .withMessage("El nombre es obligatorio")
  .trim()
  .isLength({ min: 3 })
  .withMessage("El nombre debe tener al menos 3 caracteres")
  .isLength({ max: 100 })
  .withMessage("El nombre no puede exceder 100 caracteres");

const priceValidation = body("price")
  .notEmpty()
  .withMessage("El precio es obligatorio")
  .isFloat({ min: 0 })
  .withMessage("El precio debe ser numérico y no negativo");

const durationValidation = body("duration")
  .optional()
  .isInt({ min: 1 })
  .withMessage("La duración debe ser al menos 1");

// Crear servicio
router.post(
  "/",
  [
    nameValidation,
    priceValidation,
    durationValidation,
    body("description").optional().isLength({ max: 500 }),
    body("category").optional().trim().isLength({ max: 50 }),
    handleInputErrors,
  ],
  ServicesController.createService
);

// Obtener todos los servicios (con filtros opcionales)
router.get("/", ServicesController.getAllServices);

// Obtener un servicio por ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.getServiceById
);

// Actualizar un servicio por ID
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    nameValidation.optional(),
    priceValidation.optional(),
    durationValidation,
    handleInputErrors,
  ],
  ServicesController.updateService
);

// Eliminar un servicio por ID
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.deleteService
);

// Subir UNA imagen al servicio (campo 'image' en form-data)
router.post(
  "/:id/images",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    handleInputErrors,
    // Asegura que en el frontend el campo del file se llame "image"
    uploadDisk.single("image"),
  ],
  ServicesController.addServiceImage
);

// Eliminar UNA imagen del servicio (via ?publicId=...)
router.delete(
  "/:id/images",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.removeServiceImage
);

export default router;
