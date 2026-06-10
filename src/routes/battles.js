const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  challengePlayer,
  respondToChallenge,
  getBattle,
  getActiveBattles,
  moveUnit,
  basicAttack,
  endTurn,
  surrender,
  submitTurn,
} = require('../controllers/battleController');

router.get('/active',              protect, getActiveBattles);
router.post('/challenge',          protect, challengePlayer);
router.get('/:id',                 protect, getBattle);
router.post('/:id/respond',        protect, respondToChallenge);
router.post('/:id/move',           protect, moveUnit);
router.post('/:id/attack',         protect, basicAttack);
router.post('/:id/end-turn',       protect, endTurn);
router.post('/:id/surrender',      protect, surrender);
router.post('/:id/submit-turn',    protect, submitTurn);

module.exports = router;
