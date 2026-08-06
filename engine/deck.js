// engine/deck.js
// ─── Deck Builder ──────────────────────────────────────────────────────────────
// Responsible for building the card pool for a game session.
// Classic mode = 3x the 108-card UNO deck (324 cards).
// Overkill mode = same base + custom wild cards from config.customCards.

const COLORS = ['red', 'blue', 'green', 'yellow'];
const FILES = {
  red:    { '0':'red_0.svg','1':'red_1.svg','2':'red_2.svg','3':'red_3.svg','4':'red_4.svg','5':'red_5.svg','6':'red_6.svg','7':'red_7.svg','8':'red_8.svg','9':'red_9.svg','skip':'red_skip.svg','reverse':'red_reverse.svg','+2':'red_draw_2.svg' },
  blue:   { '0':'blue_0.svg','1':'blue_1.svg','2':'blue_2.svg','3':'blue_3.svg','4':'blue_4.svg','5':'blue_5.svg','6':'blue_6.svg','7':'blue_7.svg','8':'blue_8.svg','9':'blue_9.svg','skip':'blue_skip.svg','reverse':'blue_reverse.svg','+2':'blue_draw_2.svg' },
  green:  { '0':'green_0.svg','1':'green_1.svg','2':'green_2.svg','3':'green_3.svg','4':'green_4.svg','5':'green_5.svg','6':'green_6.svg','7':'green_7.svg','8':'green_8.svg','9':'green_9.svg','skip':'green_skip.svg','reverse':'green_reverse.svg','+2':'green_draw_2.svg' },
  yellow: { '0':'yellow_0.svg','1':'yellow_1.svg','2':'yellow_2.svg','3':'yellow_3.svg','4':'yellow_4.svg','5':'yellow_5.svg','6':'yellow_6.svg','7':'yellow_7.svg','8':'yellow_8.svg','9':'yellow_9.svg','skip':'yellow_skip.svg','reverse':'yellow_reverse.svg','+2':'yellow_draw_2.svg' },
};

/**
 * Standard 108-card UNO deck (one copy).
 * Classic rules: one 0 per color, two 1-9/skip/reverse/+2 per color, four wilds, four +4.
 */
export const BASE_CLASSIC_DECK = (() => {
  const deck = [];
  for (const color of COLORS) {
    // One 0 per color
    deck.push({ color, value: '0', name: `${color} 0`, file: FILES[color]['0'] });
    // Two of 1-9 per color
    for (let n = 1; n <= 9; n++) {
      const val = `${n}`;
      deck.push({ color, value: val, name: `${color} ${val}`, file: FILES[color][val] });
      deck.push({ color, value: val, name: `${color} ${val}`, file: FILES[color][val] });
    }
    // Two skip, reverse, +2 per color
    for (const v of ['skip', 'reverse', '+2']) {
      deck.push({ color, value: v, name: `${color} ${v}`, file: FILES[color][v] });
      deck.push({ color, value: v, name: `${color} ${v}`, file: FILES[color][v] });
    }
  }
  // Four wilds + four +4
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild', name: 'Wild', file: 'wild.svg' });
    deck.push({ color: 'wild', value: '+4', name: 'Wild +4', file: 'wild_draw_4.svg' });
  }
  return deck; // 108 cards
})();

/**
 * Fisher-Yates shuffle (pure, returns new array).
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a full shuffled deck for a game session.
 * @param {object} config - room.config
 * @param {string} idPrefix - prefix for unique card IDs
 * @returns {Array} shuffled deck with unique IDs
 */
export function buildDeck(config, idPrefix = 'srv') {
  // Stack the classic deck N times (default 3x = 324 cards)
  let pool = [];
  for (let i = 0; i < config.deckMultiplier; i++) {
    pool = [...pool, ...BASE_CLASSIC_DECK];
  }

  // Add Overkill custom cards if any
  if (config.customCards && config.customCards.length > 0) {
    pool = [...pool, ...config.customCards];
  }

  return shuffle(pool).map((c, i) => ({
    ...c,
    id: `${idPrefix}_${i}_${Math.random().toString(36).substr(2, 5)}`
  }));
}

/**
 * Returns count of cards expected in a classic deck configuration.
 * Used for card conservation auditing.
 * @param {object} config
 * @returns {number}
 */
export function expectedTotalCards(config) {
  const base = BASE_CLASSIC_DECK.length * config.deckMultiplier;
  const extra = (config.customCards || []).length;
  return base + extra;
}
