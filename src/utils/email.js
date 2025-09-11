// src/utils/email.js
import nodemailer from "nodemailer";

// Configurar el transportador de correo
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Plantillas de correo
const templates = {
  verification: (name, token) => ({
    subject: "Verifica tu cuenta",
    html: `
      <h1>¡Hola ${name}!</h1>
      <p>Gracias por registrarte en nuestro servicio. Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
      <a href="${process.env.NEXTAUTH_URL}/verify-email?token=${token}">
        Verificar cuenta
      </a>
      <p>Este enlace expirará en 24 horas.</p>
    `,
  }),
  passwordReset: (name, token) => ({
    subject: "Restablecer contraseña",
    html: `
      <h1>¡Hola ${name}!</h1>
      <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
      <a href="${process.env.NEXTAUTH_URL}/reset-password?token=${token}">
        Restablecer contraseña
      </a>
      <p>Este enlace expirará en 1 hora.</p>
    `,
  }),
};

// Función para enviar correos
export const sendEmail = async (to, name, type, token) => {
  const template = templates[type](name, token);

  const mailOptions = {
    from: `"Tu Empresa" <${process.env.EMAIL_USER}>`,
    to,
    subject: template.subject,
    html: template.html,
  };

  return transporter.sendMail(mailOptions);
};
