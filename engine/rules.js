// engine/rules.js
// ─── Game Rules — Pure Validation Functions ────────────────────────────────────
// All functions are pure (no side effects, no global state).
// They receive the current state and config, and return a boolean or result.

/**
 * Cards that can counter an active draw stack.
 * In classic: only +2 and +4.
 * In overkill: also +6 and x2.
 * @param {object} config
 * @returns {string[]}
 */
export function getDefenseCards(config) {
  if (config.mode === 'overkill') return ['+2', '+4', '+6', 'x2'];
  return ['+2', '+4'];
}

/**
 * Can this card be played on the current discard pile?
 * @param {object} card - card to play
 * @param {object} topCard - top of discard pile
 * @param {string} currentColor - active color (may differ from topCard.color after wild)
 * @param {number} drawStackCount - accumulated draw penalty
 * @param {object} config - room.config
 * @returns {boolean}
 */
export function canPlay(card, topCard, currentColor, drawStackCount, config) {
  // If there is an active draw stack, ONLY defense cards are playable
  if (drawStackCount > 0) {
    return getDefenseCards(config).includes(card.value);
  }
  // Wilds are always playable
  if (card.color === 'wild') return true;
  // Same color as current active color
  if (card.color === currentColor) return true;
  // Same value regardless of color (e.g. red 5 on blue 5)
  if (card.value === topCard.value) return true;
  return false;
}

/**
 * Can a player interrupt out-of-turn with this card? (Overkill: Jump-In)
 * Jump-In requires an IDENTICAL card (same color + same value, or same wild value).
 * @param {object} card - card in player's hand
 * @param {object} topCard - top of discard pile
 * @param {object} config - room.config
 * @returns {boolean}
 */
export function canJumpIn(card, topCard, config, currentColor = null) {
  if (!config || !config.jumpInEnabled) return false;
  if (!card || !topCard) return false;
  const activeColor = currentColor || topCard.color;
  if (card.color === 'wild' && topCard.color === 'wild') {
    return card.value === topCard.value;
  }
  const isColorMatch = card.color === topCard.color || card.color === activeColor;
  return isColorMatch && card.value === topCard.value;
}

/**
 * Is this card value a number (non-action card)?
 * @param {string} value
 * @returns {boolean}
 */
export function isNumericCard(value) {
  return /^[0-9]$/.test(value);
}

/**
 * Check if a player needs to shout MUNO before playing their second-to-last card.
 * @param {number} handSizeAfterPlay - hand size AFTER the card is played
 * @param {boolean} hasShoutedMuno - whether the player already shouted
 * @returns {'penalty'|'valid_muno'|null}
 */
export function checkMunoRule(handSizeAfterPlay, hasShoutedMuno, config) {
  if (!config.munoShoutEnabled) return null;
  if (handSizeAfterPlay === 1) {
    return hasShoutedMuno ? 'valid_muno' : 'penalty';
  }
  return null;
}

/**
 * Validate that the player's hand draw request is legal.
 * @returns {{ allowed: boolean, reason: string|null, autoPass: boolean }}
 */
export function validateDraw(gs, myIdx, config) {
  const hand = gs.hands[myIdx] || [];

  if (hand.length >= config.maxHandSize) {
    return { allowed: false, reason: 'max_hand', autoPass: true };
  }

  // If no stack penalty and already drew max times this turn
  if (gs.drawStackCount === 0 && (gs.drawsThisTurn || 0) >= config.maxDrawsPerTurn) {
    return { allowed: false, reason: 'max_draws', autoPass: true };
  }

  return { allowed: true, reason: null, autoPass: false };
}
