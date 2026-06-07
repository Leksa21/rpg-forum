const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyCharacter,
  getAllMyCharacters,
  createCharacter,
  setupCharacter,
  updateBackstory,
} = require('../controllers/characterController');

router.get('/all',       protect, getAllMyCharacters);
router.get('/me',        protect, getMyCharacter);
router.post('/',         protect, createCharacter);
router.put('/setup',     protect, setupCharacter);
router.put('/backstory', protect, updateBackstory);

module.exports = router;
