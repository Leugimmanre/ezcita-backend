// userRoutes.js
import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { body, param } from "express-validator";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";

// Crear router
const router = Router();
// Primero validamos JWT
router.use(authMiddleware);
// Luego resolvemos el tenant
router.use(tenantMiddleware);
router.get("/me", UserController.me);
// Luego validamos que el usuario esté verificado
router.use(requireVerified);

// Crear
router.post(
  "/",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    handleInputErrors,
  ],
  UserController.createUser
);

// Obtener todos
router.get("/", UserController.getAllUsers);

// Obtener uno
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID inválido"), handleInputErrors],
  UserController.getUserById
);

// Actualizar
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("ID inválido"),
    body("name").optional(),
    body("email").optional().isEmail(),
    handleInputErrors,
  ],
  UserController.updateUser
);

// Eliminar
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID inválido"), handleInputErrors],
  UserController.deleteUser
);

// Cambiar contraseña
router.patch("/:id/password", UserController.changePassword);

export default router;
