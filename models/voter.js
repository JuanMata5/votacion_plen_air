const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Voter', voterSchema);
