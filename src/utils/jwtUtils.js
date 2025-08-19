// src/utils/jwtUtils.js
import jwt from "jsonwebtoken";

/**
 * Genera un JWT para un usuario
 * @param {Object} user - Objeto usuario de la BD
 * @param {string} tenantId - ID del tenant
 * @param {string} role - Rol del usuario (admin | user)
 * @returns {string} token JWT
 */
export const generateJWT = (user, tenantId, role) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.admin ? "admin" : "user",
      tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
