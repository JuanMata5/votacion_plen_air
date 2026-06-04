const express = require('express');
const multer = require('multer');
const Artwork = require('../models/artwork');
const SubmissionVerification = require('../models/submissionVerification');
const cloudinary = require('../utils/cloudinary');
const { sendVerificationCode, noEmailMode } = require('../utils/mail');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function buildCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/request-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const code = buildCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  try {
    await SubmissionVerification.findOneAndUpdate(
      { email },
      { code, expiresAt, verified: false, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendVerificationCode(email, code);
    res.json({
      success: true,
      message: noEmailMode
        ? 'Código generado en modo sin email. Copia el código y úsalo en el siguiente paso.'
        : 'Código enviado al correo.',
      code: noEmailMode ? code : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo enviar el código.' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email y código son obligatorios.' });
  }

  try {
    const verification = await SubmissionVerification.findOne({ email, code });
    if (!verification) {
      return res.status(400).json({ error: 'Código inválido.' });
    }

    if (verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'El código expiró.' });
    }

    verification.verified = true;
    await verification.save();
    res.json({ success: true, message: 'Código verificado. Ya puede subir la obra.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo verificar el código.' });
  }
});

router.post('/upload', upload.single('image'), async (req, res) => {
  const { title, description, category, author, email, code } = req.body;
  const file = req.file;

  if (!title || !description || !category || !author || !email || !code || !file) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  try {
    const verification = await SubmissionVerification.findOne({ email, code });
    if (!verification || verification.expiresAt < new Date() || !verification.verified) {
      return res.status(400).json({ error: 'Código no válido o expirado.' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'convention-artworks', resource_type: 'image' },
      async (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ error: 'Error al subir la imagen.' });
        }

        await Artwork.create({
          title,
          description,
          author,
          category,
          imageUrl: result.secure_url,
          status: 'pending',
        });

        res.json({ success: true, message: 'Obra enviada para aprobación.' });
      }
    );

    uploadStream.end(file.buffer);
  } catch (error) {
    console.error('submission upload error', error);
    res.status(500).json({
      error: 'No se pudo procesar la carga.',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

module.exports = router;
