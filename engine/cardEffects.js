// engine/cardEffects.js
// ─── Card Effects Registry ─────────────────────────────────────────────────────
// Each card value maps to a function that mutates gameState and returns metadata.
// Context object (ctx) contains: { myIdx, numPlayers, room, io, config }
//
// Return shape: { nextStep, newDir, effectName, ...extraData }
//   nextStep: how many turn steps to advance (1 = next player, 2 = skip one, etc.)
//   newDir:   gs.direction (may be flipped by reverse)
//   effectName: string identifier sent to clients for animations

import { ensureDeckHasCards } from './gameState.js';

// ── Classic Card Effects ───────────────────────────────────────────────────────

function effectPlus2(gs, ctx) {
  gs.drawStackCount += 2;
  return { nextStep: 1, newDir: gs.direction, effectName: 'draw2' };
}

function effectPlus4(gs, ctx) {
  gs.drawStackCount += 4;
  return { nextStep: 1, newDir: gs.direction, effectName: 'draw4' };
}

function effectSkip(gs, ctx) {
  gs.drawStackCount = 0;
  return { nextStep: 2, newDir: gs.direction, effectName: 'skip' };
}

function effectReverse(gs, ctx) {
  const { numPlayers } = ctx;
  gs.drawStackCount = 0;
  if (numPlayers === 2) {
    // In 2-player, reverse acts as skip
    return { nextStep: 2, newDir: gs.direction, effectName: 'reverse' };
  }
  const newDir = gs.direction * -1;
  gs.direction = newDir;
  return { nextStep: 1, newDir, effectName: 'reverse' };
}

function effectWild(gs, ctx) {
  // Color is handled separately by the caller (chosenColor)
  gs.drawStackCount = 0;
  return { nextStep: 1, newDir: gs.direction, effectName: 'wild' };
}

// ── Overkill Card Effects ──────────────────────────────────────────────────────

function effectPlus6(gs, ctx) {
  gs.drawStackCount += 6;
  return { nextStep: 1, newDir: gs.direction, effectName: 'plus6' };
}

function effectX2(gs, ctx) {
  // Multiply current draw stack by 2 (minimum 2 if stack was 0)
  gs.drawStackCount = gs.drawStackCount > 0 ? gs.drawStackCount * 2 : 2;
  return { nextStep: 1, newDir: gs.direction, effectName: 'multiplyX2' };
}

function effectDice(gs, ctx) {
  const { myIdx, room, io } = ctx;
  const roll = Math.floor(Math.random() * 6) + 1;
  ensureDeckHasCards(gs, roll + 2);
  const drawn = gs.drawPile.splice(0, roll);
  gs.hands[myIdx] = [...(gs.hands[myIdx] || []), ...drawn];
  gs.drawStackCount = 0;
  if (io && room) {
    io.to(room.code).emit('chat:message', {
      system: true,
      text: `🎲 ${room.players[myIdx]?.username} tiró el dado: ¡${roll}! (+${roll} cartas)`,
      timestamp: Date.now()
    });
  }
  return { nextStep: 1, newDir: gs.direction, effectName: 'dice', roll };
}

function effectFlush(gs, ctx) {
  const { myIdx } = ctx;
  const topColor = gs.currentColor;
  const flushed = gs.hands[myIdx].filter(c => c.color === topColor);
  gs.hands[myIdx] = gs.hands[myIdx].filter(c => c.color !== topColor);
  // Return flushed cards to draw pile
  gs.drawPile = [...gs.drawPile, ...flushed];
  gs.drawStackCount = 0;
  return { nextStep: 1, newDir: gs.direction, effectName: 'flush', flushedCount: flushed.length };
}

// Overkill: card 0 — rotate all hands in direction of play
function effectZeroRotate(gs, ctx) {
  const { io, room } = ctx;
  const n = gs.hands.length;
  if (n < 2) return { nextStep: 1, newDir: gs.direction, effectName: 'rotate0' };

  if (gs.direction === 1) {
    // Clockwise: last player gets first player's hand, everyone shifts right
    const saved = gs.hands[n - 1];
    for (let i = n - 1; i > 0; i--) gs.hands[i] = gs.hands[i - 1];
    gs.hands[0] = saved;
  } else {
    // Counter-clockwise
    const saved = gs.hands[0];
    for (let i = 0; i < n - 1; i++) gs.hands[i] = gs.hands[i + 1];
    gs.hands[n - 1] = saved;
  }
  gs.drawStackCount = 0;
  if (io && room) {
    io.to(room.code).emit('chat:message', {
      system: true,
      text: `🌀 ¡Todas las manos rotan!`,
      timestamp: Date.now()
    });
  }
  return { nextStep: 1, newDir: gs.direction, effectName: 'rotate0' };
}

// Overkill: card 7 — swap hands with target player
// targetIdx must be provided in ctx
function effectSevenSwap(gs, ctx) {
  const { myIdx, targetIdx, io, room } = ctx;
  if (targetIdx === undefined || targetIdx === null || targetIdx < 0 || targetIdx >= gs.hands.length || targetIdx === myIdx) {
    return { nextStep: 1, newDir: gs.direction, effectName: 'swap7', targetIdx: -1 };
  }
  const tmp = gs.hands[myIdx];
  gs.hands[myIdx] = gs.hands[targetIdx] || [];
  gs.hands[targetIdx] = tmp;
  gs.drawStackCount = 0;
  if (io && room) {
    const myName = room.players[myIdx]?.username || '?';
    const theirName = room.players[targetIdx]?.username || '?';
    io.to(room.code).emit('chat:message', {
      system: true,
      text: `🔄 ${myName} intercambió su mano con ${theirName}!`,
      timestamp: Date.now()
    });
  }
  return { nextStep: 1, newDir: gs.direction, effectName: 'swap7', targetIdx };
}

// ── Default (numeric card, no effect) ─────────────────────────────────────────

function effectDefault(gs, ctx) {
  gs.drawStackCount = 0;
  return { nextStep: 1, newDir: gs.direction, effectName: null };
}

// ── Effect Dispatch ────────────────────────────────────────────────────────────

const CLASSIC_EFFECTS = {
  '+2': effectPlus2,
  '+4': effectPlus4,
  'skip': effectSkip,
  'reverse': effectReverse,
  'wild': effectWild,
};

const OVERKILL_EXTRA_EFFECTS = {
  '+6': effectPlus6,
  'x2': effectX2,
  'dice': effectDice,
  'flush': effectFlush,
};

/**
 * Apply the effect of a played card to the game state.
 *
 * @param {object} card - the card that was played
 * @param {object} gs - game state (mutated in place)
 * @param {object} ctx - context: { myIdx, numPlayers, room, io, config, targetIdx? }
 * @returns {{ nextStep, newDir, effectName, ...extra }}
 */
export function applyCardEffect(card, gs, ctx) {
  const { config } = ctx;
  const value = card.value;

  // ── Overkill-only 0 and 7 overrides ──────────────────────────────────────
  if (config.zeroRotatesHands && value === '0') {
    if (ctx.targetIdx === -1) return effectDefault(gs, ctx);
    return effectZeroRotate(gs, ctx);
  }
  if (config.sevenSwapsHands && value === '7') {
    if (ctx.targetIdx === -1) return effectDefault(gs, ctx);
    return effectSevenSwap(gs, ctx);
  }

  // ── Classic effects ────────────────────────────────────────────────────────
  if (CLASSIC_EFFECTS[value]) {
    return CLASSIC_EFFECTS[value](gs, ctx);
  }

  // ── Overkill extra wild effects ────────────────────────────────────────────
  if (OVERKILL_EXTRA_EFFECTS[value]) {
    return OVERKILL_EXTRA_EFFECTS[value](gs, ctx);
  }

  // ── Default: numeric or unknown card ──────────────────────────────────────
  return effectDefault(gs, ctx);
}

// Export individual effects for unit testing
export { effectPlus2, effectPlus4, effectSkip, effectReverse,
         effectWild, effectPlus6, effectX2, effectDice, effectFlush,
         effectZeroRotate, effectSevenSwap };
