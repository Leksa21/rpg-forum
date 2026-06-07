const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const Character   = require('../models/Character');
const ChatMessage = require('../models/ChatMessage');

const MAX_HISTORY = 100;

const setupChat = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username');
      if (!user) return next(new Error('User not found'));

      const character = await Character.findOne({ owner: decoded.id, isSetup: true, isDead: false })
        .select('name avatar class race level');

      socket.userId    = decoded.id;
      socket.username  = user.username;
      socket.character = character;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const history = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY)
      .lean();

    socket.emit('chat:history', history.reverse().map(m => ({
      id:        m._id.toString(),
      text:      m.text,
      username:  m.username,
      character: m.character,
      at:        m.createdAt,
    })));

    io.emit('chat:system', {
      text: `${socket.character?.name || socket.username} has entered the realm.`,
      at:   new Date(),
    });

    socket.on('chat:message', async (text) => {
      if (!text || typeof text !== 'string') return;
      const trimmed = text.trim().slice(0, 500);
      if (!trimmed) return;

      const doc = await ChatMessage.create({
        text:      trimmed,
        username:  socket.username,
        character: socket.character
          ? { name: socket.character.name, avatar: socket.character.avatar, class: socket.character.class }
          : undefined,
      });

      io.emit('chat:message', {
        id:        doc._id.toString(),
        text:      doc.text,
        username:  doc.username,
        character: doc.character,
        at:        doc.createdAt,
      });
    });

    socket.on('disconnect', () => {
      io.emit('chat:system', {
        text: `${socket.character?.name || socket.username} has left the realm.`,
        at:   new Date(),
      });
    });
  });
};

module.exports = { setupChat };
