const express = require('express');
const multer = require('multer');
const Artwork = require('../models/artwork');
const mongoose = require('../db');
const cloudinary = require('../utils/cloudinary');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Acceso administrativo denegado.' });
  }
  next();
}

// Nota: no aplicamos requireAdmin globalmente para permitir una ruta de diagnóstico pública
// Aplicaremos `requireAdmin` sólo en las rutas que requieren control.

router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const artworks = await Artwork.find({ status: 'pending' }).sort({ createdAt: -1 });

    res.json(
      artworks.map((artwork) => ({
        id: artwork._id,
        title: artwork.title,
        description: artwork.description,
        author: artwork.author,
        category: artwork.category,
        image_url: artwork.imageUrl,
        status: artwork.status,
        votes: 0,
        created_at: artwork.createdAt,
      }))
    );
  } catch (error) {
    console.error('admin pending error', error);
    res.status(500).json({
      error: 'No se pudo obtener obras pendientes.',
      details: error.message,
    });
  }
});

// Ruta que devuelve el estado de conexión a la DB (diagnóstico)
router.get('/status', (req, res) => {
  try {
    const readyState = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const rawUri = process.env.MONGODB_URI || null;
    const masked = rawUri ? `${rawUri.slice(0, 12)}...****` : null;
    res.json({ success: true, readyState, mongodbUriPresent: !!rawUri, mongodbUriMasked: masked });
  } catch (error) {
    console.error('admin status error', error);
    res.status(500).json({ error: 'No se pudo obtener el estado de la DB', details: error.message });
  }
});

router.post('/approve', requireAdmin, async (req, res) => {
  const { artworkId } = req.body;
  if (!artworkId) {
    return res.status(400).json({ error: 'Falta artworkId.' });
  }

  try {
    await Artwork.findByIdAndUpdate(artworkId, { status: 'approved', approvedAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo aprobar la obra.' });
  }
});

router.post('/reject', requireAdmin, async (req, res) => {
  const { artworkId } = req.body;
  if (!artworkId) {
    return res.status(400).json({ error: 'Falta artworkId.' });
  }

  try {
    await Artwork.findByIdAndUpdate(artworkId, { status: 'rejected' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo rechazar la obra.' });
  }
});

router.post('/delete', requireAdmin, async (req, res) => {
  const { artworkId } = req.body;
  if (!artworkId) {
    return res.status(400).json({ error: 'Falta artworkId.' });
  }

  try {
    await Artwork.findByIdAndDelete(artworkId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo eliminar la obra.' });
  }
});

router.post('/upload', requireAdmin, upload.single('image'), async (req, res) => {
  const {
    title,
    description,
    category,
    authorFirstName,
    authorLastName,
    year,
    medium,
    imageUrl,
  } = req.body;
  const file = req.file;

  if (!title || !description || !category || !authorFirstName || !authorLastName) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para la obra.' });
  }

  if (!file && !imageUrl) {
    return res.status(400).json({ error: 'Debes subir una imagen o proporcionar una URL de imagen.' });
  }

  try {
    const saveArtwork = async (finalImageUrl) => {
      await Artwork.create({
        title,
        description,
        author: `${authorFirstName} ${authorLastName}`,
        authorFirstName,
        authorLastName,
        category,
        year,
        medium,
        imageUrl: finalImageUrl,
        status: 'approved',
        approvedAt: new Date(),
      });
      res.json({ success: true, message: 'Obra subida y aprobada.' });
    };

    if (file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'convention-artworks', resource_type: 'image' },
        async (error, result) => {
          if (error) {
            console.error('cloudinary upload error', error);
            return res.status(500).json({
              error: 'Error al subir la imagen.',
              details: error.message,
            });
          }

          try {
            await saveArtwork(result.secure_url);
          } catch (callbackError) {
            console.error('saveArtwork callback error', callbackError);
            res.status(500).json({
              error: 'No se pudo guardar la obra después de subir la imagen.',
              details: callbackError.message,
            });
          }
        }
      );
      uploadStream.end(file.buffer);
    } else {
      await saveArtwork(imageUrl);
    }
  } catch (error) {
    console.error('admin upload error', error);
    res.status(500).json({
      error: 'No se pudo procesar la subida de la obra.',
      details: error.message,
    });
  }
});

router.get('/ranking', requireAdmin, async (req, res) => {
  try {
    const artworks = await Artwork.aggregate([
      { $match: { status: 'approved' } },
      {
        $lookup: {
          from: 'votes',
          let: { artworkId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$artworkId', '$$artworkId'] } } },
            { $count: 'count' },
          ],
          as: 'voteCount',
        },
      },
      {
        $addFields: {
          votes: { $ifNull: [{ $arrayElemAt: ['$voteCount.count', 0] }, 0] },
        },
      },
      { $project: { voteCount: 0 } },
      { $sort: { votes: -1, createdAt: -1 } },
      { $limit: 20 },
    ]);

    res.json(
      artworks.map((artwork) => ({
        id: artwork._id,
        title: artwork.title,
        author: artwork.author,
        category: artwork.category,
        image_url: artwork.imageUrl,
        votes: artwork.votes,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo obtener el ranking.' });
  }
});

// Ruta de diagnóstico: intenta crear una obra de prueba y devuelve el error si ocurre
router.post('/test-create', requireAdmin, async (req, res) => {
  try {
    const sample = {
      title: req.body.title || 'TEST-ARTWORK',
      description: req.body.description || 'Prueba de creación de obra',
      author: req.body.author || 'Admin Test',
      category: req.body.category || 'Pintura',
      imageUrl: req.body.imageUrl || 'https://via.placeholder.com/800x600.png?text=test',
      status: 'approved',
      approvedAt: new Date(),
    };

    const created = await Artwork.create(sample);
    res.json({ success: true, artworkId: created._id, sample });
  } catch (error) {
    console.error('admin test-create error', error);
    const readyState = mongoose.connection && mongoose.connection.readyState;
    res.status(500).json({ error: 'No se pudo crear la obra de prueba.', details: error.message, mongooseState: readyState });
  }
});

module.exports = router;
