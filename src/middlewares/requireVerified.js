// src/middlewares/requireVerified.js
// Bloquea el acceso a rutas privadas si el usuario no está verificado
export function requireVerified(req, res, next) {
  // req.user debería estar poblado por tu middleware de auth (JWT)
  if (!req.user?.verified) {
    return res.status(403).json({
      code: "ACCOUNT_NOT_VERIFIED",
      message: "Tu cuenta aún no está verificada",
    });
  }
  next();
}
