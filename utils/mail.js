const nodemailer = require('nodemailer');

const noEmailMode = process.env.NO_EMAIL_MODE === 'true' || process.env.USE_CONSOLE_EMAIL === 'true';
let transporter = null;

if (!noEmailMode) {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM;
  if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.warn('SMTP no está configurado correctamente. Usando modo sin email para códigos de verificación.');
  }
} else {
  console.warn('NO_EMAIL_MODE=true o USE_CONSOLE_EMAIL=true: se mostrarán códigos sin enviar emails.');
}

async function sendVerificationCode(email, code) {
  const message = {
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Código de verificación para subir obra',
    html: `
      <div style="font-family: Arial, sans-serif; color: #3c2a14;">
        <h2 style="color:#d5741a;">Código de verificación</h2>
        <p>Tu código es:</p>
        <p style="font-size: 1.4rem; font-weight: bold;">${code}</p>
        <p>Ingresa este código en el formulario para poder cargar tu obra al sistema.</p>
      </div>
    `,
  };

  if (!transporter) {
    console.log(`Código de verificación para ${email}: ${code}`);
    return;
  }

  await transporter.sendMail(message);
}

module.exports = { sendVerificationCode, noEmailMode };
