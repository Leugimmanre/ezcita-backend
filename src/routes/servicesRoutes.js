import { Router } from "express";
import { body, param } from "express-validator";
import { ServicesController } from "../controllers/servicesController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import upload from "../middlewares/upload.js";

const router = Router();
// Primero validamos JWT
router.use(authMiddleware);
// Luego resolvemos el tenant
router.use(tenantMiddleware);

// Validaciones comunes reutilizables
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

// Todas las rutas requieren autenticación JWT
// router.use(validateJWT);

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

// Obtener por ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.getServiceById
);

// Actualizar por ID
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

// Eliminar por ID (borrado lógico)
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.deleteService
);

// Multer para manejo de archivos
router.post(
  "/:id/images",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    handleInputErrors,
    upload.single("file"),
  ],
  ServicesController.addServiceImage
);

// Eliminar UNA imagen del servicio por publicId
router.delete(
  "/:id/images",
  param("id").isMongoId().withMessage("ID no válido"),
  handleInputErrors,
  ServicesController.removeServiceImage
);
export default router;
