const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { listNotifications, markAllRead, markRead } = require('../controllers/notificationController');

router.get('/',            protect, listNotifications);
router.put('/read-all',    protect, markAllRead);
router.put('/:id/read',    protect, markRead);

module.exports = router;
