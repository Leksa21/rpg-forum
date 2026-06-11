import { describe, test, expect } from 'vitest';
import {
  WOUND_TTL_MS,
  xpForNextLevel,
  countActiveWounds,
  isInjured,
  injuryRemainingLabel,
} from './progression';

describe('xpForNextLevel', () => {
  test('matches the server formula (level * 100)', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(7)).toBe(700);
  });
});

describe('countActiveWounds', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  test('returns 0 for missing or empty wounds', () => {
    expect(countActiveWounds(undefined, now)).toBe(0);
    expect(countActiveWounds([], now)).toBe(0);
  });

  test('counts fresh wounds and ignores healed ones', () => {
    const wounds = [
      { inflictedAt: new Date(now - 1000).toISOString() },
      { inflictedAt: new Date(now - WOUND_TTL_MS - 1).toISOString() },
    ];
    expect(countActiveWounds(wounds, now)).toBe(1);
  });
});

describe('isInjured', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  test('true while injuredUntil is in the future', () => {
    expect(isInjured({ injuredUntil: new Date(now.getTime() + 60_000).toISOString() }, now)).toBe(true);
  });

  test('false when expired, unset, or character missing', () => {
    expect(isInjured({ injuredUntil: new Date(now.getTime() - 1).toISOString() }, now)).toBe(false);
    expect(isInjured({}, now)).toBe(false);
    expect(isInjured(null, now)).toBe(false);
  });
});

describe('injuryRemainingLabel', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  test('formats minutes under an hour', () => {
    const char = { injuredUntil: new Date(now.getTime() + 42 * 60_000).toISOString() };
    expect(injuryRemainingLabel(char, now)).toBe('42m');
  });

  test('formats hours and minutes over an hour', () => {
    const char = { injuredUntil: new Date(now.getTime() + 65 * 60_000).toISOString() };
    expect(injuryRemainingLabel(char, now)).toBe('1h 05m');
  });

  test('empty string when not injured', () => {
    expect(injuryRemainingLabel({}, now)).toBe('');
  });
});
