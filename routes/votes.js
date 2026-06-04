const express = require('express');
const Artwork = require('../models/artwork');
const Vote = require('../models/vote');
const router = express.Router();

router.post('/', async (req, res) => {
  const { artwork_id, visitor_id, email } = req.body;

  if (!artwork_id || !visitor_id || !email) {
    return res.status(400).json({ error: 'Faltan artwork_id, visitor_id o email.' });
  }

  try {
    const artwork = await Artwork.findById(artwork_id);
    if (!artwork || artwork.status !== 'approved') {
      return res.status(404).json({ error: 'Obra no disponible para votar.' });
    }

    const vote = new Vote({ artworkId: artwork_id, visitorId: visitor_id, email: email.toLowerCase().trim() });
    await vote.save();

    res.json({ success: true, voteId: vote._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya votaste por esta obra.' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar el voto.' });
  }
});

router.get('/status', async (req, res) => {
  const { artworkId, visitorId } = req.query;
  if (!artworkId || !visitorId) {
    return res.status(400).json({ error: 'Faltan artworkId o visitorId.' });
  }

  try {
    const vote = await Vote.findOne({ artworkId, visitorId });
    res.json({ voted: Boolean(vote) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo verificar el estado del voto.' });
  }
});

module.exports = router;
