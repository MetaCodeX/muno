// engine/gameState.js
// ─── Game State Factory & View Builder ────────────────────────────────────────
// initGameState: creates a fresh game state for a room
// buildStateForPlayer: returns a partial view (hides opponents' hands)
// ensureDeckHasCards: refill draw pile when running low

import { buildDeck } from './deck.js';
import { clientConfig } from './config.js';

/**
 * Ensure the draw pile has at least `min` cards.
 * Refills from a fresh deck rather than recycling the discard pile
 * (simpler, preserves card count stability).
 * @param {object} gs - game state
 * @param {number} min
 */
export function ensureDeckHasCards(gs, min = 10) {
  if (gs.drawPile.length < min) {
    const fresh = buildDeck(gs._config || { deckMultiplier: 3, customCards: [] }, 'refill');
    gs.drawPile = [...gs.drawPile, ...fresh];
  }
}

/**
 * Initialize a fresh game state for a room.
 * Uses room.config to determine cards per player, turn duration, etc.
 * @param {object} room
 * @returns {object} gameState
 */
export function initGameState(room) {
  const config = room.config;
  const numPlayers = room.players.length;
  const deck = buildDeck(config, 'g');

  const { cardsPerPlayer, turnDuration } = config;
  const hands = [];

  for (let i = 0; i < numPlayers; i++) {
    hands.push(deck.splice(0, cardsPerPlayer));
  }

  // First discard card — cannot be +4
  let topCard = deck.shift();
  while (topCard && topCard.value === '+4') {
    deck.push(topCard);
    topCard = deck.shift();
  }

  let startDir = 1;
  let startTurn = 0;
  let startColor = topCard.color === 'wild' ? 'red' : topCard.color;

  if (topCard.value === 'skip') startTurn = 1;
  if (topCard.value === 'reverse') { startDir = -1; startTurn = numPlayers - 1; }

  return {
    hands,
    drawPile: deck,
    discardPile: [topCard],
    currentTurnIdx: startTurn,
    direction: startDir,
    currentColor: startColor,
    drawStackCount: 0,
    munoShoutedBy: {},
    winner: null,
    turnStartedAt: Date.now(),
    turnDuration,
    hasDrawnThisTurn: false,
    drawsThisTurn: 0,
    // Store config reference for ensureDeckHasCards refills
    _config: config,
  };
}

/**
 * Build a player-specific view of the game state.
 * Hides all other players' hands (only sends hand sizes).
 * Adds mode/config info so the client can render the correct UI.
 * @param {object} gs - full game state
 * @param {object} room - room object
 * @param {number} viewerIdx - which player is receiving this
 * @returns {object} safe partial game state
 */
export function buildStateForPlayer(gs, room, viewerIdx) {
  return {
    myHand: gs.hands[viewerIdx] || [],
    handSizes: gs.hands.map(h => h.length),
    topCard: gs.discardPile[gs.discardPile.length - 1],
    drawPileCount: gs.drawPile.length,
    currentTurnIdx: gs.currentTurnIdx,
    direction: gs.direction,
    currentColor: gs.currentColor,
    drawStackCount: gs.drawStackCount,
    munoShoutedBy: gs.munoShoutedBy,
    winner: gs.winner,
    turnStartedAt: gs.turnStartedAt,
    turnDuration: gs.turnDuration,
    hasDrawnThisTurn: gs.hasDrawnThisTurn,
    // Mode awareness for client rendering
    mode: room.config?.mode || 'classic',
    config: clientConfig(room.config || {}),
    players: room.players.map((p, i) => ({
      sessionId: p.sessionId,
      username: p.username,
      color: p.color,
      isAdmin: p.sessionId === room.adminSessionId,
      connected: p.connected,
      playerIdx: i,
      handSize: gs.hands[i]?.length ?? 0
    }))
  };
}
