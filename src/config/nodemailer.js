// src/config/nodemailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Configuramos SMTP de Mailtrap Live
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "live.smtp.mailtrap.io",
  port: Number(process.env.SMTP_PORT) || 587, // 587 = STARTTLS, 465 = TLS directo
  secure: Number(process.env.SMTP_PORT) === 465, // true si usas 465
  auth: {
    user: process.env.SMTP_USER, // Usuario exacto del panel Mailtrap Live
    pass: process.env.SMTP_PASSWORD, // Token SMTP de Mailtrap Live
  },
  requireTLS: true, // fuerza STARTTLS en 587
  tls: {
    minVersion: "TLSv1.2",
    servername: "live.smtp.mailtrap.io",
  },
});

// Verificación opcional
transporter
  .verify()
  .then(() => {
    console.log("Conexión SMTP con Mailtrap Live lista");
  })
  .catch((err) => {
    console.error("Error en conexión SMTP:", err.message);
  });

export default transporter;

