const mongoose = require('mongoose');

const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/art_gallery';
if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI no definido. Se usará mongodb://127.0.0.1:27017/art_gallery.');
}

mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB error:', err));
db.once('open', () => console.log('Conectado a MongoDB'));

module.exports = mongoose;
