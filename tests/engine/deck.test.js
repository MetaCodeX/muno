// tests/engine/deck.test.js
import { buildDeck, shuffle, BASE_CLASSIC_DECK, expectedTotalCards } from '../../engine/deck.js';
import { createConfig } from '../../engine/config.js';

describe('engine/deck.js', () => {

  describe('BASE_CLASSIC_DECK', () => {
    test('has exactly 108 cards', () => {
      expect(BASE_CLASSIC_DECK).toHaveLength(108);
    });

    test('has 4 wilds and 4 wild +4', () => {
      const wilds = BASE_CLASSIC_DECK.filter(c => c.value === 'wild');
      const plus4 = BASE_CLASSIC_DECK.filter(c => c.value === '+4');
      expect(wilds).toHaveLength(4);
      expect(plus4).toHaveLength(4);
    });

    test('has exactly one 0 per color (4 total)', () => {
      const zeros = BASE_CLASSIC_DECK.filter(c => c.value === '0' && c.color !== 'wild');
      expect(zeros).toHaveLength(4);
    });

    test('has two of each 1-9, skip, reverse, +2 per color', () => {
      const colors = ['red', 'blue', 'green', 'yellow'];
      const actionValues = ['skip', 'reverse', '+2'];
      for (const color of colors) {
        for (let n = 1; n <= 9; n++) {
          const count = BASE_CLASSIC_DECK.filter(c => c.color === color && c.value === `${n}`).length;
          expect(count).toBe(2);
        }
        for (const v of actionValues) {
          const count = BASE_CLASSIC_DECK.filter(c => c.color === color && c.value === v).length;
          expect(count).toBe(2);
        }
      }
    });
  });

  describe('shuffle()', () => {
    test('returns array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(shuffle(arr)).toHaveLength(5);
    });

    test('does not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      shuffle(arr);
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    test('contains all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('buildDeck() — Classic mode', () => {
    const classicConfig = createConfig('classic');

    test('returns 324 cards (3x 108)', () => {
      const deck = buildDeck(classicConfig, 'test');
      expect(deck).toHaveLength(324);
    });

    test('every card has a unique ID', () => {
      const deck = buildDeck(classicConfig, 'test');
      const ids = deck.map(c => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(deck.length);
    });

    test('every card has required fields: id, color, value, name', () => {
      const deck = buildDeck(classicConfig, 'test');
      for (const card of deck) {
        expect(card.id).toBeTruthy();
        expect(card.color).toBeTruthy();
        expect(card.value).toBeTruthy();
        expect(card.name).toBeTruthy();
      }
    });

    test('ID prefix is applied correctly', () => {
      const deck = buildDeck(classicConfig, 'myprefix');
      expect(deck[0].id.startsWith('myprefix_')).toBe(true);
    });
  });

  describe('buildDeck() — Overkill mode', () => {
    const overkillConfig = createConfig('overkill');

    test('has more cards than classic (3x108 + 16 custom)', () => {
      const deck = buildDeck(overkillConfig, 'ok');
      expect(deck.length).toBe(324 + 16); // 340 cards
    });

    test('includes overkill wild cards: +6, x2, dice, flush', () => {
      const deck = buildDeck(overkillConfig, 'ok');
      const plus6 = deck.filter(c => c.value === '+6');
      const x2 = deck.filter(c => c.value === 'x2');
      const dice = deck.filter(c => c.value === 'dice');
      const flush = deck.filter(c => c.value === 'flush');
      expect(plus6).toHaveLength(4);
      expect(x2).toHaveLength(4);
      expect(dice).toHaveLength(4);
      expect(flush).toHaveLength(4);
    });
  });

  describe('expectedTotalCards()', () => {
    test('classic: 324', () => {
      expect(expectedTotalCards(createConfig('classic'))).toBe(324);
    });

    test('overkill: 340', () => {
      expect(expectedTotalCards(createConfig('overkill'))).toBe(340);
    });

    test('custom deckMultiplier=1 classic: 108', () => {
      expect(expectedTotalCards(createConfig('classic', { deckMultiplier: 1 }))).toBe(108);
    });
  });
});
