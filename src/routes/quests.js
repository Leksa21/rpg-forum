const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  getQuests, getQuest, createQuest, applyQuest,
  abandonQuest, completeQuest, getMyQuests,
} = require('../controllers/questController');

router.get('/',           getQuests);
router.get('/mine',       protect, getMyQuests);
router.get('/:id',        getQuest);

router.post('/',          protect, requireRole('admin', 'head_admin'), createQuest);
router.post('/:id/apply', protect, applyQuest);
router.post('/:id/abandon', protect, abandonQuest);
router.post('/:id/complete', protect, requireRole('admin', 'head_admin', 'moderator'), completeQuest);

module.exports = router;
