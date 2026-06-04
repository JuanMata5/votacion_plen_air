const express = require('express');
const Voter = require('../models/voter');
const router = express.Router();

router.post('/', async (req, res) => {
  const { visitorId, email } = req.body;
  if (!visitorId || !email) {
    return res.status(400).json({ error: 'Faltan visitorId o email.' });
  }

  try {
    await Voter.findOneAndUpdate(
      { visitorId },
      { email: email.toLowerCase().trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: 'Correo guardado para votar.' });
  } catch (error) {
    console.error('voter save error', error);
    res.status(500).json({ error: 'No se pudo guardar el correo.' });
  }
});

module.exports = router;
