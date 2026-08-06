// tests/engine/turnEngine.test.js
import { getNextIdx } from '../../engine/turnEngine.js';

// Helper to build a minimal room with players
function makeRoom(playerStates) {
  return {
    code: 'TEST1',
    players: playerStates.map((connected, i) => ({
      sessionId: `sess_${i}`,
      username: `Player ${i}`,
      connected,
      playerIdx: i,
    })),
    adminSessionId: 'sess_0',
    status: 'playing',
    config: { inactivityKickTurns: 2, turnDuration: 30 },
  };
}

describe('engine/turnEngine.js', () => {

  describe('getNextIdx() — simple number mode (no room)', () => {
    test('advances by 1 clockwise', () => {
      expect(getNextIdx(0, 4, 1, 1)).toBe(1);
      expect(getNextIdx(3, 4, 1, 1)).toBe(0); // wrap
    });

    test('advances by 1 counter-clockwise', () => {
      expect(getNextIdx(0, 4, 1, -1)).toBe(3);
      expect(getNextIdx(1, 4, 1, -1)).toBe(0);
    });

    test('advances by 2 (skip) clockwise', () => {
      expect(getNextIdx(0, 4, 2, 1)).toBe(2);
      expect(getNextIdx(3, 4, 2, 1)).toBe(1); // wraps correctly
    });

    test('1 player: always returns 0', () => {
      expect(getNextIdx(0, 1, 1, 1)).toBe(0);
    });

    test('2 players: skip returns same player', () => {
      expect(getNextIdx(0, 2, 2, 1)).toBe(0); // skip = come back to self
    });
  });

  describe('getNextIdx() — room-aware mode (skips disconnected)', () => {
    test('all connected: simple advance', () => {
      const room = makeRoom([true, true, true, true]);
      expect(getNextIdx(0, room, 1, 1)).toBe(1);
      expect(getNextIdx(3, room, 1, 1)).toBe(0); // wrap
    });

    test('skips a disconnected player', () => {
      const room = makeRoom([true, false, true, true]); // player 1 disconnected
      expect(getNextIdx(0, room, 1, 1)).toBe(2); // skips 1
    });

    test('skips multiple disconnected players', () => {
      const room = makeRoom([true, false, false, true]); // 1 and 2 disconnected
      expect(getNextIdx(0, room, 1, 1)).toBe(3);
    });

    test('counter-clockwise skips disconnected', () => {
      const room = makeRoom([true, false, true, true]); // player 1 disconnected
      expect(getNextIdx(2, room, 1, -1)).toBe(0); // skips 1, goes to 0
    });

    test('only one connected player: returns their index', () => {
      const room = makeRoom([false, true, false, false]);
      expect(getNextIdx(0, room, 1, 1)).toBe(1);
    });

    test('step=2 (skip) with all connected', () => {
      const room = makeRoom([true, true, true, true]);
      expect(getNextIdx(0, room, 2, 1)).toBe(2);
    });

    test('empty room: returns 0', () => {
      const room = makeRoom([]);
      expect(getNextIdx(0, room, 1, 1)).toBe(0);
    });

    test('2-player room, skip=2 loops back to same player', () => {
      const room = makeRoom([true, true]);
      expect(getNextIdx(0, room, 2, 1)).toBe(0);
    });
  });
});
