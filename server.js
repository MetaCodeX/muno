import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'child_process';

// ─── Engine Imports ────────────────────────────────────────────────────────────
import { createConfig, clientConfig, PLAYER_COLORS } from './engine/config.js';
import { canPlay, canJumpIn, validateDraw, checkMunoRule } from './engine/rules.js';
import { applyCardEffect } from './engine/cardEffects.js';
import { initGameState, buildStateForPlayer, ensureDeckHasCards } from './engine/gameState.js';
import { getNextIdx, handleTurnTimeout } from './engine/turnEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  pingTimeout: 20000,
  pingInterval: 10000
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
// rooms: Map<roomCode, RoomState>
const rooms = new Map();
// playerSessions: Map<sessionId, { roomCode, playerIdx }>
const playerSessions = new Map();
// userProfiles: Map<userKey, profile>
const userProfiles = new Map();

// ─── DB BRIDGE (Python SQLite) ────────────────────────────────────────────────

function getPublicLeaderboard() {
  try {
    const output = execSync('python3 db_service.py get_leaderboard', { cwd: __dirname }).toString();
    return JSON.parse(output);
  } catch (err) {
    console.error('Error querying leaderboard:', err);
    return [];
  }
}

function getOrCreateUserProfile(userKey, username) {
  if (!userKey || typeof userKey !== 'string') return null;
  // Security: strict allowlist — only alphanumeric, dash, underscore.
  if (!/^[a-zA-Z0-9_\-]{4,80}$/.test(userKey)) {
    console.warn('[SECURITY] Invalid userKey rejected:', String(userKey).slice(0, 40));
    return null;
  }
  try {
    const input = JSON.stringify({ user_key: userKey, username: username || 'Jugador' });
    const output = execSync('python3 db_service.py get_or_create_user', { cwd: __dirname, input, timeout: 5000 }).toString();
    return JSON.parse(output);
  } catch (err) {
    console.error('Error fetching/creating user:', err);
    return { userKey, username, wins: 0, gamesPlayed: 0, achievements: [] };
  }
}

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────

const ROOMS_FILE = path.join(__dirname, 'rooms_backup.json');
let _savePending = false;

function saveRoomsToDisk() {
  if (_savePending) return;
  _savePending = true;
  setTimeout(() => {
    _savePending = false;
    try {
      const data = {
        rooms: Array.from(rooms.entries()),
        playerSessions: Array.from(playerSessions.entries()),
        userProfiles: Array.from(userProfiles.entries())
      };
      fs.writeFile(ROOMS_FILE, JSON.stringify(data), (err) => {
        if (err) console.error('[PERSIST] Error backing up rooms:', err);
      });
    } catch (err) {
      console.error('[PERSIST] Error preparing room backup:', err);
    }
  }, 5000);
}

function loadRoomsFromDisk() {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const raw = fs.readFileSync(ROOMS_FILE, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.rooms) {
      for (const [code, room] of parsed.rooms) {
        if (room.players) {
          room.players.forEach(p => { p.connected = false; p.socketId = null; });
        }
        // Restore config with defaults if missing (backward compat with old saves)
        if (!room.config) room.config = createConfig('classic');
        rooms.set(code, room);
      }
    }
    if (parsed.playerSessions) {
      for (const [sid, sess] of parsed.playerSessions) {
        playerSessions.set(sid, sess);
      }
    }
    if (parsed.userProfiles) {
      for (const [ukey, prof] of parsed.userProfiles) {
        userProfiles.set(ukey, prof);
      }
    }
    console.log(`[PERSISTENCE] Restored ${rooms.size} rooms and ${userProfiles.size} user profiles.`);
  } catch (err) {
    console.error('Error loading room backup:', err);
  }
}

loadRoomsFromDisk();

// ─── ROOM HELPERS ─────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

function createRoom(adminSessionId, adminUsername, mode = 'classic') {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const room = {
    code,
    adminSessionId,
    status: 'lobby',
    linkOpen: true,
    players: [],
    gameState: null,
    chat: [],
    config: createConfig(mode),   // ← mode-driven config from engine
    createdAt: Date.now()
  };

  rooms.set(code, room);
  return room;
}

function getRoomBySession(sessionId, socket = null) {
  const sess = playerSessions.get(sessionId);
  if (!sess) return null;
  const room = rooms.get(sess.roomCode) || null;
  if (room && socket) {
    const player = room.players.find(p => p.sessionId === sessionId);
    if (player) {
      player.socketId = socket.id;
      player.connected = true;
    }
  }
  return room;
}

function broadcastRoom(roomCode, event, data, excludeSocketId = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const player of room.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket && socket.id !== excludeSocketId) {
      socket.emit(event, data);
    }
  }
}

function buildLobbyState(room) {
  return {
    code: room.code,
    status: room.status,
    linkOpen: room.linkOpen,
    mode: room.config?.mode || 'classic',     // ← mode visible in lobby
    config: clientConfig(room.config || {}),  // ← sanitized config for UI
    players: room.players.map(p => ({
      sessionId: p.sessionId,
      username: p.username,
      color: p.color,
      connected: p.connected,
      isAdmin: p.sessionId === room.adminSessionId,
      playerIdx: p.playerIdx
    }))
  };
}

// ─── GAME BROADCAST ───────────────────────────────────────────────────────────

function broadcastGameState(room) {
  const gs = room.gameState;
  if (!gs) return;
  for (let i = 0; i < room.players.length; i++) {
    const player = room.players[i];
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit('game:state', buildStateForPlayer(gs, room, i));
    }
  }
}

// ─── PURGE & LOGGING HELPERS ──────────────────────────────────────────────────

function logRoomEvent(roomCode, username, action, details = '') {
  const time = new Date().toLocaleTimeString();
  console.log(`📡 [${time}] [ROOM ${roomCode}] ${username || 'System'} -> ${action} ${details}`);
}

function purgeDisconnectedPlayers(room) {
  const disconnected = room.players.filter(p => !p.connected);
  if (disconnected.length > 0) {
    room.players = room.players.filter(p => p.connected);
    room.players.forEach((p, i) => { p.playerIdx = i; });
    disconnected.forEach(p => { playerSessions.delete(p.sessionId); });
  }
  return disconnected;
}

// ─── MASTER TICKER ────────────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.status === 'playing' && room.gameState) {
      const gs = room.gameState;
      const elapsed = (now - gs.turnStartedAt) / 1000;
      if (elapsed >= gs.turnDuration) {
        handleTurnTimeout(room, io);
        broadcastGameState(room);
      } else {
        broadcastGameState(room);
      }
    }
  }
}, 1000);

// ─── SOCKET.IO EVENTS ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // ── Sync on reconnect ──────────────────────────────────────────────────────
  socket.on('game:sync', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room) return;
    if (room.status === 'playing' && room.gameState) {
      const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
      socket.emit('game:state', buildStateForPlayer(room.gameState, room, myIdx));
    }
    socket.emit('lobby:update', buildLobbyState(room));
  });

  // ── Create Room ────────────────────────────────────────────────────────────
  socket.on('room:create', ({ username, sessionId: existingSession, deviceId, userKey }) => {
    const username_ = (username || 'Jugador').slice(0, 20).trim() || 'Jugador';
    const sessionId = existingSession || generateSessionId();

    // Remove player from any previous room
    const prevSession = playerSessions.get(sessionId);
    if (prevSession) {
      const prevRoom = rooms.get(prevSession.roomCode);
      if (prevRoom) {
        prevRoom.players = prevRoom.players.filter(p => p.sessionId !== sessionId);
        prevRoom.players.forEach((p, i) => { p.playerIdx = i; });
        if (prevRoom.players.length === 0) {
          rooms.delete(prevRoom.code);
        } else {
          io.to(prevRoom.code).emit('lobby:update', buildLobbyState(prevRoom));
          io.to(prevRoom.code).emit('chat:message', { system: true, text: `${username_} salió de la sala.`, timestamp: Date.now() });
        }
      }
      playerSessions.delete(sessionId);
    }

    const room = createRoom(sessionId, username_);
    const color = PLAYER_COLORS[0];
    const player = { sessionId, deviceId, userKey, username: username_, color, connected: true, socketId: socket.id, playerIdx: 0 };
    if (userKey) getOrCreateUserProfile(userKey, username_);
    room.players.push(player);
    playerSessions.set(sessionId, { roomCode: room.code, playerIdx: 0 });

    socket.join(room.code);
    socket.emit('room:created', { sessionId, roomCode: room.code, color, lobbyState: buildLobbyState(room) });
  });

  // ── Join Room ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomCode, username, sessionId: existingSession, deviceId, userKey }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);
    const username_ = (username || 'Jugador').slice(0, 20).trim() || 'Jugador';

    if (!room) return socket.emit('room:error', { message: `La sala "${code}" no existe.` });

    const isReturningPlayer =
      (existingSession && room.players.some(p => p.sessionId === existingSession)) ||
      (deviceId && deviceId.length > 4 && room.players.some(p => p.deviceId === deviceId));

    if (!room.linkOpen && !isReturningPlayer) {
      return socket.emit('room:error', { message: 'El enlace de esta sala fue cerrado por el admin.' });
    }
    if (room.players.length >= 16 && !isReturningPlayer) {
      return socket.emit('room:error', { message: 'La sala está llena (máximo 16 jugadores).' });
    }

    let sessionId = existingSession;
    let player = room.players.find(p =>
      (existingSession && p.sessionId === existingSession) ||
      (deviceId && deviceId.length > 4 && p.deviceId === deviceId)
    );

    if (player) {
      sessionId = player.sessionId;
      player.connected = true;
      player.socketId = socket.id;
      if (deviceId) player.deviceId = deviceId;
      if (userKey) { player.userKey = userKey; getOrCreateUserProfile(userKey, username_); }
      playerSessions.set(sessionId, { roomCode: code, playerIdx: player.playerIdx });
    } else {
      // New player — deduplicate username
      let finalUsername = username_;
      const takenNames = room.players.map(p => p.username.toLowerCase());
      if (takenNames.includes(finalUsername.toLowerCase())) {
        let suffix = 2;
        while (takenNames.includes(`${finalUsername.toLowerCase()} (${suffix})`)) suffix++;
        finalUsername = `${finalUsername} (${suffix})`;
      }

      sessionId = generateSessionId();
      const idx = room.players.length;
      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
      player = { sessionId, deviceId, userKey, username: finalUsername, color, connected: true, socketId: socket.id, playerIdx: idx };
      if (userKey) getOrCreateUserProfile(userKey, finalUsername);
      room.players.push(player);
      playerSessions.set(sessionId, { roomCode: code, playerIdx: idx });

      // Deal cards if game already running
      if (room.status === 'playing' && room.gameState) {
        const gs = room.gameState;
        ensureDeckHasCards(gs, 10);
        gs.hands[idx] = gs.drawPile.splice(0, room.config.cardsPerPlayer);
      }
    }

    logRoomEvent(code, player.username, 'JOIN_ROOM');

    socket.join(code);
    socket.emit('room:joined', {
      sessionId,
      roomCode: code,
      color: player.color,
      isAdmin: sessionId === room.adminSessionId,
      lobbyState: buildLobbyState(room)
    });

    if (room.status === 'playing' && room.gameState) {
      broadcastGameState(room);
      socket.emit('chat:history', room.chat);
    }

    io.to(code).emit('lobby:update', buildLobbyState(room));
    io.to(code).emit('chat:message', { system: true, text: `${player.username} se conectó.`, timestamp: Date.now() });
  });

  // ── Set Mode (Admin only) ──────────────────────────────────────────────────
  socket.on('room:setMode', ({ sessionId, mode, overrides }) => {
    console.log('[setMode] recv sessionId:', sessionId?.slice(0,8), 'mode:', mode);
    const room = getRoomBySession(sessionId, socket);
    const isAdmin = room?.adminSessionId === sessionId;
    console.log('[setMode] room:', room?.code, '| isAdmin:', isAdmin, '| status:', room?.status);
    if (!room || !isAdmin) return;

    const validModes = ['classic', 'overkill'];
    if (!validModes.includes(mode)) return;

    room.config = createConfig(mode, overrides || {});
    const newMode = room.config.mode;
    console.log('[setMode] emitting lobby:update, mode now:', newMode);

    if (room.status === 'playing' && room.gameState) {
      room.gameState.mode = newMode;
      room.gameState.config = clientConfig(room.config);
      room.gameState._config = room.config;
      broadcastGameState(room);
    }

    io.to(room.code).emit('lobby:update', buildLobbyState(room));
    io.to(room.code).emit('chat:message', {
      system: true,
      text: newMode === 'overkill' ? '🔥 ¡Modo cambiado a OVERKILL en vivo con todas las reglas activadas!' : 'Modo cambiado a Clasico.',
      timestamp: Date.now()
    });
  });

  // ── Toggle Link (Admin only) ───────────────────────────────────────────────
  socket.on('room:toggleLink', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;
    room.linkOpen = !room.linkOpen;
    io.to(room.code).emit('lobby:update', buildLobbyState(room));
    io.to(room.code).emit('chat:message', {
      system: true,
      text: room.linkOpen ? 'El admin abrió el enlace de invitación.' : 'El admin cerró el enlace de invitación.',
      timestamp: Date.now()
    });
  });

  // ── Kick Player (Admin only) ───────────────────────────────────────────────
  socket.on('room:kick', ({ sessionId, targetSessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;
    if (targetSessionId === sessionId) return;
    const target = room.players.find(p => p.sessionId === targetSessionId);
    if (!target) return;

    room.players = room.players.filter(p => p.sessionId !== targetSessionId);
    room.players.forEach((p, i) => { p.playerIdx = i; });
    playerSessions.delete(targetSessionId);

    const targetSocket = io.sockets.sockets.get(target.socketId);
    if (targetSocket) {
      targetSocket.emit('room:kicked', { message: 'Fuiste expulsado de la sala.' });
      targetSocket.leave(room.code);
    }

    io.to(room.code).emit('lobby:update', buildLobbyState(room));
    io.to(room.code).emit('chat:message', { system: true, text: `${target.username} fue expulsado.`, timestamp: Date.now() });
  });

  // ── Start Game (Admin only) ────────────────────────────────────────────────
  socket.on('game:start', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;
    if (room.status !== 'lobby') return;

    purgeDisconnectedPlayers(room);

    if (room.players.length < 2) {
      return socket.emit('room:error', { message: 'Necesitas al menos 2 jugadores conectados para iniciar.' });
    }

    room.status = 'playing';
    room.gameState = initGameState(room);  // ← uses room.config from engine

    logRoomEvent(room.code, room.players[0]?.username, 'START_GAME');

    io.to(room.code).emit('game:started', {
      players: room.players.map(p => ({ sessionId: p.sessionId, username: p.username, color: p.color, playerIdx: p.playerIdx })),
      mode: room.config.mode
    });
    broadcastGameState(room);
    io.to(room.code).emit('chat:message', { system: true, text: '¡La partida comenzó! Buena suerte a todos.', timestamp: Date.now() });
  });

  // ── Play Card ──────────────────────────────────────────────────────────────
  socket.on('game:playCard', ({ sessionId, cardId, chosenColor, targetIdx: chosenTarget }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const config = room.config;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return socket.emit('game:error', { message: 'No es tu turno.' });
    if (room.players[myIdx]) room.players[myIdx].consecutiveTimeouts = 0;

    const hand = gs.hands[myIdx];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return socket.emit('game:error', { message: 'Carta no encontrada.' });

    const card = hand[cardIdx];
    const topCard = gs.discardPile[gs.discardPile.length - 1];

    // ── Validation ────────────────────────────────────────────────────────────
    if (!canPlay(card, topCard, gs.currentColor, gs.drawStackCount, config)) {
      return socket.emit('game:error', { message: 'No puedes jugar esa carta.' });
    }

    logRoomEvent(room.code, room.players[myIdx]?.username, 'PLAY_CARD', `${card.name} (target: ${chosenTarget ?? 'none'}, color: ${chosenColor || 'none'})`);

    // Remove card from hand
    gs.hands[myIdx] = hand.filter((_, i) => i !== cardIdx);

    const playedCard = {
      ...card,
      playedBy: room.players[myIdx]?.username || 'Jugador',
      playedByIdx: myIdx,
      playedAt: Date.now()
    };
    gs.discardPile.push(playedCard);

    // Move history
    if (!room.moveHistory) room.moveHistory = [];
    room.moveHistory.push({
      playerIdx: myIdx,
      username: room.players[myIdx]?.username,
      cardName: card.name,
      cardColor: card.color,
      cardValue: card.value,
      timestamp: Date.now()
    });
    if (room.moveHistory.length > 200) room.moveHistory = room.moveHistory.slice(-200);

    // ── Apply card effect (engine) ────────────────────────────────────────────
    const numPlayers = room.players.length;
    const { nextStep, newDir, effectName, ...effectData } = applyCardEffect(card, gs, {
      myIdx,
      numPlayers,
      room,
      io,
      config,
      targetIdx: chosenTarget,  // for card 7 swap in Overkill
    });

    // ── Set active color ───────────────────────────────────────────────────────
    if (card.color === 'wild' && chosenColor) {
      gs.currentColor = chosenColor;
    } else if (card.color !== 'wild') {
      gs.currentColor = card.color;
    }
    // If wild and no chosenColor, color stays as was (shouldn't happen)

    // ── MUNO rule ─────────────────────────────────────────────────────────────
    const remainingCards = gs.hands[myIdx].length;
    const munoResult = checkMunoRule(remainingCards, !!gs.munoShoutedBy[myIdx], config);
    if (munoResult === 'penalty') {
      ensureDeckHasCards(gs, 5);
      const drawn = gs.drawPile.splice(0, 2);
      gs.hands[myIdx] = [...gs.hands[myIdx], ...drawn];
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `⚠️ ¡${room.players[myIdx].username} no gritó MUNO y recibe +2 cartas de castigo!`,
        timestamp: Date.now()
      });
    } else if (munoResult === 'valid_muno') {
      io.to(room.code).emit('game:munoAnnounce', { playerIdx: myIdx, username: room.players[myIdx].username });
      delete gs.munoShoutedBy[myIdx];
    }

    // ── Check win ─────────────────────────────────────────────────────────────
    if (gs.hands[myIdx].length === 0) {
      gs.winner = myIdx;
      room.status = 'finished';
      const winnerPlayer = room.players[myIdx];
      const playerKeysNames = room.players.map(p => [p.userKey || p.deviceId, p.username]);
      const winnerKey = winnerPlayer.userKey || winnerPlayer.deviceId;
      try {
        const input = JSON.stringify({
          room_code: room.code,
          winner_key: winnerKey,
          winner_name: winnerPlayer.username,
          player_keys_names: playerKeysNames
        });
        execSync('python3 db_service.py record_win', { cwd: __dirname, input, timeout: 5000 });
      } catch (err) {
        console.error('Error recording win:', err);
      }
      saveRoomsToDisk();
      io.emit('leaderboard:update', getPublicLeaderboard());
      io.to(room.code).emit('game:winner', { playerIdx: myIdx, username: winnerPlayer.username, color: winnerPlayer.color });
      io.to(room.code).emit('chat:message', { system: true, text: `${winnerPlayer.username} gano la partida.`, timestamp: Date.now() });
      broadcastGameState(room);
      return;
    }

    // ── Advance turn ──────────────────────────────────────────────────────────
    let targetIdx = getNextIdx(myIdx, room, nextStep, newDir);

    // Auto-apply draw stack if next player has no defense
    if (gs.drawStackCount > 0) {
      const nextHand = gs.hands[targetIdx] || [];
      const defenseCards = config.mode === 'overkill'
        ? ['+2', '+4', '+6', 'x2']
        : ['+2', '+4'];
      const hasDefense = nextHand.some(c => defenseCards.includes(c.value));
      if (!hasDefense) {
        ensureDeckHasCards(gs, gs.drawStackCount + 5);
        const penalty = gs.drawPile.splice(0, gs.drawStackCount);
        gs.hands[targetIdx] = [...nextHand, ...penalty];
        const penalized = room.players[targetIdx];
        io.to(room.code).emit('chat:message', {
          system: true,
          text: `${penalized.username} no tiene defensa y recibe +${gs.drawStackCount} cartas.`,
          timestamp: Date.now()
        });
        gs.drawStackCount = 0;
      }
    }

    gs.currentTurnIdx = targetIdx;

    // Clear munoShoutedBy for players with more than 2 cards
    for (let pI = 0; pI < numPlayers; pI++) {
      if ((gs.hands[pI]?.length || 0) > 2) {
        delete gs.munoShoutedBy[pI];
      }
    }

    gs.hasDrawnThisTurn = false;
    gs.drawsThisTurn = 0;
    gs.turnStartedAt = Date.now();

    io.to(room.code).emit('game:cardPlayed', {
      playerIdx: myIdx,
      card: { ...card, value: card.value },
      chosenColor,
      drawStackCount: gs.drawStackCount,
      nextTurnIdx: targetIdx,
      cardEffect: effectName,
      ...effectData
    });

    broadcastGameState(room);
  });

  // ── Draw Card ──────────────────────────────────────────────────────────────
  socket.on('game:drawCard', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const config = room.config;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return socket.emit('game:error', { message: 'No es tu turno.' });
    if (room.players[myIdx]) room.players[myIdx].consecutiveTimeouts = 0;

    const { allowed, reason, autoPass } = validateDraw(gs, myIdx, config);

    if (!allowed) {
      if (reason === 'max_hand') {
        socket.emit('game:error', { message: `Límite de ${config.maxHandSize} cartas en mano.` });
      } else if (reason === 'max_draws') {
        socket.emit('game:error', { message: `Límite de ${config.maxDrawsPerTurn} robos este turno.` });
        io.to(room.code).emit('chat:message', {
          system: true,
          text: `${room.players[myIdx].username} alcanzo el limite de robos. Pasa automaticamente.`,
          timestamp: Date.now()
        });
      }
      if (autoPass) {
        gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
        gs.hasDrawnThisTurn = false;
        gs.drawsThisTurn = 0;
        gs.turnStartedAt = Date.now();
        broadcastGameState(room);
      }
      return;
    }

    ensureDeckHasCards(gs, 5);

    let drawCount = 1;
    if (gs.drawStackCount > 0) {
      drawCount = gs.drawStackCount;
      gs.drawStackCount = 0;
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `${room.players[myIdx].username} recibio la penalizacion (+${drawCount} cartas).`,
        timestamp: Date.now()
      });
    } else {
      gs.drawsThisTurn = (gs.drawsThisTurn || 0) + 1;
    }

    logRoomEvent(room.code, room.players[myIdx]?.username, 'DRAW_CARD', `(count: ${drawCount})`);

    const drawn = gs.drawPile.splice(0, drawCount);
    gs.hands[myIdx] = [...(gs.hands[myIdx] || []), ...drawn];
    gs.hasDrawnThisTurn = true;

    // Auto-pass on max draws
    if (gs.drawStackCount === 0 && gs.drawsThisTurn >= config.maxDrawsPerTurn) {
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `${room.players[myIdx].username} alcanzo el limite de robos. Pasa automaticamente.`,
        timestamp: Date.now()
      });
      gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
      gs.hasDrawnThisTurn = false;
      gs.drawsThisTurn = 0;
      gs.turnStartedAt = Date.now();
    }

    io.to(room.code).emit('game:cardDrawn', { playerIdx: myIdx, count: drawCount });
    broadcastGameState(room);
  });

  // ── Pass Turn ──────────────────────────────────────────────────────────────
  socket.on('game:passTurn', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return;
    if (!gs.hasDrawnThisTurn) return;

    gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
    gs.munoShoutedBy = {};
    gs.hasDrawnThisTurn = false;
    gs.drawsThisTurn = 0;
    gs.turnStartedAt = Date.now();
    delete gs._processingTimeout;
    broadcastGameState(room);
  });

  // ── Client Timeout Fallback ────────────────────────────────────────────────
  socket.on('game:timeout', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return;
    const elapsed = (Date.now() - gs.turnStartedAt) / 1000;
    if (elapsed >= gs.turnDuration - 2) {
      handleTurnTimeout(room, io);
      broadcastGameState(room);
    }
  });

  // ── Jump-In (Overkill only) ────────────────────────────────────────────────
  socket.on('game:jumpIn', ({ sessionId, cardId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const config = room.config;

    if (!config.jumpInEnabled) {
      return socket.emit('game:error', { message: 'Jump-In solo está disponible en modo Overkill.' });
    }

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx === -1 || myIdx === gs.currentTurnIdx) return; // Can't jump-in on your own turn

    const hand = gs.hands[myIdx] || [];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return socket.emit('game:error', { message: 'Carta no encontrada.' });

    const card = hand[cardIdx];
    const topCard = gs.discardPile[gs.discardPile.length - 1];

    if (!canJumpIn(card, topCard, config, gs.currentColor)) {
      return socket.emit('game:error', { message: 'No puedes hacer Jump-In con esa carta.' });
    }

    // Interrupt: take over the turn
    gs.currentTurnIdx = myIdx;
    gs.hasDrawnThisTurn = false;
    gs.drawsThisTurn = 0;
    gs.turnStartedAt = Date.now();
    if (room.players[myIdx]) room.players[myIdx].consecutiveTimeouts = 0;

    // Play the Jump-In card automatically
    gs.hands[myIdx] = hand.filter((_, i) => i !== cardIdx);

    const playedCard = {
      ...card,
      playedBy: room.players[myIdx]?.username || 'Jugador',
      playedByIdx: myIdx,
      playedAt: Date.now()
    };
    gs.discardPile.push(playedCard);
    gs.topCard = card;

    if (card.color !== 'wild') {
      gs.currentColor = card.color;
    }

    io.to(room.code).emit('chat:message', {
      system: true,
      text: `${room.players[myIdx].username} hizo Jump-In.`,
      timestamp: Date.now()
    });

    // Notify all players of card played event
    io.to(room.code).emit('game:cardPlayed', {
      playerIdx: myIdx,
      card,
      chosenColor: null,
      drawStackCount: gs.drawStackCount,
      cardEffect: null
    });

    // Check win
    if (gs.hands[myIdx].length === 0) {
      gs.winner = myIdx;
      room.status = 'finished';
      try {
        const input = JSON.stringify({
          winner: room.players[myIdx]?.username,
          playersCount: room.players.length,
          roomCode: room.code
        });
        execSync('python3 db_service.py record_win', { cwd: __dirname, input, timeout: 5000 });
      } catch (err) { console.error('Error recording win:', err); }
      saveRoomsToDisk();
      io.emit('leaderboard:update', getPublicLeaderboard());
      io.to(room.code).emit('game:winner', { playerIdx: myIdx, username: room.players[myIdx]?.username, color: room.players[myIdx]?.color });
      io.to(room.code).emit('chat:message', { system: true, text: `${room.players[myIdx]?.username} gano la partida.`, timestamp: Date.now() });
      broadcastGameState(room);
      return;
    }

    // Apply card effect (e.g. skip, reverse, draw cards)
    const numPlayers = room.players.length;
    const { nextStep, newDir } = applyCardEffect(card, gs, {
      myIdx,
      numPlayers,
      room,
      io,
      config
    });

    // Advance turn
    gs.currentTurnIdx = getNextIdx(myIdx, room, nextStep, newDir);
    gs.direction = newDir;
    gs.hasDrawnThisTurn = false;
    gs.drawsThisTurn = 0;
    gs.turnStartedAt = Date.now();

    saveRoomsToDisk();
    broadcastGameState(room);
  });

  // ── Shout MUNO ─────────────────────────────────────────────────────────────
  socket.on('game:shoutMuno', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    if (!room.config.munoShoutEnabled) return;
    const gs = room.gameState;
    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    const hand = gs.hands[myIdx] || [];

    if (hand.length <= 2) {
      gs.munoShoutedBy[myIdx] = true;
      io.to(room.code).emit('chat:message', {
        system: false,
        text: `¡MUNO!`,
        senderName: room.players[myIdx].username,
        senderColor: room.players[myIdx].color,
        timestamp: Date.now()
      });
      broadcastGameState(room);
    }
  });

  // ── Select Wild Color ──────────────────────────────────────────────────────
  socket.on('game:selectColor', ({ sessionId, color }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return;
    const validColors = ['red', 'blue', 'green', 'yellow'];
    if (!validColors.includes(color)) return;
    gs.currentColor = color;
    io.to(room.code).emit('game:cardPlayed', {
      playerIdx: myIdx,
      card: { color: 'wild', value: 'wild', name: 'Comodín' },
      chosenColor: color,
      drawStackCount: gs.drawStackCount,
      nextTurnIdx: gs.currentTurnIdx
    });
    broadcastGameState(room);
  });

  // ── Rematch (Admin only) ───────────────────────────────────────────────────
  socket.on('game:rematch', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;
    purgeDisconnectedPlayers(room);
    room.status = 'lobby';
    room.linkOpen = true;
    room.gameState = null;
    io.to(room.code).emit('game:rematch');
    io.to(room.code).emit('lobby:update', buildLobbyState(room));
  });

  // ── Chat ───────────────────────────────────────────────────────────────────
  socket.on('chat:send', ({ sessionId, text }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room) return;
    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) return;
    const msg = {
      system: false,
      senderName: player.username,
      senderColor: player.color,
      text: (text || '').slice(0, 200).trim(),
      timestamp: Date.now()
    };
    if (!msg.text) return;
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat = room.chat.slice(-100);
    io.to(room.code).emit('chat:message', msg);
  });

  // ── Rename ─────────────────────────────────────────────────────────────────
  socket.on('player:setUsername', ({ sessionId, username }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room) return;
    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) return;
    if (room.status === 'playing') return;
    const newName = (username || '').slice(0, 20).trim() || player.username;
    const old = player.username;
    player.username = newName;
    io.to(room.code).emit('lobby:update', buildLobbyState(room));
    if (old !== newName) {
      io.to(room.code).emit('chat:message', { system: true, text: `${old} cambió su nombre a ${newName}.`, timestamp: Date.now() });
    }
  });

  // ── Leaderboard & Profiles ─────────────────────────────────────────────────
  socket.on('leaderboard:get', (ack) => {
    const data = getPublicLeaderboard();
    if (typeof ack === 'function') ack(data);
    else socket.emit('leaderboard:data', data);
  });

  socket.on('user:getProfile', ({ userKey, username }, ack) => {
    if (!userKey) return;
    const prof = getOrCreateUserProfile(userKey, username);
    if (typeof ack === 'function') ack(prof);
    else socket.emit('user:profileData', prof);
  });

  socket.on('user:importKey', ({ newKey, username }, ack) => {
    if (!newKey) return;
    const prof = getOrCreateUserProfile(newKey, username);
    if (typeof ack === 'function') ack({ success: true, profile: prof });
    else socket.emit('user:profileData', prof);
    socket.emit('leaderboard:data', getPublicLeaderboard());
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    for (const [sessionId, sess] of playerSessions) {
      const room = rooms.get(sess.roomCode);
      if (!room) continue;
      const player = room.players.find(p => p.sessionId === sessionId && p.socketId === socket.id);
      if (player) {
        player.connected = false;
        player.socketId = null;

        // Admin transfer
        if (room.adminSessionId === sessionId) {
          const nextOnlineAdmin = room.players.find(p => p.connected !== false && p.sessionId !== sessionId);
          if (nextOnlineAdmin) {
            room.adminSessionId = nextOnlineAdmin.sessionId;
            io.to(room.code).emit('chat:message', {
              system: true,
              text: `👑 ${nextOnlineAdmin.username} es ahora el Administrador.`,
              timestamp: Date.now()
            });
          }
        }

        if (room.status === 'lobby') {
          room.players = room.players.filter(p => p.sessionId !== sessionId);
          room.players.forEach((p, i) => { p.playerIdx = i; });
          playerSessions.delete(sessionId);
          if (room.players.length === 0) rooms.delete(room.code);
        }

        if (room.status === 'playing' && room.gameState) {
          const gs = room.gameState;
          if (gs.currentTurnIdx === player.playerIdx) {
            gs.currentTurnIdx = getNextIdx(player.playerIdx, room, 1, gs.direction);
            gs.turnStartedAt = Date.now();
            gs.hasDrawnThisTurn = false;
          }
          broadcastGameState(room);
        }

        io.to(room.code).emit('lobby:update', buildLobbyState(room));
        saveRoomsToDisk();
        break;
      }
    }
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
  res.json({
    exists: true,
    status: room.status,
    linkOpen: room.linkOpen,
    playerCount: room.players.length,
    mode: room.config?.mode || 'classic'
  });
});

// Catch-all: serve React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Cleanup old empty rooms every 30 minutes ─────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const allDisconnected = room.players.every(p => !p.connected);
    const isOld = now - room.createdAt > 2 * 60 * 60 * 1000;
    if (allDisconnected && isOld) rooms.delete(code);
  }
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🃏 MUNO ${process.env.NODE_ENV || 'dev'} → http://localhost:${PORT}`);
});
