const jwt       = require('jsonwebtoken');
const Character = require('../models/Character');

// In-memory store: socketId → { charId, name, class, mapX, mapY }
const connectedPlayers = new Map();

const setupMap = (io) => {
  const mapNs = io.of('/map');

  mapNs.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Auth required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const char = await Character.findOne({ owner: decoded.id, isSetup: true, isDead: false })
        .select('name class _id');
      if (!char) return next(new Error('No character'));
      socket.charId    = char._id.toString();
      socket.charName  = char.name;
      socket.charClass = char.class;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Broadcast all positions to all clients every 2 seconds
  const broadcastInterval = setInterval(() => {
    if (connectedPlayers.size === 0) return;
    const positions = {};
    connectedPlayers.forEach((data) => {
      positions[data.charId] = {
        charId: data.charId,
        name:   data.name,
        class:  data.class,
        mapX:   data.mapX,
        mapY:   data.mapY,
      };
    });
    mapNs.emit('map:positions', positions);
  }, 2000);

  mapNs.on('connection', (socket) => {
    connectedPlayers.set(socket.id, {
      charId: socket.charId,
      name:   socket.charName,
      class:  socket.charClass,
      mapX:   50,
      mapY:   50,
    });

    socket.on('map:position', (data) => {
      if (!data || typeof data.mapX !== 'number' || typeof data.mapY !== 'number') return;
      const current = connectedPlayers.get(socket.id);
      if (!current) return;
      connectedPlayers.set(socket.id, {
        ...current,
        mapX: Math.min(100, Math.max(0, data.mapX)),
        mapY: Math.min(100, Math.max(0, data.mapY)),
      });
    });

    socket.on('disconnect', () => {
      connectedPlayers.delete(socket.id);
    });
  });

  process.on('exit', () => clearInterval(broadcastInterval));
};

module.exports = { setupMap };
