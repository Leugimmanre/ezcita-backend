// src/config/nodemailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const host = process.env.SMTP_HOST; // smtp.resend.com
const port = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true solo si usas 465 (TLS implícito)
  auth: {
    user: process.env.SMTP_USER, // "resend"
    pass: process.env.SMTP_PASSWORD, // tu API key de Resend
  },
  requireTLS: port !== 465, // forzar STARTTLS en 587
  tls: { minVersion: "TLSv1.2", servername: host },
});

export default transporter;
