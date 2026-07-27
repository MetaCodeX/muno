import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { MultiplayerGame } from './components/MultiplayerGame';
import { GameChat } from './components/GameChat';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { useMultiplayerSocket } from './utils/useMultiplayer';
import { saveSession, loadSession, clearSession, saveUsername, loadUsername, getOrCreateDeviceId, getOrCreateUserKey, setUserKey } from './utils/sessionCookies';
import { soundManager } from './utils/soundManager';

// Check URL for invite code ?join=XXXXX
function getInviteCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('join') || null;
}

// Clean URL without reload
function clearUrlParam() {
  window.history.replaceState({}, '', window.location.pathname);
}

export default function App() {
  const { socket, connected, on, off, emit } = useMultiplayerSocket();

  // Screen: 'home' | 'lobby' | 'game'
  const [screen, setScreen] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Session
  const [sessionId, setSessionId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [myColor, setMyColor] = useState('#00e676');
  const [isAdmin, setIsAdmin] = useState(false);

  // Lobby state
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [linkOpen, setLinkOpen] = useState(true);

  // Game state (from server)
  const [gameState, setGameState] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [lastGameAction, setLastGameAction] = useState(null);
  const [munoAnnounceEvent, setMunoAnnounceEvent] = useState(null);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);

  // Saved username
  const savedUsername = loadUsername();

  // Leaderboard & User Key state
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [userKey, setUserKeyState] = useState(() => getOrCreateUserKey());

  useEffect(() => {
    emit('leaderboard:get');
    emit('user:getProfile', { userKey, username: savedUsername });

    const unsubLb = on('leaderboard:data', (data) => setLeaderboardData(data));
    const unsubLbUp = on('leaderboard:update', (data) => setLeaderboardData(data));
    const unsubProf = on('user:profileData', (prof) => setMyProfile(prof));

    return () => {
      unsubLb();
      unsubLbUp();
      unsubProf();
    };
  }, [userKey, savedUsername, emit, on]);

  const handleImportUserKey = (newKey) => {
    setUserKey(newKey);
    setUserKeyState(newKey);
    emit('user:importKey', { newKey, username: savedUsername });
  };

  const [urlInviteCode, setUrlInviteCode] = useState(() => getInviteCode());

  // ── Auto-join / Reconnect on mount ─────────────────────────────────────────
  useEffect(() => {
    const inviteCode = getInviteCode();
    const session = loadSession();
    const username = loadUsername();

    if (inviteCode) {
      clearUrlParam();
      // Invite code in URL overrides old session if it's for a different room!
      if (session && session.roomCode && session.roomCode.toUpperCase() !== inviteCode.toUpperCase()) {
        clearSession();
      }

      if (username) {
        // User already has a saved name -> auto-join the invited room immediately!
        setLoading(true);
        setTimeout(() => {
          emit('room:join', { roomCode: inviteCode, username });
        }, 500);
      } else {
        setUrlInviteCode(inviteCode);
      }
    } else if (session && session.sessionId && session.roomCode) {
      // Reconnect to previous session only if no new invite link was clicked
      attemptReconnect(session);
    }
  }, []);

  // ── Periodic Client State Sync Ticker (Ensures 100% Real-Time Lockstep) ─────
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const session = loadSession();
      if (session && session.sessionId && (screen === 'game' || screen === 'lobby')) {
        emit('game:sync', { sessionId: session.sessionId });
      }
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [screen, emit]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const unsubConnect = on('connect', () => {
      const session = loadSession();
      if (session && session.sessionId && session.roomCode) {
        emit('room:join', {
          roomCode: session.roomCode,
          username: loadUsername() || 'Jugador',
          sessionId: session.sessionId,
          deviceId: getOrCreateDeviceId()
        });
      }
    });

    const unsubRoomCreated = on('room:created', ({ sessionId: sid, roomCode: code, color, lobbyState }) => {
      setSessionId(sid);
      setRoomCode(code);
      setMyColor(color);
      setIsAdmin(true);
      setLobbyPlayers(lobbyState.players);
      setLinkOpen(lobbyState.linkOpen);
      saveSession({ sessionId: sid, roomCode: code });
      setLoading(false);
      setError(null);
      setScreen('lobby');
    });

    const unsubRoomJoined = on('room:joined', ({ sessionId: sid, roomCode: code, color, isAdmin: admin, lobbyState }) => {
      setSessionId(sid);
      setRoomCode(code);
      setMyColor(color);
      setIsAdmin(admin);
      setLobbyPlayers(lobbyState.players);
      setLinkOpen(lobbyState.linkOpen);
      saveSession({ sessionId: sid, roomCode: code });
      setLoading(false);
      setError(null);
      setScreen('lobby');
    });

    const unsubLobbyUpdate = on('lobby:update', (lobbyState) => {
      setLobbyPlayers(lobbyState.players);
      setLinkOpen(lobbyState.linkOpen);
    });

    const unsubGameStarted = on('game:started', ({ players }) => {
      setGamePlayers(players);
      setChatMessages([]);
      setScreen('game');
    });

    const unsubGameState = on('game:state', (state) => {
      setGameState(state);
      if (state.players) setGamePlayers(state.players);
      setScreen('game');
    });

    const unsubChatMsg = on('chat:message', (msg) => {
      setChatMessages(prev => [...prev.slice(-99), msg]);
    });

    const unsubChatHistory = on('chat:history', (history) => {
      setChatMessages(history || []);
    });

    const unsubMuno = on('game:munoAnnounce', ({ playerIdx, username }) => {
      soundManager.munoShout();
      setMunoAnnounceEvent({ playerIdx, username, key: Date.now() });
    });

    const unsubCardDrawn = on('game:cardDrawn', ({ playerIdx, count }) => {
      soundManager.drawCard();
      setLastGameAction({ type: 'cardDrawn', playerIdx, count: count || 1, key: Date.now() });
    });

    const unsubCardPlayed = on('game:cardPlayed', ({ playerIdx, card, chosenColor, drawStackCount }) => {
      if (!card) return;
      if (card.value === 'skip') {
        soundManager.skip();
      } else if (card.value === 'reverse') {
        soundManager.reverse();
      } else if (card.value === '+2' || card.value === '+4') {
        soundManager.drawStack(drawStackCount || (card.value === '+4' ? 4 : 2));
      } else if (card.color === 'wild' || chosenColor) {
        soundManager.drawStack(4);
      } else {
        soundManager.playCard();
      }
      setLastGameAction({ type: 'cardPlayed', playerIdx, card, chosenColor, drawStackCount, key: Date.now() });
    });

    const unsubGameWinner = on('game:winner', ({ playerIdx, username, color }) => {
      soundManager.winGame();
    });

    const unsubRematch = on('game:rematch', () => {
      setGameState(null);
      setScreen('lobby');
    });

    const unsubError = on('room:error', ({ message }) => {
      setError(message);
      setLoading(false);
      clearSession();
      setSessionId(null);
      setRoomCode(null);
      setGameState(null);
      setScreen('home');
    });

    const unsubKicked = on('room:kicked', ({ message }) => {
      clearSession();
      setError(message);
      setScreen('home');
      setSessionId(null);
      setRoomCode(null);
    });

    // Global user interaction listener to unlock Web Audio API Context
    const unlockAudio = () => soundManager.initContext();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      unsubConnect();
      unsubRoomCreated();
      unsubRoomJoined();
      unsubLobbyUpdate();
      unsubGameStarted();
      unsubGameState();
      unsubChatMsg();
      unsubChatHistory();
      unsubMuno();
      unsubCardDrawn();
      unsubCardPlayed();
      unsubGameWinner();
      unsubRematch();
      unsubError();
      unsubKicked();
    };
  }, [on]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function attemptReconnect(session) {
    setLoading(true);
    // Will trigger room:joined if successful or room:error if expired
    setTimeout(() => {
      emit('room:join', {
        roomCode: session.roomCode,
        username: loadUsername() || 'Jugador',
        sessionId: session.sessionId,
        deviceId: getOrCreateDeviceId()
      });
    }, 800); // Give socket time to connect
  }

  const handleCreateRoom = useCallback((username) => {
    saveUsername(username);
    setLoading(true);
    setError(null);
    const session = loadSession();
    emit('room:create', { username, sessionId: session?.sessionId, deviceId: getOrCreateDeviceId(), userKey });
  }, [emit, userKey]);

  const handleJoinRoom = useCallback((code, username) => {
    saveUsername(username);
    setLoading(true);
    setError(null);
    const session = loadSession();
    emit('room:join', { roomCode: code, username, sessionId: session?.sessionId, deviceId: getOrCreateDeviceId(), userKey });
  }, [emit, userKey]);

  const handleToggleLink = useCallback(() => {
    emit('room:toggleLink', { sessionId });
  }, [emit, sessionId]);

  const handleKick = useCallback((targetSessionId) => {
    emit('room:kick', { sessionId, targetSessionId });
  }, [emit, sessionId]);

  const handleStart = useCallback(() => {
    emit('game:start', { sessionId });
  }, [emit, sessionId]);

  const handleLeave = useCallback(() => {
    clearSession();
    setScreen('home');
    setSessionId(null);
    setRoomCode(null);
    setGameState(null);
    socket.disconnect();
    socket.connect();
  }, [socket]);

  const handleRename = useCallback((newName) => {
    saveUsername(newName);
    emit('player:setUsername', { sessionId, username: newName });
  }, [emit, sessionId]);

  const handleChatSend = useCallback((text) => {
    emit('chat:send', { sessionId, text });
  }, [emit, sessionId]);

  const handlePlayCard = useCallback((cardId, chosenColor) => {
    emit('game:playCard', { sessionId, cardId, chosenColor });
  }, [emit, sessionId]);

  const handleDrawCard = useCallback(() => {
    emit('game:drawCard', { sessionId });
  }, [emit, sessionId]);

  const handleShoutMuno = useCallback(() => {
    emit('game:shoutMuno', { sessionId });
  }, [emit, sessionId]);

  const handleSelectColor = useCallback((color) => {
    emit('game:selectColor', { sessionId, color });
  }, [emit, sessionId]);

  const handleRematch = useCallback(() => {
    emit('game:rematch', { sessionId });
  }, [emit, sessionId]);

  const handlePassTurn = useCallback(() => {
    emit('game:passTurn', { sessionId });
  }, [emit, sessionId]);

  const handleTimeout = useCallback(() => {
    emit('game:timeout', { sessionId });
  }, [emit, sessionId]);

  // Auto-join from pending invite code
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingJoinCode');
    if (pending && screen === 'home') {
      // Pre-fill join tab and code - handled by Home component via prop
      sessionStorage.removeItem('pendingJoinCode');
    }
  }, [screen]);

  // Pre-fill pending join from URL
  const pendingJoinCode = sessionStorage.getItem('pendingJoinCode') || getInviteCode() || null;

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0, background: '#0b0f19' }}>
      {screen === 'home' && (
        <HomeWithPrefill
          savedUsername={savedUsername}
          pendingJoinCode={pendingJoinCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          leaderboard={leaderboardData}
          onOpenProfile={() => setProfileOpen(true)}
          onRefreshLeaderboard={() => emit('leaderboard:get')}
          loading={loading}
          error={error}
        />
      )}

      {screen === 'lobby' && (
        <Lobby
          roomCode={roomCode}
          players={lobbyPlayers}
          mySessionId={sessionId}
          isAdmin={isAdmin}
          linkOpen={linkOpen}
          connected={connected}
          onToggleLink={handleToggleLink}
          onKick={handleKick}
          onStart={handleStart}
          onLeave={handleLeave}
          onRename={handleRename}
        />
      )}

      {screen === 'game' && gameState && (
        <>
          <MultiplayerGame
            gameState={gameState}
            gamePlayers={gamePlayers}
            mySessionId={sessionId}
            myColor={myColor}
            isAdmin={isAdmin}
            roomCode={roomCode}
            lastGameAction={lastGameAction}
            munoAnnounceEvent={munoAnnounceEvent}
            onPlayCard={handlePlayCard}
            onDrawCard={handleDrawCard}
            onShoutMuno={handleShoutMuno}
            onSelectColor={handleSelectColor}
            onRematch={handleRematch}
            onLeave={handleLeave}
            onPassTurn={handlePassTurn}
            onTimeout={handleTimeout}
          />
          <GameChat
            messages={chatMessages}
            onSend={handleChatSend}
            myColor={myColor}
            myUsername={gamePlayers.find(p => p.sessionId === sessionId)?.username || ''}
            isOpen={chatOpen}
            onToggle={() => setChatOpen(v => !v)}
          />
        </>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        leaderboard={leaderboardData}
        myProfile={myProfile}
        myUserKey={userKey}
        onImportUserKey={handleImportUserKey}
        onRefreshLeaderboard={() => emit('leaderboard:get')}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        myProfile={myProfile}
        myUserKey={userKey}
        onImportUserKey={handleImportUserKey}
      />

      {/* Loading overlay */}
      {loading && screen === 'home' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(11,15,25,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{ color: '#0088ff', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="spin" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,136,255,0.3)', borderTopColor: '#0088ff', borderRadius: '50%' }} />
            Conectando...
          </div>
        </div>
      )}
    </main>
  );
}

// Wrapper to pre-fill invite code in Home
function HomeWithPrefill({ savedUsername, pendingJoinCode, onCreateRoom, onJoinRoom, leaderboard, onOpenProfile, onRefreshLeaderboard, loading, error }) {
  const [prefillCode] = useState(() => {
    const p = sessionStorage.getItem('pendingJoinCode') || getInviteCode();
    if (p) sessionStorage.removeItem('pendingJoinCode');
    return p;
  });

  return (
    <Home
      savedUsername={savedUsername}
      initialJoinCode={prefillCode}
      initialTab={prefillCode ? 'join' : 'join'}
      onCreateRoom={onCreateRoom}
      onJoinRoom={onJoinRoom}
      leaderboard={leaderboard}
      onOpenProfile={onOpenProfile}
      onRefreshLeaderboard={onRefreshLeaderboard}
      loading={loading}
      error={error}
    />
  );
}
