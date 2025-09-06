// src/controllers/userController.js
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const normalizeUserData = (data) => {
  if (data.email && typeof data.email === "string") {
    data.email = data.email.toLowerCase().trim();
  }
  return data;
};

export const UserController = {
  // Crear usuario (admin)
  async createUser(req, res, next) {
    try {
      console.log("Entrando a createUser con tenant:", req.tenantId);

      const normalizedData = normalizeUserData({ ...req.body });

      if (!req.User) {
        throw new Error("req.User no está definido. Revisa tenantMiddleware.");
      }

      const existing = await req.User.findOne({
        email: normalizedData.email,
        tenantId: req.tenantId,
      });

      if (existing) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }

      const hashed = await bcrypt.hash(normalizedData.password, 10);

      const user = new req.User({
        ...normalizedData,
        password: hashed,
        tenantId: req.tenantId,
      });

      await user.save();

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      console.error("Error en createUser:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener todos
  async getAllUsers(req, res, next) {
    try {
      const users = await req.User.find({ tenantId: req.tenantId }).select(
        "-password"
      );
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  // Obtener uno
  async getUserById(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID no válido" });
      }
      const user = await req.User.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      }).select("-password");

      if (!user)
        return res.status(404).json({ message: "Usuario no encontrado" });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  // Actualizar
  async updateUser(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID no válido" });
      }

      const updated = await req.User.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        req.body,
        { new: true, runValidators: true }
      ).select("-password");

      if (!updated)
        return res.status(404).json({ message: "Usuario no encontrado" });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  // Eliminar
  async deleteUser(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID no válido" });
      }
      const deleted = await req.User.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.tenantId,
      });

      if (!deleted)
        return res.status(404).json({ message: "Usuario no encontrado" });

      res.json({ success: true, message: "Usuario eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  },

  // Obtener el perfil del usuario autenticado
  async me(req, res, next) {
    try {
      if (!req.User) {
        // Si pasa esto, es orden de middlewares incorrecto
        return res.status(500).json({
          success: false,
          error: "User model not initialized. Check tenantMiddleware order.",
        });
      }

      const user = await req.User.findOne({
        _id: req.user.id,
        tenantId: req.tenantId,
      }).select("-password");

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Usuario no encontrado" });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
  // Cambiar contraseña de un usuario
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // ⚠️ Model multi-tenant inyectado por tenantMiddleware
      const User = req.User;

      // 1) Validaciones básicas
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Faltan campos: currentPassword y/o newPassword",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "La nueva contraseña debe tener al menos 6 caracteres",
        });
      }

      // 2) Buscar usuario
      const user = await User.findById(id).select("+password"); // asegúrate de poder leer el hash
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuario no encontrado" });
      }

      // 3) Comprobar que el usuario autenticado puede cambiar esta contraseña
      //    (mismo usuario o admin; esto depende de tu sistema de roles)
      if (req.user.id !== String(user._id) && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      // 4) Verificar contraseña actual
      const isValid = await bcrypt.compare(
        currentPassword,
        user.password || ""
      );
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual no es correcta",
        });
      }

      // 5) Hashear nueva contraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      // 6) Guardar
      await user.save();

      return res.json({ success: true, data: { id: user._id } });
    } catch (err) {
      console.error("changePassword error:", err);
      return res.status(500).json({
        success: false,
        message: "Error al cambiar la contraseña",
      });
    }
  },
};
