// src/utils/jwtUtils.js
import jwt from "jsonwebtoken";

/**
 * Genera un JWT para un usuario
 * @param {Object} user - Objeto usuario de la BD (debe contener _id, email, admin, verified)
 * @param {string} tenantId - ID del tenant
 * @returns {string} token JWT
 */
export const generateJWT = (user, tenantId) => {
  // Si no existe el secreto, jwt.sign lanzará — mejor fallar pronto y claro
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  // Normalizamos el payload a lo que espera authMiddleware
  const payload = {
    id: String(user._id), // ← siempre string
    email: user.email,
    role: user.admin ? "admin" : "user",
    tenantId,
    // Opcional: incluir verified para atajos en middlewares/vistas
    verified: !!user.verified,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};
