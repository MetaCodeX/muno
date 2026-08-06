// engine/config.js
// ─── Room Configuration ────────────────────────────────────────────────────────
// This is the single source of truth for game mode rules.
// Every room gets a config object derived from here.
// The server NEVER hardcodes limits — it reads them from room.config.

export const PLAYER_COLORS = [
  '#00e676', '#0088ff', '#ffc107', '#ff3b5c', '#b000ff',
  '#00d2d3', '#ff9f43', '#54a0ff', '#5f27cd', '#ff6b6b',
  '#10ac84', '#ee5253', '#0abde3', '#f368e0', '#e84393',
  '#00cec9', '#fdcb6e', '#6c5ce7', '#e17055'
];

export const DEFAULT_CONFIG = {
  mode: 'classic',
  cardsPerPlayer: 7,
  turnDuration: 30,         // seconds per turn
  maxHandSize: 30,          // max cards in one hand
  maxDrawsPerTurn: 5,       // normal draws before auto-pass
  deckMultiplier: 3,        // how many times BASE_DECK is stacked
  stackingEnabled: true,    // +2/+4 can be chained
  munoShoutEnabled: true,   // players must shout MUNO at 1 card
  inactivityKickTurns: 2,   // consecutive timeouts before kick
  jumpInEnabled: false,     // Overkill: jump in out of turn
  zeroRotatesHands: false,  // Overkill: card 0 rotates all hands
  sevenSwapsHands: false,   // Overkill: card 7 swaps with target
  customCards: [],          // extra cards added to deck
};

export const OVERKILL_CONFIG = {
  ...DEFAULT_CONFIG,
  mode: 'overkill',
  turnDuration: 25,
  jumpInEnabled: true,
  zeroRotatesHands: true,
  sevenSwapsHands: true,
  customCards: [
    // 4 copies of each Overkill wild card
    ...Array(4).fill(null).map((_, i) => ({
      color: 'wild', value: '+6', name: 'Overkill +6',
      file: 'overkill_plus6.jpg', overkill: true,
    })),
    ...Array(4).fill(null).map((_, i) => ({
      color: 'wild', value: 'x2', name: 'Multiplicador x2',
      file: 'overkill_x2.jpg', overkill: true,
    })),
    ...Array(4).fill(null).map((_, i) => ({
      color: 'wild', value: 'dice', name: 'Dado del Destino',
      file: 'overkill_dice.jpg', overkill: true,
    })),
    ...Array(4).fill(null).map((_, i) => ({
      color: 'wild', value: 'flush', name: 'Flush',
      file: 'overkill_flush.jpg', overkill: true,
    })),
  ],
};

/**
 * Create a room config for the given mode, optionally merging user overrides.
 * @param {'classic'|'overkill'} mode
 * @param {Partial<typeof DEFAULT_CONFIG>} overrides - admin customizations
 * @returns {typeof DEFAULT_CONFIG}
 */
export function createConfig(mode = 'classic', overrides = {}) {
  const base = mode === 'overkill' ? OVERKILL_CONFIG : DEFAULT_CONFIG;
  return { ...base, ...overrides, mode: base.mode };
}

/**
 * Returns the subset of config that is safe to send to clients.
 * Never expose internal server flags.
 */
export function clientConfig(config) {
  return {
    mode:                config.mode,
    cardsPerPlayer:      config.cardsPerPlayer,
    turnDuration:        config.turnDuration,
    maxHandSize:         config.maxHandSize,
    maxDrawsPerTurn:     config.maxDrawsPerTurn,
    deckMultiplier:      config.deckMultiplier,
    stackingEnabled:     config.stackingEnabled,
    munoShoutEnabled:    config.munoShoutEnabled,
    inactivityKickTurns: config.inactivityKickTurns,
    jumpInEnabled:       config.jumpInEnabled,
    zeroRotatesHands:    config.zeroRotatesHands,
    sevenSwapsHands:     config.sevenSwapsHands,
  };
}
