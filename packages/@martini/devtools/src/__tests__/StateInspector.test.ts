/**
 * StateInspector Tests (TDD approach)
 *
 * The StateInspector provides real-time state visualization and debugging tools.
 * It attaches to a GameRuntime and tracks state changes, actions, and network events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateInspector } from '../StateInspector';
import { defineGame, GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';

describe('StateInspector', () => {
  describe('Basic Attachment', () => {
    it('should attach to a GameRuntime instance', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      expect(inspector.isAttached()).toBe(true);
      expect(inspector.getRuntime()).toBe(runtime);

      runtime.destroy();
      transport.disconnect();
    });

    it('should detach from runtime', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);
      inspector.detach();

      expect(inspector.isAttached()).toBe(false);
      expect(inspector.getRuntime()).toBe(null);

      runtime.destroy();
      transport.disconnect();
    });

    it('should throw error if attaching to already-attached inspector', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
      });

      const transport1 = new LocalTransport({ roomId: 'test1', playerId: 'p1', isHost: true });
      const runtime1 = new GameRuntime(game, transport1, { isHost: true, playerIds: ['p1'] });

      const transport2 = new LocalTransport({ roomId: 'test2', playerId: 'p2', isHost: true });
      const runtime2 = new GameRuntime(game, transport2, { isHost: true, playerIds: ['p2'] });

      const inspector = new StateInspector();
      inspector.attach(runtime1);

      expect(() => inspector.attach(runtime2)).toThrow('Inspector is already attached');

      runtime1.destroy();
      runtime2.destroy();
      transport1.disconnect();
      transport2.disconnect();
    });
  });

  describe('State Snapshots', () => {
    it('should capture initial state snapshot on attach', () => {
      const game = defineGame({
        setup: () => ({ count: 0, players: {} }),
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      const snapshots = inspector.getSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].state).toEqual({ count: 0, players: {} });
      expect(snapshots[0].timestamp).toBeTypeOf('number');

      runtime.destroy();
      transport.disconnect();
    });

    it('should capture state snapshots on state changes', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});

      const snapshots = inspector.getSnapshots();
      expect(snapshots.length).toBeGreaterThanOrEqual(2);
      expect(snapshots[snapshots.length - 1].state.count).toBe(2);

      runtime.destroy();
      transport.disconnect();
    });

    it('should limit number of snapshots to max size', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector({ maxSnapshots: 5 });
      inspector.attach(runtime);

      // Submit 10 actions
      for (let i = 0; i < 10; i++) {
        runtime.submitAction('increment', {});
      }

      const snapshots = inspector.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(6); // Initial + 5 max

      runtime.destroy();
      transport.disconnect();
    });
  });

  describe('Action History', () => {
    it('should track all actions submitted', () => {
      const game = defineGame({
        setup: () => ({ count: 0, value: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
          setValue: {
            apply: (state, context, input: { value: number }) => {
              state.value = input.value;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('setValue', { value: 42 });
      runtime.submitAction('increment', {});

      const history = inspector.getActionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].actionName).toBe('increment');
      expect(history[1].actionName).toBe('setValue');
      expect(history[1].input).toEqual({ value: 42 });
      expect(history[2].actionName).toBe('increment');

      runtime.destroy();
      transport.disconnect();
    });

    it('should include timestamps in action history', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      const before = Date.now();
      runtime.submitAction('increment', {});
      const after = Date.now();

      const history = inspector.getActionHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);

      runtime.destroy();
      transport.disconnect();
    });

    it('should limit action history size', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector({ maxActions: 5 });
      inspector.attach(runtime);

      for (let i = 0; i < 10; i++) {
        runtime.submitAction('increment', {});
      }

      const history = inspector.getActionHistory();
      expect(history).toHaveLength(5);
      // Should keep most recent actions
      expect(history[history.length - 1].actionName).toBe('increment');

      runtime.destroy();
      transport.disconnect();
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners on state change', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      const stateChanges: any[] = [];
      inspector.onStateChange((snapshot) => {
        stateChanges.push(snapshot);
      });

      runtime.submitAction('increment', {});

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].state.count).toBe(1);

      runtime.destroy();
      transport.disconnect();
    });

    it('should notify listeners on action', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      const actions: any[] = [];
      inspector.onAction((actionRecord) => {
        actions.push(actionRecord);
      });

      runtime.submitAction('increment', {});

      expect(actions).toHaveLength(1);
      expect(actions[0].actionName).toBe('increment');

      runtime.destroy();
      transport.disconnect();
    });

    it('should allow unsubscribing from events', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      const actions: any[] = [];
      const unsubscribe = inspector.onAction((actionRecord) => {
        actions.push(actionRecord);
      });

      runtime.submitAction('increment', {});
      expect(actions).toHaveLength(1);

      unsubscribe();

      runtime.submitAction('increment', {});
      expect(actions).toHaveLength(1); // Should still be 1

      runtime.destroy();
      transport.disconnect();
    });
  });

  describe('Statistics', () => {
    it('should track total action count', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});

      const stats = inspector.getStats();
      expect(stats.totalActions).toBe(3);

      runtime.destroy();
      transport.disconnect();
    });

    it('should track total state changes', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});

      const stats = inspector.getStats();
      expect(stats.totalStateChanges).toBeGreaterThanOrEqual(2);

      runtime.destroy();
      transport.disconnect();
    });

    it('should track action frequency by name', () => {
      const game = defineGame({
        setup: () => ({ count: 0, value: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
          setValue: {
            apply: (state, context, input: { value: number }) => {
              state.value = input.value;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});
      runtime.submitAction('setValue', { value: 42 });
      runtime.submitAction('increment', {});

      const stats = inspector.getStats();
      expect(stats.actionsByName.increment).toBe(3);
      expect(stats.actionsByName.setValue).toBe(1);

      runtime.destroy();
      transport.disconnect();
    });
  });

  describe('Clear History', () => {
    it('should clear all snapshots and action history', () => {
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.count++;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      const inspector = new StateInspector();
      inspector.attach(runtime);

      runtime.submitAction('increment', {});
      runtime.submitAction('increment', {});

      expect(inspector.getSnapshots().length).toBeGreaterThan(0);
      expect(inspector.getActionHistory().length).toBeGreaterThan(0);

      inspector.clear();

      expect(inspector.getSnapshots()).toHaveLength(0);
      expect(inspector.getActionHistory()).toHaveLength(0);

      const stats = inspector.getStats();
      expect(stats.totalActions).toBe(0);
      expect(stats.totalStateChanges).toBe(0);

      runtime.destroy();
      transport.disconnect();
    });
  });
});
