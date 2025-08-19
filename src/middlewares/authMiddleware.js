// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardamos la info del usuario en req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };

    req.tenantId = decoded.tenantId; // importante para el tenantMiddleware

    next();
  } catch (error) {
    console.error("Error en authMiddleware:", error);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};
