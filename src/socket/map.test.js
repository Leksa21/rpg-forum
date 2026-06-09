const { resolveOutcome } = require('./map');

describe('resolveOutcome(myAction, theirAction)', () => {
  describe('flee', () => {
    test('my flee always resolves as "fled" regardless of opponent action', () => {
      expect(resolveOutcome('flee', 'greet').type).toBe('fled');
      expect(resolveOutcome('flee', 'attack').type).toBe('fled');
      expect(resolveOutcome('flee', 'flee').type).toBe('fled');
    });

    test("opponent flee resolves as 'they_fled' when I did not flee", () => {
      expect(resolveOutcome('greet', 'flee').type).toBe('they_fled');
      expect(resolveOutcome('attack', 'flee').type).toBe('they_fled');
    });
  });

  describe('peaceful actions', () => {
    test('mutual greet results in a friendly encounter', () => {
      const result = resolveOutcome('greet', 'greet');
      expect(result.type).toBe('friendly');
    });
  });

  describe('combat actions', () => {
    test('mutual attack results in a clash', () => {
      const result = resolveOutcome('attack', 'attack');
      expect(result.type).toBe('clash');
    });

    test('attacking someone who greeted is a surprise attack', () => {
      const result = resolveOutcome('attack', 'greet');
      expect(result.type).toBe('attacked');
    });

    test('greeting someone who attacks means you were ambushed', () => {
      const result = resolveOutcome('greet', 'attack');
      expect(result.type).toBe('ambushed');
    });
  });

  describe('message field', () => {
    test('every possible combination returns a non-empty message', () => {
      const actions = ['greet', 'flee', 'attack'];
      for (const a of actions) {
        for (const b of actions) {
          const { message } = resolveOutcome(a, b);
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('asymmetry', () => {
    test('attack vs greet and greet vs attack produce different outcomes', () => {
      const atkFirst = resolveOutcome('attack', 'greet');
      const greetFirst = resolveOutcome('greet', 'attack');
      expect(atkFirst.type).not.toBe(greetFirst.type);
    });
  });
});
