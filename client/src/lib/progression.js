// Client mirror of src/services/progression.js pure rules.
// Keep formulas in sync with the server — the server is authoritative.
export const WOUND_TTL_MS = 24 * 60 * 60 * 1000;

// XP needed to advance FROM the given level to the next one
export function xpForNextLevel(level) {
  return level * 100;
}

// Wounds older than 24h are considered healed
export function countActiveWounds(wounds, now = new Date()) {
  if (!Array.isArray(wounds)) return 0;
  return wounds.filter(w => now - new Date(w.inflictedAt) < WOUND_TTL_MS).length;
}

export function isInjured(character, now = new Date()) {
  return Boolean(character?.injuredUntil && new Date(character.injuredUntil) > now);
}

// "42m" / "1h 05m" until injury wears off; empty string when not injured
export function injuryRemainingLabel(character, now = new Date()) {
  if (!isInjured(character, now)) return '';
  const ms   = new Date(character.injuredUntil) - now;
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
