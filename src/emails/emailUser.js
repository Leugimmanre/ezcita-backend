// src/emails/emailUser.js
export async function buildEmailUser(req, appointment, fallbackUserId) {
  const u = appointment?.user;

  // 1) Si viene populado (tiene email), úsalo
  if (u && typeof u === "object" && "email" in u && u.email) {
    return {
      name: u.name || "cliente",
      email: u.email,
    };
  }

  // 2) Resolver por ID si NO está populado
  const uid =
    (typeof u === "string" && u) ||
    (u && typeof u === "object" && (u._id?.toString?.() || u.toString?.())) ||
    (fallbackUserId ? String(fallbackUserId) : "");

  if (uid) {
    const dbUser = await req.User.findById(uid).select("name email").lean();
    if (dbUser?.email) {
      return { name: dbUser.name || "cliente", email: dbUser.email };
    }
  }

  // 3) Último recurso: datos del token, pero solo si hay email
  if (req.user?.email) {
    return { name: req.user?.name || "cliente", email: req.user.email };
  }

  // 4) Sin email -> devolvemos null para que el caller NO envíe
  return null;
}
