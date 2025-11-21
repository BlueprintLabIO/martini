/**
 * Tests for sync - Diff/patch algorithm for state synchronization
 *
 * Critical: These algorithms must be 100% correct for multiplayer to work
 */

import { describe, it, expect } from 'vitest';
import { generateDiff, applyPatch, deepClone, type Patch } from '../sync';

describe('generateDiff', () => {
  describe('Primitive Values', () => {
    it('detects number changes', () => {
      const patches = generateDiff({ value: 10 }, { value: 20 });

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['value'],
        value: 20
      });
    });

    it('detects string changes', () => {
      const patches = generateDiff({ name: 'Alice' }, { name: 'Bob' });

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['name'],
        value: 'Bob'
      });
    });

    it('detects boolean changes', () => {
      const patches = generateDiff({ active: true }, { active: false });

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['active'],
        value: false
      });
    });

    it('returns empty array when primitives are equal', () => {
      const patches = generateDiff({ x: 10 }, { x: 10 });
      expect(patches).toEqual([]);
    });

    it('handles null values', () => {
      const patches = generateDiff({ value: 10 }, { value: null });

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['value'],
        value: null
      });
    });

    it('handles undefined to defined', () => {
      const patches = generateDiff({ value: undefined }, { value: 10 });

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['value'],
        value: 10
      });
    });
  });

  describe('Object Operations', () => {
    it('detects added properties', () => {
      const patches = generateDiff(
        { x: 10 },
        { x: 10, y: 20 }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'add',
        path: ['y'],
        value: 20
      });
    });

    it('detects removed properties', () => {
      const patches = generateDiff(
        { x: 10, y: 20 },
        { x: 10 }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'remove',
        path: ['y']
      });
    });

    it('detects changed properties', () => {
      const patches = generateDiff(
        { x: 10, y: 20 },
        { x: 10, y: 30 }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['y'],
        value: 30
      });
    });

    it('detects multiple changes', () => {
      const patches = generateDiff(
        { x: 10, y: 20, z: 30 },
        { x: 15, y: 20, w: 40 }
      );

      expect(patches).toHaveLength(3);

      const ops = patches.map(p => ({ op: p.op, path: p.path.join('.') }));
      expect(ops).toContainEqual({ op: 'replace', path: 'x' });
      expect(ops).toContainEqual({ op: 'remove', path: 'z' });
      expect(ops).toContainEqual({ op: 'add', path: 'w' });
    });

    it('handles nested objects', () => {
      const patches = generateDiff(
        { player: { x: 10, y: 20 } },
        { player: { x: 15, y: 20 } }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['player', 'x'],
        value: 15
      });
    });

    it('handles deeply nested objects', () => {
      const patches = generateDiff(
        { game: { world: { player: { position: { x: 0 } } } } },
        { game: { world: { player: { position: { x: 100 } } } } }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['game', 'world', 'player', 'position', 'x'],
        value: 100
      });
    });
  });

  describe('Array Operations', () => {
    it('detects array length changes', () => {
      const patches = generateDiff(
        { items: [1, 2, 3] },
        { items: [1, 2, 3, 4] }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0].op).toBe('replace');
      expect(patches[0].path).toEqual(['items']);
    });

    it('detects array element changes', () => {
      const patches = generateDiff(
        { items: [1, 2, 3] },
        { items: [1, 5, 3] }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['items', '1'],
        value: 5
      });
    });

    it('handles empty arrays', () => {
      const patches = generateDiff(
        { items: [] },
        { items: [] }
      );

      expect(patches).toEqual([]);
    });

    it('detects array to empty array', () => {
      const patches = generateDiff(
        { items: [1, 2, 3] },
        { items: [] }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0].op).toBe('replace');
    });

    it('handles arrays of objects', () => {
      const patches = generateDiff(
        { players: [{ id: 1, x: 0 }, { id: 2, x: 0 }] },
        { players: [{ id: 1, x: 10 }, { id: 2, x: 0 }] }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['players', '0', 'x'],
        value: 10
      });
    });
  });

  describe('Type Changes', () => {
    it('detects object to primitive', () => {
      const patches = generateDiff(
        { value: { x: 10 } },
        { value: 42 }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['value'],
        value: 42
      });
    });

    it('detects primitive to object', () => {
      const patches = generateDiff(
        { value: 42 },
        { value: { x: 10 } }
      );

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: ['value'],
        value: { x: 10 }
      });
    });

    it('detects array to object', () => {
      const patches = generateDiff(
        { value: [1, 2, 3] },
        { value: { a: 1 } }
      );

      // Array to object generates removes for indices and add for new keys
      expect(patches.length).toBeGreaterThan(0);
      // Should have removes for array indices
      expect(patches.some(p => p.op === 'remove')).toBe(true);
      // Should have add for new object key
      expect(patches.some(p => p.op === 'add')).toBe(true);
    });
  });

  describe('Complex State Changes', () => {
    it('handles game state with multiple players', () => {
      const oldState = {
        players: {
          p1: { x: 100, y: 100, score: 0 },
          p2: { x: 200, y: 200, score: 0 }
        },
        round: 1
      };

      const newState = {
        players: {
          p1: { x: 150, y: 100, score: 1 },
          p2: { x: 200, y: 200, score: 0 }
        },
        round: 1
      };

      const patches = generateDiff(oldState, newState);

      expect(patches).toHaveLength(2);
      expect(patches).toContainEqual({
        op: 'replace',
        path: ['players', 'p1', 'x'],
        value: 150
      });
      expect(patches).toContainEqual({
        op: 'replace',
        path: ['players', 'p1', 'score'],
        value: 1
      });
    });

    it('handles player joining', () => {
      const oldState = {
        players: {
          p1: { x: 100, y: 100 }
        }
      };

      const newState = {
        players: {
          p1: { x: 100, y: 100 },
          p2: { x: 200, y: 200 }
        }
      };

      const patches = generateDiff(oldState, newState);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'add',
        path: ['players', 'p2'],
        value: { x: 200, y: 200 }
      });
    });

    it('handles player leaving', () => {
      const oldState = {
        players: {
          p1: { x: 100, y: 100 },
          p2: { x: 200, y: 200 }
        }
      };

      const newState = {
        players: {
          p1: { x: 100, y: 100 }
        }
      };

      const patches = generateDiff(oldState, newState);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'remove',
        path: ['players', 'p2']
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty objects', () => {
      const patches = generateDiff({}, {});
      expect(patches).toEqual([]);
    });

    it('handles identical complex objects', () => {
      const state = {
        players: {
          p1: { x: 100, y: 100, inventory: [1, 2, 3] }
        },
        world: { gravity: 9.8 }
      };

      const patches = generateDiff(state, state);
      expect(patches).toEqual([]);
    });

    it('handles root level changes', () => {
      const patches = generateDiff(
        { a: 1, b: 2 },
        { a: 1, b: 2, c: 3 }
      );

      expect(patches).toContainEqual({
        op: 'add',
        path: ['c'],
        value: 3
      });
    });
  });
});

describe('applyPatch', () => {
  describe('Replace Operations', () => {
    it('applies replace to primitive', () => {
      const state = { x: 10 };
      const patch: Patch = {
        op: 'replace',
        path: ['x'],
        value: 20
      };

      applyPatch(state, patch);

      expect(state.x).toBe(20);
    });

    it('applies replace to nested property', () => {
      const state = { player: { x: 10, y: 20 } };
      const patch: Patch = {
        op: 'replace',
        path: ['player', 'x'],
        value: 100
      };

      applyPatch(state, patch);

      expect(state.player.x).toBe(100);
      expect(state.player.y).toBe(20);
    });

    it('applies replace to deeply nested property', () => {
      const state = { game: { world: { player: { x: 0 } } } };
      const patch: Patch = {
        op: 'replace',
        path: ['game', 'world', 'player', 'x'],
        value: 100
      };

      applyPatch(state, patch);

      expect(state.game.world.player.x).toBe(100);
    });

    it('creates intermediate objects if missing', () => {
      const state = {};
      const patch: Patch = {
        op: 'replace',
        path: ['player', 'x'],
        value: 100
      };

      applyPatch(state, patch);

      expect((state as any).player.x).toBe(100);
    });
  });

  describe('Add Operations', () => {
    it('adds new property', () => {
      const state = { x: 10 };
      const patch: Patch = {
        op: 'add',
        path: ['y'],
        value: 20
      };

      applyPatch(state, patch);

      expect((state as any).y).toBe(20);
    });

    it('adds nested property', () => {
      const state = { player: { x: 10 } };
      const patch: Patch = {
        op: 'add',
        path: ['player', 'y'],
        value: 20
      };

      applyPatch(state, patch);

      expect((state as any).player.y).toBe(20);
    });

    it('creates intermediate objects for add', () => {
      const state = {};
      const patch: Patch = {
        op: 'add',
        path: ['player', 'position', 'x'],
        value: 100
      };

      applyPatch(state, patch);

      expect((state as any).player.position.x).toBe(100);
    });
  });

  describe('Remove Operations', () => {
    it('removes property', () => {
      const state = { x: 10, y: 20 };
      const patch: Patch = {
        op: 'remove',
        path: ['y']
      };

      applyPatch(state, patch);

      expect(state.x).toBe(10);
      expect((state as any).y).toBeUndefined();
    });

    it('removes nested property', () => {
      const state = { player: { x: 10, y: 20 } };
      const patch: Patch = {
        op: 'remove',
        path: ['player', 'y']
      };

      applyPatch(state, patch);

      expect(state.player.x).toBe(10);
      expect((state as any).player.y).toBeUndefined();
    });

    it('removes from array', () => {
      const state = { items: [1, 2, 3] };
      const patch: Patch = {
        op: 'remove',
        path: ['items', '1']
      };

      applyPatch(state, patch);

      expect(state.items).toEqual([1, 3]);
    });
  });

  describe('Complex Patch Sequences', () => {
    it('applies multiple patches correctly', () => {
      const state = {
        players: {
          p1: { x: 100, y: 100 }
        }
      };

      const patches: Patch[] = [
        { op: 'replace', path: ['players', 'p1', 'x'], value: 150 },
        { op: 'add', path: ['players', 'p1', 'score'], value: 10 },
        { op: 'add', path: ['players', 'p2'], value: { x: 200, y: 200 } }
      ];

      patches.forEach(patch => applyPatch(state, patch));

      expect(state.players.p1.x).toBe(150);
      expect((state.players.p1 as any).score).toBe(10);
      expect((state.players as any).p2).toEqual({ x: 200, y: 200 });
    });
  });

  describe('Error Cases', () => {
    it('throws on empty path', () => {
      const state = { x: 10 };
      const patch: Patch = {
        op: 'replace',
        path: [],
        value: 20
      };

      expect(() => applyPatch(state, patch)).toThrow('Cannot patch root');
    });
  });
});

describe('deepClone', () => {
  it('clones primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('clones simple objects', () => {
    const obj = { x: 10, y: 20 };
    const clone = deepClone(obj);

    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);

    clone.x = 999;
    expect(obj.x).toBe(10);
  });

  it('clones nested objects', () => {
    const obj = { player: { position: { x: 10, y: 20 } } };
    const clone = deepClone(obj);

    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
    expect(clone.player).not.toBe(obj.player);
    expect(clone.player.position).not.toBe(obj.player.position);

    clone.player.position.x = 999;
    expect(obj.player.position.x).toBe(10);
  });

  it('clones arrays', () => {
    const arr = [1, 2, 3];
    const clone = deepClone(arr);

    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);

    clone[0] = 999;
    expect(arr[0]).toBe(1);
  });

  it('clones arrays of objects', () => {
    const arr = [{ x: 10 }, { x: 20 }];
    const clone = deepClone(arr);

    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
    expect(clone[0]).not.toBe(arr[0]);

    clone[0].x = 999;
    expect(arr[0].x).toBe(10);
  });

  it('clones Date objects', () => {
    const date = new Date('2024-01-01');
    const clone = deepClone(date);

    expect(clone).toEqual(date);
    expect(clone).not.toBe(date);
    expect(clone.getTime()).toBe(date.getTime());
  });

  it('clones complex game state', () => {
    const state = {
      players: {
        p1: { x: 100, y: 100, inventory: [1, 2, 3] },
        p2: { x: 200, y: 200, inventory: [4, 5, 6] }
      },
      world: { gravity: 9.8, time: 1000 }
    };

    const clone = deepClone(state);

    expect(clone).toEqual(state);
    expect(clone).not.toBe(state);
    expect(clone.players).not.toBe(state.players);
    expect(clone.players.p1).not.toBe(state.players.p1);
    expect(clone.players.p1.inventory).not.toBe(state.players.p1.inventory);

    clone.players.p1.x = 999;
    clone.players.p1.inventory.push(999);

    expect(state.players.p1.x).toBe(100);
    expect(state.players.p1.inventory).toEqual([1, 2, 3]);
  });
});

describe('Diff/Patch Integration', () => {
  it('roundtrip: diff then patch produces same state', () => {
    const oldState = {
      players: {
        p1: { x: 100, y: 100, score: 0 }
      },
      round: 1
    };

    const newState = {
      players: {
        p1: { x: 150, y: 120, score: 5 },
        p2: { x: 200, y: 200, score: 0 }
      },
      round: 2
    };

    const patches = generateDiff(oldState, newState);
    const reconstructed = deepClone(oldState);

    patches.forEach(patch => applyPatch(reconstructed, patch));

    expect(reconstructed).toEqual(newState);
  });

  it('handles multiple rounds of diff/patch', () => {
    let state = { counter: 0, players: {} };

    // Round 1
    const state1 = { counter: 1, players: { p1: { x: 10 } } };
    const patches1 = generateDiff(state, state1);
    patches1.forEach(p => applyPatch(state, p));
    expect(state).toEqual(state1);

    // Round 2
    const state2 = { counter: 2, players: { p1: { x: 20 }, p2: { x: 30 } } };
    const patches2 = generateDiff(state, state2);
    patches2.forEach(p => applyPatch(state, p));
    expect(state).toEqual(state2);

    // Round 3
    const state3 = { counter: 3, players: { p2: { x: 40 } } };
    const patches3 = generateDiff(state, state3);
    patches3.forEach(p => applyPatch(state, p));
    expect(state).toEqual(state3);
  });

  it('handles complex game state changes', () => {
    const initialState = {
      players: {},
      bullets: [],
      gameState: 'waiting'
    };

    const gameStart = {
      players: {
        p1: { x: 100, y: 100, health: 100 },
        p2: { x: 700, y: 100, health: 100 }
      },
      bullets: [],
      gameState: 'playing'
    };

    const afterAction = {
      players: {
        p1: { x: 120, y: 100, health: 100 },
        p2: { x: 700, y: 100, health: 90 }
      },
      bullets: [{ x: 150, y: 100, ownerId: 'p1' }],
      gameState: 'playing'
    };

    let state = deepClone(initialState);

    // Apply game start
    const patches1 = generateDiff(state, gameStart);
    patches1.forEach(p => applyPatch(state, p));
    expect(state).toEqual(gameStart);

    // Apply action
    const patches2 = generateDiff(state, afterAction);
    patches2.forEach(p => applyPatch(state, p));
    expect(state).toEqual(afterAction);
  });
});
