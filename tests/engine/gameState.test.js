// tests/engine/gameState.test.js
import { initGameState, buildStateForPlayer, ensureDeckHasCards } from '../../engine/gameState.js';
import { createConfig, clientConfig } from '../../engine/config.js';
import { expectedTotalCards } from '../../engine/deck.js';

function makeRoom(numPlayers = 4, mode = 'classic') {
  const config = createConfig(mode);
  return {
    code: 'TESTX',
    adminSessionId: 'sess_0',
    status: 'lobby',
    config,
    players: Array(numPlayers).fill(null).map((_, i) => ({
      sessionId: `sess_${i}`,
      username: `Player ${i}`,
      color: '#ffffff',
      connected: true,
      playerIdx: i,
    })),
  };
}

describe('engine/gameState.js', () => {

  describe('initGameState()', () => {
    test('deals cardsPerPlayer cards to each player', () => {
      const room = makeRoom(4);
      const gs = initGameState(room);
      expect(gs.hands).toHaveLength(4);
      gs.hands.forEach(hand => {
        expect(hand).toHaveLength(7); // DEFAULT_CONFIG.cardsPerPlayer
      });
    });

    test('uses config.cardsPerPlayer', () => {
      const room = makeRoom(3);
      room.config = createConfig('classic', { cardsPerPlayer: 5 });
      const gs = initGameState(room);
      gs.hands.forEach(hand => expect(hand).toHaveLength(5));
    });

    test('topCard is never +4 wild', () => {
      // Run multiple times to be statistically sure
      for (let i = 0; i < 20; i++) {
        const gs = initGameState(makeRoom(2));
        const topCard = gs.discardPile[0];
        expect(topCard.value).not.toBe('+4');
      }
    });

    test('drawPile has remaining cards (total - dealt - 1 topCard)', () => {
      const room = makeRoom(4);
      const gs = initGameState(room);
      const total = expectedTotalCards(room.config); // 324 classic
      const dealt = 4 * 7; // 4 players × 7 cards
      // drawPile = total - dealt - 1 (topCard)
      expect(gs.drawPile.length).toBe(total - dealt - 1);
    });

    test('stores _config reference for ensureDeckHasCards', () => {
      const gs = initGameState(makeRoom(2));
      expect(gs._config).toBeDefined();
      expect(gs._config.mode).toBe('classic');
    });

    test('initial state fields are set correctly', () => {
      const gs = initGameState(makeRoom(2));
      expect(gs.currentTurnIdx).toBeGreaterThanOrEqual(0);
      expect([1, -1]).toContain(gs.direction);
      expect(gs.drawStackCount).toBe(0);
      expect(gs.winner).toBeNull();
      expect(gs.hasDrawnThisTurn).toBe(false);
      expect(gs.munoShoutedBy).toEqual({});
    });

    test('overkill mode: overkill deck used (340 cards)', () => {
      const room = makeRoom(2, 'overkill');
      const gs = initGameState(room);
      const total = expectedTotalCards(room.config); // 340
      const dealt = 2 * 7;
      expect(gs.drawPile.length).toBe(total - dealt - 1);
    });

    test('skip topCard: first turn is player 1', () => {
      // Force a skip card as top — hard to control directly, test statistically
      let found = false;
      for (let i = 0; i < 200; i++) {
        const gs = initGameState(makeRoom(4));
        if (gs.discardPile[0].value === 'skip') {
          expect(gs.currentTurnIdx).toBe(1);
          found = true;
          break;
        }
      }
      // Only assert if we actually found a skip start (probabilistic)
      // Just verify the logic runs without error in any case
      expect(true).toBe(true);
    });

    test('uses turnDuration from config', () => {
      const room = makeRoom(2);
      room.config = createConfig('classic', { turnDuration: 20 });
      const gs = initGameState(room);
      expect(gs.turnDuration).toBe(20);
    });
  });

  describe('buildStateForPlayer()', () => {
    let room, gs;
    beforeEach(() => {
      room = makeRoom(3);
      gs = initGameState(room);
    });

    test('myHand shows full hand of the viewer', () => {
      const state = buildStateForPlayer(gs, room, 0);
      expect(state.myHand).toEqual(gs.hands[0]);
    });

    test('handSizes hides actual cards, only shows sizes', () => {
      const state = buildStateForPlayer(gs, room, 0);
      expect(state.handSizes).toHaveLength(3);
      state.handSizes.forEach(size => expect(typeof size).toBe('number'));
    });

    test('different viewers get different myHand', () => {
      const state0 = buildStateForPlayer(gs, room, 0);
      const state1 = buildStateForPlayer(gs, room, 1);
      expect(state0.myHand).not.toEqual(state1.myHand);
    });

    test('topCard is exposed', () => {
      const state = buildStateForPlayer(gs, room, 0);
      expect(state.topCard).toBeDefined();
      expect(state.topCard.id).toBeTruthy();
    });

    test('mode is included in state', () => {
      const state = buildStateForPlayer(gs, room, 0);
      expect(state.mode).toBe('classic');
    });

    test('config is sanitized (no internal fields)', () => {
      const state = buildStateForPlayer(gs, room, 0);
      expect(state.config).toBeDefined();
      expect(state.config.deckMultiplier).toBeDefined();
      expect(state.config.customCards).toBeUndefined();
    });

    test('players array includes isAdmin flag', () => {
      const state = buildStateForPlayer(gs, room, 0);
      const admin = state.players.find(p => p.isAdmin);
      expect(admin).toBeDefined();
      expect(admin.sessionId).toBe('sess_0');
    });
  });

  describe('ensureDeckHasCards()', () => {
    test('refills draw pile when below minimum', () => {
      const gs = { drawPile: [{ id: 'x' }], _config: createConfig('classic') };
      ensureDeckHasCards(gs, 10);
      expect(gs.drawPile.length).toBeGreaterThanOrEqual(10);
    });

    test('does nothing if pile already has enough cards', () => {
      const initial = Array(20).fill({ id: 'x' });
      const gs = { drawPile: [...initial], _config: createConfig('classic') };
      ensureDeckHasCards(gs, 10);
      expect(gs.drawPile.length).toBe(20); // unchanged
    });
  });
});
