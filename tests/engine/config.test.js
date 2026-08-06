// tests/engine/config.test.js
import { createConfig, DEFAULT_CONFIG, OVERKILL_CONFIG, clientConfig } from '../../engine/config.js';

describe('engine/config.js', () => {

  describe('createConfig()', () => {
    test('classic mode returns DEFAULT_CONFIG values', () => {
      const cfg = createConfig('classic');
      expect(cfg.mode).toBe('classic');
      expect(cfg.cardsPerPlayer).toBe(7);
      expect(cfg.turnDuration).toBe(30);
      expect(cfg.jumpInEnabled).toBe(false);
      expect(cfg.zeroRotatesHands).toBe(false);
      expect(cfg.sevenSwapsHands).toBe(false);
    });

    test('overkill mode returns OVERKILL_CONFIG values', () => {
      const cfg = createConfig('overkill');
      expect(cfg.mode).toBe('overkill');
      expect(cfg.jumpInEnabled).toBe(true);
      expect(cfg.zeroRotatesHands).toBe(true);
      expect(cfg.customCards.length).toBeGreaterThan(0);
    });

    test('overrides are merged correctly', () => {
      const cfg = createConfig('classic', { turnDuration: 20, maxHandSize: 15 });
      expect(cfg.turnDuration).toBe(20);
      expect(cfg.maxHandSize).toBe(15);
      expect(cfg.mode).toBe('classic'); // mode cannot be overridden via overrides
    });

    test('overkill overrides cannot change mode to classic', () => {
      const cfg = createConfig('overkill', { mode: 'classic' });
      // mode is forced by the base config
      expect(cfg.mode).toBe('overkill');
    });

    test('invalid mode defaults to classic behavior', () => {
      const cfg = createConfig('unknown_mode');
      expect(cfg.mode).toBe('classic');
      expect(cfg.jumpInEnabled).toBe(false);
    });

    test('overkill has 16 custom cards (4 of each: +6, x2, dice, flush)', () => {
      const cfg = createConfig('overkill');
      expect(cfg.customCards).toHaveLength(16);
      const values = cfg.customCards.map(c => c.value);
      expect(values.filter(v => v === '+6')).toHaveLength(4);
      expect(values.filter(v => v === 'x2')).toHaveLength(4);
      expect(values.filter(v => v === 'dice')).toHaveLength(4);
      expect(values.filter(v => v === 'flush')).toHaveLength(4);
    });
  });

  describe('clientConfig()', () => {
    test('returns safe subset of config (no internal flags)', () => {
      const cfg = createConfig('classic');
      const safe = clientConfig(cfg);
      expect(safe.mode).toBe('classic');
      expect(safe.turnDuration).toBeDefined();
      expect(safe.jumpInEnabled).toBeDefined();
      // Should NOT expose internal/dangerous fields
      expect(safe.customCards).toBeUndefined();
      expect(safe.deckMultiplier).toBeDefined();
    });
  });
});
