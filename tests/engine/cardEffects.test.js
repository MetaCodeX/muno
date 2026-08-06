// tests/engine/cardEffects.test.js
import { applyCardEffect, effectPlus2, effectPlus4, effectSkip,
  effectReverse, effectPlus6, effectX2, effectDice,
  effectFlush, effectZeroRotate, effectSevenSwap } from '../../engine/cardEffects.js';
import { createConfig } from '../../engine/config.js';

const classic = createConfig('classic');
const overkill = createConfig('overkill');

// Minimal game state factory
function makeGs(overrides = {}) {
  return {
    hands: [
      [{ id: 'c1', color: 'red', value: '3' }, { id: 'c2', color: 'blue', value: '7' }],
      [{ id: 'c3', color: 'green', value: '5' }],
    ],
    drawPile: Array(30).fill(null).map((_, i) => ({
      id: `dp_${i}`, color: 'red', value: `${i % 9}`, name: 'Red'
    })),
    discardPile: [{ id: 'top', color: 'red', value: '5', name: 'Red 5' }],
    currentColor: 'red',
    drawStackCount: 0,
    direction: 1,
    _config: classic,
    ...overrides,
  };
}

function makeCtx(overrides = {}) {
  return {
    myIdx: 0,
    numPlayers: 2,
    room: null,
    io: null,
    config: classic,
    ...overrides,
  };
}

describe('engine/cardEffects.js', () => {

  describe('Classic card effects', () => {
    test('+2 adds 2 to drawStackCount', () => {
      const gs = makeGs();
      const result = effectPlus2(gs, makeCtx());
      expect(gs.drawStackCount).toBe(2);
      expect(result.effectName).toBe('draw2');
      expect(result.nextStep).toBe(1);
    });

    test('+4 adds 4 to drawStackCount', () => {
      const gs = makeGs();
      effectPlus4(gs, makeCtx());
      expect(gs.drawStackCount).toBe(4);
    });

    test('+2 stacks with existing penalty', () => {
      const gs = makeGs({ drawStackCount: 4 });
      effectPlus2(gs, makeCtx());
      expect(gs.drawStackCount).toBe(6);
    });

    test('skip: nextStep = 2, clears drawStack', () => {
      const gs = makeGs({ drawStackCount: 2 });
      const result = effectSkip(gs, makeCtx());
      expect(result.nextStep).toBe(2);
      expect(gs.drawStackCount).toBe(0);
      expect(result.effectName).toBe('skip');
    });

    test('reverse: flips direction in 3+ player game', () => {
      const gs = makeGs({ direction: 1 });
      const ctx = makeCtx({ numPlayers: 3 });
      const result = effectReverse(gs, ctx);
      expect(gs.direction).toBe(-1);
      expect(result.newDir).toBe(-1);
      expect(result.nextStep).toBe(1);
    });

    test('reverse: acts as skip in 2-player game', () => {
      const gs = makeGs({ direction: 1 });
      const ctx = makeCtx({ numPlayers: 2 });
      const result = effectReverse(gs, ctx);
      expect(gs.direction).toBe(1); // direction unchanged
      expect(result.nextStep).toBe(2); // acts as skip
    });

    test('default card: clears drawStack, nextStep = 1', () => {
      const gs = makeGs({ drawStackCount: 3 });
      const result = applyCardEffect(
        { color: 'red', value: '5', name: 'Red 5' },
        gs,
        makeCtx({ config: classic })
      );
      expect(gs.drawStackCount).toBe(0);
      expect(result.nextStep).toBe(1);
      expect(result.effectName).toBeNull();
    });
  });

  describe('Overkill extra effects', () => {
    test('+6 adds 6 to drawStackCount', () => {
      const gs = makeGs();
      const result = effectPlus6(gs, makeCtx());
      expect(gs.drawStackCount).toBe(6);
      expect(result.effectName).toBe('plus6');
    });

    test('x2 doubles existing draw stack', () => {
      const gs = makeGs({ drawStackCount: 6 });
      const result = effectX2(gs, makeCtx());
      expect(gs.drawStackCount).toBe(12);
      expect(result.effectName).toBe('multiplyX2');
    });

    test('x2 on empty stack gives 2', () => {
      const gs = makeGs({ drawStackCount: 0 });
      effectX2(gs, makeCtx());
      expect(gs.drawStackCount).toBe(2);
    });

    test('dice: adds 1-6 cards to player hand', () => {
      const gs = makeGs();
      const initialHandSize = gs.hands[0].length;
      const result = effectDice(gs, makeCtx());
      const drawn = gs.hands[0].length - initialHandSize;
      expect(drawn).toBeGreaterThanOrEqual(1);
      expect(drawn).toBeLessThanOrEqual(6);
      expect(result.effectName).toBe('dice');
      expect(result.roll).toBe(drawn);
    });

    test('flush: removes all cards of currentColor from hand to drawPile', () => {
      const gs = makeGs({
        currentColor: 'red',
        hands: [
          [
            { id: 'r1', color: 'red', value: '3', name: 'Red 3' },
            { id: 'b1', color: 'blue', value: '7', name: 'Blue 7' },
            { id: 'r2', color: 'red', value: '5', name: 'Red 5' },
          ]
        ],
      });
      const initialDrawPile = gs.drawPile.length;
      const result = effectFlush(gs, makeCtx());
      expect(gs.hands[0]).toHaveLength(1); // only blue card remains
      expect(gs.hands[0][0].color).toBe('blue');
      expect(gs.drawPile.length).toBe(initialDrawPile + 2); // 2 red cards returned
      expect(result.flushedCount).toBe(2);
    });

    test('flush: no cards of currentColor → hand unchanged', () => {
      const gs = makeGs({
        currentColor: 'yellow',
        hands: [
          [
            { id: 'r1', color: 'red', value: '3', name: 'Red 3' },
            { id: 'b1', color: 'blue', value: '7', name: 'Blue 7' },
          ]
        ],
      });
      effectFlush(gs, makeCtx());
      expect(gs.hands[0]).toHaveLength(2); // unchanged
    });
  });

  describe('Overkill 0 and 7 overrides', () => {
    test('card 0 in overkill mode: rotates all hands clockwise', () => {
      const gs = makeGs({
        direction: 1,
        hands: [
          [{ id: 'a' }],      // player 0
          [{ id: 'b' }],      // player 1
          [{ id: 'c' }],      // player 2
        ],
        _config: overkill,
      });
      const ctx = makeCtx({ config: overkill, numPlayers: 3 });
      const result = effectZeroRotate(gs, ctx);
      // Clockwise rotation: p0 gets p2's hand, p1 gets p0's, p2 gets p1's
      expect(gs.hands[0][0].id).toBe('c');
      expect(gs.hands[1][0].id).toBe('a');
      expect(gs.hands[2][0].id).toBe('b');
      expect(result.effectName).toBe('rotate0');
    });

    test('card 0 in overkill mode: rotates counter-clockwise when direction=-1', () => {
      const gs = makeGs({
        direction: -1,
        hands: [
          [{ id: 'a' }],
          [{ id: 'b' }],
          [{ id: 'c' }],
        ],
        _config: overkill,
      });
      const ctx = makeCtx({ config: overkill, numPlayers: 3 });
      effectZeroRotate(gs, ctx);
      expect(gs.hands[0][0].id).toBe('b');
      expect(gs.hands[1][0].id).toBe('c');
      expect(gs.hands[2][0].id).toBe('a');
    });

    test('card 0 in classic mode: NO rotation (treated as number)', () => {
      const gs = makeGs({
        direction: 1,
        hands: [
          [{ id: 'a' }],
          [{ id: 'b' }],
        ],
        drawStackCount: 3,
      });
      const ctx = makeCtx({ config: classic });
      const result = applyCardEffect(
        { color: 'green', value: '0', name: 'Green 0' },
        gs,
        ctx
      );
      // In classic, card 0 has no special effect → drawStackCount cleared
      expect(gs.hands[0][0].id).toBe('a'); // hands unchanged
      expect(gs.drawStackCount).toBe(0);
      expect(result.effectName).toBeNull();
    });

    test('card 7 in overkill mode: swaps hands with target', () => {
      const gs = makeGs({
        hands: [
          [{ id: 'a1' }, { id: 'a2' }],  // player 0
          [{ id: 'b1' }],                  // player 1
        ],
        _config: overkill,
      });
      const ctx = makeCtx({ config: overkill, myIdx: 0, targetIdx: 1 });
      const result = effectSevenSwap(gs, ctx);
      expect(gs.hands[0]).toHaveLength(1);
      expect(gs.hands[0][0].id).toBe('b1');
      expect(gs.hands[1]).toHaveLength(2);
      expect(result.effectName).toBe('swap7');
      expect(result.targetIdx).toBe(1);
    });

    test('card 7 in classic mode: treated as number (no swap)', () => {
      const gs = makeGs({ drawStackCount: 3 });
      const ctx = makeCtx({ config: classic });
      const handsBefore = JSON.stringify(gs.hands);
      applyCardEffect({ color: 'red', value: '7', name: 'Red 7' }, gs, ctx);
      expect(JSON.stringify(gs.hands)).toBe(handsBefore); // hands unchanged
      expect(gs.drawStackCount).toBe(0);
    });
  });

  describe('applyCardEffect() — dispatch', () => {
    test('routes +2 correctly via applyCardEffect', () => {
      const gs = makeGs();
      applyCardEffect({ color: 'red', value: '+2', name: 'Red +2' }, gs, makeCtx({ config: classic }));
      expect(gs.drawStackCount).toBe(2);
    });

    test('routes overkill +6 correctly via applyCardEffect', () => {
      const gs = makeGs();
      applyCardEffect({ color: 'wild', value: '+6', name: 'Overkill +6' }, gs, makeCtx({ config: overkill }));
      expect(gs.drawStackCount).toBe(6);
    });

    test('unknown card value defaults to no effect', () => {
      const gs = makeGs({ drawStackCount: 5 });
      const result = applyCardEffect({ color: 'red', value: 'unknown_card', name: 'X' }, gs, makeCtx({ config: classic }));
      expect(gs.drawStackCount).toBe(0);
      expect(result.effectName).toBeNull();
    });
  });
});
