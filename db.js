const mongoose = require('mongoose');

const url = process.env.MONGODB_URI || (process.env.VERCEL ? null : 'mongodb://127.0.0.1:27017/art_gallery');
if (!url) {
  const message = 'MONGODB_URI no está definido. Define esta variable de entorno antes de desplegar en Vercel.';
  console.error(message);
  throw new Error(message);
}

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // aumentar el timeout de selección de servidor para evitar fallos rápidos en redes lentas
  serverSelectionTimeoutMS: process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ? parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10) : 30000,
  // habilitar retryWrites si el cluster lo soporta
  retryWrites: true,
};

console.log('Conectando a MongoDB...');
mongoose.connect(url, connectOptions).catch((err) => {
  // capture initial connection errors for clearer logs
  console.error('Error inicial al conectar a MongoDB:', err && err.message ? err.message : err);
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err && err.message ? err.message : err));
db.once('open', () => console.log('Conectado a MongoDB'));

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB por SIGINT');
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});

module.exports = mongoose;
