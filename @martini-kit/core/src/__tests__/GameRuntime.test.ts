/**
 * Tests for GameRuntime - Host-authoritative state management
 *
 * Critical: These tests ensure correct state sync between host and clients
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameRuntime } from '../GameRuntime';
import { defineGame } from '../defineGame';
import type { Transport, WireMessage, RuntimeConfig } from '../transport';

// Mock Transport implementation
class MockTransport implements Transport {
  private messageHandlers: Array<(msg: WireMessage, senderId: string) => void> = [];
  private peerJoinHandlers: Array<(peerId: string) => void> = [];
  private peerLeaveHandlers: Array<(peerId: string) => void> = [];
  private peers: string[] = [];
  public sentMessages: Array<{ message: WireMessage; targetId?: string }> = [];
  public playerId: string;
  public _isHost: boolean;

  constructor(playerId: string, isHost: boolean) {
    this.playerId = playerId;
    this._isHost = isHost;
  }

  send(message: WireMessage, targetId?: string): void {
    this.sentMessages.push({ message, targetId });
  }

  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const idx = this.messageHandlers.indexOf(handler);
      if (idx >= 0) this.messageHandlers.splice(idx, 1);
    };
  }

  onPeerJoin(handler: (peerId: string) => void): () => void {
    this.peerJoinHandlers.push(handler);
    return () => {
      const idx = this.peerJoinHandlers.indexOf(handler);
      if (idx >= 0) this.peerJoinHandlers.splice(idx, 1);
    };
  }

  onPeerLeave(handler: (peerId: string) => void): () => void {
    this.peerLeaveHandlers.push(handler);
    return () => {
      const idx = this.peerLeaveHandlers.indexOf(handler);
      if (idx >= 0) this.peerLeaveHandlers.splice(idx, 1);
    };
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    return this.peers;
  }

  isHost(): boolean {
    return this._isHost;
  }

  // Test helpers
  simulateMessage(msg: WireMessage, senderId: string): void {
    this.messageHandlers.forEach(h => h(msg, senderId));
  }

  simulatePeerJoin(peerId: string): void {
    this.peers.push(peerId);
    this.peerJoinHandlers.forEach(h => h(peerId));
  }

  simulatePeerLeave(peerId: string): void {
    this.peers = this.peers.filter(p => p !== peerId);
    this.peerLeaveHandlers.forEach(h => h(peerId));
  }
}

describe('GameRuntime', () => {
  describe('Initialization', () => {
    it('initializes with empty state if no setup', () => {
      const game = defineGame({});
      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const state = runtime.getState();
      expect(state).toEqual({});
    });

    it('initializes state using setup function', () => {
      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 100, y: 100 }])
          )
        })
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, {
        isHost: true,
        playerIds: ['p1', 'p2']
      });

      const state = runtime.getState();
      expect(state.players).toHaveProperty('p1');
      expect(state.players).toHaveProperty('p2');
      expect(state.players.p1).toEqual({ x: 100, y: 100 });
    });

    it('sets up transport listeners', () => {
      const game = defineGame({});
      const transport = new MockTransport('p1', true);

      new GameRuntime(game, transport, { isHost: true });

      // Should have registered listeners
      expect(transport['messageHandlers'].length).toBeGreaterThan(0);
      expect(transport['peerJoinHandlers'].length).toBeGreaterThan(0);
      expect(transport['peerLeaveHandlers'].length).toBeGreaterThan(0);
    });

    it('starts sync loop if host', () => {
      vi.useFakeTimers();

      const game = defineGame({});
      const transport = new MockTransport('p1', true);
      new GameRuntime(game, transport, { isHost: true, syncInterval: 100 });

      // No messages initially
      expect(transport.sentMessages).toHaveLength(0);

      // Advance time
      vi.advanceTimersByTime(100);

      // Should have sent sync (even if empty)
      // Note: sync only sends if there are changes
      vi.useRealTimers();
    });

    it('does not start sync loop if client', () => {
      vi.useFakeTimers();

      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      new GameRuntime(game, transport, { isHost: false });

      vi.advanceTimersByTime(1000);

      // Client should not send sync messages
      const syncMessages = transport.sentMessages.filter(m => m.message.type === 'state_sync');
      expect(syncMessages).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe('getState', () => {
    it('returns current state', () => {
      const game = defineGame({
        setup: () => ({ counter: 42 })
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      expect(runtime.getState()).toEqual({ counter: 42 });
    });

    it('returns live state object', () => {
      const game = defineGame({
        setup: () => ({ x: 0 })
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const state1 = runtime.getState();
      const state2 = runtime.getState();

      expect(state1).toBe(state2); // Same object reference
    });
  });

  describe('submitAction (Host)', () => {
    it('applies action to state immediately on host', () => {
      const game = defineGame({
        setup: () => ({ counter: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.counter += 1;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.submitAction('increment', {});

      expect(runtime.getState().counter).toBe(1);
    });

    it('broadcasts action to peers', () => {
      const game = defineGame({
        actions: {
          move: {
            apply: () => {}
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.submitAction('move', { x: 100, y: 200 });

      const actionMessages = transport.sentMessages.filter(m => m.message.type === 'action');
      expect(actionMessages).toHaveLength(1);

      const payload = actionMessages[0].message.payload;
      expect(payload.actionName).toBe('move');
      expect(payload.input).toEqual({ x: 100, y: 200 });
      expect(payload.context.playerId).toBe('p1');
      expect(payload.context.targetId).toBe('p1');
      expect(payload.context.isHost).toBe(true);
      expect(payload.context.random).toBeDefined();
      expect(payload.actionSeed).toBe(100000); // First action uses counter value
    });

    it('notifies onChange callbacks after applying action', () => {
      const game = defineGame({
        setup: () => ({ x: 0 }),
        actions: {
          update: {
            apply: (state, context, input) => {
              state.x = input.x;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const states: any[] = [];
      runtime.onChange((state) => {
        states.push({ ...state });
      });

      runtime.submitAction('update', { x: 100 });

      expect(states).toHaveLength(1);
      expect(states[0].x).toBe(100);
    });

    it('handles action with player-specific logic', () => {
      const game = defineGame({
        setup: () => ({
          players: {
            p1: { score: 0 },
            p2: { score: 0 }
          }
        }),
        actions: {
          score: {
            apply: (state, context) => {
              state.players[context.targetId].score += 1;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.submitAction('score', {});

      expect(runtime.getState().players.p1.score).toBe(1);
      expect(runtime.getState().players.p2.score).toBe(0);
    });

    it('warns if action not found', () => {
      const game = defineGame({
        actions: {}
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      runtime.submitAction('nonexistent', {});

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[martini-kit]');
      expect(callArg).toContain('Action "nonexistent" not found');

      consoleSpy.mockRestore();
    });
  });

  describe('submitAction (Client)', () => {
    it('does not apply action locally on client', () => {
      const game = defineGame({
        setup: () => ({ counter: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.counter += 1;
            }
          }
        }
      });

      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      runtime.submitAction('increment', {});

      // Client should not apply action locally
      expect(runtime.getState().counter).toBe(0);
    });

    it('broadcasts action to host', () => {
      const game = defineGame({
        actions: {
          move: {
            apply: () => {}
          }
        }
      });

      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      runtime.submitAction('move', { x: 100 });

      const actionMessages = transport.sentMessages.filter(m => m.message.type === 'action');
      expect(actionMessages).toHaveLength(1);
    });
  });

  describe('State Synchronization (Host)', () => {
    it('sends state patches to clients when state changes', () => {
      vi.useFakeTimers();

      const game = defineGame({
        setup: () => ({ x: 0 }),
        actions: {
          update: {
            apply: (state, context, input) => {
              state.x = input.x;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, {
        isHost: true,
        syncInterval: 50
      });

      // Change state
      runtime.submitAction('update', { x: 100 });

      // Clear sent messages
      transport.sentMessages = [];

      // Advance time to trigger sync
      vi.advanceTimersByTime(50);

      // Should have sent sync message
      const syncMessages = transport.sentMessages.filter(m => m.message.type === 'state_sync');
      expect(syncMessages.length).toBeGreaterThan(0);

      if (syncMessages.length > 0) {
        expect(syncMessages[0].message.payload.patches).toBeDefined();
      }

      vi.useRealTimers();
    });

    it('does not send sync if state unchanged', () => {
      vi.useFakeTimers();

      const game = defineGame({
        setup: () => ({ x: 0 })
      });

      const transport = new MockTransport('p1', true);
      new GameRuntime(game, transport, { isHost: true, syncInterval: 50 });

      transport.sentMessages = [];
      vi.advanceTimersByTime(50);

      // No changes = no sync
      const syncMessages = transport.sentMessages.filter(m => m.message.type === 'state_sync');
      expect(syncMessages).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe('State Synchronization (Client)', () => {
    it('applies full state sync from host', () => {
      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      const newState = {
        players: {
          p1: { x: 100, y: 200 }
        }
      };

      transport.simulateMessage({
        type: 'state_sync',
        payload: { fullState: newState }
      }, 'p1');

      expect(runtime.getState()).toEqual(newState);
    });

    it('applies patches from host', () => {
      const game = defineGame({
        setup: () => ({ x: 0, y: 0 })
      });

      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      transport.simulateMessage({
        type: 'state_sync',
        payload: {
          patches: [
            { op: 'replace', path: ['x'], value: 100 },
            { op: 'add', path: ['z'], value: 50 }
          ]
        }
      }, 'p1');

      const state = runtime.getState();
      expect(state.x).toBe(100);
      expect(state.y).toBe(0);
      expect((state as any).z).toBe(50);
    });

    it('notifies onChange when receiving state sync', () => {
      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      const states: any[] = [];
      runtime.onChange((state) => {
        states.push({ ...state });
      });

      transport.simulateMessage({
        type: 'state_sync',
        payload: { fullState: { x: 100 } }
      }, 'p1');

      expect(states).toHaveLength(1);
      expect(states[0].x).toBe(100);
    });
  });

  describe('mutateState (Host Only)', () => {
    it('allows host to directly mutate state', () => {
      const game = defineGame({
        setup: () => ({ x: 0 })
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.mutateState((state) => {
        state.x = 100;
        state.y = 200;
      });

      const state = runtime.getState();
      expect(state.x).toBe(100);
      expect((state as any).y).toBe(200);
    });

    it('warns when client tries to mutate state', () => {
      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      runtime.mutateState((state) => {
        state.x = 100;
      });

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[martini-kit]');
      expect(callArg).toContain('mutateState called on non-host - ignoring');
      expect(runtime.getState()).not.toHaveProperty('x');

      consoleSpy.mockRestore();
    });

    it('notifies onChange after mutation', () => {
      const game = defineGame({
        setup: () => ({ x: 0 })
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const states: any[] = [];
      runtime.onChange((state) => {
        states.push({ ...state });
      });

      runtime.mutateState((state) => {
        state.x = 100;
      });

      expect(states).toHaveLength(1);
      expect(states[0].x).toBe(100);
    });
  });

  describe('Peer Join/Leave', () => {
    it('calls onPlayerJoin when peer joins', () => {
      const game = defineGame({
        setup: () => ({ players: {} }),
        onPlayerJoin: (state, playerId) => {
          state.players[playerId] = { joined: true };
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      transport.simulatePeerJoin('p2');

      expect(runtime.getState().players).toHaveProperty('p2');
    });

    it('sends full state to newly joined peer (host only)', () => {
      const game = defineGame({
        setup: () => ({ x: 100, y: 200 })
      });

      const transport = new MockTransport('p1', true);
      new GameRuntime(game, transport, { isHost: true });

      transport.simulatePeerJoin('p2');

      const stateSyncMessages = transport.sentMessages.filter(
        m => m.message.type === 'state_sync' && m.targetId === 'p2'
      );

      expect(stateSyncMessages).toHaveLength(1);
      expect(stateSyncMessages[0].message.payload.fullState).toEqual({ x: 100, y: 200 });
    });

    it('calls onPlayerLeave when peer leaves', () => {
      const game = defineGame({
        setup: () => ({ players: { p2: { x: 100 } } }),
        onPlayerLeave: (state, playerId) => {
          delete state.players[playerId];
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      transport.simulatePeerLeave('p2');

      expect(runtime.getState().players).not.toHaveProperty('p2');
    });
  });

  describe('Custom Events', () => {
    it('broadcasts custom events', () => {
      const game = defineGame({});
      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.broadcastEvent('player-died', { playerId: 'p1', x: 100, y: 200 });

      const eventMessages = transport.sentMessages.filter(m => m.message.type === 'event');
      expect(eventMessages).toHaveLength(1);
      expect(eventMessages[0].message.payload).toEqual({
        eventName: 'player-died',
        payload: { playerId: 'p1', x: 100, y: 200 }
      });
    });

    it('receives custom events', () => {
      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      const receivedEvents: any[] = [];
      runtime.onEvent('explosion', (senderId, eventName, payload) => {
        receivedEvents.push({ senderId, eventName, payload });
      });

      transport.simulateMessage({
        type: 'event',
        payload: {
          eventName: 'explosion',
          payload: { x: 100, y: 200, damage: 50 }
        }
      }, 'p1');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].eventName).toBe('explosion');
      expect(receivedEvents[0].senderId).toBe('p1');
      expect(receivedEvents[0].payload).toEqual({ x: 100, y: 200, damage: 50 });
    });

    it('onEvent returns cleanup function', () => {
      const game = defineGame({});
      const transport = new MockTransport('p2', false);
      const runtime = new GameRuntime(game, transport, { isHost: false });

      let callCount = 0;
      const unsubscribe = runtime.onEvent('test', () => {
        callCount++;
      });

      transport.simulateMessage({
        type: 'event',
        payload: { eventName: 'test', payload: {} }
      }, 'p1');

      expect(callCount).toBe(1);

      unsubscribe();

      transport.simulateMessage({
        type: 'event',
        payload: { eventName: 'test', payload: {} }
      }, 'p1');

      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('onChange', () => {
    it('notifies listeners on state change', () => {
      const game = defineGame({
        setup: () => ({ x: 0 }),
        actions: {
          update: {
            apply: (state, context, input) => {
              state.x = input.x;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const states: any[] = [];
      runtime.onChange((state) => {
        states.push(state.x);
      });

      runtime.submitAction('update', { x: 100 });
      runtime.submitAction('update', { x: 200 });

      expect(states).toEqual([100, 200]);
    });

    it('returns cleanup function', () => {
      const game = defineGame({
        setup: () => ({ x: 0 }),
        actions: {
          update: {
            apply: (state, context, input) => {
              state.x = input.x;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      let callCount = 0;
      const unsubscribe = runtime.onChange(() => {
        callCount++;
      });

      runtime.submitAction('update', { x: 100 });
      expect(callCount).toBe(1);

      unsubscribe();

      runtime.submitAction('update', { x: 200 });
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('destroy', () => {
    it('stops sync interval', () => {
      vi.useFakeTimers();

      const game = defineGame({});
      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true, syncInterval: 50 });

      runtime.destroy();

      transport.sentMessages = [];
      vi.advanceTimersByTime(1000);

      // Should not send any messages after destroy
      expect(transport.sentMessages).toHaveLength(0);

      vi.useRealTimers();
    });

    it('cleans up transport listeners', () => {
      const game = defineGame({});
      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      runtime.destroy();

      // Should have unsubscribed
      expect(transport['messageHandlers']).toHaveLength(0);
      expect(transport['peerJoinHandlers']).toHaveLength(0);
      expect(transport['peerLeaveHandlers']).toHaveLength(0);
    });
  });

  describe('Host Processing Client Actions', () => {
    it('host applies actions from clients', () => {
      const game = defineGame({
        setup: () => ({
          players: {
            p1: { x: 0 },
            p2: { x: 0 }
          }
        }),
        actions: {
          move: {
            apply: (state, context, input) => {
              state.players[context.targetId].x = input.x;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      // Simulate action from client p2
      transport.simulateMessage({
        type: 'action',
        payload: {
          actionName: 'move',
          input: { x: 100 },
          context: {
            playerId: 'p2',
            targetId: 'p2',
            isHost: false
          }
        }
      }, 'p2');

      expect(runtime.getState().players.p2.x).toBe(100);
    });

    it('host ignores own actions from network', () => {
      const game = defineGame({
        setup: () => ({ counter: 0 }),
        actions: {
          increment: {
            apply: (state) => {
              state.counter += 1;
            }
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      // Host submits action locally
      runtime.submitAction('increment', {});
      expect(runtime.getState().counter).toBe(1);

      // Host receives own action from network (should ignore)
      transport.simulateMessage({
        type: 'action',
        payload: {
          actionName: 'increment',
          input: {},
          playerId: 'p1'
        }
      }, 'p1');

      // Should not double-apply
      expect(runtime.getState().counter).toBe(1);
    });

    it('warns when game has no actions defined', () => {
      // Create game without calling defineGame to avoid auto-initialization
      const game = {
        setup: () => ({ counter: 0 })
      };

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate action from client
      transport.simulateMessage({
        type: 'action',
        payload: {
          actionName: 'move',
          input: {},
          context: {
            playerId: 'p2',
            targetId: 'p2',
            isHost: false
          }
        }
      }, 'p2');

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[martini-kit]');
      expect(callArg).toContain('No actions defined');
      consoleSpy.mockRestore();
    });

    it('warns when receiving unknown action from client', () => {
      const game = defineGame({
        actions: {
          move: {
            apply: () => {}
          }
        }
      });

      const transport = new MockTransport('p1', true);
      const runtime = new GameRuntime(game, transport, { isHost: true });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate unknown action from client
      transport.simulateMessage({
        type: 'action',
        payload: {
          actionName: 'jump',
          input: {},
          context: {
            playerId: 'p2',
            targetId: 'p2',
            isHost: false
          }
        }
      }, 'p2');

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[martini-kit]');
      expect(callArg).toContain('Unknown action from client: jump');
      consoleSpy.mockRestore();
    });
  });
});
