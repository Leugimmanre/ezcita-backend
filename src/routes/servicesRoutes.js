// src/routes/servicesRoutes.js
import { Router } from "express";
import { body, param, query } from "express-validator";
import { ServicesController } from "../controllers/servicesController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";
import { uploadDisk } from "../middlewares/upload.js";

const router = Router();

/**
 * Orden de middlewares:
 * 1) auth: exige JWT para todas las rutas de este router
 * 2) tenant: inyecta modelos específicos y req.tenantId
 * 3) requireVerified: solo usuarios verificados
 */
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

// ─────────────────────────────────────────────────────────────
// Validaciones reutilizables
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// CRUD Servicios
// ─────────────────────────────────────────────────────────────
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

router.get("/", ServicesController.getAllServices);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.getServiceById
);

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

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), handleInputErrors],
  ServicesController.deleteService
);

// ─────────────────────────────────────────────────────────────
// Imágenes de servicio
// ─────────────────────────────────────────────────────────────

// Subir UNA imagen (campo 'image' en form-data)
// Nota: usamos uploadDisk porque el controller usa file.path y borra el tmp.
router.post(
  "/:id/images",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    handleInputErrors,
    uploadDisk.single("image"), // 👈 Asegúrate de que el front mande "image"
  ],
  ServicesController.addServiceImage
);

// Eliminar UNA imagen (vía ?publicId=... o body.publicId)
// Añadimos validación de publicId para evitar llegar al controller sin él.
router.delete(
  "/:id/images",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    // publicId puede venir por query o body: validamos "uno u otro"
    query("publicId").optional().isString().notEmpty(),
    body("publicId").optional().isString().notEmpty(),
    handleInputErrors,
  ],
  ServicesController.removeServiceImage
);

/**
 * (Opcional) Endpoint alternativo para borrar con :publicId en la URL.
 * Útil si prefieres enviar el publicId URL-encoded, ej:
 * DELETE /services/:id/images/ezcita%2Fsalon%2Fservices%2Fabc123
 *
 * Si lo habilitas, añade una función en el controller (o reutiliza la actual
 * haciendo que lea req.params.publicId si existe).
 */
router.delete(
  "/:id/images/:publicId",
  [
    param("id").isMongoId().withMessage("ID no válido"),
    param("publicId").isString().notEmpty().withMessage("publicId requerido"),
    handleInputErrors,
  ],
  async (req, res, next) => {
    // Redirige al controller actual pasando publicId “como si” viniera en query
    try {
      req.query.publicId = decodeURIComponent(req.params.publicId);
      return ServicesController.removeServiceImage(req, res, next);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
