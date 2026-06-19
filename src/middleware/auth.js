const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    const user = await User.findById(decoded.id).select('role');
    req.userRole = user?.role || 'member';

    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token invalid or expired' });
  }
};

// Optional auth: if a valid token is present, populate req.userId/req.userRole;
// otherwise continue as an anonymous request. Never blocks. Use on endpoints
// that are public but behave differently when the caller is known (e.g.
// presence-gated forum reads).
const attachUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      const user = await User.findById(decoded.id).select('role');
      req.userRole = user?.role || 'member';
    } catch {
      // Invalid or expired token → fall through as anonymous.
    }
  }

  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { protect, attachUser, requireRole };
