require('dotenv').config();
require('../db');
const Artwork = require('../models/artwork');

async function run() {
  const artworks = [
    {
      title: 'Luz del Atardecer',
      description: 'Un momento cálido capturado con colores suaves y vibrantes.',
      author: 'María Rivera',
      category: 'Pintura',
      imageUrl: 'https://images.unsplash.com/photo-1526201451341-2a3e63aa6c90?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
    },
    {
      title: 'Siluetas Urbanas',
      description: 'Una exploración de formas y sombras en la ciudad moderna.',
      author: 'Diego Soto',
      category: 'Fotografía',
      imageUrl: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
    },
  ];

  await Artwork.insertMany(artworks);
  console.log('Seeder completado: se agregaron obras de ejemplo.');
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
