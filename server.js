import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';

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

// ─── ROOM STATE ───────────────────────────────────────────────────────────────
// rooms: Map<roomCode, RoomState>
const rooms = new Map();

// playerSessions: Map<sessionId, { roomCode, playerIdx, username }>
const playerSessions = new Map();
const userProfiles = new Map(); // userKey -> { userKey, username, wins, gamesPlayed, achievements, createdAt, lastSeenAt }

const ACHIEVEMENTS_DEF = {
  first_win: { id: 'first_win', name: 'Primera Victoria', icon: '🏆', desc: 'Gana tu primera partida de MUNO!' },
  veteran_5: { id: 'veteran_5', name: 'Veterano (5 Partidas)', icon: '⚔️', desc: 'Completa 5 partidas de MUNO!' },
  master_10: { id: 'master_10', name: 'Maestro MUNO (10 Victorias)', icon: '👑', desc: 'Acumula 10 victorias en el servidor.' },
  win_streak_3: { id: 'win_streak_3', name: 'Racha Implacable (3 Rondas)', icon: '🔥', desc: 'Consigue una racha de victorias.' },
  duelist_1v1: { id: 'duelist_1v1', name: 'Dominador 1v1', icon: '⚡', desc: 'Gana un duelo 1v1 mano a mano.' },
};

function getOrCreateUserProfile(userKey, username) {
  if (!userKey || typeof userKey !== 'string') return null;
  let profile = userProfiles.get(userKey);
  if (!profile) {
    profile = {
      userKey,
      username: username || 'Jugador MUNO',
      wins: 0,
      gamesPlayed: 0,
      achievements: [],
      createdAt: Date.now(),
      lastSeenAt: Date.now()
    };
    userProfiles.set(userKey, profile);
  } else {
    if (username && username !== profile.username) {
      profile.username = username;
    }
    profile.lastSeenAt = Date.now();
  }
  saveRoomsToDisk();
  return profile;
}

function getPublicLeaderboard() {
  const sorted = Array.from(userProfiles.values())
    .filter(p => p.username && p.gamesPlayed > 0)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const rateA = a.gamesPlayed > 0 ? (a.wins / a.gamesPlayed) : 0;
      const rateB = b.gamesPlayed > 0 ? (b.wins / b.gamesPlayed) : 0;
      return rateB - rateA;
    })
    .slice(0, 50);

  return sorted.map((p, idx) => ({
    rank: idx + 1,
    username: p.username,
    wins: p.wins,
    gamesPlayed: p.gamesPlayed,
    winRate: p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0,
    achievements: (p.achievements || []).map(id => ACHIEVEMENTS_DEF[id]).filter(Boolean),
    lastSeenAt: p.lastSeenAt
  }));
}

const ROOMS_FILE = path.join(__dirname, 'rooms_backup.json');

function saveRoomsToDisk() {
  try {
    const data = {
      rooms: Array.from(rooms.entries()),
      playerSessions: Array.from(playerSessions.entries()),
      userProfiles: Array.from(userProfiles.entries())
    };
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error backing up rooms:', err);
  }
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
    console.log(`[PERSISTENCE] Restored ${rooms.size} active rooms and ${userProfiles.size} user profiles from disk.`);
  } catch (err) {
    console.error('Error loading room backup:', err);
  }
}

loadRoomsFromDisk();

const PLAYER_COLORS = [
  '#00e676', '#0088ff', '#ffc107', '#ff3b5c', '#b000ff',
  '#00d2d3', '#ff9f43', '#54a0ff', '#5f27cd', '#ff6b6b',
  '#10ac84', '#ee5253', '#0abde3', '#f368e0', '#e84393',
  '#00cec9', '#fdcb6e', '#6c5ce7', '#e17055'
];

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

function createRoom(adminSessionId, adminUsername) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const room = {
    code,
    adminSessionId,
    status: 'lobby',       // 'lobby' | 'playing' | 'finished'
    linkOpen: true,        // admin can close this to block new joins
    players: [],           // [{ sessionId, username, color, connected, playerIdx }]
    gameState: null,       // full game state when playing
    chat: [],              // last 100 messages
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

// ─── UNO DECK DEFINITIONS ────────────────────────────────────────────────────
const BASE_DECK = (() => {
  const deck = [];
  const colors = ['red', 'blue', 'green', 'yellow'];
  const files = {
    red: { '0': 'red_0.svg', '1': 'red_1.svg', '2': 'red_2.svg', '3': 'red_3.svg', '4': 'red_4.svg', '5': 'red_5.svg', '6': 'red_6.svg', '7': 'red_7.svg', '8': 'red_8.svg', '9': 'red_9.svg', 'skip': 'red_skip.svg', 'reverse': 'red_reverse.svg', '+2': 'red_draw_2.svg' },
    blue: { '0': 'blue_0.svg', '1': 'blue_1.svg', '2': 'blue_2.svg', '3': 'blue_3.svg', '4': 'blue_4.svg', '5': 'blue_5.svg', '6': 'blue_6.svg', '7': 'blue_7.svg', '8': 'blue_8.svg', '9': 'blue_9.svg', 'skip': 'blue_skip.svg', 'reverse': 'blue_reverse.svg', '+2': 'blue_draw_2.svg' },
    green: { '0': 'green_0.svg', '1': 'green_1.svg', '2': 'green_2.svg', '3': 'green_3.svg', '4': 'green_4.svg', '5': 'green_5.svg', '6': 'green_6.svg', '7': 'green_7.svg', '8': 'green_8.svg', '9': 'green_9.svg', 'skip': 'green_skip.svg', 'reverse': 'green_reverse.svg', '+2': 'green_draw_2.svg' },
    yellow: { '0': 'yellow_0.svg', '1': 'yellow_1.svg', '2': 'yellow_2.svg', '3': 'yellow_3.svg', '4': 'yellow_4.svg', '5': 'yellow_5.svg', '6': 'yellow_6.svg', '7': 'yellow_7.svg', '8': 'yellow_8.svg', '9': 'yellow_9.svg', 'skip': 'yellow_skip.svg', 'reverse': 'yellow_reverse.svg', '+2': 'yellow_draw_2.svg' }
  };

  for (const color of colors) {
    deck.push({ color, value: '0', name: `${color} 0`, file: files[color]['0'] });
    for (let n = 1; n <= 9; n++) {
      deck.push({ color, value: `${n}`, name: `${color} ${n}`, file: files[color][`${n}`] });
      deck.push({ color, value: `${n}`, name: `${color} ${n}`, file: files[color][`${n}`] });
    }
    ['skip', 'reverse', '+2'].forEach(v => {
      deck.push({ color, value: v, name: `${color} ${v}`, file: files[color][v] });
      deck.push({ color, value: v, name: `${color} ${v}`, file: files[color][v] });
    });
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild', name: 'Wild', file: 'wild.svg' });
    deck.push({ color: 'wild', value: '+4', name: 'Wild +4', file: 'wild_draw_4.svg' });
  }

  return deck;
})();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFreshDeck(idPrefix = 'srv') {
  const full = [...BASE_DECK, ...BASE_DECK, ...BASE_DECK];
  return shuffle(full).map((c, i) => ({ ...c, id: `${idPrefix}_${i}_${Math.random().toString(36).substr(2, 5)}` }));
}

function initGameState(room) {
  // ALWAYS use ALL players in room.players order — never filter by connected.
  // broadcastGameState uses room.players indices, so these MUST match.
  const numPlayers = room.players.length;
  const deck = buildFreshDeck('g');
  const CARDS_PER_PLAYER = 7;
  const TURN_DURATION = 30; // seconds per turn

  const hands = [];
  for (let i = 0; i < numPlayers; i++) {
    hands.push(deck.splice(0, CARDS_PER_PLAYER));
  }

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
    turnDuration: TURN_DURATION,
    hasDrawnThisTurn: false,
  };
}

function canPlay(card, topCard, currentColor, drawStackCount) {
  if (drawStackCount > 0) return card.value === '+2' || card.value === '+4';
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

function getNextIdx(current, roomOrTotal, step = 1, dir = 1) {
  const room = typeof roomOrTotal === 'object' ? roomOrTotal : null;
  const total = room ? room.players.length : roomOrTotal;
  if (total <= 1) return 0;

  if (!room) {
    let next = (current + step * dir) % total;
    if (next < 0) next += total;
    return next;
  }

  const connectedPlayers = room.players.filter(p => p.connected !== false);
  if (connectedPlayers.length === 0) return 0;
  if (connectedPlayers.length === 1) return connectedPlayers[0].playerIdx;

  let curr = current;
  for (let s = 0; s < step; s++) {
    let next = (curr + 1 * dir) % total;
    if (next < 0) next += total;

    let count = 0;
    while (room.players[next] && room.players[next].connected === false && count < total) {
      next = (next + 1 * dir) % total;
      if (next < 0) next += total;
      count++;
    }
    curr = next;
  }
  return curr;
}

function ensureDeckHasCards(gs, min = 10) {
  if (gs.drawPile.length < min) {
    const fresh = buildFreshDeck('refill');
    gs.drawPile = [...gs.drawPile, ...fresh];
  }
}

// Build state view for a specific player (hides other players' hands)
function buildStateForPlayer(gs, room, viewerIdx) {
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
  saveRoomsToDisk();
}

function handleTurnTimeout(room) {
  const gs = room.gameState;
  if (!gs || room.status !== 'playing') return;
  const myIdx = gs.currentTurnIdx;
  const player = room.players[myIdx];
  if (!player) return;

  player.consecutiveTimeouts = (player.consecutiveTimeouts || 0) + 1;

  if (player.consecutiveTimeouts >= 2) {
    // KICK INACTIVE PLAYER (2 consecutive turn timeouts)
    const kickedUsername = player.username;
    console.log(`[AUTO KICK] Kicking ${kickedUsername} from room ${room.code} due to 2 consecutive timeouts`);

    // Return their cards back to drawPile so total card count is preserved
    if (gs.hands[myIdx] && gs.hands[myIdx].length > 0) {
      gs.drawPile.push(...gs.hands[myIdx]);
    }

    // Remove player from room.players and gs.hands
    room.players.splice(myIdx, 1);
    gs.hands.splice(myIdx, 1);

    // Re-index remaining players
    for (let i = 0; i < room.players.length; i++) {
      room.players[i].playerIdx = i;
    }

    io.to(room.code).emit('chat:message', {
      system: true,
      text: `⚙️ ${kickedUsername} fue expulsado de la partida por inactividad (2 turnos sin responder).`,
      timestamp: Date.now()
    });

    if (room.players.length < 2) {
      room.status = 'finished';
      gs.winner = 0;
      io.to(room.code).emit('chat:message', { system: true, text: `🏁 Partida finalizada por falta de jugadores suficientes.`, timestamp: Date.now() });
    } else {
      gs.currentTurnIdx = getNextIdx(myIdx % room.players.length, room, 1, gs.direction);
      gs.hasDrawnThisTurn = false;
      gs.drawsThisTurn = 0;
      gs.turnStartedAt = Date.now();
    }

    broadcastGameState(room);
    return;
  }

  // Timeout penalty: auto-draw 2 cards!
  ensureDeckHasCards(gs, 5);
  const drawn = gs.drawPile.splice(0, 2);
  gs.hands[myIdx] = [...(gs.hands[myIdx] || []), ...drawn];
  io.to(room.code).emit('chat:message', { system: true, text: `⏱️ ${player.username} se quedó sin tiempo (1/2 inactividad) y recibe 2 cartas.`, timestamp: Date.now() });

  gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
  delete gs.munoShoutedBy[myIdx];
  gs.hasDrawnThisTurn = false;
  gs.drawsThisTurn = 0;
  gs.turnStartedAt = Date.now();
  broadcastGameState(room);
}

// ── SERVER MASTER TIMER TICKER & REAL-TIME HEARTBEAT ─────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.status === 'playing' && room.gameState) {
      const gs = room.gameState;
      const elapsed = (now - gs.turnStartedAt) / 1000;
      if (elapsed >= gs.turnDuration) {
        handleTurnTimeout(room);
      } else {
        // Continuous Real-Time Heartbeat: Broadcast state to all connected players every second!
        broadcastGameState(room);
      }
    }
  }
}, 1000);

// ─── SOCKET.IO EVENTS ────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // ── Real-Time Sync Request ───────────────────────────────────────────────────
  socket.on('game:sync', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room) return;
    if (room.status === 'playing' && room.gameState) {
      const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
      socket.emit('game:state', buildStateForPlayer(room.gameState, room, myIdx));
    }
    socket.emit('lobby:update', buildLobbyState(room));
  });

  // ── Create Room ─────────────────────────────────────────────────────────────
  socket.on('room:create', ({ username, sessionId: existingSession, deviceId, userKey }) => {
    const username_ = (username || 'Jugador').slice(0, 20).trim() || 'Jugador';
    const sessionId = existingSession || generateSessionId();
    const room = createRoom(sessionId, username_);

    const color = PLAYER_COLORS[0];
    const player = { sessionId, deviceId, userKey, username: username_, color, connected: true, socketId: socket.id, playerIdx: 0 };
    if (userKey) getOrCreateUserProfile(userKey, username_);
    room.players.push(player);
    playerSessions.set(sessionId, { roomCode: room.code, playerIdx: 0 });

    socket.join(room.code);
    socket.emit('room:created', { sessionId, roomCode: room.code, color, lobbyState: buildLobbyState(room) });
  });

  // ── Join Room ────────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomCode, username, sessionId: existingSession, deviceId }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);
    const username_ = (username || 'Jugador').slice(0, 20).trim() || 'Jugador';

    if (!room) return socket.emit('room:error', { message: `La sala "${code}" no existe.` });
    if (!room.linkOpen) return socket.emit('room:error', { message: 'El enlace de esta sala fue cerrado por el admin.' });
    if (room.players.length >= 16 && !room.players.find(p => p.sessionId === existingSession || (deviceId && p.deviceId === deviceId))) {
      return socket.emit('room:error', { message: 'La sala está llena (máximo 16 jugadores).' });
    }

    let sessionId = existingSession;
    let player = room.players.find(p =>
      (existingSession && p.sessionId === existingSession) ||
      (deviceId && p.deviceId === deviceId) ||
      (username_ && p.username.toLowerCase() === username_.toLowerCase())
    );

    if (player) {
      // Re-attach socket & session to existing player slot (Prevents Duplicate Profiles!)
      sessionId = player.sessionId;
      player.connected = true;
      player.socketId = socket.id;
      if (deviceId) player.deviceId = deviceId;
      if (userKey) {
        player.userKey = userKey;
        getOrCreateUserProfile(userKey, username_);
      }
      playerSessions.set(sessionId, { roomCode: code, playerIdx: player.playerIdx });
    } else {
      // New player joining (even mid-game if link is open!)
      sessionId = generateSessionId();
      const idx = room.players.length;
      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
      player = { sessionId, deviceId, userKey, username: username_, color, connected: true, socketId: socket.id, playerIdx: idx };
      if (userKey) getOrCreateUserProfile(userKey, username_);
      room.players.push(player);
      playerSessions.set(sessionId, { roomCode: code, playerIdx: idx });

      // If game is currently running, deal cards to new player
      if (room.status === 'playing' && room.gameState) {
        const gs = room.gameState;
        ensureDeckHasCards(gs, 10);
        gs.hands[idx] = gs.drawPile.splice(0, 7);
      }
    }

    socket.join(code);

    socket.emit('room:joined', {
      sessionId,
      roomCode: code,
      color: player.color,
      isAdmin: sessionId === room.adminSessionId,
      lobbyState: buildLobbyState(room)
    });

    // If game is running, broadcast game state to ALL players instantly
    if (room.status === 'playing' && room.gameState) {
      broadcastGameState(room);
      socket.emit('chat:history', room.chat);
    }

    io.to(code).emit('lobby:update', buildLobbyState(room));
    io.to(code).emit('chat:message', { system: true, text: `${player.username} se conectó.`, timestamp: Date.now() });
  });

  // ── Toggle Link (Admin only) ─────────────────────────────────────────────────
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

  // ── Kick Player (Admin only) ─────────────────────────────────────────────────
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

function purgeDisconnectedPlayers(room) {
  const disconnected = room.players.filter(p => !p.connected);
  if (disconnected.length > 0) {
    room.players = room.players.filter(p => p.connected);
    room.players.forEach((p, i) => { p.playerIdx = i; });
    disconnected.forEach(p => {
      playerSessions.delete(p.sessionId);
    });
  }
  return disconnected;
}

  // ── Start Game (Admin only) ──────────────────────────────────────────────────
  socket.on('game:start', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;
    if (room.status !== 'lobby') return;

    // Silently remove any disconnected players before starting
    purgeDisconnectedPlayers(room);

    if (room.players.length < 2) return socket.emit('room:error', { message: 'Necesitas al menos 2 jugadores conectados para iniciar.' });

    room.status = 'playing';
    room.gameState = initGameState(room);

    io.to(room.code).emit('game:started', { players: room.players.map(p => ({ sessionId: p.sessionId, username: p.username, color: p.color, playerIdx: p.playerIdx })) });
    broadcastGameState(room);
    io.to(room.code).emit('chat:message', { system: true, text: '¡La partida comenzó! Buena suerte a todos.', timestamp: Date.now() });
  });

  // ── Play Card ────────────────────────────────────────────────────────────────
  socket.on('game:playCard', ({ sessionId, cardId, chosenColor }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return socket.emit('game:error', { message: 'No es tu turno.' });
    if (room.players[myIdx]) room.players[myIdx].consecutiveTimeouts = 0;

    const hand = gs.hands[myIdx];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return socket.emit('game:error', { message: 'Carta no encontrada.' });

    const card = hand[cardIdx];
    const topCard = gs.discardPile[gs.discardPile.length - 1];

    if (!canPlay(card, topCard, gs.currentColor, gs.drawStackCount)) {
      return socket.emit('game:error', { message: 'No puedes jugar esa carta.' });
    }

    // Remove card from hand
    gs.hands[myIdx] = hand.filter((_, i) => i !== cardIdx);
    
    const playedCard = {
      ...card,
      playedBy: room.players[myIdx]?.username || 'Jugador',
      playedByIdx: myIdx,
      playedAt: Date.now()
    };
    gs.discardPile.push(playedCard);

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

    const remainingCards = gs.hands[myIdx].length;
    const numPlayers = room.players.length;
    let nextStep = 1;
    let newDir = gs.direction;

    // Apply card effects
    if (card.value === '+2') {
      gs.drawStackCount += 2;
    } else if (card.value === '+4') {
      gs.drawStackCount += 4;
    } else if (card.value === 'skip') {
      nextStep = 2;
      gs.drawStackCount = 0;
    } else if (card.value === 'reverse') {
      if (numPlayers === 2) { nextStep = 2; }
      else { newDir = gs.direction * -1; gs.direction = newDir; }
      gs.drawStackCount = 0;
    } else {
      gs.drawStackCount = 0;
    }

    // Handle wild color
    if (card.color === 'wild' && chosenColor) {
      gs.currentColor = chosenColor;
    } else {
      gs.currentColor = card.color === 'wild' ? 'red' : card.color;
    }

    // MUNO rule: if going to 1 card and didn't shout => 2 cards penalty!
    if (remainingCards === 1) {
      if (!gs.munoShoutedBy[myIdx]) {
        // Penalty: draw 2 cards automatically
        ensureDeckHasCards(gs, 5);
        const drawn = gs.drawPile.splice(0, 2);
        gs.hands[myIdx] = [...gs.hands[myIdx], ...drawn];
        io.to(room.code).emit('chat:message', { system: true, text: `⚠️ ¡${room.players[myIdx].username} no gritó MUNO y recibe +2 cartas de castigo!`, timestamp: Date.now() });
      } else {
        // Valid MUNO - broadcast shout to all ONCE, then clear flag!
        io.to(room.code).emit('game:munoAnnounce', { playerIdx: myIdx, username: room.players[myIdx].username });
        delete gs.munoShoutedBy[myIdx];
      }
    }

    // Check win
    if (gs.hands[myIdx].length === 0) {
      gs.winner = myIdx;
      room.status = 'finished';
      const winnerPlayer = room.players[myIdx];

      // Record statistics and achievements for user profiles
      room.players.forEach((p, pIdx) => {
        const ukey = p.userKey || p.deviceId;
        if (!ukey) return;
        const prof = getOrCreateUserProfile(ukey, p.username);
        if (prof) {
          prof.gamesPlayed = (prof.gamesPlayed || 0) + 1;
          if (pIdx === myIdx) {
            prof.wins = (prof.wins || 0) + 1;
            if (!prof.achievements) prof.achievements = [];
            if (!prof.achievements.includes('first_win')) prof.achievements.push('first_win');
            if (prof.gamesPlayed >= 5 && !prof.achievements.includes('veteran_5')) prof.achievements.push('veteran_5');
            if (prof.wins >= 10 && !prof.achievements.includes('master_10')) prof.achievements.push('master_10');
            if (room.players.length === 2 && !prof.achievements.includes('duelist_1v1')) prof.achievements.push('duelist_1v1');
          }
        }
      });
      saveRoomsToDisk();
      io.emit('leaderboard:update', getPublicLeaderboard());

      io.to(room.code).emit('game:winner', { playerIdx: myIdx, username: winnerPlayer.username, color: winnerPlayer.color });
      io.to(room.code).emit('chat:message', { system: true, text: `🏆 ¡${winnerPlayer.username} ganó la partida!`, timestamp: Date.now() });
      broadcastGameState(room);
      return;
    }

    // Set turn to next player
    let targetIdx = getNextIdx(myIdx, room, nextStep, newDir);

    if (gs.drawStackCount > 0) {
      const nextHand = gs.hands[targetIdx] || [];
      const hasDefense = nextHand.some(c => c.value === '+2' || c.value === '+4');
      if (!hasDefense) {
        // Player has NO defense (+2/+4): automatically add penalty stack to their hand!
        ensureDeckHasCards(gs, gs.drawStackCount + 5);
        const penalty = gs.drawPile.splice(0, gs.drawStackCount);
        gs.hands[targetIdx] = [...nextHand, ...penalty];
        const penalized = room.players[targetIdx];
        io.to(room.code).emit('chat:message', {
          system: true,
          text: `⚠️ ${penalized.username} no tiene defensa (+2/+4) y recibe +${gs.drawStackCount} cartas, pero conserva su turno.`,
          timestamp: Date.now()
        });
        gs.drawStackCount = 0;
        // targetIdx keeps their turn to play from enlarged hand or draw further!
      }
    }

    gs.currentTurnIdx = targetIdx;
    // Clear munoShoutedBy ONLY for players who have more than 2 cards now
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
      drawStackCount: gs.drawStackCount,
      nextTurnIdx: targetIdx
    });

    broadcastGameState(room);
  });

  // ── Draw Card ────────────────────────────────────────────────────────────────
  // Player can draw up to 5 cards per turn or penalty stack, max 30 cards in hand!
  socket.on('game:drawCard', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return socket.emit('game:error', { message: 'No es tu turno.' });
    if (room.players[myIdx]) room.players[myIdx].consecutiveTimeouts = 0;

    // Max Hand Limit (30 cards)
    const currentHandSize = gs.hands[myIdx]?.length || 0;
    if (currentHandSize >= 30) {
      socket.emit('game:error', { message: 'Llegaste al límite máximo de 30 cartas en mano.' });
      // Auto pass turn if at max capacity
      gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
      gs.hasDrawnThisTurn = false;
      gs.drawsThisTurn = 0;
      gs.turnStartedAt = Date.now();
      broadcastGameState(room);
      return;
    }

    // HARD SERVER BLOCK: Max 5 draws per turn for normal draws (Check BEFORE drawing card!)
    if (gs.drawStackCount === 0 && (gs.drawsThisTurn || 0) >= 5) {
      socket.emit('game:error', { message: 'Alcanzaste el límite de 5 robos este turno.' });
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `⚠️ ${room.players[myIdx].username} alcanzó el límite de 5 robos este turno. Pasa el turno automáticamente.`,
        timestamp: Date.now()
      });
      gs.currentTurnIdx = getNextIdx(myIdx, room, 1, gs.direction);
      gs.hasDrawnThisTurn = false;
      gs.drawsThisTurn = 0;
      gs.turnStartedAt = Date.now();
      broadcastGameState(room);
      return;
    }

    ensureDeckHasCards(gs, 5);

    let drawCount = 1;
    if (gs.drawStackCount > 0) {
      drawCount = gs.drawStackCount;
      gs.drawStackCount = 0;
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `⚠️ ${room.players[myIdx].username} recibió la penalización (+${drawCount} cartas) pero conserva su turno.`,
        timestamp: Date.now()
      });
    } else {
      gs.drawsThisTurn = (gs.drawsThisTurn || 0) + 1;
    }

    const drawn = gs.drawPile.splice(0, drawCount);
    gs.hands[myIdx] = [...(gs.hands[myIdx] || []), ...drawn];
    gs.hasDrawnThisTurn = true;

    // Check if player hit the 5-draws limit for normal draws
    if (gs.drawStackCount === 0 && gs.drawsThisTurn >= 5) {
      io.to(room.code).emit('chat:message', {
        system: true,
        text: `⚠️ ${room.players[myIdx].username} alcanzó el límite de 5 robos este turno. Pasa el turno automáticamente.`,
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

  // ── Pass Turn (after drawing) ────────────────────────────────────────────────
  socket.on('game:passTurn', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return;
    // Must have drawn at least once to pass
    if (!gs.hasDrawnThisTurn) return;

    const numPlayers = room.players.length;
    gs.currentTurnIdx = getNextIdx(myIdx, numPlayers, 1, gs.direction);
    gs.munoShoutedBy = {};
    gs.hasDrawnThisTurn = false;
    gs.turnStartedAt = Date.now();
    broadcastGameState(room);
  });

  // Client manual notification of timeout (fallback)
  socket.on('game:timeout', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;

    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    if (myIdx !== gs.currentTurnIdx) return;

    const elapsed = (Date.now() - gs.turnStartedAt) / 1000;
    if (elapsed >= gs.turnDuration - 2) {
      handleTurnTimeout(room);
    }
  });


  // ── Shout MUNO ───────────────────────────────────────────────────────────────
  socket.on('game:shoutMuno', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    const myIdx = room.players.findIndex(p => p.sessionId === sessionId);
    const hand = gs.hands[myIdx] || [];

    // Allow shouting MUNO if hand size is 2 or 1
    if (hand.length <= 2) {
      gs.munoShoutedBy[myIdx] = true;
      io.to(room.code).emit('chat:message', { system: false, text: `¡MUNO!`, senderName: room.players[myIdx].username, senderColor: room.players[myIdx].color, timestamp: Date.now() });
      broadcastGameState(room);
    }
  });

  // ── Select Wild Color ────────────────────────────────────────────────────────
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

  // ── Rematch / New Game (Admin) ───────────────────────────────────────────────
  socket.on('game:rematch', ({ sessionId }) => {
    const room = getRoomBySession(sessionId, socket);
    if (!room || room.adminSessionId !== sessionId) return;

    // Purge disconnected players silently
    purgeDisconnectedPlayers(room);

    room.status = 'lobby';
    room.linkOpen = true;
    room.gameState = null;
    io.to(room.code).emit('game:rematch');
    io.to(room.code).emit('lobby:update', buildLobbyState(room));
  });

  // ── Chat Message ─────────────────────────────────────────────────────────────
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

  // ── Change Username ──────────────────────────────────────────────────────────
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

  // ── Leaderboard & User Profile Events ─────────────────────────────────────────
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

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    for (const [sessionId, sess] of playerSessions) {
      const room = rooms.get(sess.roomCode);
      if (!room) continue;
      const player = room.players.find(p => p.sessionId === sessionId && p.socketId === socket.id);
      if (player) {
        player.connected = false;
        player.socketId = null;

        // Automatic Admin Transfer if current Admin disconnects
        if (room.adminSessionId === sessionId) {
          const nextOnlineAdmin = room.players.find(p => p.connected !== false && p.sessionId !== sessionId);
          if (nextOnlineAdmin) {
            room.adminSessionId = nextOnlineAdmin.sessionId;
            io.to(room.code).emit('chat:message', {
              system: true,
              text: `👑 ${nextOnlineAdmin.username} es ahora el nuevo Administrador de la sala.`,
              timestamp: Date.now()
            });
          }
        }

        if (room.status === 'lobby') {
          // In lobby mode: remove disconnected player immediately from list
          room.players = room.players.filter(p => p.sessionId !== sessionId);
          room.players.forEach((p, i) => { p.playerIdx = i; });
          playerSessions.delete(sessionId);

          if (room.players.length === 0) {
            rooms.delete(room.code);
          }
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

// ─── REST API ROUTES ─────────────────────────────────────────────────────────
app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
  res.json({ exists: true, status: room.status, linkOpen: room.linkOpen, playerCount: room.players.length });
});

// Catch-all: serve React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Cleanup old empty rooms every 30 minutes ────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const allDisconnected = room.players.every(p => !p.connected);
    const isOld = now - room.createdAt > 2 * 60 * 60 * 1000; // 2 hours
    if (allDisconnected && isOld) {
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🃏 MUNO Multiplayer Server → http://localhost:${PORT}`);
});
