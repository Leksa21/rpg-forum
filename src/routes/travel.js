const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { startTravel, getActiveTravel, cancelTravel, getTravelHistory } = require('../controllers/travelController');

router.post('/',         protect, startTravel);
router.get('/active',    protect, getActiveTravel);
router.delete('/cancel', protect, cancelTravel);
router.get('/history',   protect, getTravelHistory);

module.exports = router;
