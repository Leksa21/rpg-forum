const Character = require('../models/Character');

// ── Tunable constants ───────────────────────────────────────────────────────
const WOUND_TTL_MS            = 24 * 60 * 60 * 1000; // wound heals after 24h
const INJURY_MS               = 60 * 60 * 1000;      // cannot battle for 1h after a loss
const DEATH_SAVE_WOUND_COUNT  = 3;                   // losing with 3+ active wounds = death save
const BASE_DEATH_SAVE_DC      = 10;
const LOSS_XP                 = 15;

const PRIMARY_STAT = {
  Warrior: 'strength',     Paladin: 'strength',
  Ranger:  'dexterity',    Rogue:   'dexterity',
  Mage:    'intelligence', Necromancer: 'intelligence',
  Druid:   'wisdom',       Bard:    'charisma',
};

// ── Pure functions ──────────────────────────────────────────────────────────

// XP needed to advance FROM the given level to the next one
function xpForNextLevel(level) {
  return level * 100;
}

// Winner XP scales with loser level; fighting below your level pays less
function xpForWin(winnerLevel, loserLevel) {
  const base  = 40 + 20 * loserLevel;
  const ratio = Math.min(1.5, Math.max(0.5, loserLevel / winnerLevel));
  return Math.round(base * ratio);
}

function xpForLoss() {
  return LOSS_XP;
}

// Returns { level, experience, levelsGained } after consuming XP thresholds
function computeLevelUps(level, experience) {
  let newLevel = level;
  let xp       = experience;
  while (xp >= xpForNextLevel(newLevel) && newLevel < 100) {
    xp -= xpForNextLevel(newLevel);
    newLevel += 1;
  }
  return { level: newLevel, experience: xp, levelsGained: newLevel - level };
}

// Wounds older than 24h are considered healed
function countActiveWounds(wounds, now = new Date()) {
  if (!Array.isArray(wounds)) return 0;
  return wounds.filter(w => now - new Date(w.inflictedAt) < WOUND_TTL_MS).length;
}

function isInjured(character, now = new Date()) {
  return Boolean(character.injuredUntil && new Date(character.injuredUntil) > now);
}

// D&D-style ability modifier
function endModifier(endurance) {
  return Math.floor(((endurance || 10) - 10) / 2);
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

// d20 + END modifier vs DC (10 + active wounds). Fail = death.
function resolveDeathSave(endurance, woundCount, roll) {
  const modifier = endModifier(endurance);
  const dc       = BASE_DEATH_SAVE_DC + woundCount;
  const total    = roll + modifier;
  return { roll, modifier, dc, total, survived: total >= dc };
}

// ── Battle settlement ───────────────────────────────────────────────────────

function unitCharId(unit) {
  return unit.character?._id || unit.character;
}

// Awards XP/level-ups to the winner, wounds (and possibly death) to the loser.
// Mutates battle.rewards and battle.log; saves both Character docs.
// Does NOT save the battle — the caller is responsible for that.
async function settleBattle(battle, { roll = rollD20, now = new Date() } = {}) {
  if (battle.status !== 'completed' || !battle.winner) return null;
  if (battle.rewards?.settled) return battle.rewards;

  const winnerId   = battle.winner?._id || battle.winner;
  const winnerUnit = battle.units.find(u => String(unitCharId(u)) === String(winnerId));
  const loserUnit  = battle.units.find(u => String(unitCharId(u)) !== String(winnerId));
  if (!winnerUnit || !loserUnit) return null;

  const [winner, loser] = await Promise.all([
    Character.findById(unitCharId(winnerUnit)),
    Character.findById(unitCharId(loserUnit)),
  ]);
  if (!winner || !loser) return null;

  // Winner: XP + level-ups (+1 primary class stat per level gained)
  const winnerXp = xpForWin(winner.level, loser.level);
  const leveled  = computeLevelUps(winner.level, winner.experience + winnerXp);
  winner.experience = leveled.experience;
  winner.level      = leveled.level;
  if (leveled.levelsGained > 0) {
    const stat = PRIMARY_STAT[winner.class];
    if (stat) {
      winner.stats[stat] = Math.min(100, (winner.stats[stat] || 10) + leveled.levelsGained);
    }
  }

  // Loser: death save first (if already badly wounded), then a fresh wound
  const preWounds = countActiveWounds(loser.wounds, now);
  let deathRoll   = null;
  let loserDied   = false;

  if (preWounds >= DEATH_SAVE_WOUND_COUNT) {
    deathRoll = resolveDeathSave(loser.stats?.endurance, preWounds, roll());
    loserDied = !deathRoll.survived;
  }

  if (loserDied) {
    loser.isDead = true;
    battle.log.push({
      turn:      battle.turnNumber,
      actor:     loser._id,
      action:    'end_turn',
      message:   `${loser.name} succumbed to their wounds. Death claims them (rolled ${deathRoll.total} vs DC ${deathRoll.dc}).`,
      timestamp: now,
    });
  } else {
    loser.wounds = [...(loser.wounds || []), { inflictedAt: now }];
    loser.injuredUntil = new Date(now.getTime() + INJURY_MS);
  }
  loser.experience += xpForLoss();

  battle.rewards = {
    settled:            true,
    winnerXp,
    loserXp:            xpForLoss(),
    winnerLevelsGained: leveled.levelsGained,
    winnerNewLevel:     leveled.level,
    loserActiveWounds:  countActiveWounds(loser.wounds, now),
    loserDied,
    deathRoll,
  };

  await Promise.all([winner.save(), loser.save()]);
  return battle.rewards;
}

module.exports = {
  WOUND_TTL_MS,
  INJURY_MS,
  DEATH_SAVE_WOUND_COUNT,
  PRIMARY_STAT,
  xpForNextLevel,
  xpForWin,
  xpForLoss,
  computeLevelUps,
  countActiveWounds,
  isInjured,
  endModifier,
  rollD20,
  resolveDeathSave,
  settleBattle,
};
