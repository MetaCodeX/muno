// tests/engine/rules.test.js
import { canPlay, canJumpIn, getDefenseCards, isNumericCard, checkMunoRule, validateDraw } from '../../engine/rules.js';
import { createConfig } from '../../engine/config.js';

const classic = createConfig('classic');
const overkill = createConfig('overkill');

// Helper to build a card object
const card = (color, value) => ({ color, value, name: `${color} ${value}` });

describe('engine/rules.js', () => {

  describe('canPlay() — Classic mode', () => {
    const topCard = card('red', '5');
    const currentColor = 'red';

    test('same color → playable', () => {
      expect(canPlay(card('red', '7'), topCard, currentColor, 0, classic)).toBe(true);
    });

    test('same value, different color → playable', () => {
      expect(canPlay(card('blue', '5'), topCard, currentColor, 0, classic)).toBe(true);
    });

    test('wild → always playable', () => {
      expect(canPlay(card('wild', 'wild'), topCard, currentColor, 0, classic)).toBe(true);
      expect(canPlay(card('wild', '+4'), topCard, currentColor, 0, classic)).toBe(true);
    });

    test('wrong color, wrong value → NOT playable', () => {
      expect(canPlay(card('blue', '3'), topCard, currentColor, 0, classic)).toBe(false);
    });

    test('with draw stack: only +2 and +4 are playable', () => {
      expect(canPlay(card('red', '+2'), topCard, currentColor, 4, classic)).toBe(true);
      expect(canPlay(card('wild', '+4'), topCard, currentColor, 4, classic)).toBe(true);
      expect(canPlay(card('red', '5'), topCard, currentColor, 4, classic)).toBe(false);
      expect(canPlay(card('wild', 'wild'), topCard, currentColor, 4, classic)).toBe(false);
    });

    test('color follows chosen color after wild (not topCard color)', () => {
      const wildTop = card('wild', 'wild');
      expect(canPlay(card('blue', '3'), wildTop, 'blue', 0, classic)).toBe(true);
      expect(canPlay(card('red', '3'), wildTop, 'blue', 0, classic)).toBe(false);
    });
  });

  describe('canPlay() — Overkill mode', () => {
    const topCard = card('red', '5');

    test('with draw stack: +6 and x2 are also defensive in overkill', () => {
      expect(canPlay(card('wild', '+6'), topCard, 'red', 4, overkill)).toBe(true);
      expect(canPlay(card('wild', 'x2'), topCard, 'red', 4, overkill)).toBe(true);
    });

    test('+6 and x2 are NOT defensive in classic', () => {
      expect(canPlay(card('wild', '+6'), topCard, 'red', 4, classic)).toBe(false);
      expect(canPlay(card('wild', 'x2'), topCard, 'red', 4, classic)).toBe(false);
    });
  });

  describe('canJumpIn()', () => {
    test('always false in classic (jump-in disabled)', () => {
      const top = card('red', '5');
      expect(canJumpIn(card('red', '5'), top, classic)).toBe(false);
    });

    test('overkill: exact same color + value → jump-in allowed', () => {
      const top = card('red', '5');
      expect(canJumpIn(card('red', '5'), top, overkill)).toBe(true);
    });

    test('overkill: same value, different color → NOT allowed', () => {
      const top = card('red', '5');
      expect(canJumpIn(card('blue', '5'), top, overkill)).toBe(false);
    });

    test('overkill: wild matches wild by value only', () => {
      const topWild = card('wild', 'wild');
      expect(canJumpIn(card('wild', 'wild'), topWild, overkill)).toBe(true);
      expect(canJumpIn(card('wild', '+4'), topWild, overkill)).toBe(false);
    });

    test('overkill: +4 matches +4', () => {
      const topPlus4 = card('wild', '+4');
      expect(canJumpIn(card('wild', '+4'), topPlus4, overkill)).toBe(true);
    });
  });

  describe('getDefenseCards()', () => {
    test('classic: [+2, +4]', () => {
      expect(getDefenseCards(classic)).toEqual(['+2', '+4']);
    });

    test('overkill: [+2, +4, +6, x2]', () => {
      expect(getDefenseCards(overkill)).toEqual(['+2', '+4', '+6', 'x2']);
    });
  });

  describe('isNumericCard()', () => {
    test('0-9 are numeric', () => {
      for (let i = 0; i <= 9; i++) {
        expect(isNumericCard(`${i}`)).toBe(true);
      }
    });

    test('action cards are not numeric', () => {
      expect(isNumericCard('skip')).toBe(false);
      expect(isNumericCard('+2')).toBe(false);
      expect(isNumericCard('wild')).toBe(false);
      expect(isNumericCard('+6')).toBe(false);
    });
  });

  describe('checkMunoRule()', () => {
    test('hand size 1 without shout → penalty', () => {
      expect(checkMunoRule(1, false, classic)).toBe('penalty');
    });

    test('hand size 1 with shout → valid_muno', () => {
      expect(checkMunoRule(1, true, classic)).toBe('valid_muno');
    });

    test('hand size 2+ → no action', () => {
      expect(checkMunoRule(2, false, classic)).toBeNull();
      expect(checkMunoRule(5, true, classic)).toBeNull();
    });

    test('muno disabled in config → always null', () => {
      const noMuno = createConfig('classic', { munoShoutEnabled: false });
      expect(checkMunoRule(1, false, noMuno)).toBeNull();
    });
  });

  describe('validateDraw()', () => {
    function makeGs(overrides = {}) {
      return {
        drawStackCount: 0,
        drawsThisTurn: 0,
        hands: [[]],
        ...overrides,
      };
    }

    test('normal draw: allowed', () => {
      const result = validateDraw(makeGs(), 0, classic);
      expect(result.allowed).toBe(true);
    });

    test('max hand size reached → not allowed, auto-pass', () => {
      const gs = makeGs({ hands: [new Array(30).fill({ id: 'x' })] });
      const result = validateDraw(gs, 0, classic);
      expect(result.allowed).toBe(false);
      expect(result.autoPass).toBe(true);
      expect(result.reason).toBe('max_hand');
    });

    test('max draws per turn reached → not allowed, auto-pass', () => {
      const gs = makeGs({ drawsThisTurn: 5 });
      const result = validateDraw(gs, 0, classic);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_draws');
    });

    test('draw stack active → always allowed (clearing the penalty)', () => {
      const gs = makeGs({ drawStackCount: 6, drawsThisTurn: 5 });
      const result = validateDraw(gs, 0, classic);
      expect(result.allowed).toBe(true);
    });

    test('custom maxDrawsPerTurn from config', () => {
      const cfg = createConfig('classic', { maxDrawsPerTurn: 3 });
      const gs = makeGs({ drawsThisTurn: 3 });
      const result = validateDraw(gs, 0, cfg);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_draws');
    });
  });
});
