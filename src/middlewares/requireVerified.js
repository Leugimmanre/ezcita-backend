// src/middlewares/requireVerified.js
export async function requireVerified(req, res, next) {
  try {
    // 1) si el token ya trae verified=true (por si lo añades en el futuro)
    if (req.user?.verified === true) return next();

    // 2) necesita un id de usuario
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Token inválido" });
    }

    // 3) revalidar en BD del tenant (req.User viene de tenantMiddleware)
    const fresh = await req.User.findById(userId).select("verified");
    if (fresh?.verified === true) return next();

    return res.status(403).json({
      code: "ACCOUNT_NOT_VERIFIED",
      message: "Tu cuenta aún no está verificada",
    });
  } catch (e) {
    next(e);
  }
}
