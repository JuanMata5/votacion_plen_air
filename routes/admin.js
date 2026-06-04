const express = require('express');
const multer = require('multer');
const Artwork = require('../models/artwork');
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

router.use(requireAdmin);

router.get('/pending', async (req, res) => {
  try {
    const artworks = await Artwork.aggregate([
      { $match: { status: 'pending' } },
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
      { $sort: { createdAt: -1 } },
    ]);

    res.json(
      artworks.map((artwork) => ({
        id: artwork._id,
        title: artwork.title,
        description: artwork.description,
        author: artwork.author,
        category: artwork.category,
        image_url: artwork.imageUrl,
        status: artwork.status,
        votes: artwork.votes,
        created_at: artwork.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo obtener obras pendientes.' });
  }
});

router.post('/approve', async (req, res) => {
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

router.post('/reject', async (req, res) => {
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

router.post('/upload', upload.single('image'), async (req, res) => {
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
            console.error(error);
            return res.status(500).json({ error: 'Error al subir la imagen.' });
          }
          await saveArtwork(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    } else {
      await saveArtwork(imageUrl);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo procesar la subida de la obra.' });
  }
});

router.get('/ranking', async (req, res) => {
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

module.exports = router;
