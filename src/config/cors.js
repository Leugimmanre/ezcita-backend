import dotenv from "dotenv";

dotenv.config();

export const corsConfig = {
  origin: function (origin, callback) {
    const whitelist = [
      process.env.FRONTEND_URL,
      "http://localhost:5173", // Desarrollo local
      undefined, // Para permitir solicitudes sin origen (como Postman)
    ];

    // En producción, verifica el origen
    if (process.env.NODE_ENV === "production") {
      if (whitelist.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`Origen no permitido: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    } else {
      // En desarrollo, permitir todos los orígenes
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};
