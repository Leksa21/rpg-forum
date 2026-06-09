const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyCharacter,
  getAllMyCharacters,
  createCharacter,
  setupCharacter,
  updateBackstory,
  updateProfile,
  getPublicCharacter,
  discoverLocation,
} = require('../controllers/characterController');

router.get('/all',       protect, getAllMyCharacters);
router.get('/me',        protect, getMyCharacter);
router.post('/',         protect, createCharacter);
router.put('/setup',     protect, setupCharacter);
router.put('/backstory', protect, updateBackstory);
router.put('/profile',   protect, updateProfile);
router.post('/discover', protect, discoverLocation);
router.get('/:id',                getPublicCharacter);

module.exports = router;
