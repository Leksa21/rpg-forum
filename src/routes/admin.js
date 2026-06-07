const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { getUsers, updateUserRole, toggleBan } = require('../controllers/adminController');

const canManage = requireRole('moderator', 'admin', 'head_admin');
const canChangeRoles = requireRole('admin', 'head_admin');

router.get('/users',              protect, canManage,     getUsers);
router.put('/users/:id/role',    protect, canChangeRoles, updateUserRole);
router.put('/users/:id/ban',     protect, canManage,      toggleBan);

module.exports = router;
