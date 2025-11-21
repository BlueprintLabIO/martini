/**
 * Tests for defineGame - Game definition and validation
 */

import { describe, it, expect } from 'vitest';
import { defineGame } from '../defineGame';

describe('defineGame', () => {
  describe('Basic Game Definition', () => {
    it('accepts minimal valid game definition', () => {
      const game = defineGame({});

      expect(game).toBeDefined();
      expect(game.actions).toEqual({});
    });

    it('accepts game with setup function', () => {
      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 100, y: 100 }])
          )
        })
      });

      expect(game.setup).toBeDefined();
      expect(typeof game.setup).toBe('function');
    });

    it('accepts game with actions', () => {
      const game = defineGame({
        actions: {
          move: {
            apply: (state, playerId, input) => {
              state.x = input.x;
            }
          }
        }
      });

      expect(game.actions).toBeDefined();
      expect(game.actions.move).toBeDefined();
      expect(typeof game.actions.move.apply).toBe('function');
    });

    it('accepts game with lifecycle hooks', () => {
      const game = defineGame({
        onPlayerJoin: (state, playerId) => {
          state.players[playerId] = { x: 0, y: 0 };
        },
        onPlayerLeave: (state, playerId) => {
          delete state.players[playerId];
        }
      });

      expect(game.onPlayerJoin).toBeDefined();
      expect(game.onPlayerLeave).toBeDefined();
    });
  });

  describe('Action Validation', () => {
    it('throws if action missing apply function', () => {
      expect(() => {
        defineGame({
          actions: {
            invalid: {} as any
          }
        });
      }).toThrow('Action "invalid" must have an apply function');
    });

    it('throws if action apply is not a function', () => {
      expect(() => {
        defineGame({
          actions: {
            invalid: {
              apply: 'not a function' as any
            }
          }
        });
      }).toThrow('Action "invalid" must have an apply function');
    });

    it('accepts action with optional input schema', () => {
      const game = defineGame({
        actions: {
          move: {
            input: { x: 'number', y: 'number' },
            apply: (state, playerId, input) => {
              state.x = input.x;
              state.y = input.y;
            }
          }
        }
      });

      expect(game.actions.move.input).toEqual({ x: 'number', y: 'number' });
    });
  });

  describe('Complex Game Definitions', () => {
    it('accepts complete game with all features', () => {
      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
          ),
          round: 1
        }),

        actions: {
          move: {
            input: { x: 'number', y: 'number' },
            apply: (state, playerId, input) => {
              if (state.players[playerId]) {
                state.players[playerId].x = input.x;
                state.players[playerId].y = input.y;
              }
            }
          },
          score: {
            apply: (state, playerId) => {
              if (state.players[playerId]) {
                state.players[playerId].score += 1;
              }
            }
          }
        },

        onPlayerJoin: (state, playerId) => {
          state.players[playerId] = { x: 100, y: 100, score: 0 };
        },

        onPlayerLeave: (state, playerId) => {
          delete state.players[playerId];
        }
      });

      expect(game.setup).toBeDefined();
      expect(Object.keys(game.actions!)).toEqual(['move', 'score']);
      expect(game.onPlayerJoin).toBeDefined();
      expect(game.onPlayerLeave).toBeDefined();
    });

    it('handles multiple actions', () => {
      const game = defineGame({
        actions: {
          move: {
            apply: (state, playerId, input) => {
              state.x = input.x;
            }
          },
          jump: {
            apply: (state, playerId) => {
              state.jumping = true;
            }
          },
          shoot: {
            apply: (state, playerId, input) => {
              state.bullets.push({ x: input.x, y: input.y });
            }
          }
        }
      });

      expect(Object.keys(game.actions!)).toHaveLength(3);
      expect(game.actions!.move).toBeDefined();
      expect(game.actions!.jump).toBeDefined();
      expect(game.actions!.shoot).toBeDefined();
    });
  });

  describe('Setup Function', () => {
    it('setup receives playerIds', () => {
      let receivedContext: any;

      const game = defineGame({
        setup: (context) => {
          receivedContext = context;
          return {};
        }
      });

      // Simulate calling setup
      game.setup!({ playerIds: ['p1', 'p2', 'p3'] });

      expect(receivedContext).toBeDefined();
      expect(receivedContext.playerIds).toEqual(['p1', 'p2', 'p3']);
    });

    it('setup can initialize complex state', () => {
      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, {
              position: { x: 100, y: 100 },
              velocity: { x: 0, y: 0 },
              health: 100,
              inventory: []
            }])
          ),
          world: {
            gravity: 9.8,
            boundaries: { width: 800, height: 600 }
          },
          gameState: 'waiting'
        })
      });

      const state = game.setup!({ playerIds: ['p1', 'p2'] });

      expect(state.players.p1).toBeDefined();
      expect(state.players.p2).toBeDefined();
      expect(state.world.gravity).toBe(9.8);
      expect(state.gameState).toBe('waiting');
    });
  });

  describe('Action Apply Function', () => {
    it('action apply receives state, playerId, and input', () => {
      let receivedArgs: any;

      const game = defineGame({
        actions: {
          test: {
            apply: (state, playerId, input) => {
              receivedArgs = { state, playerId, input };
            }
          }
        }
      });

      const mockState = { x: 0 };
      game.actions!.test.apply(mockState, 'player-1', { data: 'test' });

      expect(receivedArgs.state).toBe(mockState);
      expect(receivedArgs.playerId).toBe('player-1');
      expect(receivedArgs.input).toEqual({ data: 'test' });
    });

    it('action apply can mutate state', () => {
      const game = defineGame({
        actions: {
          increment: {
            apply: (state) => {
              state.counter += 1;
            }
          }
        }
      });

      const state = { counter: 0 };
      game.actions!.increment.apply(state, 'p1', {});

      expect(state.counter).toBe(1);
    });

    it('action apply can modify nested state', () => {
      const game = defineGame({
        actions: {
          movePlayer: {
            apply: (state, playerId, input) => {
              state.players[playerId].position.x = input.x;
              state.players[playerId].position.y = input.y;
            }
          }
        }
      });

      const state = {
        players: {
          p1: { position: { x: 0, y: 0 } }
        }
      };

      game.actions!.movePlayer.apply(state, 'p1', { x: 100, y: 200 });

      expect(state.players.p1.position.x).toBe(100);
      expect(state.players.p1.position.y).toBe(200);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('onPlayerJoin receives state and playerId', () => {
      let receivedArgs: any;

      const game = defineGame({
        onPlayerJoin: (state, playerId) => {
          receivedArgs = { state, playerId };
        }
      });

      const state = { players: {} };
      game.onPlayerJoin!(state, 'p1');

      expect(receivedArgs.state).toBe(state);
      expect(receivedArgs.playerId).toBe('p1');
    });

    it('onPlayerLeave receives state and playerId', () => {
      let receivedArgs: any;

      const game = defineGame({
        onPlayerLeave: (state, playerId) => {
          receivedArgs = { state, playerId };
        }
      });

      const state = { players: { p1: {} } };
      game.onPlayerLeave!(state, 'p1');

      expect(receivedArgs.state).toBe(state);
      expect(receivedArgs.playerId).toBe('p1');
    });

    it('hooks can mutate state', () => {
      const game = defineGame({
        onPlayerJoin: (state, playerId) => {
          state.players[playerId] = { joined: true };
        },
        onPlayerLeave: (state, playerId) => {
          delete state.players[playerId];
        }
      });

      const state = { players: {} };

      game.onPlayerJoin!(state, 'p1');
      expect(state.players).toHaveProperty('p1');

      game.onPlayerLeave!(state, 'p1');
      expect(state.players).not.toHaveProperty('p1');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty actions object', () => {
      const game = defineGame({
        actions: {}
      });

      expect(game.actions).toEqual({});
    });

    it('initializes actions to empty object if not provided', () => {
      const game = defineGame({
        setup: () => ({})
      });

      expect(game.actions).toEqual({});
    });

    it('preserves all provided properties', () => {
      const setup = () => ({});
      const onPlayerJoin = () => {};
      const onPlayerLeave = () => {};
      const actions = {
        test: {
          apply: () => {}
        }
      };

      const game = defineGame({
        setup,
        actions,
        onPlayerJoin,
        onPlayerLeave
      });

      expect(game.setup).toBe(setup);
      expect(game.actions).toBe(actions);
      expect(game.onPlayerJoin).toBe(onPlayerJoin);
      expect(game.onPlayerLeave).toBe(onPlayerLeave);
    });
  });
});
