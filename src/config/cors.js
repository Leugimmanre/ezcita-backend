// src/config/cors.js
import dotenv from "dotenv";
dotenv.config();

const whitelist = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

export const corsConfig = {
  origin(origin, callback) {
    // requests sin Origin (curl, Postman) -> permitir
    if (!origin) return callback(null, true);

    if (whitelist.includes(origin)) {
      return callback(null, true);
    }
    console.error(`CORS bloqueado: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // si usas cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};
