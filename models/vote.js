const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  visitorId: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

voteSchema.index({ artworkId: 1, visitorId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
