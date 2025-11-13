/**
 * Integration tests for SeededRandom in GameRuntime contexts
 *
 * Tests that random is properly injected into setup and action contexts,
 * and that it produces deterministic results across multiple clients.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineGame } from '../defineGame';
import { GameRuntime } from '../GameRuntime';
import { LocalTransport } from '../../../transport-local/src/LocalTransport';

describe('SeededRandom Integration', () => {
  describe('setup context', () => {
    it('should provide random in setup context', () => {
      let setupRandomUsed = false;
      let randomValue = -1;

      const game = defineGame({
        setup: ({ playerIds, random }) => {
          setupRandomUsed = true;
          randomValue = random.range(0, 100);
          return { players: {} };
        },
      });

      const transport = new LocalTransport({ roomId: 'setup-1', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      expect(setupRandomUsed).toBe(true);
      expect(randomValue).toBeGreaterThanOrEqual(0);
      expect(randomValue).toBeLessThan(100);

      runtime.destroy();
      transport.disconnect();
    });

    it('should produce identical setup state on host and client', () => {
      const game = defineGame({
        setup: ({ playerIds, random }) => ({
          players: Object.fromEntries(
            playerIds.map((id) => [
              id,
              {
                x: random.range(0, 800),
                y: random.range(0, 600),
                color: random.choice(['red', 'blue', 'green']),
              },
            ])
          ),
        }),
      });

      // Create host
      const hostTransport = new LocalTransport({ roomId: 'setup-2', playerId: 'host', isHost: true });
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host', 'client1'],
      });

      // Create client
      const clientTransport = new LocalTransport({ roomId: 'setup-3', playerId: 'client1', isHost: false });
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: ['host', 'client1'],
      });

      // Both should have identical initial state
      const hostState = hostRuntime.getState();
      const clientState = clientRuntime.getState();

      expect(hostState).toEqual(clientState);
      expect(hostState.players.host.x).toBe(clientState.players.host.x);
      expect(hostState.players.host.y).toBe(clientState.players.host.y);
      expect(hostState.players.host.color).toBe(clientState.players.host.color);

      hostRuntime.destroy();
      clientRuntime.destroy();
      hostTransport.disconnect();
      clientTransport.disconnect();
    });

    it('should use same seed for setup across multiple game instances', () => {
      const game = defineGame({
        setup: ({ random }) => ({
          value: random.range(0, 1000),
        }),
      });

      const transport1 = new LocalTransport({ roomId: 'setup-4', playerId: 'p1', isHost: true });
      const runtime1 = new GameRuntime(game, transport1, { isHost: true, playerIds: ['p1'] });

      const transport2 = new LocalTransport({ roomId: 'setup-5', playerId: 'p2', isHost: true });
      const runtime2 = new GameRuntime(game, transport2, { isHost: true, playerIds: ['p2'] });

      // Both instances should generate the same random value
      expect(runtime1.getState().value).toBe(runtime2.getState().value);

      runtime1.destroy();
      runtime2.destroy();
      transport1.disconnect();
      transport2.disconnect();
    });
  });

  describe('action context', () => {
    it('should provide random in action context', async () => {
      let actionRandomUsed = false;
      let randomValue = -1;

      const game = defineGame({
        setup: () => ({ value: 0 }),
        actions: {
          test: {
            apply: (state, context) => {
              actionRandomUsed = true;
              randomValue = context.random.range(0, 100);
              state.value = randomValue;
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'action-1', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      runtime.submitAction('test', {});

      expect(actionRandomUsed).toBe(true);
      expect(randomValue).toBeGreaterThanOrEqual(0);
      expect(randomValue).toBeLessThan(100);

      runtime.destroy();
      transport.disconnect();
    });

    it('should produce different random values for each action call', () => {
      const game = defineGame({
        setup: () => ({ values: [] as number[] }),
        actions: {
          addRandom: {
            apply: (state, context) => {
              state.values.push(context.random.range(0, 1000));
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'test-room-1', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

      runtime.submitAction('addRandom', {});
      runtime.submitAction('addRandom', {});
      runtime.submitAction('addRandom', {});

      const values = runtime.getState().values;
      expect(values.length).toBe(3);

      // Values should be deterministic but different for each action
      // (each action gets a different seed from the counter)
      expect(values[0]).not.toBe(values[1]);
      expect(values[1]).not.toBe(values[2]);
      expect(values[0]).not.toBe(values[2]);

      runtime.destroy();
      transport.disconnect();
    });

    it('should use same action seed when action is broadcasted', (done) => {
      let hostRandomValue = -1;
      let clientRandomValue = -1;

      const game = defineGame({
        setup: () => ({ value: 0 }),
        actions: {
          setRandom: {
            apply: (state, context) => {
              const value = context.random.range(0, 10000);

              if (context.isHost) {
                state.value = value;
                hostRandomValue = value;
              } else {
                clientRandomValue = value;
              }
            },
          },
        },
      });

      // Create connected transports using same roomId
      const hostTransport = new LocalTransport({ roomId: 'test-room-2', playerId: 'host', isHost: true });
      const clientTransport = new LocalTransport({ roomId: 'test-room-2', playerId: 'client', isHost: false });

      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host', 'client'],
      });

      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: ['host', 'client'],
      });

      // Host submits action
      hostRuntime.submitAction('setRandom', {});

      // Wait for message propagation
      setTimeout(() => {
        // Both should have used the same random seed
        expect(hostRandomValue).toBe(clientRandomValue);
        expect(hostRandomValue).not.toBe(-1);

        hostRuntime.destroy();
        clientRuntime.destroy();
        hostTransport.disconnect();
        clientTransport.disconnect();
        done();
      }, 50);
    });
  });

  describe('deterministic gameplay', () => {
    it('should support deterministic food spawning example', () => {
      interface GameState {
        food: Array<{ id: string; x: number; y: number }>;
      }

      const game = defineGame<GameState>({
        setup: ({ random }) => {
          const food: Array<{ id: string; x: number; y: number }> = [];
          for (let i = 0; i < 10; i++) {
            food.push({
              id: `food-${i}`,
              x: random.range(0, 800),
              y: random.range(0, 600),
            });
          }
          return { food };
        },
      });

      // Create two independent game instances
      const transport1 = new LocalTransport({ roomId: 'game-1', playerId: 'p1', isHost: true });
      const runtime1 = new GameRuntime(game, transport1, {
        isHost: true,
        playerIds: ['p1'],
      });

      const transport2 = new LocalTransport({ roomId: 'game-2', playerId: 'p2', isHost: true });
      const runtime2 = new GameRuntime(game, transport2, {
        isHost: true,
        playerIds: ['p2'],
      });

      // Both should generate identical food positions
      const food1 = runtime1.getState().food;
      const food2 = runtime2.getState().food;

      expect(food1).toEqual(food2);

      for (let i = 0; i < food1.length; i++) {
        expect(food1[i].x).toBe(food2[i].x);
        expect(food1[i].y).toBe(food2[i].y);
      }

      runtime1.destroy();
      runtime2.destroy();
      transport1.disconnect();
      transport2.disconnect();
    });

    it('should support deterministic physics simulation', () => {
      interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
      }

      const game = defineGame<{ particles: Particle[] }>({
        setup: ({ random }) => {
          const particles: Particle[] = [];
          for (let i = 0; i < 5; i++) {
            particles.push({
              x: random.range(0, 800),
              y: random.range(0, 600),
              vx: random.float(-5, 5),
              vy: random.float(-5, 5),
            });
          }
          return { particles };
        },
        actions: {
          tick: {
            apply: (state, context) => {
              // Add random jitter to particles
              for (const particle of state.particles) {
                particle.x += particle.vx + context.random.float(-0.1, 0.1);
                particle.y += particle.vy + context.random.float(-0.1, 0.1);
              }
            },
          },
        },
      });

      const transport1 = new LocalTransport({ roomId: 'physics-1', playerId: 'p1', isHost: true });
      const runtime1 = new GameRuntime(game, transport1, {
        isHost: true,
        playerIds: ['p1'],
      });

      const transport2 = new LocalTransport({ roomId: 'physics-2', playerId: 'p2', isHost: true });
      const runtime2 = new GameRuntime(game, transport2, {
        isHost: true,
        playerIds: ['p2'],
      });

      // Initial state should be identical
      expect(runtime1.getState().particles).toEqual(runtime2.getState().particles);

      // Simulate 10 ticks on both
      for (let i = 0; i < 10; i++) {
        runtime1.submitAction('tick', {});
        runtime2.submitAction('tick', {});
      }

      // Final state should still be identical
      const particles1 = runtime1.getState().particles;
      const particles2 = runtime2.getState().particles;

      expect(particles1.length).toBe(particles2.length);
      for (let i = 0; i < particles1.length; i++) {
        expect(particles1[i].x).toBeCloseTo(particles2[i].x, 5);
        expect(particles1[i].y).toBeCloseTo(particles2[i].y, 5);
      }

      runtime1.destroy();
      runtime2.destroy();
      transport1.disconnect();
      transport2.disconnect();
    });
  });

  describe('all SeededRandom methods in context', () => {
    it('should support all random methods in setup context', () => {
      const game = defineGame({
        setup: ({ random }) => ({
          rangeValue: random.range(0, 100),
          floatValue: random.float(0, 1),
          choiceValue: random.choice(['a', 'b', 'c']),
          boolValue: random.boolean(),
          shuffledArray: random.shuffle([1, 2, 3, 4, 5]),
        }),
      });

      const transport = new LocalTransport({ roomId: 'methods-1', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, {
        isHost: true,
        playerIds: ['p1'],
      });

      const state = runtime.getState();

      expect(state.rangeValue).toBeGreaterThanOrEqual(0);
      expect(state.rangeValue).toBeLessThan(100);
      expect(state.floatValue).toBeGreaterThanOrEqual(0);
      expect(state.floatValue).toBeLessThanOrEqual(1);
      expect(['a', 'b', 'c']).toContain(state.choiceValue);
      expect(typeof state.boolValue).toBe('boolean');
      expect(state.shuffledArray).toHaveLength(5);
      expect(state.shuffledArray.sort()).toEqual([1, 2, 3, 4, 5]);

      runtime.destroy();
      transport.disconnect();
    });

    it('should support all random methods in action context', () => {
      const game = defineGame({
        setup: () => ({ results: [] as any[] }),
        actions: {
          test: {
            apply: (state, context) => {
              state.results.push({
                rangeValue: context.random.range(0, 100),
                floatValue: context.random.float(0, 1),
                choiceValue: context.random.choice(['a', 'b', 'c']),
                boolValue: context.random.boolean(),
                shuffledArray: context.random.shuffle([1, 2, 3]),
              });
            },
          },
        },
      });

      const transport = new LocalTransport({ roomId: 'methods-2', playerId: 'p1', isHost: true });
      const runtime = new GameRuntime(game, transport, {
        isHost: true,
        playerIds: ['p1'],
      });

      runtime.submitAction('test', {});

      const result = runtime.getState().results[0];

      expect(result.rangeValue).toBeGreaterThanOrEqual(0);
      expect(result.rangeValue).toBeLessThan(100);
      expect(result.floatValue).toBeGreaterThanOrEqual(0);
      expect(result.floatValue).toBeLessThanOrEqual(1);
      expect(['a', 'b', 'c']).toContain(result.choiceValue);
      expect(typeof result.boolValue).toBe('boolean');
      expect(result.shuffledArray).toHaveLength(3);
      expect(result.shuffledArray.sort()).toEqual([1, 2, 3]);

      runtime.destroy();
      transport.disconnect();
    });
  });
});
