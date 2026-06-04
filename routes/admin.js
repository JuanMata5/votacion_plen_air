const express = require('express');
const Artwork = require('../models/artwork');
const router = express.Router();

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
