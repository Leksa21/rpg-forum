// Client mirror of the server travel-time rules (src/controllers/travelController.js).
// Travel time scales with map distance; the server is authoritative.
export const SECONDS_PER_MAP_UNIT = 5;
export const MIN_TRAVEL_SECS      = 30;
export const MAX_TRAVEL_SECS      = 600;

export function travelDurationSecs(fromCoords, toCoords) {
  const dx   = (toCoords?.x ?? 50) - (fromCoords?.x ?? 50);
  const dy   = (toCoords?.y ?? 50) - (fromCoords?.y ?? 50);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const secs = Math.round(dist * SECONDS_PER_MAP_UNIT);
  return Math.min(MAX_TRAVEL_SECS, Math.max(MIN_TRAVEL_SECS, secs));
}

export function formatTravelSecs(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
}
