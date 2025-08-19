// src/controllers/authController.js
import bcrypt from "bcryptjs";
import { generateJWT } from "../utils/jwtUtils.js";
import Token from "../models/TokenModel.js";
import {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} from "../emails/AuthEmail.js";
import { tokenGenarator } from "../utils/tokenGenarator.js";

/**
 * Nota multitenant:
 * - Usamos req.User (inyectado por tu tenantMiddleware)
 * - tenantId en req.tenantId
 */
export const AuthController = {
  // Registro + enviar token de verificación
  async register(req, res, next) {
    try {
      const { name, lastname, email, password } = req.body;
      const tenantId = req.tenantId;

      // Normalizar email
      const normalizedEmail = String(email).toLowerCase().trim();

      // ¿Existe ya?
      const existing = await req.User.findOne({
        email: normalizedEmail,
        tenantId,
      });
      if (existing) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }

      // Crear usuario con password hasheada
      const hashed = await bcrypt.hash(password, 10);
      const user = await req.User.create({
        name,
        lastname,
        email: normalizedEmail,
        password: hashed,
        tenantId,
        verified: false,
      });

      // Crear token de verificación (se borra automático a los 10m)
      const token = tokenGenarator();
      await Token.create({ token, user: user._id, type: "verify" });

      // Enviar email de verificación
      await sendConfirmationEmail({
        name: user.name,
        email: user.email,
        token,
      });

      // Por seguridad, no enviar password ni campos sensibles
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          verified: user.verified,
        },
        message:
          "Usuario registrado. Revisa tu email para verificar la cuenta.",
      });
    } catch (error) {
      next(error);
    }
  },

  // Confirmar cuenta con token
  async confirmAccount(req, res, next) {
    try {
      const { token } = req.body;

      const tokenDoc = await Token.findOne({ token, type: "verify" });
      if (!tokenDoc) {
        return res.status(409).json({ message: "Token inválido o expirado" });
      }

      // Marcar usuario como verificado
      const user = await req.User.findById(tokenDoc.user).select("+tenantId");
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      user.verified = true;
      await Promise.allSettled([user.save(), tokenDoc.deleteOne()]);

      res.json({ success: true, message: "Cuenta confirmada correctamente" });
    } catch (error) {
      next(error);
    }
  },

  // Reenviar token de verificación
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const tenantId = req.tenantId;

      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await req.User.findOne({
        email: normalizedEmail,
        tenantId,
      }).select("+tenantId");

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (user.verified) {
        return res
          .status(400)
          .json({ message: "La cuenta ya está verificada" });
      }

      // Eliminar tokens previos de verificación
      await Token.deleteMany({ user: user._id, type: "verify" });

      const token = tokenGenarator();
      await Token.create({ token, user: user._id, type: "verify" });
      await sendConfirmationEmail({
        name: user.name,
        email: user.email,
        token,
      });

      res.json({ success: true, message: "Nuevo token enviado al correo" });
    } catch (error) {
      next(error);
    }
  },

  // Login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const tenantId = req.tenantId;

      const user = await req.User.findOne({
        email: String(email).toLowerCase().trim(),
        tenantId,
      }).select("+password +tenantId");

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Opcional: exigir verificación antes de login
      // if (!user.verified) return res.status(403).json({ message: "Verifica tu cuenta antes de iniciar sesión" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      const token = generateJWT(user, user.tenantId);

      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          role: user.admin ? "admin" : "user",
          tenantId: user.tenantId,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Olvidé mi contraseña (envía token)
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const tenantId = req.tenantId;

      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await req.User.findOne({
        email: normalizedEmail,
        tenantId,
      }).select("+tenantId");

      // Por seguridad, no revelamos si existe o no. Pero aquí vamos a responder 200 igual.
      if (!user) {
        return res.json({
          success: true,
          message: "Si el correo existe, enviaremos instrucciones.",
        });
      }

      // Eliminar tokens previos de reset
      await Token.deleteMany({ user: user._id, type: "password_reset" });

      const token = tokenGenarator();
      await Token.create({ token, user: user._id, type: "password_reset" });
      await sendPasswordResetEmail({
        name: user.name,
        email: user.email,
        token,
      });

      res.json({
        success: true,
        message: "Si el correo existe, enviaremos instrucciones.",
      });
    } catch (error) {
      next(error);
    }
  },

  // Resetear contraseña con token
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      const tokenDoc = await Token.findOne({ token, type: "password_reset" });
      if (!tokenDoc) {
        return res.status(409).json({ message: "Token inválido o expirado" });
      }

      const user = await req.User.findById(tokenDoc.user).select(
        "+tenantId +password"
      );
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      user.password = await bcrypt.hash(password, 10);
      await Promise.allSettled([user.save(), tokenDoc.deleteOne()]);

      res.json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      next(error);
    }
  },
};
