const mongoose = require('mongoose');

const url = process.env.MONGODB_URI || (process.env.VERCEL ? null : 'mongodb://127.0.0.1:27017/art_gallery');
if (!url) {
  const message = 'MONGODB_URI no está definido. Define esta variable de entorno antes de desplegar en Vercel.';
  console.error(message);
  throw new Error(message);
}

mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB error:', err));
db.once('open', () => console.log('Conectado a MongoDB'));

module.exports = mongoose;
