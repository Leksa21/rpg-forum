const express = require('express');
const router  = express.Router();

const authRouter      = require('./auth');
const characterRouter = require('./characters');
const postRouter      = require('./posts');
const questRouter     = require('./quests');
const travelRouter    = require('./travel');
const worldRouter     = require('./world');

router.use('/api/auth',       authRouter);
router.use('/api/characters', characterRouter);
router.use('/api/posts',      postRouter);
router.use('/api/quests',     questRouter);
router.use('/api/travel',     travelRouter);
router.use('/api/world',      worldRouter);

router.get('/api', (req, res) => {
  res.json({ success: true, data: 'RPG Forum API v1' });
});

module.exports = router;
