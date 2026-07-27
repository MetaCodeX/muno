import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, User, Bot, Ban, RefreshCw, Zap, UserPlus, UserMinus, Wifi, WifiOff } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

// OFFICIAL 108-CARD UNO DECK DEFINITION
const DECK = [
  // Red Cards (15 cards)
  { color: 'red', value: '0', name: 'Rojo 0', file: 'red_0.svg' },
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'red', value: `${i + 1}`, name: `Rojo ${i + 1}`, file: `red_${i + 1}.svg` })),
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'red', value: `${i + 1}`, name: `Rojo ${i + 1}`, file: `red_${i + 1}.svg` })),
  { color: 'red', value: 'skip', name: 'Rojo Bloqueo', file: 'red_skip.svg' },
  { color: 'red', value: 'skip', name: 'Rojo Bloqueo', file: 'red_skip.svg' },
  { color: 'red', value: 'reverse', name: 'Rojo Reversa', file: 'red_reverse.svg' },
  { color: 'red', value: 'reverse', name: 'Rojo Reversa', file: 'red_reverse.svg' },
  { color: 'red', value: '+2', name: 'Rojo +2', file: 'red_draw_2.svg' },
  { color: 'red', value: '+2', name: 'Rojo +2', file: 'red_draw_2.svg' },

  // Blue Cards (15 cards)
  { color: 'blue', value: '0', name: 'Azul 0', file: 'blue_0.svg' },
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'blue', value: `${i + 1}`, name: `Azul ${i + 1}`, file: `blue_${i + 1}.svg` })),
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'blue', value: `${i + 1}`, name: `Azul ${i + 1}`, file: `blue_${i + 1}.svg` })),
  { color: 'blue', value: 'skip', name: 'Azul Bloqueo', file: 'blue_skip.svg' },
  { color: 'blue', value: 'skip', name: 'Azul Bloqueo', file: 'blue_skip.svg' },
  { color: 'blue', value: 'reverse', name: 'Azul Reversa', file: 'blue_reverse.svg' },
  { color: 'blue', value: 'reverse', name: 'Azul Reversa', file: 'blue_reverse.svg' },
  { color: 'blue', value: '+2', name: 'Azul +2', file: 'blue_draw_2.svg' },
  { color: 'blue', value: '+2', name: 'Azul +2', file: 'blue_draw_2.svg' },

  // Green Cards (15 cards)
  { color: 'green', value: '0', name: 'Verde 0', file: 'green_0.svg' },
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'green', value: `${i + 1}`, name: `Verde ${i + 1}`, file: `green_${i + 1}.svg` })),
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'green', value: `${i + 1}`, name: `Verde ${i + 1}`, file: `green_${i + 1}.svg` })),
  { color: 'green', value: 'skip', name: 'Verde Bloqueo', file: 'green_skip.svg' },
  { color: 'green', value: 'skip', name: 'Verde Bloqueo', file: 'green_skip.svg' },
  { color: 'green', value: 'reverse', name: 'Verde Reversa', file: 'green_reverse.svg' },
  { color: 'green', value: 'reverse', name: 'Verde Reversa', file: 'green_reverse.svg' },
  { color: 'green', value: '+2', name: 'Verde +2', file: 'green_draw_2.svg' },
  { color: 'green', value: '+2', name: 'Verde +2', file: 'green_draw_2.svg' },

  // Yellow Cards (15 cards)
  { color: 'yellow', value: '0', name: 'Amarillo 0', file: 'yellow_0.svg' },
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'yellow', value: `${i + 1}`, name: `Amarillo ${i + 1}`, file: `yellow_${i + 1}.svg` })),
  ...Array.from({ length: 9 }, (_, i) => ({ color: 'yellow', value: `${i + 1}`, name: `Amarillo ${i + 1}`, file: `yellow_${i + 1}.svg` })),
  { color: 'yellow', value: 'skip', name: 'Amarillo Bloqueo', file: 'yellow_skip.svg' },
  { color: 'yellow', value: 'skip', name: 'Amarillo Bloqueo', file: 'yellow_skip.svg' },
  { color: 'yellow', value: 'reverse', name: 'Amarillo Reversa', file: 'yellow_reverse.svg' },
  { color: 'yellow', value: 'reverse', name: 'Amarillo Reversa', file: 'yellow_reverse.svg' },
  { color: 'yellow', value: '+2', name: 'Amarillo +2', file: 'yellow_draw_2.svg' },
  { color: 'yellow', value: '+2', name: 'Amarillo +2', file: 'yellow_draw_2.svg' },

  // Wild Cards (8 cards)
  { color: 'wild', value: 'wild', name: 'Comodín Color', file: 'wild.svg' },
  { color: 'wild', value: 'wild', name: 'Comodín Color', file: 'wild.svg' },
  { color: 'wild', value: 'wild', name: 'Comodín Color', file: 'wild.svg' },
  { color: 'wild', value: 'wild', name: 'Comodín Color', file: 'wild.svg' },
  { color: 'wild', value: '+4', name: 'Comodín +4', file: 'wild_draw_4.svg' },
  { color: 'wild', value: '+4', name: 'Comodín +4', file: 'wild_draw_4.svg' },
  { color: 'wild', value: '+4', name: 'Comodín +4', file: 'wild_draw_4.svg' },
  { color: 'wild', value: '+4', name: 'Comodín +4', file: 'wild_draw_4.svg' },
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 16;
const CARDS_PER_PLAYER = 7;

const COLOR_MAP = {
  red: '#ff3b5c',
  blue: '#0088ff',
  green: '#00e676',
  yellow: '#ffc107',
  wild: '#b000ff'
};

const PLAYER_COLORS = [
  '#00e676', '#0088ff', '#ffc107', '#ff3b5c', '#b000ff',
  '#00d2d3', '#ff9f43', '#54a0ff', '#5f27cd', '#ff6b6b',
  '#10ac84', '#ee5253', '#0abde3', '#f368e0', '#e84393',
  '#00cec9', '#fdcb6e', '#6c5ce7', '#e17055'
];

export function MunoGame() {
  const [numPlayers, setNumPlayers] = useState(14);
  const [hands, setHands] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [drawPile, setDrawPile] = useState([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [currentColor, setCurrentColor] = useState('red');
  const [gameLog, setGameLog] = useState(['Partida iniciada']);
  const [gameWinner, setGameWinner] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState(null);
  const [munoShouted, setMunoShouted] = useState(false);

  // Turn Move Lock Ref
  const isMoveLock = useRef(false);

  // 30-Second Turn Countdown Timer State
  const [timeLeft, setTimeLeft] = useState(30);

  // Connection & Cookie Session State
  const [isSimulatingDisconnect, setIsSimulatingDisconnect] = useState(false);
  const [cookieStatusMsg, setCookieStatusMsg] = useState('');

  // Draw Card Stacking State
  const [drawStackCount, setDrawStackCount] = useState(0);

  // Action Burst State
  const [actionBurst, setActionBurst] = useState(null);
  const actionBurstTimerRef = useRef(null);

  // Flying Cards Overlay State
  const [flyingCards, setFlyingCards] = useState([]);

  // DYNAMIC RANDOMIZED AMBIENT PULSARS STATE
  const [pulsars, setPulsars] = useState([]);

  // Element Refs for Seats
  const drawDeckRef = useRef(null);
  const discardPileRef = useRef(null);
  const playerHandRef = useRef(null);
  const seatRefs = useRef([]);

  useEffect(() => {
    seatRefs.current = Array.from({ length: MAX_PLAYERS }, (_, i) => seatRefs.current[i] || React.createRef());
  }, []);

  // Trigger Sound Effect when Turn passes to Human Player
  useEffect(() => {
    if (currentTurnIdx === 0 && !gameWinner && !isSimulatingDisconnect) {
      soundManager.yourTurn();
    }
  }, [currentTurnIdx]);

  // Dynamic Pulsar Spawner Loop
  useEffect(() => {
    const deckColors = ['#ff3b5c', '#0088ff', '#00e676', '#ffc107', '#b000ff'];

    const spawnInterval = setInterval(() => {
      setPulsars(prev => {
        const now = Date.now();
        const active = prev.filter(p => now - p.created < p.duration);
        if (active.length >= 6) return active;

        const randomColor = deckColors[Math.floor(Math.random() * deckColors.length)];
        const randomX = 10 + Math.random() * 80;
        const randomY = 10 + Math.random() * 80;
        const randomSize = 130 + Math.random() * 210;
        const randomMaxOpacity = (0.07 + Math.random() * 0.22).toFixed(2);
        const duration = Math.floor(4500 + Math.random() * 4500);

        const newPulsar = {
          id: 'pulsar_' + Math.random().toString(36).substr(2, 6),
          x: randomX,
          y: randomY,
          size: randomSize,
          color: randomColor,
          maxOpacity: randomMaxOpacity,
          created: now,
          duration
        };

        return [...active, newPulsar];
      });
    }, 1600);

    return () => clearInterval(spawnInterval);
  }, []);

  const createUniqueCardInstance = (cardRaw, prefix = 'c') => {
    const uniqueId = `${prefix}_${cardRaw.color}_${cardRaw.value}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    return { ...cardRaw, id: uniqueId };
  };

  const getNextPlayerIdx = (currentIdx, totalPlayers = numPlayers, step = 1, dir = direction) => {
    let next = (currentIdx + (step * dir)) % totalPlayers;
    if (next < 0) next += totalPlayers;
    return next;
  };

  const deepMultiPassShuffle = (array, passes = 3) => {
    let result = [...array];
    for (let p = 0; p < passes; p++) {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }
    return result;
  };

  const generateInfiniteDeckPool = (existingDeck = [], minThreshold = 30) => {
    let currentPool = [...existingDeck];
    if (currentPool.length < minThreshold) {
      const freshDeck = deepMultiPassShuffle([...DECK, ...DECK, ...DECK, ...DECK]);
      const stampedFresh = freshDeck.map((c, idx) => createUniqueCardInstance(c, `inf_${idx}`));
      currentPool = [...stampedFresh, ...currentPool];
    }
    return currentPool;
  };

  // 30-Second Turn Timer Countdown Interval
  useEffect(() => {
    if (gameWinner || isSimulatingDisconnect) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTurnTimeout();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurnIdx, gameWinner, isSimulatingDisconnect, numPlayers, direction, drawStackCount]);

  useEffect(() => {
    setTimeLeft(30);
  }, [currentTurnIdx]);

  const handleTurnTimeout = () => {
    if (isMoveLock.current) return;
    isMoveLock.current = true;
    soundManager.timeout();

    if (drawStackCount > 0) {
      const penalty = drawStackCount;
      addLog(`Tiempo agotado para ${currentTurnIdx === 0 ? 'Humano' : `Bot ${currentTurnIdx}`}. Penalización de ${penalty} cartas de acumulación.`);
      drawCardsInternal(currentTurnIdx, penalty, () => {
        setDrawStackCount(0);
        const nextTurn = getNextPlayerIdx(currentTurnIdx, numPlayers, 1, direction);
        setCurrentTurnIdx(nextTurn);
        setTimeLeft(30);
        isMoveLock.current = false;
      });
    } else {
      addLog(`Tiempo agotado para ${currentTurnIdx === 0 ? 'Humano' : `Bot ${currentTurnIdx}`}. Penalización de 2 cartas.`);
      drawCardsInternal(currentTurnIdx, 2, () => {
        const nextTurn = getNextPlayerIdx(currentTurnIdx, numPlayers, 1, direction);
        setCurrentTurnIdx(nextTurn);
        setTimeLeft(30);
        isMoveLock.current = false;
      });
    }
  };

  const saveSessionToCookie = (activeHands, currentDiscard, currentDraw, turnIdx, color, activeNumPlayers, currentDir) => {
    try {
      const sessionData = {
        numPlayers: activeNumPlayers,
        hands: activeHands,
        discardPile: currentDiscard,
        drawPile: currentDraw,
        currentTurnIdx: turnIdx,
        currentColor: color,
        direction: currentDir,
        timestamp: Date.now()
      };
      document.cookie = `muno_active_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=86400`;
    } catch (e) {
      console.warn('Cookie save warning:', e);
    }
  };

  const getSessionFromCookie = () => {
    try {
      const match = document.cookie.match(/(?:^|; )muno_active_session=([^;]*)/);
      if (match) {
        return JSON.parse(decodeURIComponent(match[1]));
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  useEffect(() => {
    const saved = getSessionFromCookie();
    if (saved && saved.hands && saved.hands.length > 0) {
      const safePlayers = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, saved.numPlayers || 14));
      setNumPlayers(safePlayers);
      setHands(saved.hands);
      setDiscardPile(saved.discardPile || []);
      setDrawPile(generateInfiniteDeckPool(saved.drawPile || []));
      setCurrentTurnIdx(saved.currentTurnIdx || 0);
      setCurrentColor(saved.currentColor || 'red');
      setDirection(saved.direction || 1);
      setTimeLeft(30);
      isMoveLock.current = false;
      addLog('Sesión reanudada desde Cookie.');
      showCookieToast('Sesión reanudada desde Cookie');
    } else {
      startNewGame(numPlayers);
    }
  }, []);

  const showCookieToast = (msg) => {
    setCookieStatusMsg(msg);
    setTimeout(() => setCookieStatusMsg(''), 2500);
  };

  const startNewGame = (playerCount = numPlayers) => {
    const safeCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, playerCount));
    const megaDeck = deepMultiPassShuffle([...DECK, ...DECK, ...DECK, ...DECK]);
    const stampedMegaDeck = megaDeck.map((c, i) => createUniqueCardInstance(c, `start_${i}`));

    const initialHands = [];
    for (let i = 0; i < safeCount; i++) {
      initialHands.push(stampedMegaDeck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER));
    }

    let initialDiscardIdx = safeCount * CARDS_PER_PLAYER;
    let initialDiscard = stampedMegaDeck[initialDiscardIdx] || createUniqueCardInstance(DECK[0], 'discard_init');

    while (initialDiscard.value === '+4' && initialDiscard.color === 'wild') {
      initialDiscardIdx++;
      initialDiscard = stampedMegaDeck[initialDiscardIdx] || createUniqueCardInstance(DECK[0], 'discard_init');
    }

    const rest = generateInfiniteDeckPool(stampedMegaDeck.slice(initialDiscardIdx + 1));

    let startTurn = 0;
    let startDir = 1;
    let startColor = initialDiscard.color === 'wild' ? 'red' : initialDiscard.color;

    if (initialDiscard.value === 'skip') {
      startTurn = 1;
    } else if (initialDiscard.value === 'reverse') {
      startDir = -1;
      startTurn = safeCount - 1;
    }

    setHands(initialHands);
    setDiscardPile([initialDiscard]);
    setDrawPile(rest);
    setCurrentTurnIdx(startTurn);
    setDirection(startDir);
    setCurrentColor(startColor);
    setGameWinner(null);
    setMunoShouted(false);
    setActionBurst(null);
    setDrawStackCount(0);
    setTimeLeft(30);
    isMoveLock.current = false;

    addLog(`Partida iniciada (${safeCount} jugadores, 7 cartas por jugador)`);
    saveSessionToCookie(initialHands, [initialDiscard], rest, startTurn, startColor, safeCount, startDir);
  };

  const addLog = (msg) => {
    setGameLog(prev => [msg, ...prev]);
  };

  const triggerActionBurst = (type, colorVal = '#00e676', numText = '') => {
    if (actionBurstTimerRef.current) clearTimeout(actionBurstTimerRef.current);
    setActionBurst({ type, color: colorVal, numText, key: Date.now() });

    actionBurstTimerRef.current = setTimeout(() => {
      setActionBurst(null);
    }, 1000);
  };

  const triggerSpatialFlight = (fromEl, toEl, cardFile, onComplete, isEnemy = false) => {
    if (!fromEl || !toEl) {
      if (onComplete) onComplete();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const flyId = 'fly_' + Math.random().toString(36).substr(2, 6);

    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const startWidth = 80;
    const startHeight = 120;
    const startLeft = fromCenterX - startWidth / 2;
    const startTop = fromCenterY - startHeight / 2;

    const newFlyingCard = {
      id: flyId,
      cardFile,
      isEnemy,
      isFlipped: isEnemy,
      left: startLeft,
      top: startTop,
      width: startWidth,
      height: startHeight,
      transform: isEnemy 
        ? 'translate3d(0, 0, 0) rotateY(180deg) scale(1)'
        : 'translate3d(0, 0, 0) rotateY(0deg) scale(1)'
    };

    setFlyingCards(prev => [...prev, newFlyingCard]);

    requestAnimationFrame(() => {
      setFlyingCards(prev => prev.map(c => {
        if (c.id === flyId) {
          return {
            ...c,
            isFlipped: false,
            transform: isEnemy
              ? `translate3d(${dx}px, ${dy}px, 0) rotateY(360deg) scale(1.04)`
              : `translate3d(${dx}px, ${dy}px, 0) rotateY(0deg) scale(1.04)`
          };
        }
        return c;
      }));
    });

    setTimeout(() => {
      setFlyingCards(prev => prev.filter(c => c.id !== flyId));
      if (onComplete) onComplete();
    }, 460);
  };

  const topCard = discardPile[discardPile.length - 1];

  const canPlayCard = (card) => {
    if (!topCard) return false;

    if (drawStackCount > 0) {
      return card.value === '+2' || card.value === '+4';
    }

    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const playCard = (card, playerIdx = 0, event = null) => {
    if (isMoveLock.current) return;
    if (currentTurnIdx !== playerIdx) return;
    if (!canPlayCard(card)) return;

    const clickedElement = event ? event.currentTarget : null;
    if (card.color === 'wild' && playerIdx === 0) {
      setPendingWildCard({ card, clickedElement });
      setShowColorPicker(true);
      return;
    }

    executePlayCard(card, playerIdx, currentColor, clickedElement);
  };

  const executePlayCard = (card, playerIdx, chosenColor, clickedEl = null) => {
    if (isMoveLock.current) return;
    isMoveLock.current = true;

    let sourceElement = clickedEl || seatRefs.current[playerIdx]?.current;
    const isEnemy = playerIdx !== 0;

    let newDir = direction;
    let nextStep = 1;

    const cardHexColor = card.color === 'wild' 
      ? (COLOR_MAP[chosenColor] || COLOR_MAP.wild)
      : (COLOR_MAP[card.color] || '#ff3b5c');

    let isSumCard = false;
    let newStack = drawStackCount;

    if (card.value === '+2' || card.value === '+4') {
      isSumCard = true;
      const penalty = card.value === '+2' ? 2 : 4;
      newStack = drawStackCount + penalty;
      setDrawStackCount(newStack);
      triggerActionBurst('draw_stack', cardHexColor, `+${newStack}`);
      soundManager.drawStack(newStack);
    } else if (card.value === 'skip') {
      triggerActionBurst('skip', cardHexColor, 'BLOQUEO');
      nextStep = 2;
      soundManager.skip();
    } else if (card.value === 'reverse') {
      triggerActionBurst('reverse', cardHexColor, 'REVERSA');
      if (numPlayers === 2) {
        nextStep = 2;
      } else {
        newDir = direction * -1;
        setDirection(newDir);
      }
      soundManager.reverse();
    } else {
      soundManager.playCard();
    }

    let remainingHandSize = 0;
    let currentPlayersHands = [];
    setHands(prevHands => {
      currentPlayersHands = prevHands.map((h, idx) => {
        if (idx !== playerIdx) return h;
        const targetIdx = h.findIndex(c => c.id === card.id);
        if (targetIdx === -1) {
          remainingHandSize = h.length;
          return h;
        }
        const newHand = [...h];
        newHand.splice(targetIdx, 1);
        remainingHandSize = newHand.length;
        return newHand;
      });
      return currentPlayersHands;
    });

    triggerSpatialFlight(sourceElement, discardPileRef.current, card.file, () => {
      // RULE ENFORCEMENT: SHOUT SOUND PLAYS ONLY WHEN GOING DOWN TO EXACTLY 1 CARD AND MUNO WAS ANNOUNCED BEFORE/AT PENULTIMATE CARD
      if (remainingHandSize === 1) {
        if (playerIdx === 0) {
          if (munoShouted) {
            soundManager.munoShout();
          } else {
            addLog('Penalización de 2 cartas por no anunciar MUNO.');
            drawCardsInternal(0, 2);
          }
        } else {
          // Bots automatically shout MUNO right when playing down to 1 card
          soundManager.munoShout();
        }
      }

      // GAME WINNER RESOLUTION (AT 0 CARDS REMAINING) -> WIN GAME FANFARE ONLY!
      if (remainingHandSize === 0) {
        setGameWinner(playerIdx === 0 ? 'Humano' : `Bot ${playerIdx}`);
        addLog(`Ganador: ${playerIdx === 0 ? 'Humano' : `Bot ${playerIdx}`}`);
        soundManager.winGame(); // Plays Triumphant Victory Fanfare win.wav!
        isMoveLock.current = false;
        return;
      }

      const updatedDiscard = [...discardPile, card];
      setDiscardPile(updatedDiscard);

      const activeColor = card.color === 'wild' ? chosenColor : card.color;
      setCurrentColor(activeColor);
      addLog(`Jugador ${playerIdx === 0 ? 'Humano' : `Bot ${playerIdx}`} jugo ${card.name}`);

      const targetTurn = getNextPlayerIdx(playerIdx, numPlayers, nextStep, newDir);
      setMunoShouted(false);
      setTimeLeft(30);

      // Stack Defense Resolution
      if (isSumCard && newStack > 0) {
        const targetHand = currentPlayersHands[targetTurn] || [];
        const targetHasDefense = targetHand.some(c => c.value === '+2' || c.value === '+4');

        if (!targetHasDefense) {
          addLog(`Jugador ${targetTurn === 0 ? 'Humano' : `Bot ${targetTurn}`} no tiene defensa y recibe penalización de ${newStack} cartas.`);
          
          drawCardsInternal(targetTurn, newStack, () => {
            setDrawStackCount(0);
            const afterPenaltyTurn = getNextPlayerIdx(targetTurn, numPlayers, 1, newDir);
            setCurrentTurnIdx(afterPenaltyTurn);
            setTimeLeft(30);
            isMoveLock.current = false;
          });
          return;
        }
      }

      setCurrentTurnIdx(targetTurn);
      isMoveLock.current = false;

      saveSessionToCookie(currentPlayersHands, updatedDiscard, drawPile, targetTurn, activeColor, numPlayers, newDir);
    }, isEnemy);
  };

  // Bot Turn Logic
  useEffect(() => {
    if (currentTurnIdx !== 0 && !gameWinner && !isSimulatingDisconnect && !isMoveLock.current) {
      const timer = setTimeout(() => {
        botTakeTurn(currentTurnIdx);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIdx, gameWinner, hands, currentColor, topCard, isSimulatingDisconnect]);

  const botTakeTurn = (bIdx) => {
    if (isMoveLock.current) return;
    const hand = hands[bIdx] || [];
    const playableCards = hand.filter(c => canPlayCard(c));
    const seatRef = seatRefs.current[bIdx]?.current;

    if (playableCards.length > 0) {
      const cardToPlay = playableCards[0];
      const botColors = ['red', 'blue', 'green', 'yellow'];
      const chosenColor = botColors[Math.floor(Math.random() * botColors.length)];
      executePlayCard(cardToPlay, bIdx, chosenColor, seatRef);
    } else {
      if (drawStackCount > 0) {
        return;
      }

      addLog(`Bot ${bIdx} roba carta.`);
      drawCardsInternal(bIdx, 1, (newDrawnCard) => {
        if (newDrawnCard && canPlayCard(newDrawnCard)) {
          const botColors = ['red', 'blue', 'green', 'yellow'];
          const chosenColor = botColors[Math.floor(Math.random() * botColors.length)];
          executePlayCard(newDrawnCard, bIdx, chosenColor, seatRef);
        } else {
          const nextTurn = getNextPlayerIdx(bIdx, numPlayers, 1, direction);
          setCurrentTurnIdx(nextTurn);
          setTimeLeft(30);
        }
      });
    }
  };

  const drawCardsInternal = (playerIdx, count, onCompleteDraw = null) => {
    soundManager.drawCard();
    const targetEl = playerIdx === 0 ? playerHandRef.current : seatRefs.current[playerIdx]?.current;

    triggerSpatialFlight(drawDeckRef.current, targetEl, 'back.svg', () => {
      let currentDeck = generateInfiniteDeckPool([...drawPile], count + 10);
      let drawn = [];

      for (let i = 0; i < count; i++) {
        if (currentDeck.length === 0) {
          currentDeck = generateInfiniteDeckPool([], 60);
        }
        if (currentDeck.length > 0) {
          drawn.push(currentDeck.pop());
        }
      }

      const safeInfiniteDeck = generateInfiniteDeckPool(currentDeck, 30);
      setDrawPile(safeInfiniteDeck);

      let updatedHands = [];
      setHands(prevHands => {
        updatedHands = prevHands.map((h, idx) => idx === playerIdx ? [...h, ...drawn] : h);
        return updatedHands;
      });

      if (playerIdx === 0 && drawStackCount === 0) {
        addLog(`Robaste ${count} carta(s) del mazo.`);
      }

      if (onCompleteDraw) onCompleteDraw(drawn[0]);

      saveSessionToCookie(updatedHands, discardPile, safeInfiniteDeck, currentTurnIdx, currentColor, numPlayers, direction);
    }, false);
  };

  const handleAddBot = () => {
    if (numPlayers >= MAX_PLAYERS) {
      addLog(`Límite máximo de ${MAX_PLAYERS} jugadores alcanzado.`);
      showCookieToast(`Límite máximo de ${MAX_PLAYERS} jugadores`);
      return;
    }

    soundManager.addPlayer();
    const newCount = numPlayers + 1;
    setNumPlayers(newCount);

    let currentDeck = generateInfiniteDeckPool([...drawPile], 30);
    const newBotHand = currentDeck.slice(0, CARDS_PER_PLAYER);
    const restDeck = currentDeck.slice(CARDS_PER_PLAYER);

    const updatedHands = [...hands, newBotHand];
    setHands(updatedHands);
    setDrawPile(restDeck);
    addLog(`Bot ${newCount - 1} unido (${newCount} jugadores)`);
    showCookieToast(`Bot ${newCount - 1} añadido (${newCount}/${MAX_PLAYERS})`);

    saveSessionToCookie(updatedHands, discardPile, restDeck, currentTurnIdx, currentColor, newCount, direction);
  };

  const handleRemoveBot = () => {
    if (numPlayers <= MIN_PLAYERS) {
      addLog(`Mínimo ${MIN_PLAYERS} jugadores requeridos.`);
      showCookieToast(`Mínimo ${MIN_PLAYERS} jugadores`);
      return;
    }

    soundManager.removePlayer();
    const newCount = numPlayers - 1;
    setNumPlayers(newCount);
    const updatedHands = hands.slice(0, newCount);
    setHands(updatedHands);
    
    let nextTurn = currentTurnIdx;
    if (nextTurn >= newCount) nextTurn = 0;
    setCurrentTurnIdx(nextTurn);

    addLog(`Bot removido (${newCount} jugadores)`);
    showCookieToast(`Bot removido (${newCount}/${MAX_PLAYERS})`);

    saveSessionToCookie(updatedHands, discardPile, drawPile, nextTurn, currentColor, newCount, direction);
  };

  const handleSimulateReconnection = () => {
    setIsSimulatingDisconnect(true);
    addLog('Conexión interrumpida.');
    showCookieToast('Conexión perdida. Reanudando...');

    setTimeout(() => {
      setIsSimulatingDisconnect(false);
      const saved = getSessionFromCookie();
      if (saved) {
        const safePlayers = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, saved.numPlayers || 14));
        setNumPlayers(safePlayers);
        setHands(saved.hands);
        setDiscardPile(saved.discardPile);
        setDrawPile(generateInfiniteDeckPool(saved.drawPile || [], 30));
        setCurrentTurnIdx(saved.currentTurnIdx);
        setCurrentColor(saved.currentColor);
        setDirection(saved.direction || 1);
        setTimeLeft(30);
        isMoveLock.current = false;
        addLog('Conexión reanudada desde Cookie.');
        showCookieToast('Conexión reanudada');
      }
    }, 1500);
  };

  const handleShoutMuno = () => {
    setMunoShouted(true);
    soundManager.munoShout();
    addLog('MUNO anunciado');
  };

  const selectWildColor = (color) => {
    setShowColorPicker(false);
    if (pendingWildCard) {
      executePlayCard(pendingWildCard.card, 0, color, pendingWildCard.clickedElement);
      setPendingWildCard(null);
    }
  };

  const getBotArcPosition = (botIdx, totalBotsCount) => {
    if (totalBotsCount === 1) {
      return { left: '50%', top: '14%' };
    }

    const startAngle = -Math.PI * 0.68;
    const endAngle = Math.PI * 0.68;
    
    const step = (endAngle - startAngle) / (totalBotsCount - 1);
    const angle = startAngle + (botIdx - 1) * step;

    const rx = 41;
    const ry = 29;

    const x = 50 + rx * Math.sin(angle);
    const y = 42 - ry * Math.cos(angle);

    return { left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` };
  };

  const getBotCardDimensions = (playerCount) => {
    if (playerCount <= 2) return { width: 48, height: 72, overlap: -24 };
    if (playerCount <= 4) return { width: 44, height: 66, overlap: -22 };
    if (playerCount <= 8) return { width: 38, height: 57, overlap: -18 };
    if (playerCount <= 12) return { width: 34, height: 51, overlap: -16 };
    return { width: 30, height: 45, overlap: -15 };
  };

  const totalBotsCount = numPlayers - 1;
  const botCardDims = getBotCardDimensions(numPlayers);

  const humanHasPlayable = (hands[0] || []).some(c => canPlayCard(c));
  const humanMustDraw = currentTurnIdx === 0 && !humanHasPlayable && drawStackCount === 0;

  const isDeckClickable = currentTurnIdx === 0 && drawStackCount === 0;
  const canShoutMunoBeforePlay = currentTurnIdx === 0 && (hands[0] || []).length === 2;

  const activeColorHex = COLOR_MAP[currentColor] || '#00e676';

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Dynamic Ambient Pulsars */}
      {pulsars.map(p => (
        <div 
          key={p.id}
          className="dynamic-pulsar-instance"
          style={{
            top: `${p.y}%`,
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            '--max-op': p.maxOpacity,
            '--dur': `${p.duration}ms`
          }}
        />
      ))}

      {/* Floating Debug Panel */}
      <div className="debug-panel-floating">
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-yellow)' }}>DEBUG:</span>
        
        <button 
          className="debug-btn btn-success" 
          onClick={handleAddBot} 
          disabled={numPlayers >= MAX_PLAYERS}
          style={{ opacity: numPlayers >= MAX_PLAYERS ? 0.5 : 1, cursor: numPlayers >= MAX_PLAYERS ? 'not-allowed' : 'pointer' }}
          title={`Añadir bot (máximo ${MAX_PLAYERS})`}
        >
          <UserPlus size={13} /> +Bot ({numPlayers}/{MAX_PLAYERS})
        </button>

        <button 
          className="debug-btn btn-danger" 
          onClick={handleRemoveBot} 
          disabled={numPlayers <= MIN_PLAYERS}
          style={{ opacity: numPlayers <= MIN_PLAYERS ? 0.5 : 1, cursor: numPlayers <= MIN_PLAYERS ? 'not-allowed' : 'pointer' }}
          title={`Quitar bot (mínimo ${MIN_PLAYERS})`}
        >
          <UserMinus size={13} /> -Bot
        </button>

        <button className="debug-btn" onClick={handleSimulateReconnection} title="Simular reconexión">
          {isSimulatingDisconnect ? <WifiOff size={13} color="var(--color-red)" /> : <Wifi size={13} color="var(--color-green)" />}
          {isSimulatingDisconnect ? 'Reconectando...' : 'Reconectar sesion'}
        </button>
      </div>

      {/* Cookie Status Toast Notification */}
      {cookieStatusMsg && (
        <div style={{
          position: 'fixed',
          top: '4.5rem', right: '1rem',
          background: 'rgba(11, 15, 25, 0.92)',
          border: '1px solid var(--color-green)',
          color: '#fff',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 700,
          zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {cookieStatusMsg}
        </div>
      )}

      {/* Dynamic 3D Flying Layer */}
      <div className="flying-cards-layer">
        {flyingCards.map(fc => (
          <div 
            key={fc.id} 
            className="flying-card-instance"
            style={{
              left: `${fc.left}px`,
              top: `${fc.top}px`,
              width: `${fc.width}px`,
              height: `${fc.height}px`,
              transform: fc.transform
            }}
          >
            <div className={`card-flip-wrapper ${fc.isFlipped ? 'is-flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
              <div className="card-flip-inner">
                <div className="card-face card-face-front">
                  <img src={`/cards/${fc.cardFile}`} alt="Flying Card" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="card-face card-face-back">
                  <img src="/cards/back.svg" alt="Reverso MμN0!" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 100% Fullscreen Spatial Stage */}
      <div className="full-screen-spatial-stage">
        {/* ACTION BURST: LIGHTNING AND TEXT RENDERED IN EXACT CARD COLOR */}
        {actionBurst && (
          <div className="action-burst-lightning-pure" style={{ color: actionBurst.color }}>
            {actionBurst.type === 'draw_stack' ? (
              <>
                <Zap size={95} color={actionBurst.color} style={{ filter: `drop-shadow(0 0 20px ${actionBurst.color})` }} />
                <span style={{ fontSize: '3.6rem', fontWeight: 900, textShadow: `0 0 20px ${actionBurst.color}` }}>
                  {actionBurst.numText}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '3.5rem', fontWeight: 900, textShadow: `0 0 20px ${actionBurst.color}` }}>
                {actionBurst.numText}
              </span>
            )}
          </div>
        )}

        {/* STATIONARY OVAL WITH FLOWING DIRECTIONAL ARROWS */}
        <div className="puno-center-direction-ring">
          <svg className="direction-arrows-svg" viewBox="0 0 420 280">
            <defs>
              <filter id="ring-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base Stationary Oval Outline Track */}
            <ellipse 
              cx="210" cy="140" rx="190" ry="120" 
              fill="none" 
              stroke={activeColorHex} 
              strokeWidth="2" 
              strokeOpacity="0.35" 
            />

            {/* Dynamic Dashes & Arrows Flowing Continuously along Stationary Oval Track */}
            <ellipse 
              className={`direction-dash-flow ${direction === 1 ? 'flow-clockwise' : 'flow-counterclockwise'}`} 
              cx="210" cy="140" rx="190" ry="120" 
              fill="none" 
              stroke={activeColorHex} 
              strokeWidth="4" 
              strokeDasharray="24 16 6 16" 
              strokeLinecap="round"
              filter="url(#ring-glow)"
            />

            {/* Static Directional Arrow Markers at Top & Bottom Points */}
            <polygon 
              points={direction === 1 ? "225,14 210,20 225,26" : "195,14 210,20 195,26"} 
              fill={activeColorHex} 
              filter="url(#ring-glow)"
            />
            <polygon 
              points={direction === 1 ? "195,254 210,260 195,266" : "225,254 210,260 225,266"} 
              fill={activeColorHex} 
              filter="url(#ring-glow)"
            />
          </svg>
        </div>

        {/* Center Discard, Draw Piles & 30-Second Turn Countdown Timer */}
        <div className="puno-center-pile">
          {/* Draw Deck */}
          <div 
            ref={drawDeckRef}
            className={humanMustDraw ? 'draw-deck-must-draw' : ''}
            onClick={() => isDeckClickable && drawCardsInternal(0, 1)} 
            style={{ cursor: isDeckClickable ? 'pointer' : 'not-allowed', textAlign: 'center' }}
            title={isDeckClickable ? 'Toca para robar cartas' : ''}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>Mazo (∞)</div>
            <img src="/cards/back.svg" alt="Mazo" style={{ width: '75px', height: '110px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' }} />
          </div>

          {/* 30-Second Turn Timer Ring in Active Color */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '50%', 
              margin: '0 auto', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.65)',
              border: `3.5px solid var(--color-${currentColor})`,
              boxShadow: `0 0 20px var(--color-${currentColor})`,
              color: timeLeft <= 5 ? '#ff3b5c' : '#ffffff',
              fontWeight: 900,
              fontSize: '1.1rem',
              fontFamily: 'var(--font-code)'
            }}>
              {timeLeft}s
            </div>
            {drawStackCount > 0 && (
              <div style={{ color: '#ff3b5c', fontWeight: 900, fontSize: '0.78rem', marginTop: '0.3rem' }}>
                +{drawStackCount}
              </div>
            )}
          </div>

          {/* Discard Pile */}
          <div ref={discardPileRef} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>Descarte</div>
            {topCard && (
              <img 
                src={`/cards/${topCard.file}`} 
                alt={topCard.name} 
                style={{ width: '78px', height: '115px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))' }} 
              />
            )}
          </div>
        </div>

        {/* Dynamic Bots */}
        {Array.from({ length: totalBotsCount }, (_, i) => {
          const bIdx = i + 1;
          const hand = hands[bIdx] || [];
          const pos = getBotArcPosition(bIdx, totalBotsCount);
          const isTurn = currentTurnIdx === bIdx;
          const pColor = drawStackCount > 0 && isTurn ? '#ff3b5c' : PLAYER_COLORS[bIdx % PLAYER_COLORS.length];

          const isBotMunoActive = hand.length === 1;

          return (
            <div 
              key={bIdx} 
              className="oval-player-slot"
              style={pos}
              ref={seatRefs.current[bIdx]}
            >
              {/* Visible "MUNO!" Shout Badge over Bot when at 1 card */}
              {isBotMunoActive && (
                <div style={{ marginBottom: '0.2rem' }}>
                  <span className="muno-shout-badge">MUNO!</span>
                </div>
              )}

              <div 
                className={`bot-hand-mini ${isTurn ? 'tight-hand-glow' : ''}`}
                style={{ '--glow-color': pColor }}
              >
                {hand.map((_, cIdx) => (
                  <img 
                    key={cIdx} 
                    src="/cards/back.svg" 
                    alt={`Bot ${bIdx}`} 
                    style={{
                      width: `${botCardDims.width}px`,
                      height: `${botCardDims.height}px`,
                      marginLeft: cIdx === 0 ? '0' : `${botCardDims.overlap}px`,
                      borderRadius: '4px',
                      filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6))',
                      transition: 'all 0.3s ease'
                    }} 
                  />
                ))}
              </div>

              <div className="bot-tag-badge">
                <Bot size={12} color={pColor} />
                <span>Bot {bIdx} ({hand.length})</span>
                {isTurn && (
                  <span style={{ color: pColor, fontWeight: 900, marginLeft: '0.2rem' }}>
                    {drawStackCount > 0 ? 'Penalización' : '•'}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Integrated Human Player Seat */}
        <div className="human-bottom-seat-integrated" ref={playerHandRef}>
          {/* Visible "MUNO!" Shout Badge over Human Player when Announced */}
          {munoShouted && (hands[0] || []).length <= 2 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span className="muno-shout-badge">MUNO!</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <User size={15} color="var(--color-green)" />
              <span style={{ fontWeight: '800', fontSize: '0.88rem' }}>Tu Mano ({(hands[0] || []).length} cartas)</span>
              {currentTurnIdx === 0 && (
                <span style={{ color: drawStackCount > 0 ? '#ff3b5c' : 'var(--color-green)', fontWeight: '900', fontSize: '0.85rem' }}>
                  {drawStackCount > 0 ? `Penalización: +${drawStackCount}` : 'Tu turno'}
                </span>
              )}
            </div>

            {/* MUNO Shout button ONLY visible when player has EXACTLY 2 cards before playing */}
            {canShoutMunoBeforePlay && (
              <button 
                className="btn-primary" 
                style={{ 
                  padding: '0.25rem 0.85rem', 
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: munoShouted ? 'linear-gradient(135deg, #00e676, #00b0ff)' : 'linear-gradient(135deg, #ff3b5c, #ff9f43)'
                }}
                onClick={handleShoutMuno}
              >
                {munoShouted ? 'MUNO anunciado' : 'Gritar MUNO'}
              </button>
            )}

            <button className="filter-chip" style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }} onClick={() => startNewGame(numPlayers)}>
              <RotateCcw size={12} /> Reiniciar
            </button>
          </div>

          <div 
            className={`player-hand-spacious ${currentTurnIdx === 0 ? 'tight-hand-glow' : ''}`} 
            style={{ '--glow-color': drawStackCount > 0 ? '#ff3b5c' : '#00e676' }}
          >
            {(hands[0] || []).map((card) => {
              const playable = currentTurnIdx === 0 && canPlayCard(card);
              return (
                <div 
                  key={card.id} 
                  className="card-item"
                  onClick={(e) => playable && playCard(card, 0, e)}
                  style={{ 
                    width: '85px', 
                    padding: '0.28rem', 
                    opacity: playable ? 1 : 0.4,
                    border: playable ? '2.5px solid var(--color-green)' : '1px solid rgba(255,255,255,0.15)',
                    cursor: playable ? 'pointer' : 'not-allowed'
                  }}
                >
                  <img src={`/cards/${card.file}`} alt={card.name} style={{ width: '100%' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STERILIZED COLOR SELECTION MODAL */}
      {showColorPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', borderRadius: '24px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--text-main)' }}>
              Seleccionar Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <button className="color-select-btn" style={{ background: 'var(--color-red)' }} onClick={() => selectWildColor('red')}>Rojo</button>
              <button className="color-select-btn" style={{ background: 'var(--color-blue)' }} onClick={() => selectWildColor('blue')}>Azul</button>
              <button className="color-select-btn" style={{ background: 'var(--color-green)', color: '#0b0f19' }} onClick={() => selectWildColor('green')}>Verde</button>
              <button className="color-select-btn" style={{ background: 'var(--color-yellow)', color: '#0b0f19' }} onClick={() => selectWildColor('yellow')}>Amarillo</button>
            </div>
          </div>
        </div>
      )}

      {/* STERILIZED WINNER MODAL */}
      {gameWinner && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', borderRadius: '24px' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
              Partida Concluida
            </div>
            <h2 style={{ color: 'var(--color-yellow)', fontSize: '1.8rem', margin: '0 0 0.5rem 0', fontWeight: 900 }}>
              Ganador: {gameWinner}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.4rem' }}>
              Partida de {numPlayers} jugadores finalizada.
            </p>
            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1.2rem', fontSize: '0.9rem', borderRadius: '14px', background: 'linear-gradient(135deg, #0088ff, #00e676)' }} 
              onClick={() => startNewGame(numPlayers)}
            >
              Nueva partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
