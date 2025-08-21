// src/emails/AuthEmail.js
import { sendMail } from "../emails/transport.js";
import { resolveFrom } from "./from.js";
import {
  commonStyles,
  confirmationStyles,
  resetStyles,
} from "./emailStyles.js";

const APP_NAME = process.env.APP_NAME || "nuestra plataforma";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Remitente y reply-to coherentes (dominio verificado en Resend)
const FROM = resolveFrom(); // p.ej. "EzCita <no-reply@tudominio.com>"
const REPLY_TO =
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_EMAIL ||
  FROM.match(/<([^>]+)>/)?.[1] ||
  FROM;

/**
 * Enviar email genérico (vía adaptador)
 */
export const sendEmail = async ({ to, subject, html }) => {
  return sendMail({
    from: FROM,
    to,
    subject,
    html,
    replyTo: REPLY_TO,
  });
};

/**
 * Email de confirmación de cuenta
 */
export const sendConfirmationEmail = async ({ name, email, token }) => {
  const year = new Date().getFullYear();
  const styles = `${commonStyles} ${confirmationStyles}`;

  // Usa FRONTEND_URL (no hardcodees localhost)
  const link = `${FRONTEND_URL}/verify?token=${encodeURIComponent(token)}`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>Verifica tu cuenta</h1></div>
      <div class="content">
        <h2 class="greeting">Hola, ${name || "usuario"} 👋</h2>
        <p class="message">
          Gracias por registrarte en <span class="app-name">${APP_NAME}</span>.
          Por favor utiliza el siguiente código para verificar tu cuenta:
        </p>
        <div class="code-container"><div class="code">${token}</div></div>
        <p class="message">
          O haz clic en el siguiente botón para completar la verificación (válido por 10 minutos):
        </p>
        <div class="button-container">
          <a href="${link}" class="button" style="color:#ffffff !important; text-decoration:none !important;">Verificar mi cuenta</a>
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <p>¿Ya tienes una cuenta? <a href="${FRONTEND_URL}/" style="color: #3a0ca3; font-weight: 600;">Inicia sesión</a></p>
        </div>
        <p class="note"><strong>Nota:</strong> Si no solicitaste crear una cuenta en ${APP_NAME}, puedes ignorar este mensaje con seguridad.</p>
      </div>
      <div class="footer">
        <p>© ${year} ${APP_NAME}. Todos los derechos reservados.</p>
        <p style="margin-top: 8px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    </div>
  </body>
  </html>`;

  return sendEmail({
    to: email,
    subject: `Verifica tu cuenta en ${APP_NAME}`,
    html,
  });
};

/**
 * Email de reseteo de contraseña
 */
export const sendPasswordResetEmail = async ({ name, email, token }) => {
  const year = new Date().getFullYear();
  const styles = `${commonStyles} ${resetStyles}`;

  // usa FRONTEND_URL (no hardcodees localhost)
  const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu contraseña</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>Restablece tu contraseña</h1></div>
      <div class="content">
        <h2 class="greeting">Hola, ${name || "usuario"} 👋</h2>
        <p class="message">
          Recibimos una solicitud para restablecer tu contraseña en 
          <span class="app-name">${APP_NAME}</span>. Por favor utiliza el siguiente código:
        </p>
        <div class="code-container"><div class="code">${token}</div></div>
        <p class="message">
          O haz clic en el siguiente botón para continuar con el proceso (válido por 10 minutos):
        </p>
        <div class="button-container">
          <a href="${link}" class="button">Restablecer contraseña</a>
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <p>¿Recuerdas tu contraseña? <a href="${FRONTEND_URL}/" style="color: #d90429; font-weight: 600;">Inicia sesión</a></p>
          <p style="margin-top: 8px;">¿No tienes cuenta? <a href="${FRONTEND_URL}/registration" style="color: #d90429; font-weight: 600;">Regístrate aquí</a></p>
        </div>
        <p class="note"><strong>Importante:</strong> Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje. Tu cuenta permanecerá segura.</p>
      </div>
      <div class="footer">
        <p>© ${year} ${APP_NAME}. Todos los derechos reservados.</p>
        <p style="margin-top: 8px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    </div>
  </body>
  </html>`;

  return sendEmail({
    to: email,
    subject: `Restablece tu contraseña en ${APP_NAME}`,
    html,
  });
};
