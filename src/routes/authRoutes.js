// src/routes/authRoutes.js
import { Router } from "express";
import { body } from "express-validator";
import { AuthController } from "../controllers/authController.js";
import { handleInputErrors } from "../middlewares/handleInputErrors.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";

const router = Router();

// Todas las rutas usan multitenancy
router.use(tenantMiddleware);

// Registro
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("El nombre es obligatorio"),
    body("lastname").notEmpty().withMessage("El apellido es obligatorio"),
    body("email").isEmail().withMessage("Email inválido"),
    body("phone").optional(),
    body("password").isLength({ min: 6 }).withMessage("Mínimo 6 caracteres"),
  ],
  handleInputErrors,
  AuthController.register
);

// Confirmar cuenta
router.post(
  "/confirm-account",
  [body("token").notEmpty().withMessage("El Token es obligatorio")],
  handleInputErrors,
  AuthController.confirmAccount
);

// Reenviar token verificación
router.post(
  "/resend-token",
  [body("email").isEmail().withMessage("Email inválido")],
  handleInputErrors,
  AuthController.resendVerification
);

// Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("La contraseña es obligatoria"),
  ],
  handleInputErrors,
  AuthController.login
);

// Olvidé mi contraseña
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Email inválido")],
  handleInputErrors,
  AuthController.forgotPassword
);

// Resetear contraseña
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("El Token es obligatorio"),
    body("password").isLength({ min: 6 }).withMessage("Mínimo 6 caracteres"),
  ],
  handleInputErrors,
  AuthController.resetPassword
);

export default router;
