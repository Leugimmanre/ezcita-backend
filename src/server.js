// src/server.js
import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import morgan from "morgan";
import cron from "node-cron";
import Appointment from "./models/AppointmentModel.js";
import { corsConfig } from "./config/cors.js";
import cors from "cors";
import servicesRouter from "./routes/servicesRoutes.js";
import appointmentSettingsRouter from "./routes/appointmentSettingsRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import internalCronRoutes from "./routes/internalCronRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import brandSettingsRoutes from "./routes/brandSettingsRoutes.js";
import path from "path";
import activityRoutes from "./routes/activityRoutes.js";
import legalRoutes from "./routes/legalRoutes.js";
import { startCron } from "./cron/index.js";

// 1. Configuración inicial
dotenv.config();
// 2. Conexión a la base de datos
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});
// 3. Creación de la aplicación Express
const app = express();
// 4. Configuración de CORS
app.use(cors(corsConfig));
app.options(/.*/, cors(corsConfig));
// 5. Middlewares básicos
app.use(express.json());
app.use(morgan("dev"));

// 6. Configuración de rutas
app.use("/api/services", servicesRouter);
app.use("/api/appointment-settings", appointmentSettingsRouter);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/cron", internalCronRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/brand", brandSettingsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/legal", legalRoutes);

// Iniciar cron jobs
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sirve archivos estáticos de uploads (solo lectura pública)
app.use(
  "/static",
  cors({ origin: "*", maxAge: 86400 }),
  express.static(path.resolve(__dirname, "uploads"), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    },
  })
);

// 7. Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Server Error",
  });
});

// 8. Ruta de prueba
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
  });
});

// 9. Cron Job para eliminar citas canceladas hace más de 30 minutos
startCron();

export default app;
