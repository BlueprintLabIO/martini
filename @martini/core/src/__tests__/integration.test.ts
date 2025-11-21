/**
 * Integration tests - End-to-end multiplayer scenarios
 *
 * These tests verify that all components work together correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineGame } from '../defineGame';
import { GameRuntime } from '../GameRuntime';
import type { Transport, WireMessage } from '../transport';

// Realistic Transport implementation for testing
class TestTransport implements Transport {
  private messageHandlers: Array<(msg: WireMessage, senderId: string) => void> = [];
  private peerJoinHandlers: Array<(peerId: string) => void> = [];
  private peerLeaveHandlers: Array<(peerId: string) => void> = [];
  private peers: Map<string, TestTransport> = new Map();

  constructor(
    public playerId: string,
    public _isHost: boolean,
    private network?: Map<string, TestTransport>
  ) {
    if (network) {
      network.set(playerId, this);
    }
  }

  send(message: WireMessage, targetId?: string): void {
    if (!this.network) return;

    if (targetId) {
      // Unicast
      const target = this.network.get(targetId);
      if (target) {
        setTimeout(() => target.deliver(message, this.playerId), 0);
      }
    } else {
      // Broadcast
      for (const [peerId, peer] of this.network.entries()) {
        if (peerId !== this.playerId) {
          setTimeout(() => peer.deliver(message, this.playerId), 0);
        }
      }
    }
  }

  deliver(message: WireMessage, senderId: string): void {
    this.messageHandlers.forEach(h => h(message, senderId));
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
    return Array.from(this.peers.keys());
  }

  isHost(): boolean {
    return this._isHost;
  }

  // Test helpers
  connectPeer(peer: TestTransport): void {
    this.peers.set(peer.playerId, peer);
    peer.peers.set(this.playerId, this);

    setTimeout(() => {
      this.peerJoinHandlers.forEach(h => h(peer.playerId));
      peer.peerJoinHandlers.forEach(h => h(this.playerId));
    }, 0);
  }

  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.peers.delete(peerId);
      peer.peers.delete(this.playerId);

      setTimeout(() => {
        this.peerLeaveHandlers.forEach(h => h(peerId));
        peer.peerLeaveHandlers.forEach(h => h(this.playerId));
      }, 0);
    }
  }
}

describe('Integration Tests', () => {
  describe('2-Player Game Session', () => {
    it('syncs state from host to client', async () => {
      const network = new Map<string, TestTransport>();

      // Define game
      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 0, y: 0, score: 0 }])
          )
        }),

        actions: {
          move: {
            apply(state, context, input) {
              state.players[context.targetId].x = input.x;
              state.players[context.targetId].y = input.y;
            }
          }
        }
      });

      // Create host
      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host']
      });

      // Create client
      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      // Connect peers
      hostTransport.connectPeer(clientTransport);

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Host moves
      hostRuntime.submitAction('move', { x: 100, y: 200 });

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Client should see host's position
      const clientState = clientRuntime.getState();
      expect(clientState.players?.host?.x).toBe(100);
      expect(clientState.players?.host?.y).toBe(200);
    });

    it('handles client actions on host', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 0, y: 0 }])
          )
        }),

        actions: {
          move: {
            apply(state, context, input) {
              if (state.players[context.targetId]) {
                state.players[context.targetId].x = input.x;
                state.players[context.targetId].y = input.y;
              }
            }
          }
        }
      });

      // Create host and client
      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host', 'client']
      });

      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Client sends action
      clientRuntime.submitAction('move', { x: 300, y: 400 });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Host should process client action
      const hostState = hostRuntime.getState();
      expect(hostState.players.client.x).toBe(300);
      expect(hostState.players.client.y).toBe(400);
    });

    it('syncs late joiner with full state', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { x: 0, y: 0, score: 0 }])
          )
        }),

        actions: {
          score: {
            apply(state, context) {
              if (state.players[context.targetId]) {
                state.players[context.targetId].score += 1;
              }
            }
          }
        },

        onPlayerJoin(state, playerId) {
          state.players[playerId] = { x: 0, y: 0, score: 0 };
        }
      });

      // Create host
      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host']
      });

      // Host plays for a while
      hostRuntime.submitAction('score', {});
      hostRuntime.submitAction('score', {});
      hostRuntime.submitAction('score', {});

      expect(hostRuntime.getState().players.host.score).toBe(3);

      // New client joins
      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Client should receive full state
      const clientState = clientRuntime.getState();
      expect(clientState.players.host.score).toBe(3);
      expect(clientState.players.client).toBeDefined();
    });
  });

  describe('Custom Events', () => {
    it('broadcasts events to all peers', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({});

      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host']
      });

      const client1Transport = new TestTransport('client1', false, network);
      const client1Runtime = new GameRuntime(game, client1Transport, {
        isHost: false,
        playerIds: []
      });

      const client2Transport = new TestTransport('client2', false, network);
      const client2Runtime = new GameRuntime(game, client2Transport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(client1Transport);
      hostTransport.connectPeer(client2Transport);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Listen for events
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      client1Runtime.onEvent('explosion', (senderId, eventName, payload) => {
        client1Events.push({ senderId, eventName, payload });
      });

      client2Runtime.onEvent('explosion', (senderId, eventName, payload) => {
        client2Events.push({ senderId, eventName, payload });
      });

      // Host broadcasts event
      hostRuntime.broadcastEvent('explosion', { x: 100, y: 200, damage: 50 });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Both clients should receive
      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);

      expect(client1Events[0].senderId).toBe('host');
      expect(client1Events[0].payload.damage).toBe(50);
    });
  });

  describe('Multiple Actions Sequence', () => {
    it('maintains state consistency across multiple actions', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: () => ({
          counter: 0,
          history: [] as string[]
        }),

        actions: {
          increment: {
            apply(state, context) {
              state.counter += 1;
              state.history.push(`${context.playerId}:+1`);
            }
          },
          decrement: {
            apply(state, context) {
              state.counter -= 1;
              state.history.push(`${context.playerId}:-1`);
            }
          }
        }
      });

      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host']
      });

      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Sequence of actions
      hostRuntime.submitAction('increment', {});
      await new Promise(resolve => setTimeout(resolve, 10));

      hostRuntime.submitAction('increment', {});
      await new Promise(resolve => setTimeout(resolve, 10));

      clientRuntime.submitAction('increment', {});
      await new Promise(resolve => setTimeout(resolve, 10));

      hostRuntime.submitAction('decrement', {});
      await new Promise(resolve => setTimeout(resolve, 10));

      // Wait for final sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify final state on both
      const hostState = hostRuntime.getState();
      const clientState = clientRuntime.getState();

      expect(hostState.counter).toBe(2); // +1+1+1-1 = 2
      expect(clientState.counter).toBe(2);

      expect(hostState.history).toHaveLength(4);
      expect(clientState.history).toHaveLength(4);
    });
  });

  describe('Peer Disconnect', () => {
    it('calls onPlayerLeave when peer disconnects', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: ({ playerIds }) => ({
          players: Object.fromEntries(
            playerIds.map(id => [id, { active: true }])
          )
        }),

        onPlayerJoin(state, playerId) {
          state.players[playerId] = { active: true };
        },

        onPlayerLeave(state, playerId) {
          if (state.players[playerId]) {
            state.players[playerId].active = false;
          }
        }
      });

      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host', 'client']
      });

      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(hostRuntime.getState().players.client.active).toBe(true);

      // Client disconnects
      hostTransport.disconnectPeer('client');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Host should mark as inactive
      expect(hostRuntime.getState().players.client.active).toBe(false);

      // Cleanup
      hostRuntime.destroy();
      clientRuntime.destroy();
    });
  });

  describe('State Synchronization Performance', () => {
    it('syncs efficiently with patches', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: () => ({
          players: {
            host: { x: 0, y: 0, score: 0 }
          }
        }),

        actions: {
          move: {
            apply(state, context, input) {
              state.players[context.targetId].x = input.x;
              state.players[context.targetId].y = input.y;
            }
          }
        }
      });

      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host'],
        syncInterval: 50
      });

      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);

      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Make changes
      hostRuntime.submitAction('move', { x: 100, y: 100 });
      await new Promise(resolve => setTimeout(resolve, 10));

      hostRuntime.submitAction('move', { x: 150, y: 150 });

      // Wait for sync interval to trigger
      await new Promise(resolve => setTimeout(resolve, 100));

      // Client should be synced
      const clientState = clientRuntime.getState();
      expect(clientState.players.host.x).toBe(150);
      expect(clientState.players.host.y).toBe(150);

      // Cleanup
      hostRuntime.destroy();
      clientRuntime.destroy();
    });
  });

  describe('Complex Game State', () => {
    it('handles nested objects and arrays', async () => {
      const network = new Map<string, TestTransport>();

      const game = defineGame({
        setup: () => ({
          world: {
            entities: [],
            map: {
              width: 800,
              height: 600,
              tiles: []
            }
          }
        }),

        actions: {
          spawnEntity: {
            apply(state, context, input) {
              state.world.entities.push({
                id: input.id,
                type: input.type,
                position: { x: input.x, y: input.y },
                owner: context.playerId
              });
            }
          },

          removeEntity: {
            apply(state, context, input) {
              const idx = state.world.entities.findIndex((e: any) => e.id === input.id);
              if (idx >= 0) {
                state.world.entities.splice(idx, 1);
              }
            }
          }
        }
      });

      const hostTransport = new TestTransport('host', true, network);
      const hostRuntime = new GameRuntime(game, hostTransport, {
        isHost: true,
        playerIds: ['host']
      });

      const clientTransport = new TestTransport('client', false, network);
      const clientRuntime = new GameRuntime(game, clientTransport, {
        isHost: false,
        playerIds: []
      });

      hostTransport.connectPeer(clientTransport);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Spawn entities
      hostRuntime.submitAction('spawnEntity', {
        id: 'bullet-1',
        type: 'bullet',
        x: 100,
        y: 200
      });

      hostRuntime.submitAction('spawnEntity', {
        id: 'enemy-1',
        type: 'enemy',
        x: 300,
        y: 400
      });

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify client state
      let clientState = clientRuntime.getState();
      expect(clientState.world.entities).toHaveLength(2);

      // Remove entity
      hostRuntime.submitAction('removeEntity', { id: 'bullet-1' });

      await new Promise(resolve => setTimeout(resolve, 100));

      clientState = clientRuntime.getState();
      expect(clientState.world.entities).toHaveLength(1);
      expect(clientState.world.entities[0].id).toBe('enemy-1');

      // Cleanup
      hostRuntime.destroy();
      clientRuntime.destroy();
    }, 10000); // Increase timeout to 10s
  });
});
