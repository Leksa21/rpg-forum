const { isStaffRole, canViewCity, canPostInCity } = require('./visibility');

describe('isStaffRole()', () => {
  test('recognizes moderator, admin and head_admin as staff', () => {
    expect(isStaffRole('moderator')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('head_admin')).toBe(true);
  });

  test('treats members and anonymous requests as non-staff', () => {
    expect(isStaffRole('member')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe('canViewCity()', () => {
  test('lets a present character see their current city', () => {
    expect(
      canViewCity({ role: 'member', currentCityId: 'roko', targetCityId: 'roko' })
    ).toBe(true);
  });

  test('hides another city the character has left', () => {
    expect(
      canViewCity({ role: 'member', currentCityId: 'maki', targetCityId: 'roko' })
    ).toBe(false);
  });

  test('staff see any city regardless of where they are', () => {
    expect(
      canViewCity({ role: 'admin', currentCityId: null, targetCityId: 'roko' })
    ).toBe(true);
  });

  test('an anonymous or location-less character sees nothing location-bound', () => {
    expect(
      canViewCity({ role: 'member', currentCityId: null, targetCityId: 'roko' })
    ).toBe(false);
  });

  test('compares ids by value, not reference (ObjectId vs string)', () => {
    expect(
      canViewCity({
        role: 'member',
        currentCityId: { toString: () => 'abc123' },
        targetCityId: 'abc123',
      })
    ).toBe(true);
  });
});

describe('canPostInCity()', () => {
  test('uses the same presence rule as reading', () => {
    expect(
      canPostInCity({ role: 'member', currentCityId: 'roko', targetCityId: 'roko' })
    ).toBe(true);
    expect(
      canPostInCity({ role: 'member', currentCityId: 'roko', targetCityId: 'maki' })
    ).toBe(false);
  });
});
