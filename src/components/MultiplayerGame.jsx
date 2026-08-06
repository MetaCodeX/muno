import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Crown, LogOut, Trophy } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const COLOR_MAP = {
  red: '#ff3b5c',
  blue: '#0088ff',
  green: '#00e676',
  yellow: '#ffc107',
  wild: '#b000ff'
};

const SPANISH_COLOR_NAMES = {
  red: 'ROJO',
  blue: 'AZUL',
  green: 'VERDE',
  yellow: 'AMARILLO',
  wild: 'COMODÍN',
};

// ── Turn Timer Hook ────────────────────────────────────────────────────────────
function useTurnTimer(turnStartedAt, turnDuration, isMyTurn, onTimeout) {
  const [secondsLeft, setSecondsLeft] = useState(turnDuration);
  const timeoutFired = useRef(false);

  useEffect(() => {
    timeoutFired.current = false;
    setSecondsLeft(turnDuration);
  }, [turnStartedAt, turnDuration]);

  useEffect(() => {
    if (!isMyTurn) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - turnStartedAt) / 1000;
      const left = Math.max(0, Math.ceil(turnDuration - elapsed));
      setSecondsLeft(left);
      if (left === 0 && !timeoutFired.current) {
        timeoutFired.current = true;
        onTimeout?.();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnDuration, onTimeout]);

  useEffect(() => {
    if (isMyTurn) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - turnStartedAt) / 1000;
      const left = Math.max(0, Math.ceil(turnDuration - elapsed));
      setSecondsLeft(left);
    }, 500);
    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnDuration]);

  return secondsLeft;
}

export function MultiplayerGame({
  gameState,
  gamePlayers,
  mySessionId,
  myColor,
  isAdmin,
  roomCode,
  lastGameAction,
  munoAnnounceEvent,
  mode = 'classic',
  gameConfig = null,
  onPlayCard,
  onDrawCard,
  onJumpIn,
  onShoutMuno,
  onSelectColor,
  onRematch,
  onLeave,
  onTimeout,
  onOpenLeaderboard,
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [showZeroPicker, setShowZeroPicker] = useState(false);
  const [actionBurst, setActionBurst] = useState(null);
  const [flyingCards, setFlyingCards] = useState([]);
  const [pulsars, setPulsars] = useState([]);
  const [okAnimClass, setOkAnimClass] = useState(null);

  const isOverkill = mode === 'overkill';
  const actionBurstTimer = useRef(null);
  const prevTopCardId = useRef(null);
  const prevTurnIdx = useRef(null);
  const prevHandLength = useRef(0);
  const discardRef = useRef(null);
  const drawRef = useRef(null);
  const mySeatRef = useRef(null);
  const processedActionKey = useRef(null);
  const processedMunoKey = useRef(null);

  // ── Mobile Detection ──────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Responsive sizing
  const sz = isMobile ? {
    drawW: '50px', drawH: '74px',
    discardW: '52px', discardH: '76px',
    timerSize: '46px', timerR: 18, timerFont: '1rem',
    feltW: '260px', feltH: '170px',
    ringW: '220px', ringH: '140px',
    burstIcon: 40, burstFontStack: '1.8rem', burstFontText: '2.2rem',
    centerGap: '0.8rem',
    cardW: '56px',
    flyW: 48, flyH: 68,
    arcYBase: 0.08, arcYExtra: 0.05,
    labelFont: '0.55rem',
  } : {
    drawW: '72px', drawH: '106px',
    discardW: '73px', discardH: '108px',
    timerSize: '64px', timerR: 25, timerFont: '1.35rem',
    feltW: '500px', feltH: '320px',
    ringW: '420px', ringH: '260px',
    burstIcon: 80, burstFontStack: '3rem', burstFontText: '4rem',
    centerGap: '1.8rem',
    cardW: '80px',
    flyW: 70, flyH: 100,
    arcYBase: 0.13, arcYExtra: 0.08,
    labelFont: '0.65rem',
  };

  const myIdx = gamePlayers.findIndex(p => p.sessionId === mySessionId);
  const me = gamePlayers[myIdx];
  const myHand = gameState?.myHand || [];
  const topCard = gameState?.topCard;
  const currentColor = gameState?.currentColor || 'red';
  const currentTurnIdx = gameState?.currentTurnIdx ?? -1;
  const direction = gameState?.direction ?? 1;
  const drawStackCount = gameState?.drawStackCount ?? 0;
  const handSizes = gameState?.handSizes || [];
  const munoShoutedBy = gameState?.munoShoutedBy || {};
  const winner = gameState?.winner;
  const turnStartedAt = gameState?.turnStartedAt ?? Date.now();
  const turnDuration = gameState?.turnDuration ?? 30;
  const hasDrawnThisTurn = gameState?.hasDrawnThisTurn ?? false;

  const isMyTurn = myIdx !== -1 && myIdx === currentTurnIdx;
  const activeColorHex = COLOR_MAP[currentColor] || '#00e676';

  const handleTimeout = useCallback(() => {
    if (isMyTurn && !winner) onTimeout?.();
  }, [isMyTurn, winner, onTimeout]);

  const secondsLeft = useTurnTimer(turnStartedAt, turnDuration, isMyTurn, handleTimeout);
  const timerUrgent = secondsLeft <= 8;
  const timerPct = Math.max(0, secondsLeft / turnDuration);

  // Mobile card inspection selection state
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Dynamic Background Pulsars (Disabled on mobile to ensure 60fps performance)
  useEffect(() => {
    if (isMobile) {
      setPulsars([]);
      return;
    }
    const deckColors = ['#ff3b5c', '#0088ff', '#00e676', '#ffc107', '#b000ff'];
    const spawnInterval = setInterval(() => {
      setPulsars(prev => {
        const now = Date.now();
        const active = prev.filter(p => now - p.created < p.duration);
        if (active.length >= 6) return active;
        const newPulsar = {
          id: 'p_' + Math.random().toString(36).substr(2, 5),
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          size: 130 + Math.random() * 210,
          color: deckColors[Math.floor(Math.random() * deckColors.length)],
          maxOpacity: (0.07 + Math.random() * 0.22).toFixed(2),
          created: Date.now(),
          duration: Math.floor(4500 + Math.random() * 4500)
        };
        return [...active, newPulsar];
      });
    }, 1600);
    return () => clearInterval(spawnInterval);
  }, [isMobile]);

  const [displayedTopCard, setDisplayedTopCard] = useState(topCard);

  // Sound triggers for card actions & Delayed visual update of top discard card for smooth landing
  useEffect(() => {
    if (!topCard) return;
    if (topCard.id !== prevTopCardId.current) {
      const isFirst = !prevTopCardId.current;
      prevTopCardId.current = topCard.id;

      if (isFirst) {
        setDisplayedTopCard(topCard);
      } else {
        // Keep previous card showing while flying card animation is traveling across screen
        const timer = setTimeout(() => {
          setDisplayedTopCard(topCard);
        }, 380);
        
        if (topCard.value === 'skip') {
          soundManager.skip();
        } else if (topCard.value === 'reverse') {
          soundManager.reverse();
        } else if (topCard.value === '+2' || topCard.value === '+4') {
          soundManager.drawStack(drawStackCount || 2);
        } else {
          soundManager.playCard();
        }

        return () => clearTimeout(timer);
      }
    }
  }, [topCard?.id, topCard?.value, drawStackCount]);

  useEffect(() => {
    if (currentTurnIdx !== prevTurnIdx.current && currentTurnIdx !== -1) {
      prevTurnIdx.current = currentTurnIdx;
      if (myIdx === currentTurnIdx && !winner) soundManager.yourTurn();
    }
  }, [currentTurnIdx, myIdx, winner]);

  useEffect(() => {
    if (winner !== null && winner !== undefined) soundManager.winGame();
  }, [winner]);

  // Universal Spatial Card Flying Animations for ALL Players (Hand -> Discard AND Mazo -> Hand)
  const triggerPlayFlightForPlayer = useCallback((playerIdx, cardFile) => {
    if (!discardRef.current) return;
    const seatEl = document.querySelector(`[data-seat-idx="${playerIdx}"]`);
    const fromRect = seatEl ? seatEl.getBoundingClientRect() : (mySeatRef.current ? mySeatRef.current.getBoundingClientRect() : null);
    if (!fromRect) return;

    const toRect = discardRef.current.getBoundingClientRect();
    const flyId = 'fly_' + Math.random().toString(36).substr(2, 6);
    const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
    const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

    const fw = window.innerWidth <= 768 ? 48 : 70;
    const fh = window.innerWidth <= 768 ? 68 : 100;
    const flyingCard = {
      id: flyId,
      file: cardFile || 'back.svg',
      left: fromRect.left + (fromRect.width / 2) - (fw / 2),
      top: fromRect.top + (fromRect.height / 2) - (fh / 2),
      width: fw,
      height: fh,
      transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
    };
    setFlyingCards(prev => [...prev, flyingCard]);

    requestAnimationFrame(() => {
      setFlyingCards(prev => prev.map(c => {
        if (c.id === flyId) {
          return {
            ...c,
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.05) rotate(360deg)`
          };
        }
        return c;
      }));
    });

    setTimeout(() => {
      setFlyingCards(prev => prev.filter(c => c.id !== flyId));
    }, 450);
  }, []);

  const triggerDrawFlightForPlayer = useCallback((playerIdx, count = 1) => {
    if (!drawRef.current) return;
    const seatEl = document.querySelector(`[data-seat-idx="${playerIdx}"]`);
    const toRect = seatEl ? seatEl.getBoundingClientRect() : (mySeatRef.current ? mySeatRef.current.getBoundingClientRect() : null);
    if (!toRect) return;

    const fromRect = drawRef.current.getBoundingClientRect();
    const flyId = 'fly_' + Math.random().toString(36).substr(2, 6);
    const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
    const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

    const fw = window.innerWidth <= 768 ? 48 : 70;
    const fh = window.innerWidth <= 768 ? 68 : 100;
    const flyingCard = {
      id: flyId,
      file: 'back.svg',
      left: fromRect.left,
      top: fromRect.top,
      width: fw,
      height: fh,
      transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
    };
    setFlyingCards(prev => [...prev, flyingCard]);

    requestAnimationFrame(() => {
      setFlyingCards(prev => prev.map(c => {
        if (c.id === flyId) {
          return {
            ...c,
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.85) rotate(180deg)`
          };
        }
        return c;
      }));
    });

    setTimeout(() => {
      setFlyingCards(prev => prev.filter(c => c.id !== flyId));
    }, 450);
  }, []);

  // React to incoming network actions (cardPlayed, cardDrawn) for ALL players (EXACTLY ONCE per event)
  useEffect(() => {
    if (!lastGameAction || processedActionKey.current === lastGameAction.key) return;
    processedActionKey.current = lastGameAction.key;

    if (lastGameAction.type === 'cardPlayed') {
      const pColor = gamePlayers[lastGameAction.playerIdx]?.color || '#ff3b5c';
      const card = lastGameAction.card;

      triggerPlayFlightForPlayer(lastGameAction.playerIdx, card?.file);

      if (card) {
        if (card.value === 'skip') {
          triggerBurst('text', pColor, 'BLOQUEO');
        } else if (card.value === 'reverse') {
          triggerBurst('text', pColor, '↺ REVERSA');
        } else if (card.value === '+2' || card.value === '+4') {
          triggerBurst('stack', pColor, `+${lastGameAction.drawStackCount || (card.value === '+4' ? 4 : 2)}`);
        } else if (lastGameAction.chosenColor) {
          const chosenHex = COLOR_MAP[lastGameAction.chosenColor] || pColor;
          const colorName = SPANISH_COLOR_NAMES[lastGameAction.chosenColor] || lastGameAction.chosenColor.toUpperCase();
          triggerBurst('text', chosenHex, `COLOR: ${colorName}`);
        }
      }
    } else if (lastGameAction.type === 'cardDrawn') {
      triggerDrawFlightForPlayer(lastGameAction.playerIdx, lastGameAction.count);
    }
  }, [lastGameAction, triggerPlayFlightForPlayer, triggerDrawFlightForPlayer, gamePlayers]);

  // React to MUNO announcement event for burst display (EXACTLY ONCE per event)
  useEffect(() => {
    if (!munoAnnounceEvent || processedMunoKey.current === munoAnnounceEvent.key) return;
    processedMunoKey.current = munoAnnounceEvent.key;

    const pColor = gamePlayers[munoAnnounceEvent.playerIdx]?.color || '#ff3b5c';
    triggerBurst('text', pColor, '¡MUNO!');
  }, [munoAnnounceEvent, gamePlayers]);

  const handleDrawClick = () => {
    if (!isMyTurn) return;
    onDrawCard();
  };

  const triggerBurst = (type, color, text) => {
    if (actionBurstTimer.current) clearTimeout(actionBurstTimer.current);
    setActionBurst({ type, color, text, key: Date.now() });
    actionBurstTimer.current = setTimeout(() => setActionBurst(null), 1000);
  };

  const canPlayCard = (card) => {
    if (!isMyTurn || !topCard) return false;
    const activeColor = (currentColor || topCard?.color || '').toLowerCase();
    const cardColor = (card.color || '').toLowerCase();

    if (drawStackCount > 0) {
      // Overkill: +6 and x2 are also defense cards
      const defenseCards = isOverkill
        ? ['+2', '+4', '+6', 'x2']
        : ['+2', '+4'];
      return defenseCards.includes(card.value);
    }
    if (cardColor === 'wild') return true;
    if (cardColor === activeColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const canJumpInCard = (card) => {
    if (isMyTurn || !topCard || !isOverkill || !gameConfig?.jumpInEnabled) return false;
    const activeColor = (currentColor || topCard.color || '').toLowerCase();
    const cardColor = (card.color || '').toLowerCase();
    if (cardColor === 'wild' && topCard.color === 'wild') {
      return card.value === topCard.value;
    }
    const isColorMatch = cardColor === topCard.color?.toLowerCase() || cardColor === activeColor;
    return isColorMatch && card.value === topCard.value;
  };

  const handleCardClick = (card) => {
    console.log('🃏 [MUNO DEBUG] Card clicked:', card.id, card.name, '| color:', card.color, '| value:', card.value);
    console.log('   ↳ Turn State -> isMyTurn:', isMyTurn, '(myIdx:', myIdx, 'currentTurnIdx:', currentTurnIdx, ') | topCard:', topCard);

    if (!isMyTurn) {
      if (canJumpInCard(card)) {
        console.log('   ⚡ Jump-in triggered for card:', card.id);
        onJumpIn(card.id);
      } else {
        console.warn('   ⚠️ Click ignored: Not your turn!');
        setSelectedCardId(null);
      }
      return;
    }

    const playable = canPlayCard(card);
    console.log('   ↳ canPlayCard evaluation:', playable);
    if (!playable) {
      console.warn('   ⚠️ Card is not playable against top card:', topCard);
      setSelectedCardId(null);
      return;
    }

    setSelectedCardId(null);

    // Overkill: card 0 triggers rotate modal
    if (isOverkill && gameConfig?.zeroRotatesHands && card.value === '0' && card.color !== 'wild') {
      console.log('   🌀 Opening Zero Rotate Modal for card:', card.id);
      setPendingCard(card);
      setShowZeroPicker(true);
      return;
    }

    // Overkill: card 7 triggers swap picker
    if (isOverkill && gameConfig?.sevenSwapsHands && card.value === '7' && card.color !== 'wild') {
      console.log('   🔄 Opening Seven Swap Modal for card:', card.id);
      setPendingCard(card);
      setShowSwapPicker(true);
      return;
    }

    if (card.color === 'wild') {
      console.log('   🎨 Opening Wildcard Color Picker for card:', card.id);
      setPendingCard(card);
      setShowColorPicker(true);
      return;
    }

    console.log('   ✅ Executing onPlayCard:', card.id);
    onPlayCard(card.id, null);
  };

  const handleSelectColor = (color) => {
    setShowColorPicker(false);
    if (pendingCard) {
      onPlayCard(pendingCard.id, color);
      setPendingCard(null);
    }
  };

  const otherPlayers = gamePlayers.filter((_, i) => i !== myIdx);
  const totalOthers = otherPlayers.length;

  const canShoutMuno = isMyTurn && myHand.length === 2 && myHand.some(c => canPlayCard(c)) && !munoShoutedBy[myIdx];

  const getArcPos = (idx, total) => {
    const margin = isMobile ? 0.06 : 0.10;
    const available = 1 - margin * 2;
    const x = total === 1 ? 0.5 : margin + (idx / (total - 1)) * available;
    const yBase = total <= 2 ? sz.arcYBase : (sz.arcYBase - 0.02);
    const yExtra = total > 2 ? Math.abs((idx / (total - 1)) - 0.5) * sz.arcYExtra : 0;
    return { left: `${(x * 100).toFixed(1)}%`, top: `${((yBase + yExtra) * 100).toFixed(1)}%` };
  };

  return (
    <div
      data-mode={mode}
      style={{
        width: '100vw', height: isMobile ? '100dvh' : '100vh', overflow: 'hidden', position: 'relative',
        background: isOverkill
          ? 'radial-gradient(ellipse at 50% 50%, #150a00 0%, #0a0600 100%)'
          : 'radial-gradient(ellipse at 50% 50%, #0e1628 0%, #07090f 100%)',
        fontFamily: 'var(--font-body)',
        transition: 'background 0.5s ease',
      }}
    >

      {/* DYNAMIC BACKGROUND PULSARS */}
      {pulsars.map(p => (
        <div key={p.id} className="dynamic-pulsar-instance" style={{ top: `${p.y}%`, left: `${p.x}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, '--max-op': p.maxOpacity, '--dur': `${p.duration}ms` }} />
      ))}

      {/* FLYING CARDS OVERLAY (Draw + Play animations) */}
      {flyingCards.map(fc => (
        <div key={fc.id} style={{
          position: 'fixed',
          left: `${fc.left}px`,
          top: `${fc.top}px`,
          width: `${fc.width}px`,
          height: `${fc.height}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          transform: fc.transform,
          transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          <img src={`/cards/${fc.file}`} alt="" style={{ width: '100%', height: '100%', display: 'block', borderRadius: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} />
        </div>
      ))}

      {/* Table felt glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: sz.feltW, height: sz.feltH, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${activeColorHex}18 0%, transparent 70%)`,
        filter: 'blur(30px)', pointerEvents: 'none',
        transition: 'background 0.8s ease', zIndex: 0,
      }} />

      {/* Direction ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: sz.ringW, height: sz.ringH, pointerEvents: 'none', zIndex: 1,
      }}>
        <svg width="100%" height="100%" viewBox="0 0 420 260"
          style={{ filter: `drop-shadow(0 0 6px ${activeColorHex}88)` }}>
          <ellipse cx="210" cy="130" rx="195" ry="115"
            fill="none" stroke={activeColorHex} strokeWidth="1.5" strokeOpacity="0.18" />
          <ellipse cx="210" cy="130" rx="195" ry="115"
            fill="none" stroke={activeColorHex} strokeWidth="3"
            strokeDasharray="18 12 4 12" strokeLinecap="round" strokeOpacity="0.55"
            style={{ animation: `${direction === 1 ? 'flowCw' : 'flowCcw'} 2.8s linear infinite` }} />
        </svg>
      </div>

      {/* HUD top-left */}
      <div style={{
        position: 'fixed', top: isMobile ? '0.3rem' : '0.7rem', left: isMobile ? '0.3rem' : '0.7rem', zIndex: 9000,
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        background: 'rgba(7,9,15,0.92)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: isMobile ? '7px' : '10px', padding: isMobile ? '0.15rem 0.4rem' : '0.27rem 0.65rem', backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: isMobile ? '0.55rem' : '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-code)', letterSpacing: '0.12em' }}>{roomCode}</span>
        {isAdmin && <Crown size={isMobile ? 8 : 10} color="#ffc107" />}
        <button
          onClick={onOpenLeaderboard}
          title="Tabla de Clasificación & Logros"
          style={{
            background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)',
            borderRadius: '6px', color: '#ffc107', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0.15rem 0.35rem', marginLeft: '0.2rem'
          }}
        >
          <Trophy size={isMobile ? 9 : 12} />
        </button>
        <span style={{ fontSize: isMobile ? '0.48rem' : '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-code)', marginLeft: '0.2rem' }}>v0.9.9.8888-alpha.4</span>
        {isOverkill && (
          <span style={{
            fontSize: isMobile ? '0.45rem' : '0.55rem', fontWeight: 900,
            color: '#ff6030', background: 'rgba(255,69,0,0.15)',
            border: '1px solid rgba(255,69,0,0.3)',
            borderRadius: '4px', padding: '0.05rem 0.35rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginLeft: '0.2rem',
          }}>
            OVERKILL
          </span>
        )}
      </div>

      {/* Leave button */}
      <button onClick={onLeave} style={{
        position: 'fixed', top: isMobile ? '0.3rem' : '0.7rem', right: isMobile ? '0.3rem' : '0.7rem', zIndex: 9000,
        display: 'flex', alignItems: 'center', gap: '0.2rem',
        background: 'rgba(255,59,92,0.07)', border: '1px solid rgba(255,59,92,0.22)',
        color: 'rgba(255,100,100,0.65)', borderRadius: isMobile ? '6px' : '8px', padding: isMobile ? '0.15rem 0.4rem' : '0.27rem 0.65rem',
        fontSize: isMobile ? '0.55rem' : '0.7rem', fontWeight: 700, cursor: 'pointer',
      }}>
        <LogOut size={isMobile ? 9 : 11} /> Salir
      </button>

      {/* Action burst */}
      {actionBurst && (
        <div key={actionBurst.key} className="action-burst-lightning-pure" style={{ color: actionBurst.color }}>
          {actionBurst.type === 'stack'
            ? <><Zap size={sz.burstIcon} color={actionBurst.color} style={{ filter: `drop-shadow(0 0 16px ${actionBurst.color})` }} /><span style={{ fontSize: sz.burstFontStack, fontWeight: 900, textShadow: `0 0 16px ${actionBurst.color}` }}>{actionBurst.text}</span></>
            : <span style={{ fontSize: sz.burstFontText, fontWeight: 900, textShadow: `0 0 20px ${actionBurst.color}` }}>{actionBurst.text}</span>
          }
        </div>
      )}

      {/* ═══ CENTER PILE ═══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5, display: 'flex', alignItems: 'center', gap: sz.centerGap,
      }}>

        {/* Draw pile (GLOWS ON YOUR TURN TO INDICATE YOU CAN DRAW MULTIPLE TIMES) */}
        <div
          ref={drawRef}
          onClick={handleDrawClick}
          style={{
            textAlign: 'center',
            cursor: isMyTurn ? 'pointer' : 'default',
            transform: isMyTurn ? 'scale(1.05)' : 'scale(0.97)',
            transition: 'all 0.2s ease',
          }}
        >
          <img src="/cards/back.svg" alt="Mazo" style={{
            width: sz.drawW, height: sz.drawH,
            filter: `drop-shadow(0 6px 16px rgba(0,0,0,0.75)) ${isMyTurn ? `drop-shadow(0 0 16px ${activeColorHex})` : ''}`,
            transition: 'filter 0.3s',
            borderRadius: '6px',
          }} />
          <div style={{
            fontSize: sz.labelFont,
            color: isMyTurn ? activeColorHex : 'rgba(255,255,255,0.3)',
            marginTop: '0.3rem', letterSpacing: '0.08em',
            fontWeight: isMyTurn ? 900 : 400,
            textShadow: isMyTurn ? `0 0 8px ${activeColorHex}` : 'none',
          }}>
            MAZO {isMyTurn ? '(ROBAR)' : ''}
          </div>
        </div>

        {/* Turn indicator + SVG countdown ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          {/* Turn Name Badge */}
          <div style={{
            fontSize: '0.68rem', fontWeight: 800,
            color: isMyTurn ? '#00e676' : 'rgba(255,255,255,0.7)',
            background: 'rgba(7,9,15,0.85)',
            border: `1px solid ${isMyTurn ? '#00e67655' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', padding: '0.15rem 0.55rem',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {isMyTurn ? '● TU TURNO' : `Turno: ${gamePlayers[currentTurnIdx]?.username || '...'}`}
          </div>

          {/* SVG ring timer with giant countdown number */}
          <div style={{ position: 'relative', width: sz.timerSize, height: sz.timerSize }}>
            <svg width="100%" height="100%" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="25" fill="rgba(7,9,15,0.92)" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle cx="32" cy="32" r="25" fill="none"
                stroke={timerUrgent ? '#ff3b5c' : activeColorHex}
                strokeWidth="4"
                strokeDasharray={`${(timerPct * 2 * Math.PI * 25).toFixed(1)} ${(2 * Math.PI * 25).toFixed(1)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${timerUrgent ? '#ff3b5c' : activeColorHex})` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontWeight: 900, fontSize: sz.timerFont, fontFamily: 'var(--font-code)',
                color: timerUrgent ? '#ff3b5c' : '#fff', lineHeight: 1,
                textShadow: timerUrgent ? '0 0 10px rgba(255,59,92,0.6)' : 'none',
              }}>
                {secondsLeft}
              </span>
            </div>
          </div>

          {/* Stack warning */}
          {drawStackCount > 0 && (
            <div style={{
              background: 'rgba(255,59,92,0.15)', border: '1px solid rgba(255,59,92,0.4)',
              color: '#ff3b5c', fontWeight: 900, fontSize: '0.75rem',
              padding: '0.12rem 0.55rem', borderRadius: '8px',
            }}>
              +{drawStackCount}
            </div>
          )}
        </div>

        {/* Discard pile */}
        <div ref={discardRef} style={{ textAlign: 'center' }}>
          {(displayedTopCard || topCard)
            ? <img src={`/cards/${(displayedTopCard || topCard).file}`} alt={(displayedTopCard || topCard).name} style={{ width: sz.discardW, height: sz.discardH, borderRadius: '6px', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.8))' }} />
            : <div style={{ width: sz.discardW, height: sz.discardH, borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>…</div>
          }
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem', letterSpacing: '0.07em' }}>DESCARTE</div>
        </div>
      </div>

      {/* ═══ OTHER PLAYERS ARC ══════════════════════════════════════════════════ */}
      {otherPlayers.map((player, arcIdx) => {
        const globalIdx = gamePlayers.findIndex(p => p.sessionId === player.sessionId);
        const isTurn = currentTurnIdx === globalIdx;
        const handSize = handSizes[globalIdx] ?? 0;
        const pColor = player.color || '#888';
        const pos = getArcPos(arcIdx, totalOthers);
        const baseCardW = isMobile ? Math.max(14, 28 - totalOthers * 1.5) : Math.max(26, 46 - totalOthers * 2);
        const cardW = baseCardW;
        const cardH = Math.round(cardW * 1.48);
        const overlap = Math.round(cardW * 0.55);
        const maxVisibleCards = isMobile ? Math.min(handSize, Math.max(5, 10 - totalOthers)) : Math.min(handSize, 10);

        return (
          <div key={player.sessionId} data-seat-idx={globalIdx} style={{
            position: 'absolute',
            left: pos.left, top: pos.top,
            transform: 'translate(-50%, 0)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.1rem' : '0.28rem',
            zIndex: 8,
          }}>
            {handSize === 1 && <span className="muno-shout-badge">MUNO!</span>}

            {/* Cards */}
            <div className={isTurn ? 'tight-hand-glow' : ''}
              style={{ '--glow-color': pColor, display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: maxVisibleCards }).map((_, ci) => (
                <img key={ci} src="/cards/back.svg" alt="" style={{
                  width: `${cardW}px`, height: `${cardH}px`,
                  marginLeft: ci === 0 ? '0' : `-${overlap}px`,
                  borderRadius: isMobile ? '2px' : '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
                }} />
              ))}
              {handSize > maxVisibleCards && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.5rem' : '0.65rem', marginLeft: '2px' }}>+{handSize - maxVisibleCards}</span>}
            </div>

            {/* Name tag */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: isMobile ? '0.15rem' : '0.3rem',
              background: 'rgba(7,9,15,0.85)',
              border: `1px solid ${isTurn ? pColor + '55' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '20px', padding: isMobile ? '0.1rem 0.3rem' : '0.18rem 0.55rem',
              boxShadow: isTurn ? `0 0 10px ${pColor}35` : 'none',
              transition: 'all 0.3s ease',
              maxWidth: isMobile ? '70px' : 'none',
            }}>
              <span style={{
                width: isMobile ? '4px' : '7px', height: isMobile ? '4px' : '7px', borderRadius: '50%', background: pColor, flexShrink: 0,
                boxShadow: isTurn ? `0 0 5px ${pColor}` : 'none',
                opacity: player.connected !== false ? 1 : 0.3,
              }} />
              <span style={{ fontSize: isMobile ? '0.48rem' : '0.72rem', fontWeight: 700, color: isTurn ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'color 0.3s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.username}
              </span>
              {player.isAdmin && <Crown size={9} color="#ffc107" />}
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-code)' }}>({handSize})</span>
              {isTurn && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00e676', boxShadow: '0 0 5px #00e676' }} />}
            </div>
          </div>
        );
      })}

      {/* ═══ MY HAND ════════════════════════════════════════════════════════════ */}
      <div ref={mySeatRef} data-seat-idx={myIdx} className="human-bottom-seat-integrated">
        {/* Info bar (Always sitting above cards with zIndex: 5000) */}
        <div style={{
          position: 'relative',
          zIndex: 5000,
          display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.55rem',
          marginBottom: isMobile ? '0.5rem' : '0.6rem', flexWrap: 'wrap', justifyContent: 'center',
          pointerEvents: 'auto',
        }}>
          {/* Name + color */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(7,9,15,0.95)',
            border: `1.5px solid ${isMyTurn ? myColor : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '20px', padding: isMobile ? '0.15rem 0.5rem' : '0.22rem 0.7rem',
            transition: 'all 0.4s ease',
            boxShadow: isMyTurn ? `0 0 16px ${myColor}60` : '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <span style={{ width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', borderRadius: '50%', background: myColor, boxShadow: `0 0 6px ${myColor}` }} />
            <span style={{ fontWeight: 800, fontSize: isMobile ? '0.72rem' : '0.83rem', color: '#fff' }}>{me?.username || 'Tú'}</span>
            {isAdmin && <Crown size={10} color="#ffc107" />}
            <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.32)', fontFamily: 'var(--font-code)' }}>({myHand.length})</span>
          </div>

          {/* Draw stack warning */}
          {isMyTurn && drawStackCount > 0 && (
            <div style={{
              background: 'rgba(255,59,92,0.13)', border: '1px solid rgba(255,59,92,0.4)',
              color: '#ff6b82', borderRadius: '20px', padding: '0.2rem 0.65rem',
              fontSize: '0.73rem', fontWeight: 800,
            }}>
              ⚠ Defiéndete o roba +{drawStackCount}
            </div>
          )}

          {/* MUNO button (Sitting prominently on top of cards with heartbeat pulsation) */}
          {canShoutMuno && (
            <button onClick={onShoutMuno} className="muno-button-pulsing" style={{
              background: 'linear-gradient(135deg, #ff3b5c, #ff9f43)',
              border: '2px solid #ffffff',
              borderRadius: '20px', color: '#fff',
              padding: isMobile ? '0.3rem 1.1rem' : '0.25rem 0.9rem',
              fontSize: isMobile ? '0.85rem' : '0.78rem',
              fontWeight: 900, cursor: 'pointer',
              letterSpacing: '0.04em',
              zIndex: 5001,
            }}>
              ¡MUNO!
            </button>
          )}

          {/* MUNO announced badge */}
          {munoShoutedBy[myIdx] && myHand.length <= 2 && (
            <span className="muno-shout-badge">MUNO!</span>
          )}
        </div>

        {/* Hand cards */}
        <div
          className={`player-hand-spacious ${isMyTurn ? 'tight-hand-glow' : ''}`}
          style={{ '--glow-color': drawStackCount > 0 ? '#ff3b5c' : myColor }}
        >
          {myHand.map(card => {
            const cardColor = COLOR_MAP[card.color] || '#fff';
            const isSelected = selectedCardId === card.id;

            const cardW = isMobile
              ? (myHand.length > 12 ? '42px' : myHand.length > 7 ? '48px' : '54px')
              : sz.cardW;

            const marginLeft = isMobile
              ? (myHand.length > 12 ? '-26px' : myHand.length > 7 ? '-20px' : '-16px')
              : undefined;

            const playable = isMyTurn ? canPlayCard(card) : canJumpInCard(card);
            const isJumpIn = !isMyTurn && canJumpInCard(card);

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                style={{
                  width: cardW,
                  marginLeft: isSelected && isMobile ? '8px' : marginLeft,
                  marginRight: isSelected && isMobile ? '20px' : undefined,
                  transform: isSelected ? 'translateY(-24px) scale(1.35)' : undefined,
                  zIndex: isSelected ? 400 : undefined,
                  padding: isMobile ? '0.1rem' : '0.25rem',
                  opacity: playable ? 1 : 0.36,
                  border: isSelected
                    ? `2.5px solid ${cardColor}`
                    : (isJumpIn
                        ? '2.5px solid #ffc107'
                        : (playable ? `2px solid ${cardColor}90` : '1px solid rgba(255,255,255,0.09)')),
                  cursor: playable ? 'pointer' : 'not-allowed',
                  boxShadow: isSelected
                    ? `0 0 25px ${cardColor}, 0 12px 30px rgba(0,0,0,0.95)`
                    : (isJumpIn
                        ? '0 0 18px #ffc107, 0 0 30px rgba(255,69,0,0.6)'
                        : (playable ? `0 0 10px ${cardColor}45` : 'none')),
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '6px',
                }}
              >
                <img src={`/cards/${card.file}`} alt={card.name} style={{ width: '100%', display: 'block', borderRadius: '4px' }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ WILD COLOR PICKER ════════════════════════════════════════════════ */}
      {showColorPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '320px', textAlign: 'center', borderRadius: '22px', padding: '1.5rem', background: 'rgba(10,13,24,0.97)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Elige un color</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
              {[
                { key: 'red', label: 'Rojo', hex: '#ff3b5c' },
                { key: 'blue', label: 'Azul', hex: '#0088ff' },
                { key: 'green', label: 'Verde', hex: '#00e676' },
                { key: 'yellow', label: 'Amarillo', hex: '#ffc107' },
              ].map(c => (
                <button key={c.key} onClick={() => handleSelectColor(c.key)} style={{
                  background: c.hex + '18', border: `2px solid ${c.hex}60`,
                  borderRadius: '12px', padding: '0.75rem',
                  color: '#fff', fontWeight: 800, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = c.hex + '38'}
                  onMouseLeave={e => e.currentTarget.style.background = c.hex + '18'}
                >
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: c.hex, boxShadow: `0 0 7px ${c.hex}` }} />
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setPendingCard(null); setShowColorPicker(false); }} style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '0.3rem 0.6rem',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ═══ OVERKILL: CARD 0 ROTATE PICKER ═══════════════════════════════════ */}
      {showZeroPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '300px', textAlign: 'center', borderRadius: '22px', padding: '1.5rem', background: 'rgba(10,6,0,0.97)', border: '1px solid rgba(255,69,0,0.15)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.3rem', color: '#fff' }}>Carta 0</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem', fontWeight: 500 }}>Rotación de manos en Overkill</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <button onClick={() => { onPlayCard(pendingCard.id, null); setPendingCard(null); setShowZeroPicker(false); }} style={{ padding: '0.6rem', background: 'rgba(255,69,0,0.15)', border: '1px solid rgba(255,69,0,0.35)', borderRadius: '10px', color: '#ff6030', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Rotar todas las manos</button>
              <button onClick={() => { onPlayCard(pendingCard.id, null, -1); setPendingCard(null); setShowZeroPicker(false); }} style={{ padding: '0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Lanzar sin efecto</button>
              <button onClick={() => { setPendingCard(null); setShowZeroPicker(false); }} style={{ marginTop: '0.1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '0.2rem' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ OVERKILL: SWAP TARGET PICKER (carta 7) ══════════════════════════ */}
      {showSwapPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '300px', textAlign: 'center', borderRadius: '22px', padding: '1.5rem', background: 'rgba(10,6,0,0.97)', border: '1px solid rgba(255,69,0,0.15)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.3rem', color: '#fff' }}>Carta 7</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem', fontWeight: 500 }}>Intercambiar mano con un jugador</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {gamePlayers.filter((_, i) => i !== myIdx).map(p => (
                <button key={p.sessionId} onClick={() => { onPlayCard(pendingCard.id, null, p.playerIdx); setPendingCard(null); setShowSwapPicker(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}`, flexShrink: 0 }} />{p.username}</div>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-code)' }}>{gameState.handSizes?.[p.playerIdx] ?? '?'} cartas</span>
                </button>
              ))}
              <button onClick={() => { onPlayCard(pendingCard.id, null, -1); setPendingCard(null); setShowSwapPicker(false); }} style={{ padding: '0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Lanzar sin efecto</button>
              <button onClick={() => { setPendingCard(null); setShowSwapPicker(false); }} style={{ marginTop: '0.2rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '0.2rem' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ WINNER MODAL ═══════════════════════════════════════════════════════ */}
      {winner !== null && winner !== undefined && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px', textAlign: 'center', borderRadius: '22px', padding: '2rem', background: 'rgba(10,13,24,0.97)' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🏆</div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: '0.35rem' }}>Ganador</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: gamePlayers[winner]?.color || '#ffc107', marginBottom: '0.25rem' }}>{gamePlayers[winner]?.username || '???'}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginBottom: '1.3rem' }}>{gamePlayers.length} jugadores · Sala {roomCode}</div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              {isAdmin && (
                <button onClick={onRematch} style={{ flex: 1, padding: '0.68rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0088ff, #00e676)', color: '#07090f', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer' }}>Nueva partida</button>
              )}
              <button onClick={onLeave} style={{ flex: 1, padding: '0.68rem', borderRadius: '12px', border: '1px solid rgba(255,59,92,0.28)', background: 'rgba(255,59,92,0.07)', color: '#ff6b82', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
