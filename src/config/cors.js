import dotenv from "dotenv";
dotenv.config();

const whitelist = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(
  Boolean
);

export const corsConfig = {
  // Permitir orígenes del whitelist
  origin(origin, callback) {
    if (!origin) return callback(null, true); // curl/Postman
    if (whitelist.includes(origin)) return callback(null, true);
    console.error(`CORS bloqueado: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // ⬇️ Agrega tu header personalizado
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-tenant-id"],
  // (opcional) expón headers si luego los lees en el cliente
  exposedHeaders: ["Authorization"],
};
