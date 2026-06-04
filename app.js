require('dotenv').config();
require('./db');
const express = require('express');
const cors = require('cors');
const path = require('path');
const artworksRouter = require('./routes/artworks');
const votesRouter = require('./routes/votes');
const submissionsRouter = require('./routes/submissions');
const adminRouter = require('./routes/admin');
const votersRouter = require('./routes/voters');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/artworks', artworksRouter);
app.use('/api/votes', votesRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/voters', votersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
