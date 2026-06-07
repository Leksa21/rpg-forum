const User = require('../models/User');
const Character = require('../models/Character');

const ROLE_RANK = { member: 0, moderator: 1, admin: 2, head_admin: 3 };

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = search
      ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    const usersWithChars = await Promise.all(users.map(async u => {
      const [activeChar, deadCount] = await Promise.all([
        Character.findOne({ owner: u._id, isDead: false }).select('name class race level avatar'),
        Character.countDocuments({ owner: u._id, isDead: true }),
      ]);
      return { ...u.toObject(), activeCharacter: activeChar, deadCharacterCount: deadCount };
    }));

    res.json({ success: true, data: usersWithChars, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['member', 'moderator', 'admin', 'head_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const callerRank = ROLE_RANK[req.userRole] ?? 0;
    const targetRank = ROLE_RANK[role] ?? 0;

    if (callerRank <= targetRank && req.userRole !== 'head_admin') {
      return res.status(403).json({ success: false, error: 'Cannot assign a role equal to or above your own' });
    }

    const target = await User.findById(req.params.id).select('-password');
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });
    if (target._id.toString() === req.userId) {
      return res.status(403).json({ success: false, error: 'Cannot change your own role' });
    }
    if (target.role === 'head_admin' && req.userRole !== 'head_admin') {
      return res.status(403).json({ success: false, error: 'Cannot modify a head admin' });
    }

    target.role = role;
    await target.save();
    res.json({ success: true, data: target });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const toggleBan = async (req, res) => {
  try {
    const target = await User.findById(req.params.id).select('-password');
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });
    if (target._id.toString() === req.userId) {
      return res.status(403).json({ success: false, error: 'Cannot ban yourself' });
    }
    if (target.role === 'head_admin') {
      return res.status(403).json({ success: false, error: 'Cannot ban a head admin' });
    }

    target.isActive = !target.isActive;
    await target.save();
    res.json({ success: true, data: target });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getUsers, updateUserRole, toggleBan };
