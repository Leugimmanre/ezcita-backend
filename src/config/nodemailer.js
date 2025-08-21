// src/config/nodemailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const host = process.env.SMTP_HOST || "live.smtp.mailtrap.io";
const port = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true solo si usas 465
  auth: {
    user: process.env.SMTP_USER, // ej: apismtp@mailtrap.io (exacto del panel)
    pass: process.env.SMTP_PASSWORD, // tu API token de Email Sending
  },
  requireTLS: true, // forzar STARTTLS en 587/2525/25
  tls: { minVersion: "TLSv1.2", servername: host }, // TLS moderno
  logger: true, // temporal: logs en consola de Render
  debug: true, // temporal: logs SMTP detallados
});

export default transporter;
