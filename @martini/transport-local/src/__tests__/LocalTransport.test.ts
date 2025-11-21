/**
 * Tests for LocalTransport - In-memory transport for same-page multiplayer
 *
 * Philosophy: Comprehensive testing of the Transport interface + LocalTransport specifics
 * - Verify all Transport methods are implemented correctly
 * - Test registry management (room join/leave)
 * - Test message routing (unicast/broadcast)
 * - Test peer discovery and synchronization
 * - Test edge cases (disconnection, multiple rooms, etc.)
 * - Achieve 100% code coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalTransport } from '../LocalTransport';
import type { WireMessage } from '@martini-kit/core';

describe('LocalTransport', () => {
  let transports: LocalTransport[] = [];

  // Helper to create a transport and track it for cleanup
  function createTransport(config: { roomId: string; playerId?: string; isHost: boolean }): LocalTransport {
    const transport = new LocalTransport(config);
    transports.push(transport);
    return transport;
  }

  afterEach(() => {
    // Clean up all transports
    transports.forEach(t => t.disconnect());
    transports = [];
  });

  describe('Transport Interface Compliance', () => {
    it('implements all required Transport methods', () => {
      const transport = createTransport({ roomId: 'test-room', isHost: true });

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

      // LocalTransport-specific methods
      expect(typeof transport.onHostDisconnect).toBe('function');
    });

    it('getPlayerId returns a valid string', () => {
      const transport = createTransport({ roomId: 'test-room', isHost: true });
      const playerId = transport.getPlayerId();

      expect(typeof playerId).toBe('string');
      expect(playerId.length).toBeGreaterThan(0);
    });

    it('getPlayerId uses provided playerId if given', () => {
      const transport = createTransport({ roomId: 'test-room', playerId: 'custom-id', isHost: true });

      expect(transport.getPlayerId()).toBe('custom-id');
    });

    it('getPlayerId generates random ID if not provided', () => {
      const transport1 = createTransport({ roomId: 'test-room', isHost: true });
      const transport2 = createTransport({ roomId: 'test-room', isHost: false });

      const id1 = transport1.getPlayerId();
      const id2 = transport2.getPlayerId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^player-/);
      expect(id2).toMatch(/^player-/);
    });

    it('getPeerIds returns an array', () => {
      const transport = createTransport({ roomId: 'test-room', isHost: true });
      const peers = transport.getPeerIds();

      expect(Array.isArray(peers)).toBe(true);
    });

    it('isHost returns the configured value', () => {
      const host = createTransport({ roomId: 'test-room', isHost: true });
      const client = createTransport({ roomId: 'test-room', isHost: false });

      expect(host.isHost()).toBe(true);
      expect(client.isHost()).toBe(false);
    });
  });

  describe('Room Management', () => {
    it('two peers in same room discover each other', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const peers1 = peer1.getPeerIds();
      const peers2 = peer2.getPeerIds();

      expect(peers1).toContain('p2');
      expect(peers2).toContain('p1');
      expect(peers1).toHaveLength(1);
      expect(peers2).toHaveLength(1);
    });

    it('peers in different rooms do not see each other', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-2', playerId: 'p2', isHost: true });

      expect(peer1.getPeerIds()).toHaveLength(0);
      expect(peer2.getPeerIds()).toHaveLength(0);
    });

    it('supports multiple peers in the same room', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });
      const peer4 = createTransport({ roomId: 'room-1', playerId: 'p4', isHost: false });

      expect(peer1.getPeerIds()).toEqual(expect.arrayContaining(['p2', 'p3', 'p4']));
      expect(peer1.getPeerIds()).toHaveLength(3);

      expect(peer2.getPeerIds()).toEqual(expect.arrayContaining(['p1', 'p3', 'p4']));
      expect(peer2.getPeerIds()).toHaveLength(3);
    });
  });

  describe('Peer Join Notifications', () => {
    it('notifies existing peer when new peer joins', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      const joinedPeers: string[] = [];
      peer1.onPeerJoin((peerId) => {
        joinedPeers.push(peerId);
      });

      createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      expect(joinedPeers).toContain('p2');
    });

    it('notifies new peer about existing peers', () => {
      createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      // The new peer should see the existing peer in getPeerIds
      expect(peer2.getPeerIds()).toContain('p1');
    });

    it('notifies all peers when multiple peers join sequentially', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const joinEvents1: string[] = [];

      peer1.onPeerJoin((peerId) => joinEvents1.push(peerId));

      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const joinEvents2: string[] = [];
      peer2.onPeerJoin((peerId) => joinEvents2.push(peerId));

      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });

      // Peer 1 should have received notifications for p2 and p3
      expect(joinEvents1).toEqual(['p2', 'p3']);

      // Peer 2 registered its handler AFTER it joined, so it only sees p3 (not p1)
      expect(joinEvents2).toEqual(['p3']);

      // But peer2 should see both p1 and p3 in getPeerIds
      expect(peer2.getPeerIds()).toContain('p1');
      expect(peer2.getPeerIds()).toContain('p3');
    });

    it('onPeerJoin returns unsubscribe function', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const joinEvents: string[] = [];

      const unsubscribe = peer1.onPeerJoin((peerId) => joinEvents.push(peerId));

      createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      expect(joinEvents).toHaveLength(1);

      // Unsubscribe
      unsubscribe();

      createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });
      // Should not receive this notification
      expect(joinEvents).toHaveLength(1);
    });
  });

  describe('Peer Leave Notifications', () => {
    it('notifies remaining peers when a peer disconnects', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const leftPeers: string[] = [];
      peer1.onPeerLeave((peerId) => {
        leftPeers.push(peerId);
      });

      peer2.disconnect();

      expect(leftPeers).toContain('p2');
    });

    it('updates peer list after disconnect', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });

      expect(peer1.getPeerIds()).toHaveLength(2);

      peer2.disconnect();

      expect(peer1.getPeerIds()).toEqual(['p3']);
      expect(peer1.getPeerIds()).toHaveLength(1);
    });

    it('handles multiple disconnections', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });

      const leaveEvents: string[] = [];
      peer1.onPeerLeave((peerId) => leaveEvents.push(peerId));

      peer2.disconnect();
      peer3.disconnect();

      expect(leaveEvents).toEqual(['p2', 'p3']);
      expect(peer1.getPeerIds()).toHaveLength(0);
    });

    it('onPeerLeave returns unsubscribe function', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const leaveEvents: string[] = [];
      const unsubscribe = peer1.onPeerLeave((peerId) => leaveEvents.push(peerId));

      unsubscribe();

      peer2.disconnect();

      // Should not receive notification
      expect(leaveEvents).toHaveLength(0);
    });

    it('cleans up empty rooms after all peers disconnect', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      peer1.disconnect();
      peer2.disconnect();

      // Create a new peer in the same room
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: true });

      // Should not see any peers from the previous session
      expect(peer3.getPeerIds()).toHaveLength(0);
    });
  });

  describe('Message Broadcasting', () => {
    it('broadcasts messages to all peers in the room', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });

      const messagesReceived2: Array<{ msg: WireMessage; senderId: string }> = [];
      const messagesReceived3: Array<{ msg: WireMessage; senderId: string }> = [];

      peer2.onMessage((msg, senderId) => messagesReceived2.push({ msg, senderId }));
      peer3.onMessage((msg, senderId) => messagesReceived3.push({ msg, senderId }));

      const testMessage: WireMessage = { type: 'action', payload: { test: 'data' } };
      peer1.send(testMessage);

      expect(messagesReceived2).toHaveLength(1);
      expect(messagesReceived2[0].msg).toEqual(testMessage);
      expect(messagesReceived2[0].senderId).toBe('p1');

      expect(messagesReceived3).toHaveLength(1);
      expect(messagesReceived3[0].msg).toEqual(testMessage);
      expect(messagesReceived3[0].senderId).toBe('p1');
    });

    it('does not send message to sender', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const messagesReceived: WireMessage[] = [];
      peer1.onMessage((msg) => messagesReceived.push(msg));

      peer1.send({ type: 'action', payload: {} });

      expect(messagesReceived).toHaveLength(0);
    });

    it('does not broadcast to peers in different rooms', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-2', playerId: 'p2', isHost: true });

      const messagesReceived: WireMessage[] = [];
      peer2.onMessage((msg) => messagesReceived.push(msg));

      peer1.send({ type: 'action', payload: {} });

      expect(messagesReceived).toHaveLength(0);
    });

    it('onMessage returns unsubscribe function', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const messagesReceived: WireMessage[] = [];
      const unsubscribe = peer2.onMessage((msg) => messagesReceived.push(msg));

      peer1.send({ type: 'action', payload: { test: 1 } });
      expect(messagesReceived).toHaveLength(1);

      unsubscribe();

      peer1.send({ type: 'action', payload: { test: 2 } });
      // Should not receive this message
      expect(messagesReceived).toHaveLength(1);
    });

    it('supports multiple message handlers on same transport', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const messages1: WireMessage[] = [];
      const messages2: WireMessage[] = [];

      peer2.onMessage((msg) => messages1.push(msg));
      peer2.onMessage((msg) => messages2.push(msg));

      const testMessage: WireMessage = { type: 'action', payload: {} };
      peer1.send(testMessage);

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1[0]).toEqual(testMessage);
      expect(messages2[0]).toEqual(testMessage);
    });
  });

  describe('Unicast Messaging', () => {
    it('sends message to specific peer only', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });

      const messagesReceived2: WireMessage[] = [];
      const messagesReceived3: WireMessage[] = [];

      peer2.onMessage((msg) => messagesReceived2.push(msg));
      peer3.onMessage((msg) => messagesReceived3.push(msg));

      const testMessage: WireMessage = { type: 'state_sync', payload: { data: 'unicast' } };
      peer1.send(testMessage, 'p2');

      expect(messagesReceived2).toHaveLength(1);
      expect(messagesReceived2[0]).toEqual(testMessage);

      expect(messagesReceived3).toHaveLength(0);
    });

    it('handles unicast to non-existent peer gracefully', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      // Should not throw
      expect(() => {
        peer1.send({ type: 'action', payload: {} }, 'non-existent');
      }).not.toThrow();
    });

    it('delivers unicast with correct senderId', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      let receivedSenderId = '';
      peer2.onMessage((_, senderId) => {
        receivedSenderId = senderId;
      });

      peer1.send({ type: 'action', payload: {} }, 'p2');

      expect(receivedSenderId).toBe('p1');
    });
  });

  describe('Host Disconnect Handling', () => {
    it('notifies clients when host disconnects', () => {
      const host = createTransport({ roomId: 'room-1', playerId: 'host', isHost: true });
      const client = createTransport({ roomId: 'room-1', playerId: 'client', isHost: false });

      let hostDisconnected = false;
      client.onHostDisconnect(() => {
        hostDisconnected = true;
      });

      host.disconnect();

      expect(hostDisconnected).toBe(true);
    });

    it('does not notify about host disconnect when non-host leaves', () => {
      const host = createTransport({ roomId: 'room-1', playerId: 'host', isHost: true });
      const client1 = createTransport({ roomId: 'room-1', playerId: 'client1', isHost: false });
      const client2 = createTransport({ roomId: 'room-1', playerId: 'client2', isHost: false });

      let hostDisconnectCalled = false;
      client2.onHostDisconnect(() => {
        hostDisconnectCalled = true;
      });

      client1.disconnect();

      expect(hostDisconnectCalled).toBe(false);
    });

    it('onHostDisconnect returns unsubscribe function', () => {
      const host = createTransport({ roomId: 'room-1', playerId: 'host', isHost: true });
      const client = createTransport({ roomId: 'room-1', playerId: 'client', isHost: false });

      let callCount = 0;
      const unsubscribe = client.onHostDisconnect(() => {
        callCount++;
      });

      unsubscribe();
      host.disconnect();

      expect(callCount).toBe(0);
    });

    it('supports multiple host disconnect handlers', () => {
      const host = createTransport({ roomId: 'room-1', playerId: 'host', isHost: true });
      const client = createTransport({ roomId: 'room-1', playerId: 'client', isHost: false });

      let callCount1 = 0;
      let callCount2 = 0;

      client.onHostDisconnect(() => callCount1++);
      client.onHostDisconnect(() => callCount2++);

      host.disconnect();

      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('handles rapid connect/disconnect cycles', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      for (let i = 0; i < 10; i++) {
        const peer = createTransport({ roomId: 'room-1', playerId: `temp-${i}`, isHost: false });
        peer.disconnect();
      }

      // Peer 1 should still work fine
      expect(peer1.getPeerIds()).toHaveLength(0);
    });

    it('handles many simultaneous peers', () => {
      const peerCount = 50;
      const peers: LocalTransport[] = [];

      for (let i = 0; i < peerCount; i++) {
        peers.push(createTransport({ roomId: 'big-room', playerId: `p${i}`, isHost: i === 0 }));
      }

      // Each peer should see all others
      expect(peers[0].getPeerIds()).toHaveLength(peerCount - 1);
      expect(peers[25].getPeerIds()).toHaveLength(peerCount - 1);
    });

    it('handles many messages rapidly', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const messagesReceived: WireMessage[] = [];
      peer2.onMessage((msg) => messagesReceived.push(msg));

      // Send many messages
      for (let i = 0; i < 100; i++) {
        peer1.send({ type: 'action', payload: { index: i } });
      }

      expect(messagesReceived).toHaveLength(100);
      expect(messagesReceived[50].payload.index).toBe(50);
    });

    it('handles disconnect from unregistered room gracefully', () => {
      const peer = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      peer.disconnect();

      // Second disconnect should not throw
      expect(() => {
        peer.disconnect();
      }).not.toThrow();
    });

    it('isolates multiple rooms completely', () => {
      const room1Peers = [
        createTransport({ roomId: 'room-1', playerId: 'r1p1', isHost: true }),
        createTransport({ roomId: 'room-1', playerId: 'r1p2', isHost: false })
      ];

      const room2Peers = [
        createTransport({ roomId: 'room-2', playerId: 'r2p1', isHost: true }),
        createTransport({ roomId: 'room-2', playerId: 'r2p2', isHost: false })
      ];

      // Room 1 peers should only see each other
      expect(room1Peers[0].getPeerIds()).toEqual(['r1p2']);
      expect(room1Peers[1].getPeerIds()).toEqual(['r1p1']);

      // Room 2 peers should only see each other
      expect(room2Peers[0].getPeerIds()).toEqual(['r2p2']);
      expect(room2Peers[1].getPeerIds()).toEqual(['r2p1']);

      // Messages should not cross rooms
      const room1Messages: WireMessage[] = [];
      const room2Messages: WireMessage[] = [];

      room1Peers[1].onMessage((msg) => room1Messages.push(msg));
      room2Peers[1].onMessage((msg) => room2Messages.push(msg));

      room1Peers[0].send({ type: 'action', payload: { room: 1 } });
      room2Peers[0].send({ type: 'action', payload: { room: 2 } });

      expect(room1Messages).toHaveLength(1);
      expect(room1Messages[0].payload.room).toBe(1);

      expect(room2Messages).toHaveLength(1);
      expect(room2Messages[0].payload.room).toBe(2);
    });

    it('handles complex message types correctly', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const receivedMessages: WireMessage[] = [];
      peer2.onMessage((msg) => receivedMessages.push(msg));

      const complexMessage: WireMessage = {
        type: 'state_sync',
        payload: {
          nested: {
            deeply: {
              value: 42
            }
          },
          array: [1, 2, 3],
          mixed: { a: [{ b: 'c' }] }
        },
        senderId: 'p1',
        timestamp: Date.now()
      };

      peer1.send(complexMessage);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(complexMessage);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('removes all handlers on disconnect', () => {
      const peer1 = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });
      const peer2 = createTransport({ roomId: 'room-1', playerId: 'p2', isHost: false });

      const messages: WireMessage[] = [];
      const joins: string[] = [];
      const leaves: string[] = [];

      peer2.onMessage((msg) => messages.push(msg));
      peer2.onPeerJoin((peerId) => joins.push(peerId));
      peer2.onPeerLeave((peerId) => leaves.push(peerId));

      peer2.disconnect();

      // Create a new peer - should not trigger handlers on disconnected peer
      const peer3 = createTransport({ roomId: 'room-1', playerId: 'p3', isHost: false });
      peer1.send({ type: 'action', payload: {} });
      peer3.disconnect();

      expect(messages).toHaveLength(0);
      expect(joins.filter(id => id === 'p3')).toHaveLength(0);
      expect(leaves.filter(id => id === 'p3')).toHaveLength(0);
    });

    it('prevents memory leaks with handler cleanup', () => {
      const peer = createTransport({ roomId: 'room-1', playerId: 'p1', isHost: true });

      const unsubscribes = [
        peer.onMessage(() => {}),
        peer.onPeerJoin(() => {}),
        peer.onPeerLeave(() => {}),
        peer.onHostDisconnect(() => {})
      ];

      // Unsubscribe all
      unsubscribes.forEach(unsub => unsub());

      // Verify handlers arrays are empty
      expect(peer['messageHandlers']).toHaveLength(0);
      expect(peer['peerJoinHandlers']).toHaveLength(0);
      expect(peer['peerLeaveHandlers']).toHaveLength(0);
      expect(peer['hostDisconnectHandlers']).toHaveLength(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('simulates a complete 2-player game session', () => {
      // Setup: Host creates room
      const host = createTransport({ roomId: 'game-123', playerId: 'host', isHost: true });

      const hostEvents: string[] = [];
      host.onPeerJoin((peerId) => hostEvents.push(`join:${peerId}`));
      host.onPeerLeave((peerId) => hostEvents.push(`leave:${peerId}`));

      // Client joins
      const client = createTransport({ roomId: 'game-123', playerId: 'client', isHost: false });

      expect(host.getPeerIds()).toEqual(['client']);
      expect(client.getPeerIds()).toEqual(['host']);

      // Exchange messages
      const clientMessages: WireMessage[] = [];
      client.onMessage((msg) => clientMessages.push(msg));

      host.send({ type: 'state_sync', payload: { gameState: 'started' } });

      expect(clientMessages).toHaveLength(1);
      expect(clientMessages[0].payload.gameState).toBe('started');

      // Client disconnects
      client.disconnect();

      expect(host.getPeerIds()).toHaveLength(0);
      expect(hostEvents).toEqual(['join:client', 'leave:client']);
    });

    it('simulates late joiner scenario', () => {
      // Game in progress with 2 players
      const host = createTransport({ roomId: 'game-456', playerId: 'host', isHost: true });
      const player1 = createTransport({ roomId: 'game-456', playerId: 'player1', isHost: false });

      // Late joiner connects
      const lateJoiner = createTransport({ roomId: 'game-456', playerId: 'late', isHost: false });

      // Late joiner should see all existing peers
      const peers = lateJoiner.getPeerIds();
      expect(peers).toContain('host');
      expect(peers).toContain('player1');
      expect(peers).toHaveLength(2);

      // Late joiner should receive state sync from host
      const receivedMessages: WireMessage[] = [];
      lateJoiner.onMessage((msg) => receivedMessages.push(msg));

      host.send({ type: 'state_sync', payload: { fullState: { score: 42 } } }, 'late');

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('state_sync');
    });

    it('simulates host migration scenario', () => {
      const host = createTransport({ roomId: 'game-789', playerId: 'host', isHost: true });
      const client1 = createTransport({ roomId: 'game-789', playerId: 'client1', isHost: false });
      const client2 = createTransport({ roomId: 'game-789', playerId: 'client2', isHost: false });

      // Monitor host disconnect on clients
      let client1HostDisconnected = false;
      let client2HostDisconnected = false;

      client1.onHostDisconnect(() => { client1HostDisconnected = true; });
      client2.onHostDisconnect(() => { client2HostDisconnected = true; });

      // Host disconnects
      host.disconnect();

      expect(client1HostDisconnected).toBe(true);
      expect(client2HostDisconnected).toBe(true);

      // Clients still see each other
      expect(client1.getPeerIds()).toEqual(['client2']);
      expect(client2.getPeerIds()).toEqual(['client1']);
    });
  });
});
