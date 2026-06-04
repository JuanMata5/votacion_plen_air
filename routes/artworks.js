const express = require('express');
const Artwork = require('../models/artwork');
const Vote = require('../models/vote');
const router = express.Router();

router.get('/', async (req, res) => {
  const { category, artist, search, visitorId, status } = req.query;
  const match = {};

  if (!status || status === 'approved') {
    match.status = 'approved';
  } else if (status !== 'all') {
    match.status = status;
  }

  if (category) {
    match.category = new RegExp(`^${category}$`, 'i');
  }

  if (artist) {
    match.author = new RegExp(artist, 'i');
  }

  if (search) {
    match.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }

  const pipeline = [
    { $match: match },
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
  ];

  if (visitorId) {
    pipeline.push({
      $lookup: {
        from: 'votes',
        let: { artworkId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$artworkId', '$$artworkId'] },
                  { $eq: ['$visitorId', visitorId] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'visitorVote',
      },
    });
    pipeline.push({
      $addFields: { voted: { $gt: [{ $size: '$visitorVote' }, 0] } },
    });
  } else {
    pipeline.push({ $addFields: { voted: false } });
  }

  pipeline.push({ $project: { voteCount: 0, visitorVote: 0 } });
  pipeline.push({ $sort: { votes: -1, createdAt: -1 } });

  try {
    const artworks = await Artwork.aggregate(pipeline);
    res.json(
      artworks.map((artwork) => ({
        id: artwork._id,
        title: artwork.title,
        description: artwork.description,
        author: artwork.author,
        category: artwork.category,
        image_url: artwork.imageUrl,
        status: artwork.status,
        created_at: artwork.createdAt,
        votes: artwork.votes,
        voted: artwork.voted || false,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo obtener las obras.' });
  }
});

module.exports = router;
