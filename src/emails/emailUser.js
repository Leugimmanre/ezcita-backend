// src/emails/emailUser.js
export async function buildEmailUser(req, appointment, fallbackUserId) {
  // 1) si ya viene populada la cita con el usuario
  if (appointment?.user && typeof appointment.user === "object") {
    return {
      name: appointment.user.name || "cliente",
      email: appointment.user.email,
    };
  }
  // 2) si tenemos un userId (de la cita o fallback), lo buscamos en BD del tenant
  const uid = appointment?.user?.toString?.() || String(fallbackUserId || "");
  if (uid) {
    const dbUser = await req.User.findById(uid).select("name email").lean();
    if (dbUser?.email) {
      return { name: dbUser.name || "cliente", email: dbUser.email };
    }
  }
  // 3) último recurso: lo que haya en el token
  return { name: req.user?.name || "cliente", email: req.user?.email };
}
