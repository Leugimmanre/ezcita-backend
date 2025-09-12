// src/controllers/userController.js
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const normalizePhone = (phone) => {
  // Normaliza: recorta y colapsa espacios; mantiene '+' inicial si existe
  if (!phone || typeof phone !== "string") return phone;
  const trimmed = phone.trim();
  // Reemplaza múltiples espacios por uno
  return trimmed.replace(/\s+/g, " ");
};

const normalizeUserData = (data) => {
  if (data.email && typeof data.email === "string") {
    data.email = data.email.toLowerCase().trim();
  }
  if (data.phone && typeof data.phone === "string") {
    data.phone = normalizePhone(data.phone);
  }
  return data;
};

export const UserController = {
  async createUser(req, res, next) {
    try {
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

      // Excluir password en la respuesta
      const plain = user.toObject();
      delete plain.password;

      res.status(201).json({ success: true, data: plain });
    } catch (error) {
      console.error("Error en createUser:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

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

  async updateUser(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID no válido" });
      }

      const update = normalizeUserData({ ...req.body });

      const updated = await req.User.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        update,
        { new: true, runValidators: true }
      ).select("-password");

      if (!updated)
        return res.status(404).json({ message: "Usuario no encontrado" });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

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

  async me(req, res, next) {
    try {
      if (!req.User) {
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

  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      const User = req.User;

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

      const user = await User.findById(id).select("+password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuario no encontrado" });
      }

      // ⚠️ Ajuste a tu modelo: usas `admin: Boolean`, no `role`.
      const isSelf = req.user.id === String(user._id);
      const isAdmin = !!req.user.admin; // asegúrate de inyectar `admin` en el JWT

      if (!isSelf && !isAdmin) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

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

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

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

  async search(req, res, next) {
    try {
      const q = String(req.query.q || "").trim();
      const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);

      if (!q || q.length < 2) {
        return res.json({ users: [] });
      }

      const Users = req.User || req.app.get("UserModel");

      // Escapar regex y crear búsqueda insensible a mayúsculas
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const filter = {
        tenantId: req.tenantId,
        $or: [
          { name: re },
          { lastname: re },
          { email: re },
          { phone: re }, // ← incluir teléfono en búsquedas
        ],
      };

      const users = await Users.find(filter)
        .select("_id name lastname email phone")
        .limit(limit)
        .sort({ name: 1, lastname: 1 });

      res.json({ users });
    } catch (e) {
      next(e);
    }
  },
};
