// Presence-based forum visibility (variant A).
//
// A character only sees the forum of the city (Location) they are physically
// in right now. Leave the city → its content is hidden. Return → visible again
// (live current state, no frozen snapshot). Staff (mods/admins) bypass the gate
// so they can curate and moderate from anywhere.
//
// The comparison is intentionally a single direct match on the owning city,
// which keeps the rule cheap (no per-character watermarks) and easy to reason
// about. All forum content carries its city id on `location`.

const STAFF_ROLES = ['moderator', 'admin', 'head_admin'];

/**
 * @param {string} [role]
 * @returns {boolean} true if the role can bypass presence-based visibility
 */
function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Can the requester read forum content that belongs to a given city?
 *
 * @param {{ role?: string, currentCityId?: unknown, targetCityId?: unknown }} args
 * @returns {boolean}
 */
function canViewCity({ role, currentCityId, targetCityId }) {
  if (isStaffRole(role)) return true;
  if (!currentCityId || !targetCityId) return false;
  return String(currentCityId) === String(targetCityId);
}

// Writing (replying to an existing thread) follows the same rule as reading:
// you must be present in the city, or be staff.
const canPostInCity = canViewCity;

/**
 * Can the requester OPEN a new thread in a venue/city? By default only staff
 * may; a place can opt players in via `allowPlayerThreads`. Players still need
 * to be present. (Replying to existing threads is governed by canPostInCity.)
 *
 * @param {{ role?: string, currentCityId?: unknown, targetCityId?: unknown, allowPlayerThreads?: boolean }} args
 * @returns {boolean}
 */
function canOpenThread({ role, currentCityId, targetCityId, allowPlayerThreads }) {
  if (isStaffRole(role)) return true;
  if (!canViewCity({ role, currentCityId, targetCityId })) return false;
  return Boolean(allowPlayerThreads);
}

module.exports = { STAFF_ROLES, isStaffRole, canViewCity, canPostInCity, canOpenThread };
