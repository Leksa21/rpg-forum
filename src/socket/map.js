const jwt       = require('jsonwebtoken');
const Character = require('../models/Character');

// socketId → { socketId, charId, name, class, mapX, mapY }
const connectedPlayers = new Map();
// pairKey → { charId1, charId2, socketId1, socketId2, action1, action2, timeout }
const activeEncounters = new Map();

const ENCOUNTER_RADIUS = 6; // map units (0-100 scale)

function pairKey(a, b) {
  return [a, b].sort().join('::');
}

function getSocketIdByCharId(charId) {
  for (const [, p] of connectedPlayers) {
    if (p.charId === charId) return p.socketId;
  }
  return null;
}

function resolveOutcome(myAction, theirAction) {
  if (myAction === 'flee')   return { type: 'fled',      message: 'Pobjegli ste!' };
  if (theirAction === 'flee') return { type: 'they_fled', message: 'Protivnik je pobjegao.' };
  if (myAction === 'greet'  && theirAction === 'greet')  return { type: 'friendly', message: 'Pozdravili ste se!' };
  if (myAction === 'attack' && theirAction === 'attack') return { type: 'clash',    message: 'Okršaj! Oboje napadate!' };
  if (myAction === 'attack' && theirAction === 'greet')  return { type: 'attacked', message: 'Napali ste iznenada!' };
  if (myAction === 'greet'  && theirAction === 'attack') return { type: 'ambushed', message: 'Napadnuti ste dok ste pozdravili!' };
  return { type: 'unknown', message: 'Susret je završen.' };
}

function resolveEncounter(mapNs, key) {
  const enc = activeEncounters.get(key);
  if (!enc) return;

  clearTimeout(enc.timeout);
  activeEncounters.delete(key);

  const a1 = enc.action1 || 'greet';
  const a2 = enc.action2 || 'greet';

  const sock1 = getSocketIdByCharId(enc.charId1) || enc.socketId1;
  const sock2 = getSocketIdByCharId(enc.charId2) || enc.socketId2;

  if (sock1) mapNs.to(sock1).emit('map:encounter:result', {
    outcome: resolveOutcome(a1, a2), myAction: a1, theirAction: a2,
  });
  if (sock2) mapNs.to(sock2).emit('map:encounter:result', {
    outcome: resolveOutcome(a2, a1), myAction: a2, theirAction: a1,
  });
}

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

  const broadcastInterval = setInterval(() => {
    if (connectedPlayers.size === 0) return;

    const positions = {};
    const players   = [];
    connectedPlayers.forEach((data) => {
      positions[data.charId] = {
        charId: data.charId,
        name:   data.name,
        class:  data.class,
        mapX:   data.mapX,
        mapY:   data.mapY,
      };
      players.push(data);
    });
    mapNs.emit('map:positions', positions);

    // Encounter proximity check
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j];
        const key = pairKey(a.charId, b.charId);
        if (activeEncounters.has(key)) continue;
        const dx = a.mapX - b.mapX, dy = a.mapY - b.mapY;
        if (Math.sqrt(dx * dx + dy * dy) < ENCOUNTER_RADIUS) {
          const timeout = setTimeout(() => resolveEncounter(mapNs, key), 30000);
          activeEncounters.set(key, {
            charId1: a.charId, charId2: b.charId,
            socketId1: a.socketId, socketId2: b.socketId,
            action1: null, action2: null,
            timeout,
          });
          mapNs.to(a.socketId).emit('map:encounter', {
            opponent: { charId: b.charId, name: b.name, class: b.class },
          });
          mapNs.to(b.socketId).emit('map:encounter', {
            opponent: { charId: a.charId, name: a.name, class: a.class },
          });
        }
      }
    }
  }, 2000);

  mapNs.on('connection', (socket) => {
    connectedPlayers.set(socket.id, {
      socketId: socket.id,
      charId:   socket.charId,
      name:     socket.charName,
      class:    socket.charClass,
      mapX:     50,
      mapY:     50,
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

    socket.on('map:encounter:respond', ({ action }) => {
      if (!['greet', 'flee', 'attack'].includes(action)) return;
      const charId = socket.charId;
      for (const [key, enc] of activeEncounters) {
        const isFirst  = enc.charId1 === charId;
        const isSecond = enc.charId2 === charId;
        if (!isFirst && !isSecond) continue;
        if (isFirst)  enc.action1 = action;
        else          enc.action2 = action;
        // Flee or both responded → resolve immediately
        if (action === 'flee' || (enc.action1 && enc.action2)) {
          resolveEncounter(mapNs, key);
        }
        return;
      }
    });

    socket.on('disconnect', () => {
      // Treat disconnect as flee for any active encounter
      const charId = socket.charId;
      for (const [key, enc] of activeEncounters) {
        if (enc.charId1 === charId || enc.charId2 === charId) {
          if (enc.charId1 === charId) enc.action1 = 'flee';
          else                        enc.action2 = 'flee';
          resolveEncounter(mapNs, key);
        }
      }
      connectedPlayers.delete(socket.id);
    });
  });

  process.on('exit', () => clearInterval(broadcastInterval));
};

module.exports = { setupMap, resolveOutcome };
