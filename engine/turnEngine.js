// engine/turnEngine.js
// ─── Turn Navigation & Timeout Handling ───────────────────────────────────────
// getNextIdx: resolves the next active player index (skips disconnected players)
// handleTurnTimeout: processes AFK timeouts and auto-kick logic

import { ensureDeckHasCards } from './gameState.js';

/**
 * Get the index of the player whose turn comes next.
 * Skips disconnected players. Handles direction.
 *
 * @param {number} current - current player index
 * @param {object|number} roomOrTotal - room object (preferred) or total player count
 * @param {number} step - how many steps to advance (1=next, 2=skip one)
 * @param {number} dir - direction (1=clockwise, -1=counter-clockwise)
 * @returns {number} next player index
 */
export function getNextIdx(current, roomOrTotal, step = 1, dir = 1) {
  const room = typeof roomOrTotal === 'object' ? roomOrTotal : null;
  const total = room ? room.players.length : roomOrTotal;
  if (total <= 1) return 0;

  if (!room) {
    // Simple modulo — no skip of disconnected players
    let next = (current + step * dir) % total;
    if (next < 0) next += total;
    return next;
  }

  // Room-aware: skip disconnected players
  const connectedPlayers = room.players.filter(p => p.connected !== false);
  if (connectedPlayers.length === 0) return 0;
  if (connectedPlayers.length === 1) return connectedPlayers[0].playerIdx;

  let curr = current;
  for (let s = 0; s < step; s++) {
    let next = (curr + dir) % total;
    if (next < 0) next += total;

    let count = 0;
    while (room.players[next] && room.players[next].connected === false && count < total) {
      next = (next + dir) % total;
      if (next < 0) next += total;
      count++;
    }
    curr = next;
  }
  return curr;
}

/**
 * Handle an expired turn (AFK timeout).
 * First offense: +2 penalty cards, advance turn.
 * Second consecutive offense: kick the player.
 *
 * @param {object} room - room object (mutated)
 * @param {object} io - Socket.IO server instance
 */
export function handleTurnTimeout(room, io) {
  const gs = room.gameState;
  if (!gs || room.status !== 'playing') return;

  // Guard against double-execution on overlapping ticks
  if (gs._processingTimeout) return;
  gs._processingTimeout = true;

  const myIdx = gs.currentTurnIdx;
  const player = room.players[myIdx];
  if (!player) { gs._processingTimeout = false; return; }

  const config = room.config;
  const kickThreshold = config?.inactivityKickTurns ?? 2;

  player.consecutiveTimeouts = (player.consecutiveTimeouts || 0) + 1;

  if (player.consecutiveTimeouts >= kickThreshold) {
    // ── KICK ─────────────────────────────────────────────────────────────────
    const kickedUsername = player.username;
    console.log(`[AUTO KICK] Kicking ${kickedUsername} from room ${room.code} due to ${kickThreshold} consecutive timeouts`);

    // Return their cards to preserve total card count
    if (gs.hands[myIdx] && gs.hands[myIdx].length > 0) {
      gs.drawPile.push(...gs.hands[myIdx]);
    }

    room.players.splice(myIdx, 1);
    gs.hands.splice(myIdx, 1);
    room.players.forEach((p, i) => { p.playerIdx = i; });

    io.to(room.code).emit('chat:message', {
      system: true,
      text: `⚙️ ${kickedUsername} fue expulsado por inactividad (${kickThreshold} turnos sin responder).`,
      timestamp: Date.now()
    });

    if (room.players.length < 2) {
      room.status = 'finished';
      gs.winner = 0;
      io.to(room.code).emit('chat:message', {
        system: true,
        text: '🏁 Partida finalizada por falta de jugadores.',
        timestamp: Date.now()
      });
    } else {
      gs.currentTurnIdx = getNextIdx(myIdx % room.players.length, room, 1, gs.direction);
      gs.hasDrawnThisTurn = false;
      gs.drawsThisTurn = 0;
      gs.turnStartedAt = Date.now();
      delete gs._processingTimeout;
    }
    return;
  }

  // ── PENALTY (1st timeout) ──────────────────────────────────────────────────
  ensureDeckHasCards(gs, 5);
  const drawn = gs.drawPile.splice(0, 2);
  gs.hands[myIdx] = [...(gs.hands[myIdx] || []), ...drawn];

  io.to(room.code).emit('chat:message', {
    system: true,
    text: `⏱️ ${player.username} se quedó sin tiempo (${player.consecutiveTimeouts}/${kickThreshold}) y recibe 2 cartas.`,
    timestamp: Date.now()
  });

  gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
  delete gs.munoShoutedBy[myIdx];
  gs.hasDrawnThisTurn = false;
  gs.drawsThisTurn = 0;
  gs.turnStartedAt = Date.now();
  delete gs._processingTimeout;
}
