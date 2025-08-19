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
};
