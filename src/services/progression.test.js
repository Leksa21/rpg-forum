const {
  WOUND_TTL_MS,
  INJURY_MS,
  DEATH_SAVE_WOUND_COUNT,
  xpForNextLevel,
  xpForWin,
  xpForLoss,
  computeLevelUps,
  countActiveWounds,
  isInjured,
  endModifier,
  resolveDeathSave,
} = require('./progression');

describe('xpForNextLevel', () => {
  test('scales linearly with level', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(5)).toBe(500);
  });
});

describe('xpForWin', () => {
  test('pays more for a higher-level opponent', () => {
    const vsEqual  = xpForWin(3, 3);
    const vsHigher = xpForWin(3, 6);
    expect(vsHigher).toBeGreaterThan(vsEqual);
  });

  test('caps the bonus for farming much weaker opponents at 50%', () => {
    // level 10 beats level 1: ratio clamps to 0.5
    expect(xpForWin(10, 1)).toBe(Math.round((40 + 20) * 0.5));
  });

  test('equal levels pay base amount', () => {
    expect(xpForWin(2, 2)).toBe(40 + 20 * 2);
  });
});

describe('xpForLoss', () => {
  test('returns a small consolation amount', () => {
    expect(xpForLoss()).toBeGreaterThan(0);
    expect(xpForLoss()).toBeLessThan(xpForWin(1, 1));
  });
});

describe('computeLevelUps', () => {
  test('does not level up below the threshold', () => {
    expect(computeLevelUps(1, 99)).toEqual({ level: 1, experience: 99, levelsGained: 0 });
  });

  test('levels up once and carries over remainder', () => {
    expect(computeLevelUps(1, 130)).toEqual({ level: 2, experience: 30, levelsGained: 1 });
  });

  test('chains multiple level-ups from a large XP gain', () => {
    // 100 (1→2) + 200 (2→3) = 300 consumed, 50 left
    expect(computeLevelUps(1, 350)).toEqual({ level: 3, experience: 50, levelsGained: 2 });
  });

  test('never exceeds level 100', () => {
    const result = computeLevelUps(100, 999999);
    expect(result.level).toBe(100);
  });
});

describe('countActiveWounds', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  test('returns 0 for empty or missing wounds', () => {
    expect(countActiveWounds([], now)).toBe(0);
    expect(countActiveWounds(undefined, now)).toBe(0);
  });

  test('counts wounds younger than 24h', () => {
    const wounds = [
      { inflictedAt: new Date(now - 1000) },
      { inflictedAt: new Date(now - WOUND_TTL_MS + 60_000) },
    ];
    expect(countActiveWounds(wounds, now)).toBe(2);
  });

  test('ignores wounds older than 24h (healed)', () => {
    const wounds = [
      { inflictedAt: new Date(now - WOUND_TTL_MS - 1) },
      { inflictedAt: new Date(now - 1000) },
    ];
    expect(countActiveWounds(wounds, now)).toBe(1);
  });
});

describe('isInjured', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  test('true while injuredUntil is in the future', () => {
    expect(isInjured({ injuredUntil: new Date(now.getTime() + INJURY_MS) }, now)).toBe(true);
  });

  test('false when injuredUntil has passed or is unset', () => {
    expect(isInjured({ injuredUntil: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(isInjured({ injuredUntil: null }, now)).toBe(false);
    expect(isInjured({}, now)).toBe(false);
  });
});

describe('endModifier', () => {
  test('follows the (END - 10) / 2 floor rule', () => {
    expect(endModifier(10)).toBe(0);
    expect(endModifier(14)).toBe(2);
    expect(endModifier(8)).toBe(-1);
    expect(endModifier(undefined)).toBe(0);
  });
});

describe('resolveDeathSave', () => {
  test('survives when roll + modifier meets the DC exactly', () => {
    // 3 wounds: DC 13; END 14 gives +2, roll 11 → total 13
    const result = resolveDeathSave(14, DEATH_SAVE_WOUND_COUNT, 11);
    expect(result).toEqual({ roll: 11, modifier: 2, dc: 13, total: 13, survived: true });
  });

  test('dies when total falls below the DC', () => {
    const result = resolveDeathSave(10, 4, 3);
    expect(result.dc).toBe(14);
    expect(result.total).toBe(3);
    expect(result.survived).toBe(false);
  });

  test('high endurance can save a bad roll', () => {
    const weak  = resolveDeathSave(10, 3, 12); // total 12 vs DC 13 → dead
    const tough = resolveDeathSave(16, 3, 12); // total 15 vs DC 13 → alive
    expect(weak.survived).toBe(false);
    expect(tough.survived).toBe(true);
  });
});
