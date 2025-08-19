// src/emails/AuthEmail.js
import transporter from "../config/nodemailer.js";
import {
  commonStyles,
  confirmationStyles,
  resetStyles,
} from "./emailStyles.js";

/**
 * Enviar email genérico
 */
export const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: `"${process.env.APP_NAME || "Sistema"}" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject,
    html,
  });
  return info;
};

/**
 * Email de confirmación de cuenta con enlace corregido
 */
export const sendConfirmationEmail = async ({ name, email, token }) => {
  const appName = process.env.APP_NAME || "nuestra plataforma";
  const year = new Date().getFullYear();

  // Enlace de verificación corregido
  const link = `http://localhost:5173/verify?token=${token}`;

  const styles = `${commonStyles} ${confirmationStyles}`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta</title>
    <style>
      ${styles}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Verifica tu cuenta</h1>
      </div>
      
      <div class="content">
        <h2 class="greeting">Hola, ${name || "usuario"} 👋</h2>
        
        <p class="message">
          Gracias por registrarte en <span class="app-name">${appName}</span>. 
          Por favor utiliza el siguiente código para verificar tu cuenta:
        </p>
        
        <div class="code-container">
          <div class="code">${token}</div>
        </div>
        
        <p class="message">
          O haz clic en el siguiente botón para completar la verificación (válido por 10 minutos):
        </p>
        
        <div class="button-container">
          <a href="${link}" class="button">Verificar mi cuenta</a>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p>¿Ya tienes una cuenta? <a href="http://localhost:5173/" style="color: #3a0ca3; font-weight: 600;">Inicia sesión</a></p>
        </div>
        
        <p class="note">
          <strong>Nota:</strong> Si no solicitaste crear una cuenta en ${appName}, 
          puedes ignorar este mensaje con seguridad.
        </p>
      </div>
      
      <div class="footer">
        <p>© ${year} ${appName}. Todos los derechos reservados.</p>
        <p style="margin-top: 8px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    </div>
  </body>
  </html>`;

  return sendEmail({
    to: email,
    subject: `Verifica tu cuenta en ${appName}`,
    html,
  });
};

/**
 * Email de reseteo de contraseña con enlaces corregidos
 */
export const sendPasswordResetEmail = async ({ name, email, token }) => {
  const appName = process.env.APP_NAME || "nuestra plataforma";
  const year = new Date().getFullYear();

  // Enlace de restablecimiento corregido
  const link = `http://localhost:5173/reset-password?token=${token}`;

  const styles = `${commonStyles} ${resetStyles}`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu contraseña</title>
    <style>
      ${styles}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Restablece tu contraseña</h1>
      </div>
      
      <div class="content">
        <h2 class="greeting">Hola, ${name || "usuario"} 👋</h2>
        
        <p class="message">
          Recibimos una solicitud para restablecer tu contraseña en 
          <span class="app-name">${appName}</span>. 
          Por favor utiliza el siguiente código:
        </p>
        
        <div class="code-container">
          <div class="code">${token}</div>
        </div>
        
        <p class="message">
          O haz clic en el siguiente botón para continuar con el proceso (válido por 10 minutos):
        </p>
        
        <div class="button-container">
          <a href="${link}" class="button">Restablecer contraseña</a>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p>¿Recuerdas tu contraseña? <a href="http://localhost:5173/" style="color: #d90429; font-weight: 600;">Inicia sesión</a></p>
          <p style="margin-top: 8px;">¿No tienes cuenta? <a href="http://localhost:5173/registration" style="color: #d90429; font-weight: 600;">Regístrate aquí</a></p>
        </div>
        
        <p class="note">
          <strong>Importante:</strong> Si no solicitaste restablecer tu contraseña, 
          por favor ignora este mensaje. Tu cuenta permanecerá segura.
        </p>
      </div>
      
      <div class="footer">
        <p>© ${year} ${appName}. Todos los derechos reservados.</p>
        <p style="margin-top: 8px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    </div>
  </body>
  </html>`;

  return sendEmail({
    to: email,
    subject: `Restablece tu contraseña en ${appName}`,
    html,
  });
};
