const Battle                        = require('../models/Battle');
const Character                     = require('../models/Character');
const { Types }                     = require('mongoose');
const { BASE_MANA, BASE_ENERGY }    = require('../data/classResources');
const { CLASS_SPELLS, getSpell }    = require('../data/spells');
const spellEngineLib                = require('../services/spellEngine');
const { settleBattle, isInjured }   = require('../services/progression');

// Thin wrapper so submitTurn can call spellEngine.getSpellById consistently
const spellEngine = {
  ...spellEngineLib,
  getSpellById: getSpell,
};

const BASE_HP = {
  Warrior: 120, Paladin: 110, Ranger: 90,  Rogue: 80,
  Mage: 70, Necromancer: 75, Druid: 85, Bard: 80,
};

const PRIMARY_STAT = {
  Warrior: 'strength',     Paladin: 'strength',
  Ranger:  'dexterity',   Rogue:   'dexterity',
  Mage:    'intelligence', Necromancer: 'intelligence',
  Druid:   'wisdom',       Bard:    'charisma',
};

const CHAR_SELECT = 'name avatar class race level stats';

function calcMaxHp(char) {
  return (BASE_HP[char.class] || 80) + (char.level - 1) * 10;
}

function calcMaxMana(char) {
  return (BASE_MANA[char.class] || 0) + (char.level - 1) * 2;
}

function calcMaxEnergy(char) {
  return (BASE_ENERGY[char.class] || 20) + (char.level - 1);
}

function calcDamage(char) {
  const statName = PRIMARY_STAT[char.class] || 'strength';
  const statVal  = char.stats?.[statName] || 10;
  return Math.floor(statVal / 4) + Math.floor(Math.random() * 6) + 1;
}

// Offset even-r hex distance via cube coordinates
function hexDistance(a, b) {
  const ax = a.q - (a.r - (a.r & 1)) / 2;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q - (b.r - (b.r & 1)) / 2;
  const bz = b.r;
  const by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}

function populatedBattle(id) {
  return Battle.findById(id).populate([
    { path: 'units.character', select: CHAR_SELECT },
    { path: 'currentTurn',     select: '_id name avatar' },
    { path: 'winner',          select: '_id name avatar' },
    { path: 'lastTurnActor',   select: '_id name avatar' },
  ]);
}

async function handleTimeout(battle) {
  if (battle.status !== 'active' || !battle.turnDeadline) return false;
  if (new Date() < battle.turnDeadline) return false;

  const current = battle.units.find(u => u.character.equals(battle.currentTurn));
  const other   = battle.units.find(u => !u.character.equals(battle.currentTurn));
  if (!current || !other) return false;

  battle.status = 'completed';
  battle.winner = other.character;
  battle.log.push({
    turn:    battle.turnNumber,
    actor:   current.character,
    action:  'timeout_forfeit',
    message: `${current.name} ran out of time — forfeited!`,
    timestamp: new Date(),
  });
  await settleBattle(battle);
  await battle.save();
  return true;
}

// POST /api/battles/challenge
const challengePlayer = async (req, res) => {
  try {
    const { targetCharacterId } = req.body;
    if (!targetCharacterId) {
      return res.status(400).json({ success: false, error: 'targetCharacterId required' });
    }

    const challenger = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!challenger) return res.status(400).json({ success: false, error: 'No active character' });

    if (isInjured(challenger)) {
      return res.status(400).json({ success: false, error: 'You are too injured to fight — rest and recover first' });
    }

    const target = await Character.findById(targetCharacterId);
    if (!target) return res.status(404).json({ success: false, error: 'Target character not found' });
    if (target.isDead) return res.status(400).json({ success: false, error: 'Target character is dead' });
    if (isInjured(target)) {
      return res.status(400).json({ success: false, error: 'Target character is injured and recovering' });
    }
    if (String(target.owner) === String(req.userId)) {
      return res.status(400).json({ success: false, error: 'Cannot challenge yourself' });
    }

    const existing = await Battle.findOne({
      'units.character': { $in: [challenger._id, target._id] },
      status: { $in: ['pending', 'active'] },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'One of these characters is already in a battle' });
    }

    const challengerHp     = calcMaxHp(challenger);
    const challengerMana   = calcMaxMana(challenger);
    const challengerEnergy = calcMaxEnergy(challenger);
    const targetHp         = calcMaxHp(target);
    const targetMana       = calcMaxMana(target);
    const targetEnergy     = calcMaxEnergy(target);

    const battle = await Battle.create({
      triggerType: 'challenge',
      units: [
        {
          character:   challenger._id,
          user:        req.userId,
          side:        'attacker',
          name:        challenger.name,
          avatar:      challenger.avatar,
          position:    { q: 3, r: 14 },
          hp:          challengerHp,
          maxHp:       challengerHp,
          ap:          6,
          mana:        challengerMana,
          maxMana:     challengerMana,
          energy:      challengerEnergy,
          maxEnergy:   challengerEnergy,
          knownSpells: CLASS_SPELLS[challenger.class] || [],
        },
        {
          character:   target._id,
          user:        target.owner,
          side:        'defender',
          name:        target.name,
          avatar:      target.avatar,
          position:    { q: 26, r: 14 },
          hp:          targetHp,
          maxHp:       targetHp,
          ap:          6,
          mana:        targetMana,
          maxMana:     targetMana,
          energy:      targetEnergy,
          maxEnergy:   targetEnergy,
          knownSpells: CLASS_SPELLS[target.class] || [],
        },
      ],
    });

    const populated = await populatedBattle(battle._id);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/respond
const respondToChallenge = async (req, res) => {
  try {
    const { accept } = req.body;
    if (typeof accept !== 'boolean') {
      return res.status(400).json({ success: false, error: 'accept (boolean) required' });
    }

    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Battle is not pending' });
    }

    const defUnit = battle.units.find(u => String(u.user) === String(req.userId) && u.side === 'defender');
    if (!defUnit) return res.status(403).json({ success: false, error: 'Not the defender in this battle' });

    if (!accept) {
      battle.status = 'declined';
      await battle.save();
      const populated = await populatedBattle(battle._id);
      return res.json({ success: true, data: populated });
    }

    const atkUnit = battle.units.find(u => u.side === 'attacker');
    battle.status       = 'active';
    battle.currentTurn  = atkUnit.character;
    battle.turnDeadline = new Date(Date.now() + battle.turnDeadlineHours * 3600 * 1000);
    battle.log.push({
      turn:    1,
      actor:   atkUnit.character,
      action:  'battle_start',
      message: 'Battle has begun!',
      timestamp: new Date(),
    });

    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/battles/active
const getActiveBattles = async (req, res) => {
  try {
    const battles = await Battle.find({
      'units.user': new Types.ObjectId(req.userId),
      status: { $in: ['pending', 'active'] },
    })
      .populate('units.character', 'name avatar class race level')
      .populate('currentTurn', 'name')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: battles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/battles/:id
const getBattle = async (req, res) => {
  try {
    let battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });

    await handleTimeout(battle);

    const populated = await populatedBattle(req.params.id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/move
const moveUnit = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || typeof to.q !== 'number' || typeof to.r !== 'number') {
      return res.status(400).json({ success: false, error: 'Target position { q, r } required' });
    }

    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ success: false, error: 'Battle is not active' });

    const myUnit = battle.units.find(u => String(u.user) === String(req.userId));
    if (!myUnit) return res.status(403).json({ success: false, error: 'Not a participant' });
    if (!myUnit.character.equals(battle.currentTurn)) {
      return res.status(400).json({ success: false, error: 'Not your turn' });
    }

    if (to.q < 0 || to.q >= battle.gridWidth || to.r < 0 || to.r >= battle.gridHeight) {
      return res.status(400).json({ success: false, error: 'Position out of grid bounds' });
    }

    const occupied = battle.units.some(u => u.position.q === to.q && u.position.r === to.r);
    if (occupied) return res.status(400).json({ success: false, error: 'Hex is occupied' });

    const dist = hexDistance(myUnit.position, to);
    if (dist === 0) return res.status(400).json({ success: false, error: 'Already at that position' });
    if (dist > myUnit.ap) return res.status(400).json({ success: false, error: 'Not enough AP' });

    const from = { q: myUnit.position.q, r: myUnit.position.r };
    myUnit.position = to;
    myUnit.ap -= dist;

    battle.log.push({
      turn:    battle.turnNumber,
      actor:   myUnit.character,
      action:  'move',
      from,
      to,
      message: `${myUnit.name} moved to (${to.q}, ${to.r}).`,
      timestamp: new Date(),
    });

    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/attack
const basicAttack = async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id)
      .populate('units.character', CHAR_SELECT);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ success: false, error: 'Battle is not active' });

    const myUnit    = battle.units.find(u => String(u.user) === String(req.userId));
    if (!myUnit) return res.status(403).json({ success: false, error: 'Not a participant' });
    if (!myUnit.character._id.equals(battle.currentTurn)) {
      return res.status(400).json({ success: false, error: 'Not your turn' });
    }
    if (myUnit.ap < 2) return res.status(400).json({ success: false, error: 'Not enough AP (need 2)' });

    const enemyUnit = battle.units.find(u => String(u.user) !== String(req.userId));
    if (!enemyUnit) return res.status(400).json({ success: false, error: 'No enemy found' });

    const dist = hexDistance(myUnit.position, enemyUnit.position);
    if (dist > 1) {
      return res.status(400).json({ success: false, error: `Enemy not adjacent (distance: ${dist})` });
    }

    const damage = calcDamage(myUnit.character);
    enemyUnit.hp  = Math.max(0, enemyUnit.hp - damage);
    myUnit.ap    -= 2;

    battle.log.push({
      turn:    battle.turnNumber,
      actor:   myUnit.character._id,
      action:  'attack',
      to:      { q: enemyUnit.position.q, r: enemyUnit.position.r },
      damage,
      message: `${myUnit.name} attacked ${enemyUnit.name} for ${damage} damage.`,
      timestamp: new Date(),
    });

    if (enemyUnit.hp <= 0) {
      battle.status = 'completed';
      battle.winner = myUnit.character._id;
      battle.log.push({
        turn:    battle.turnNumber,
        actor:   myUnit.character._id,
        action:  'end_turn',
        message: `${enemyUnit.name} has been defeated! ${myUnit.name} wins!`,
        timestamp: new Date(),
      });
      await settleBattle(battle);
    }

    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/end-turn
const endTurn = async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ success: false, error: 'Battle is not active' });

    const myUnit = battle.units.find(u => String(u.user) === String(req.userId));
    if (!myUnit) return res.status(403).json({ success: false, error: 'Not a participant' });
    if (!myUnit.character.equals(battle.currentTurn)) {
      return res.status(400).json({ success: false, error: 'Not your turn' });
    }

    const otherUnit = battle.units.find(u => String(u.user) !== String(req.userId));
    if (!otherUnit) return res.status(500).json({ success: false, error: 'Battle state corrupted' });

    battle.log.push({
      turn:    battle.turnNumber,
      actor:   myUnit.character,
      action:  'end_turn',
      message: `${myUnit.name} ended their turn.`,
      timestamp: new Date(),
    });

    battle.currentTurn  = otherUnit.character;
    otherUnit.ap        = 6;
    battle.turnNumber  += 1;
    battle.turnDeadline = new Date(Date.now() + battle.turnDeadlineHours * 3600 * 1000);

    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/submit-turn
const submitTurn = async (req, res) => {
  try {
    const { actions } = req.body;
    if (!Array.isArray(actions)) {
      return res.status(400).json({ success: false, error: 'actions array required' });
    }

    const battle = await Battle.findById(req.params.id)
      .populate('units.character', CHAR_SELECT);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Battle is not active' });
    }

    const myUnit = battle.units.find(u => String(u.user) === String(req.userId));
    if (!myUnit) return res.status(403).json({ success: false, error: 'Not a participant' });
    if (!myUnit.character._id.equals(battle.currentTurn)) {
      return res.status(400).json({ success: false, error: 'Not your turn' });
    }

    const enemyUnit = battle.units.find(u => String(u.user) !== String(req.userId));
    if (!enemyUnit) return res.status(500).json({ success: false, error: 'Battle state corrupted' });

    // Simulation state
    let simPos    = { q: myUnit.position.q, r: myUnit.position.r };
    let simAP     = myUnit.ap;
    let simMana   = myUnit.mana;
    let simEnergy = myUnit.energy;

    let totalDamage       = 0;
    let selfHeal          = 0;
    let pendingApModSelf  = 0;
    let pendingApModEnemy = 0;
    const pendingZones    = [];
    const processed       = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (action.type === 'move') {
        const to = action.to;
        if (!to || typeof to.q !== 'number' || typeof to.r !== 'number') {
          return res.status(400).json({ success: false, error: `Action ${i}: move requires {to:{q,r}}` });
        }
        if (to.q < 0 || to.q >= battle.gridWidth || to.r < 0 || to.r >= battle.gridHeight) {
          return res.status(400).json({ success: false, error: `Action ${i}: move target out of bounds` });
        }
        if (enemyUnit.position.q === to.q && enemyUnit.position.r === to.r) {
          return res.status(400).json({ success: false, error: `Action ${i}: target hex is occupied` });
        }
        const dist = hexDistance(simPos, to);
        if (dist === 0) {
          return res.status(400).json({ success: false, error: `Action ${i}: already at target` });
        }
        if (dist > simAP) {
          return res.status(400).json({ success: false, error: `Action ${i}: not enough AP (need ${dist}, have ${simAP})` });
        }
        if (simEnergy < dist) {
          return res.status(400).json({ success: false, error: `Action ${i}: not enough energy to move (need ${dist}, have ${simEnergy})` });
        }
        processed.push({
          type: 'move',
          from: { q: simPos.q, r: simPos.r },
          to:   { q: to.q,     r: to.r },
          message: `${myUnit.name} moved to (${to.q}, ${to.r}).`,
        });
        simPos    = { q: to.q, r: to.r };
        simAP    -= dist;
        simEnergy -= dist;

      } else if (action.type === 'attack') {
        const ATTACK_AP     = 2;
        const ATTACK_ENERGY = 2;
        if (simAP < ATTACK_AP) {
          return res.status(400).json({ success: false, error: `Action ${i}: not enough AP for attack` });
        }
        if (simEnergy < ATTACK_ENERGY) {
          return res.status(400).json({ success: false, error: `Action ${i}: not enough energy to attack (need ${ATTACK_ENERGY}, have ${simEnergy})` });
        }
        const dist = hexDistance(simPos, enemyUnit.position);
        if (dist > 1) {
          return res.status(400).json({ success: false, error: `Action ${i}: enemy not adjacent (distance: ${dist})` });
        }
        const damage = calcDamage(myUnit.character);
        totalDamage += damage;
        processed.push({
          type:    'attack',
          from:    { q: simPos.q,             r: simPos.r },
          to:      { q: enemyUnit.position.q, r: enemyUnit.position.r },
          damage,
          message: `${myUnit.name} attacked ${enemyUnit.name} for ${damage} damage.`,
        });
        simAP     -= ATTACK_AP;
        simEnergy -= ATTACK_ENERGY;

      } else if (action.type === 'cast') {
        const spell = spellEngine.getSpellById(action.spellId);
        const target = action.target || null;
        const casterSim = {
          pos:         simPos,
          ap:          simAP,
          mana:        simMana,
          energy:      simEnergy,
          knownSpells: myUnit.knownSpells,
        };
        const validation = spellEngine.validateCast(spell, casterSim, enemyUnit, target, battle.gridWidth, battle.gridHeight);
        if (!validation.ok) {
          return res.status(400).json({ success: false, error: `Action ${i}: ${validation.error}` });
        }

        // Handle isReaction — dispel a matching active zone
        if (action.isReaction) {
          if (!target) {
            return res.status(400).json({ success: false, error: `Action ${i}: reaction requires a target hex` });
          }
          const zoneIdx = battle.activeZones.findIndex(z =>
            z.hexes.some(h => h.q === target.q && h.r === target.r)
          );
          if (zoneIdx === -1) {
            return res.status(400).json({ success: false, error: `Action ${i}: no active zone at target hex` });
          }
          battle.activeZones.splice(zoneIdx, 1);
          processed.push({
            type:       'cast',
            spellId:    action.spellId,
            spellKind:  'reaction',
            target,
            isReaction: true,
            message:    `${myUnit.name} dispelled the ${spell.name} zone.`,
          });
          simAP   -= spell.apCost;
          simMana -= spell.manaCost;
          continue;
        }

        switch (spell.kind) {
          case 'damage':
            totalDamage += spell.damage;
            processed.push({
              type:      'cast',
              spellId:   spell.id,
              spellKind: 'damage',
              target:    { q: enemyUnit.position.q, r: enemyUnit.position.r },
              damage:    spell.damage,
              message:   `${myUnit.name} cast ${spell.name} on ${enemyUnit.name} for ${spell.damage} damage.`,
            });
            break;

          case 'zone':
            pendingZones.push(spellEngine.buildZone(spell, myUnit.character._id, target, battle.gridWidth, battle.gridHeight));
            processed.push({
              type:      'cast',
              spellId:   spell.id,
              spellKind: 'zone',
              target,
              hexes:     spellEngine.hexesInRadius(target, spell.radius, battle.gridWidth, battle.gridHeight),
              message:   `${myUnit.name} cast ${spell.name} at (${target.q}, ${target.r}).`,
            });
            break;

          case 'heal':
            selfHeal += spell.heal;
            processed.push({
              type:      'cast',
              spellId:   spell.id,
              spellKind: 'heal',
              heal:      spell.heal,
              message:   `${myUnit.name} cast ${spell.name} and restored ${spell.heal} HP.`,
            });
            break;

          case 'buff':
            pendingApModSelf += spell.apMod;
            processed.push({
              type:      'cast',
              spellId:   spell.id,
              spellKind: 'buff',
              message:   `${myUnit.name} cast ${spell.name} — gains ${spell.apMod} AP next turn.`,
            });
            break;

          case 'debuff':
            pendingApModEnemy += spell.apMod;
            processed.push({
              type:      'cast',
              spellId:   spell.id,
              spellKind: 'debuff',
              target:    { q: enemyUnit.position.q, r: enemyUnit.position.r },
              message:   `${myUnit.name} cast ${spell.name} on ${enemyUnit.name} — loses ${Math.abs(spell.apMod)} AP next turn.`,
            });
            break;

          default:
            return res.status(400).json({ success: false, error: `Action ${i}: unhandled spell kind '${spell.kind}'` });
        }

        simAP   -= spell.apCost;
        simMana -= spell.manaCost;

      } else {
        return res.status(400).json({ success: false, error: `Action ${i}: unknown type '${action.type}'` });
      }
    }

    // ── Commit phase ────────────────────────────────────────────────────────
    myUnit.position = simPos;
    myUnit.ap       = simAP;
    myUnit.mana     = simMana;
    myUnit.energy   = simEnergy;

    myUnit.hp    = Math.min(myUnit.maxHp, myUnit.hp + selfHeal);
    enemyUnit.hp = Math.max(0, enemyUnit.hp - totalDamage);

    myUnit.pendingApMod    += pendingApModSelf;
    enemyUnit.pendingApMod += pendingApModEnemy;

    battle.activeZones = [...battle.activeZones, ...pendingZones];

    // Zone tick — applies damage from ALL active zones (including newly placed ones)
    const { survivingZones, ticks } = spellEngine.tickZones(battle.activeZones, battle.units);
    battle.activeZones = survivingZones;

    for (const tick of ticks) {
      const hitDesc = tick.hitUnits.map(u => `${u.name} (${u.damage} dmg)`).join(', ');
      const msg     = hitDesc
        ? `${tick.icon} ${tick.name} ticked — hit: ${hitDesc}.`
        : `${tick.icon} ${tick.name} ticked (no hits).`;
      processed.push({
        type:      'zone_tick',
        spellId:   tick.spellId,
        spellKind: 'zone',
        hexes:     tick.hexes,
        message:   msg,
      });
      battle.log.push({
        turn:      battle.turnNumber,
        actor:     myUnit.character._id,
        action:    'zone_tick',
        message:   msg,
        timestamp: new Date(),
      });
    }

    // Replay data
    battle.lastTurnActions = processed;
    battle.lastTurnActor   = myUnit.character._id;

    // Summary log entry
    const summary = processed.filter(a => a.type !== 'zone_tick').length
      ? processed.filter(a => a.type !== 'zone_tick').map(a => a.message).join(' ')
      : `${myUnit.name} passed their turn.`;
    battle.log.push({
      turn:      battle.turnNumber,
      actor:     myUnit.character._id,
      action:    'end_turn',
      message:   summary,
      timestamp: new Date(),
    });

    // Check win (direct damage + zone ticks can be lethal)
    if (enemyUnit.hp <= 0) {
      battle.status = 'completed';
      battle.winner = myUnit.character._id;
      battle.log.push({
        turn:      battle.turnNumber,
        actor:     myUnit.character._id,
        action:    'end_turn',
        message:   `${enemyUnit.name} has been defeated! ${myUnit.name} wins!`,
        timestamp: new Date(),
      });
      await settleBattle(battle);
    } else {
      // AP regen with pending buff/debuff delta, clamped to ≥ 0
      const nextAP       = Math.max(0, 6 + enemyUnit.pendingApMod);
      battle.currentTurn = enemyUnit.character._id;
      enemyUnit.ap       = nextAP;
      enemyUnit.pendingApMod = 0;
      battle.turnNumber  += 1;
      battle.turnDeadline = new Date(Date.now() + battle.turnDeadlineHours * 3600 * 1000);
    }

    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/battles/:id/surrender
const surrender = async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ success: false, error: 'Battle is not active' });

    const myUnit    = battle.units.find(u => String(u.user) === String(req.userId));
    if (!myUnit) return res.status(403).json({ success: false, error: 'Not a participant' });

    const enemyUnit = battle.units.find(u => String(u.user) !== String(req.userId));
    if (!enemyUnit) return res.status(500).json({ success: false, error: 'Battle state corrupted' });

    battle.status = 'completed';
    battle.winner = enemyUnit.character;
    battle.log.push({
      turn:    battle.turnNumber,
      actor:   myUnit.character,
      action:  'surrender',
      message: `${myUnit.name} surrendered. ${enemyUnit.name} wins!`,
      timestamp: new Date(),
    });

    await settleBattle(battle);
    await battle.save();
    const populated = await populatedBattle(battle._id);
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  challengePlayer,
  respondToChallenge,
  getBattle,
  getActiveBattles,
  moveUnit,
  basicAttack,
  endTurn,
  surrender,
  submitTurn,
};
