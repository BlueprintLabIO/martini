/**
 * Tests for TrysteroTransport
 *
 * Philosophy: Test Transport interface compliance + P2P specific behavior
 * - Verify all Transport methods are implemented correctly
 * - Test host election and migration
 * - Test message routing (unicast/broadcast)
 * - Test peer join/leave handling
 * - Test connection state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrysteroTransport } from '../TrysteroTransport';
import type { WireMessage } from '@martini-kit/core';

// Mock Trystero
vi.mock('trystero/mqtt', () => {
  const mockPeers = new Set<string>();
  const mockHandlers = {
    peerJoin: [] as Array<(peerId: string) => void>,
    peerLeave: [] as Array<(peerId: string) => void>,
    message: [] as Array<(msg: any, peerId: string) => void>
  };

  let mockSelfId = 'peer-1';

  return {
    selfId: mockSelfId,
    joinRoom: vi.fn((config, roomId) => {
      const room = {
        makeAction: vi.fn((channel: string) => {
          const send = vi.fn((msg: any, targetId?: string) => {
            // Simulate receiving own messages (for testing)
            if (!targetId) {
              // Broadcast - notify all handlers
              mockHandlers.message.forEach(h => h(msg, mockSelfId));
            }
          });

          const receive = vi.fn((handler: (msg: any, peerId: string) => void) => {
            mockHandlers.message.push(handler);
            return () => {
              const idx = mockHandlers.message.indexOf(handler);
              if (idx >= 0) mockHandlers.message.splice(idx, 1);
            };
          });

          return [send, receive];
        }),

        onPeerJoin: vi.fn((handler: (peerId: string) => void) => {
          mockHandlers.peerJoin.push(handler);
        }),

        onPeerLeave: vi.fn((handler: (peerId: string) => void) => {
          mockHandlers.peerLeave.push(handler);
        }),

        getPeers: vi.fn(() => Array.from(mockPeers)),

        leave: vi.fn(() => {
          mockPeers.clear();
          mockHandlers.peerJoin = [];
          mockHandlers.peerLeave = [];
          mockHandlers.message = [];
        }),

        // Test helpers
        __simulatePeerJoin: (peerId: string) => {
          mockPeers.add(peerId);
          mockHandlers.peerJoin.forEach(h => h(peerId));
        },

        __simulatePeerLeave: (peerId: string) => {
          mockPeers.delete(peerId);
          mockHandlers.peerLeave.forEach(h => h(peerId));
        },

        __simulateMessage: (msg: any, fromPeer: string) => {
          mockHandlers.message.forEach(h => h(msg, fromPeer));
        }
      };

      return room;
    })
  };
});

describe('TrysteroTransport', () => {
  let transport: TrysteroTransport;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    transport?.disconnect();
  });

  describe('Transport Interface Compliance', () => {
    it('implements all required Transport methods', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      // Identity methods
      expect(typeof transport.getPlayerId).toBe('function');
      expect(typeof transport.getPeerIds).toBe('function');
      expect(typeof transport.isHost).toBe('function');

      // Messaging methods
      expect(typeof transport.send).toBe('function');
      expect(typeof transport.onMessage).toBe('function');

      // Lifecycle methods
      expect(typeof transport.onPeerJoin).toBe('function');
      expect(typeof transport.onPeerLeave).toBe('function');
      expect(typeof transport.disconnect).toBe('function');

      // Connection state methods
      expect(typeof transport.getConnectionState).toBe('function');
      expect(typeof transport.onConnectionChange).toBe('function');
      expect(typeof transport.onError).toBe('function');
    });

    it('getPlayerId returns a valid string', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });
      const playerId = transport.getPlayerId();

      expect(typeof playerId).toBe('string');
      expect(playerId.length).toBeGreaterThan(0);
    });

    it('getPeerIds returns an array', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });
      const peers = transport.getPeerIds();

      expect(Array.isArray(peers)).toBe(true);
    });

    it('isHost returns a boolean', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });
      const isHost = transport.isHost();

      expect(typeof isHost).toBe('boolean');
    });

    it('getConnectionState returns valid state', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });
      const state = transport.getConnectionState();

      expect(['connecting', 'connected', 'reconnecting', 'disconnected']).toContain(state);
    });
  });

  describe('Host Election', () => {
    it('first peer becomes host when explicit isHost=true', () => {
      transport = new TrysteroTransport({ roomId: 'test-room', isHost: true });

      // Explicit host mode - immediate host
      expect(transport.isHost()).toBe(true);
      expect(transport.getCurrentHost()).toBe(transport.getPlayerId());
    });

    it('tracks current host from heartbeat messages', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const room = transport.getRoom() as any;

      // Simulate receiving heartbeat from another peer who claims to be host
      const heartbeat: WireMessage = {
        type: 'heartbeat',
        tick: 1,
        revision: 1,
        sessionId: 'peer-2',
        queueChecksum: '',
        queueTail: [],
        snapshotTick: 0
      };

      room.__simulateMessage(heartbeat, 'peer-2');

      // Current host should be updated
      expect(transport.getCurrentHost()).toBe('peer-2');
      expect(transport.isHost()).toBe(false);
    });

    it('handles host migration message', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const room = transport.getRoom() as any;

      const migration: WireMessage = {
        type: 'host_migration',
        newHost: 'peer-3',
        snapshot: { kind: 'snapshot', tick: 10, revision: 5, state: {} },
        actionQueue: []
      };

      room.__simulateMessage(migration, 'peer-2');

      expect(transport.getCurrentHost()).toBe('peer-3');
    });

    it('notifies when host disconnects (sticky host pattern)', () => {
      // In sticky host pattern, host NEVER migrates - game ends instead
      transport = new TrysteroTransport({ roomId: 'test-room', isHost: true });
      const room = transport.getRoom() as any;

      let hostDisconnectCalled = false;
      transport.onHostDisconnect(() => {
        hostDisconnectCalled = true;
      });

      // Simulate another peer joining (this peer is host)
      room.__simulatePeerJoin('peer-2');
      expect(transport.isHost()).toBe(true);

      // If WE (the host) disconnect, notification fires
      // Note: In real usage, the host leaving ends the game
      // This test verifies the notification mechanism works
      const hostId = transport.getPlayerId();

      // Simulate ourselves leaving (host disconnect)
      room.__simulatePeerLeave(hostId);

      expect(hostDisconnectCalled).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('broadcasts messages to all peers', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const message: WireMessage = {
        type: 'action',
        actionName: 'move',
        payload: { x: 10 },
        tick: 1,
        playerId: 'p1',
        actionIndex: 0,
        timestamp: Date.now()
      };

      // Should not throw
      expect(() => transport.send(message)).not.toThrow();
    });

    it('sends unicast messages to specific peer', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const message: WireMessage = {
        type: 'action',
        actionName: 'move',
        payload: { x: 10 },
        tick: 1,
        playerId: 'p1',
        actionIndex: 0,
        timestamp: Date.now()
      };

      // Should not throw
      expect(() => transport.send(message, 'peer-2')).not.toThrow();
    });

    it('onMessage handler receives messages', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const receivedMessages: Array<{ msg: WireMessage; sender: string }> = [];

      transport.onMessage((msg, senderId) => {
        receivedMessages.push({ msg, sender: senderId });
      });

      const room = transport.getRoom() as any;

      const message: WireMessage = {
        type: 'action',
        actionName: 'jump',
        payload: {},
        tick: 2,
        playerId: 'p2',
        actionIndex: 1,
        timestamp: Date.now()
      };

      room.__simulateMessage(message, 'peer-2');

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].msg.actionName).toBe('jump');
      expect(receivedMessages[0].sender).toBe('peer-2');
    });

    it('onMessage returns cleanup function', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let callCount = 0;
      const unsubscribe = transport.onMessage(() => {
        callCount++;
      });

      const room = transport.getRoom() as any;
      const message: WireMessage = {
        type: 'action',
        actionName: 'test',
        payload: {},
        tick: 1,
        playerId: 'p1',
        actionIndex: 0,
        timestamp: Date.now()
      };

      room.__simulateMessage(message, 'peer-2');
      expect(callCount).toBe(1);

      // Unsubscribe
      unsubscribe();

      // Should not receive more messages
      room.__simulateMessage(message, 'peer-2');
      expect(callCount).toBe(1);
    });

    it('handles multiple message handlers', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let count1 = 0;
      let count2 = 0;
      let count3 = 0;

      transport.onMessage(() => count1++);
      transport.onMessage(() => count2++);
      transport.onMessage(() => count3++);

      const room = transport.getRoom() as any;
      const message: WireMessage = {
        type: 'action',
        actionName: 'test',
        payload: {},
        tick: 1,
        playerId: 'p1',
        actionIndex: 0,
        timestamp: Date.now()
      };

      room.__simulateMessage(message, 'peer-2');

      expect(count1).toBe(1);
      expect(count2).toBe(1);
      expect(count3).toBe(1);
    });

    it('deliver injects messages for server-style adapters', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const received: Array<{ msg: WireMessage; sender: string }> = [];
      transport.onMessage((msg, sender) => received.push({ msg, sender }));

      const message: WireMessage = {
        type: 'event',
        payload: { eventName: 'test', payload: { data: 'test' } },
        senderId: 'peer-x'
      };

      transport.deliver?.(message, 'peer-x');

      expect(received).toHaveLength(1);
      expect(received[0].msg.type).toBe('event');
      expect(received[0].sender).toBe('peer-x');
    });
  });

  describe('Peer Join/Leave', () => {
    it('onPeerJoin fires when peer connects', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const joinedPeers: string[] = [];
      transport.onPeerJoin((peerId) => {
        joinedPeers.push(peerId);
      });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');
      room.__simulatePeerJoin('peer-3');

      expect(joinedPeers).toEqual(['peer-2', 'peer-3']);
      expect(transport.getPeerIds()).toContain('peer-2');
      expect(transport.getPeerIds()).toContain('peer-3');
    });

    it('onPeerLeave fires when peer disconnects', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');
      room.__simulatePeerJoin('peer-3');

      const leftPeers: string[] = [];
      transport.onPeerLeave((peerId) => {
        leftPeers.push(peerId);
      });

      room.__simulatePeerLeave('peer-2');

      expect(leftPeers).toEqual(['peer-2']);
      expect(transport.getPeerIds()).not.toContain('peer-2');
      expect(transport.getPeerIds()).toContain('peer-3');
    });

    it('onPeerJoin returns cleanup function', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let callCount = 0;
      const unsubscribe = transport.onPeerJoin(() => {
        callCount++;
      });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');
      expect(callCount).toBe(1);

      unsubscribe();

      room.__simulatePeerJoin('peer-3');
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('Connection State Management', () => {
    it('starts in connected state when explicit host', () => {
      transport = new TrysteroTransport({ roomId: 'test-room', isHost: true });

      // Explicit host mode - immediately connected
      expect(transport.getConnectionState()).toBe('connected');
    });

    it('transitions to connected when peer joins', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const states: string[] = [];
      transport.onConnectionChange((state) => {
        states.push(state);
      });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');

      // Should already be connected, or transition to connected
      expect(transport.getConnectionState()).toBe('connected');
    });

    it('transitions to disconnected when all peers leave', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');

      const states: string[] = [];
      transport.onConnectionChange((state) => {
        states.push(state);
      });

      room.__simulatePeerLeave('peer-2');

      expect(transport.getConnectionState()).toBe('disconnected');
      expect(states).toContain('disconnected');
    });

    it('onConnectionChange returns cleanup function', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let callCount = 0;
      const unsubscribe = transport.onConnectionChange(() => {
        callCount++;
      });

      const room = transport.getRoom() as any;
      room.__simulatePeerJoin('peer-2');

      const initialCount = callCount;
      unsubscribe();

      room.__simulatePeerLeave('peer-2');
      expect(callCount).toBe(initialCount); // Should not increase
    });
  });

  describe('Error Handling', () => {
    it('onError handler receives errors', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const errors: Error[] = [];
      transport.onError((error) => {
        errors.push(error);
      });

      // Simulate error in message handler
      transport.onMessage(() => {
        throw new Error('Handler error');
      });

      const room = transport.getRoom() as any;
      room.__simulateMessage({ type: 'action', actionName: 'test', payload: {}, tick: 1, playerId: 'p1', actionIndex: 0, timestamp: 0 }, 'peer-2');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe('Handler error');
    });

    it('onError returns cleanup function', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let callCount = 0;
      const unsubscribe = transport.onError(() => {
        callCount++;
      });

      // Trigger an error
      transport.onMessage(() => {
        throw new Error('Test error');
      });

      const room = transport.getRoom() as any;
      room.__simulateMessage({ type: 'action', actionName: 'test', payload: {}, tick: 1, playerId: 'p1', actionIndex: 0, timestamp: 0 }, 'peer-2');

      const initialCount = callCount;
      unsubscribe();

      // Trigger another error
      room.__simulateMessage({ type: 'action', actionName: 'test', payload: {}, tick: 1, playerId: 'p1', actionIndex: 0, timestamp: 0 }, 'peer-2');
      expect(callCount).toBe(initialCount); // Should not increase
    });
  });

  describe('Disconnect', () => {
    it('cleans up all handlers on disconnect', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      let messageCount = 0;
      let joinCount = 0;
      let leaveCount = 0;

      transport.onMessage(() => messageCount++);
      transport.onPeerJoin(() => joinCount++);
      transport.onPeerLeave(() => leaveCount++);

      transport.disconnect();

      const room = transport.getRoom() as any;
      room.__simulateMessage({ type: 'action', actionName: 'test', payload: {}, tick: 1, playerId: 'p1', actionIndex: 0, timestamp: 0 }, 'peer-2');
      room.__simulatePeerJoin('peer-2');
      room.__simulatePeerLeave('peer-2');

      // No handlers should fire after disconnect
      expect(messageCount).toBe(0);
      expect(joinCount).toBe(0);
      expect(leaveCount).toBe(0);
    });

    it('sets state to disconnected', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      transport.disconnect();

      expect(transport.getConnectionState()).toBe('disconnected');
    });
  });

  describe('waitForReady', () => {
    it('has waitForReady method available', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      expect(typeof transport.waitForReady).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('calls error handlers when message handler throws', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const errors: Error[] = [];
      transport.onError((err) => errors.push(err));

      // Register a message handler that throws
      transport.onMessage(() => {
        throw new Error('Test error');
      });

      const room = transport.getRoom() as any;

      // This should trigger the error handler
      room.__simulateMessage({
        type: 'action',
        payload: {}
      }, 'peer-2');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
    });

    it('onError returns unsubscribe function', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const errors: Error[] = [];
      const unsubscribe = transport.onError((err) => errors.push(err));

      // Register a message handler that throws
      transport.onMessage(() => {
        throw new Error('Test error');
      });

      unsubscribe();

      const room = transport.getRoom() as any;

      // This should NOT trigger the error handler (we unsubscribed)
      room.__simulateMessage({
        type: 'action',
        payload: {}
      }, 'peer-2');

      expect(errors).toHaveLength(0);
    });

    it('supports multiple error handlers', () => {
      transport = new TrysteroTransport({ roomId: 'test-room' });

      const errors1: Error[] = [];
      const errors2: Error[] = [];

      transport.onError((err) => errors1.push(err));
      transport.onError((err) => errors2.push(err));

      // Register a message handler that throws
      transport.onMessage(() => {
        throw new Error('Test error');
      });

      const room = transport.getRoom() as any;

      room.__simulateMessage({
        type: 'action',
        payload: {}
      }, 'peer-2');

      expect(errors1).toHaveLength(1);
      expect(errors2).toHaveLength(1);
    });
  });
});
