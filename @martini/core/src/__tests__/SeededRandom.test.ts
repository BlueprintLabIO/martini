/**
 * Tests for SeededRandom - Deterministic random number generator
 *
 * SeededRandom provides a deterministic PRNG that produces the same
 * sequence of random numbers given the same seed. This is critical
 * for multiplayer games to ensure all clients generate identical
 * random values during setup and gameplay.
 */

import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../SeededRandom';

describe('SeededRandom', () => {
  describe('Constructor & Seeding', () => {
    it('creates instance with seed', () => {
      const rng = new SeededRandom(12345);
      expect(rng).toBeDefined();
    });

    it('produces same sequence with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequence with different seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('next() - Basic Random', () => {
    it('returns number between 0 and 1', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('returns different values on subsequent calls', () => {
      const rng = new SeededRandom(12345);

      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(rng.next());
      }

      // Should have many unique values (not all identical)
      expect(values.size).toBeGreaterThan(90);
    });
  });

  describe('range(min, max) - Integer Range', () => {
    it('returns integer in range [min, max)', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.range(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('returns min when min === max', () => {
      const rng = new SeededRandom(12345);
      expect(rng.range(5, 5)).toBe(5);
    });

    it('handles negative ranges', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.range(-50, -10);
        expect(value).toBeGreaterThanOrEqual(-50);
        expect(value).toBeLessThan(-10);
      }
    });

    it('produces same sequence with same seed', () => {
      const rng1 = new SeededRandom(999);
      const rng2 = new SeededRandom(999);

      const seq1 = [rng1.range(0, 100), rng1.range(0, 100), rng1.range(0, 100)];
      const seq2 = [rng2.range(0, 100), rng2.range(0, 100), rng2.range(0, 100)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('float(min, max) - Float Range', () => {
    it('returns float in range [min, max)', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.float(0, 100);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(100);
      }
    });

    it('returns values with decimal precision', () => {
      const rng = new SeededRandom(12345);

      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(rng.float(0, 1));
      }

      // Most values should have decimal parts
      const withDecimals = values.filter(v => v % 1 !== 0);
      expect(withDecimals.length).toBeGreaterThan(90);
    });

    it('produces same sequence with same seed', () => {
      const rng1 = new SeededRandom(777);
      const rng2 = new SeededRandom(777);

      const seq1 = [rng1.float(0, 1), rng1.float(0, 1), rng1.float(0, 1)];
      const seq2 = [rng2.float(0, 1), rng2.float(0, 1), rng2.float(0, 1)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('choice(array) - Random Element', () => {
    it('returns element from array', () => {
      const rng = new SeededRandom(12345);
      const items = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 50; i++) {
        const item = rng.choice(items);
        expect(items).toContain(item);
      }
    });

    it('returns all elements over many trials', () => {
      const rng = new SeededRandom(12345);
      const items = ['red', 'blue', 'green', 'yellow'];

      const chosen = new Set();
      for (let i = 0; i < 100; i++) {
        chosen.add(rng.choice(items));
      }

      expect(chosen.size).toBe(4); // All items chosen at least once
    });

    it('produces same sequence with same seed', () => {
      const items = [10, 20, 30, 40, 50];

      const rng1 = new SeededRandom(555);
      const rng2 = new SeededRandom(555);

      const seq1 = [rng1.choice(items), rng1.choice(items), rng1.choice(items)];
      const seq2 = [rng2.choice(items), rng2.choice(items), rng2.choice(items)];

      expect(seq1).toEqual(seq2);
    });

    it('throws error for empty array', () => {
      const rng = new SeededRandom(12345);
      expect(() => rng.choice([])).toThrow();
    });
  });

  describe('shuffle(array) - Array Shuffling', () => {
    it('returns shuffled copy of array', () => {
      const rng = new SeededRandom(12345);
      const original = [1, 2, 3, 4, 5];

      const shuffled = rng.shuffle(original);

      expect(shuffled).toHaveLength(5);
      expect(shuffled).toContain(1);
      expect(shuffled).toContain(2);
      expect(shuffled).toContain(3);
      expect(shuffled).toContain(4);
      expect(shuffled).toContain(5);
    });

    it('does not modify original array', () => {
      const rng = new SeededRandom(12345);
      const original = [1, 2, 3, 4, 5];

      const shuffled = rng.shuffle(original);

      expect(original).toEqual([1, 2, 3, 4, 5]);
      expect(shuffled).not.toBe(original);
    });

    it('produces same shuffle with same seed', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];

      const rng1 = new SeededRandom(333);
      const rng2 = new SeededRandom(333);

      const shuffled1 = rng1.shuffle(items);
      const shuffled2 = rng2.shuffle(items);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('produces different shuffle with different seed', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const rng1 = new SeededRandom(100);
      const rng2 = new SeededRandom(200);

      const shuffled1 = rng1.shuffle(items);
      const shuffled2 = rng2.shuffle(items);

      expect(shuffled1).not.toEqual(shuffled2);
    });

    it('handles empty array', () => {
      const rng = new SeededRandom(12345);
      const shuffled = rng.shuffle([]);
      expect(shuffled).toEqual([]);
    });

    it('handles single element array', () => {
      const rng = new SeededRandom(12345);
      const shuffled = rng.shuffle([42]);
      expect(shuffled).toEqual([42]);
    });
  });

  describe('boolean(probability) - Weighted Boolean', () => {
    it('returns boolean', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.boolean();
        expect(typeof value).toBe('boolean');
      }
    });

    it('returns ~50% true with default probability', () => {
      const rng = new SeededRandom(12345);

      let trueCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        if (rng.boolean()) trueCount++;
      }

      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    it('returns ~75% true with probability 0.75', () => {
      const rng = new SeededRandom(12345);

      let trueCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        if (rng.boolean(0.75)) trueCount++;
      }

      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(0.8);
    });

    it('always returns true with probability 1.0', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.boolean(1.0)).toBe(true);
      }
    });

    it('always returns false with probability 0.0', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.boolean(0.0)).toBe(false);
      }
    });

    it('produces same sequence with same seed', () => {
      const rng1 = new SeededRandom(888);
      const rng2 = new SeededRandom(888);

      const seq1 = [rng1.boolean(), rng1.boolean(), rng1.boolean()];
      const seq2 = [rng2.boolean(), rng2.boolean(), rng2.boolean()];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('Determinism Across Platforms', () => {
    it('produces identical sequences for complex scenario', () => {
      // Simulate what happens in a real game setup
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      // Player positions
      const player1Positions = [
        { x: rng1.range(0, 800), y: rng1.range(0, 600) },
        { x: rng1.range(0, 800), y: rng1.range(0, 600) },
      ];

      const player2Positions = [
        { x: rng2.range(0, 800), y: rng2.range(0, 600) },
        { x: rng2.range(0, 800), y: rng2.range(0, 600) },
      ];

      expect(player1Positions).toEqual(player2Positions);

      // Enemy types
      const enemies = ['zombie', 'skeleton', 'ghost'];
      const enemy1Types = [rng1.choice(enemies), rng1.choice(enemies), rng1.choice(enemies)];
      const enemy2Types = [rng2.choice(enemies), rng2.choice(enemies), rng2.choice(enemies)];

      expect(enemy1Types).toEqual(enemy2Types);

      // Food shuffle
      const food = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const food1 = rng1.shuffle(food);
      const food2 = rng2.shuffle(food);

      expect(food1).toEqual(food2);
    });
  });
});
