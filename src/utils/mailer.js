// src/utils/mailer.js
const nodemailer = require('nodemailer');

// Si hay credenciales SMTP configuradas en .env se envía el correo real.
// Si no (por ejemplo en desarrollo local), el enlace se muestra en consola
// para poder probar el flujo de recuperación sin necesitar un correo real.
function crearTransportador() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function enviarCorreoRecuperacion(destinatario, enlaceReset) {
  const transportador = crearTransportador();

  if (!transportador) {
    console.log('--- MODO DESARROLLO: no hay SMTP configurado ---');
    console.log(`Enlace de recuperación para ${destinatario}: ${enlaceReset}`);
    return;
  }

  await transportador.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: destinatario,
    subject: 'SecureStock - Recuperación de contraseña',
    html: `
      <p>Solicitaste recuperar tu contraseña en SecureStock.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):</p>
      <p><a href="${enlaceReset}">${enlaceReset}</a></p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `
  });
}

module.exports = { enviarCorreoRecuperacion };
