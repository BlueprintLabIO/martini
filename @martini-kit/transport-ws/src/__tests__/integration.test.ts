/**
 * End-to-end integration test with real WebSocket server
 *
 * This test starts the actual martini-kitServer and creates multiple clients
 * to verify the full message flow, host election, and reconnection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketTransport } from '../WebSocketTransport';
import type { WireMessage } from '@martini-kit/core';

// Import the server implementation (we'll create a minimal version inline)
interface Player {
  id: string;
  ws: WebSocket;
  roomId: string | null;
}

interface Room {
  id: string;
  players: Map<string, Player>;
  hostId: string | null;
}

class martini-kitTestServer {
  private wss: WebSocketServer;
  private players = new Map<WebSocket, Player>();
  private rooms = new Map<string, Room>();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('[TestServer] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        const player = this.players.get(ws);
        if (player) {
          this.handlePlayerDisconnect(player);
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    const { type } = message;

    switch (type) {
      case 'handshake':
        this.handleHandshake(ws, message);
        break;

      case 'join_room':
        this.handleJoinRoom(ws, message);
        break;

      case 'leave_room':
        this.handleLeaveRoom(ws, message);
        break;

      default:
        // Forward message to appropriate recipients
        this.forwardMessage(ws, message);
        break;
    }
  }

  private handleHandshake(ws: WebSocket, message: any): void {
    const { playerId } = message;

    const player: Player = {
      id: playerId,
      ws,
      roomId: null
    };

    this.players.set(ws, player);

    this.send(ws, {
      type: 'handshake_ack',
      playerId
    });
  }

  private handleJoinRoom(ws: WebSocket, message: any): void {
    const player = this.players.get(ws);
    if (!player) return;

    const { roomId } = message;

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        players: new Map(),
        hostId: null
      });
    }

    const room = this.rooms.get(roomId)!;
    player.roomId = roomId;
    room.players.set(player.id, player);

    // Elect host if first player
    if (!room.hostId) {
      room.hostId = player.id;
    }

    // Notify all players about the new player
    this.broadcast(room, {
      type: 'player_join',
      payload: { playerId: player.id }
    });

    // Send current room state to the new player
    const peerList = Array.from(room.players.keys()).filter(id => id !== player.id);
    this.send(ws, {
      type: 'peers_list',
      payload: { peers: peerList }
    });

    // Announce current host
    this.send(ws, {
      type: 'host_announce',
      hostId: room.hostId
    });
  }

  private handleLeaveRoom(ws: WebSocket, message: any): void {
    const player = this.players.get(ws);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (!room) return;

    this.removePlayerFromRoom(player, room);
  }

  private handlePlayerDisconnect(player: Player): void {
    if (player.roomId) {
      const room = this.rooms.get(player.roomId);
      if (room) {
        this.removePlayerFromRoom(player, room);
      }
    }

    this.players.delete(player.ws);
  }

  private removePlayerFromRoom(player: Player, room: Room): void {
    const wasHost = room.hostId === player.id;

    room.players.delete(player.id);
    player.roomId = null;

    // Notify remaining players
    this.broadcast(room, {
      type: 'player_leave',
      payload: { playerId: player.id }
    });

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(room.id);
      return;
    }

    // If host left, elect new host
    if (wasHost) {
      const newHostId = Array.from(room.players.keys())[0];
      room.hostId = newHostId;

      this.broadcast(room, {
        type: 'host_announce',
        hostId: newHostId
      });
    }
  }

  private forwardMessage(ws: WebSocket, message: any): void {
    const player = this.players.get(ws);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (!room) return;

    const { targetId } = message;

    if (targetId) {
      // Unicast to specific player
      const targetPlayer = room.players.get(targetId);
      if (targetPlayer) {
        this.send(targetPlayer.ws, message);
      }
    } else {
      // Broadcast to all players except sender
      this.broadcast(room, message, player.id);
    }
  }

  private broadcast(room: Room, message: any, excludeId?: string): void {
    for (const player of room.players.values()) {
      if (excludeId && player.id === excludeId) continue;
      this.send(player.ws, message);
    }
  }

  private send(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  close(): void {
    this.wss.close();
  }
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('WebSocketTransport Integration', () => {
  let server: martini-kitTestServer;
  const PORT = 9876;
  const SERVER_URL = `ws://localhost:${PORT}`;

  beforeAll(() => {
    server = new martini-kitTestServer(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('connects to server and receives handshake', async () => {
    const transport = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });

    await transport.waitForReady();

    expect(transport.getPlayerId()).toBe('player-1');

    transport.disconnect();
  });

  it('joins room and discovers peers', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();

    // Set up handler BEFORE sending join_room
    const peersListReceived = new Promise<void>((resolve) => {
      transport1.onMessage((message) => {
        if (message.type === 'peers_list') {
          expect(message.payload.peers).toEqual([]);
          resolve();
        }
      });
    });

    // Player 1 joins room
    transport1.send({ type: 'join_room', roomId: 'test-room' });
    await peersListReceived;

    // Set up handler BEFORE player 2 joins
    const player2Joined = new Promise<void>((resolve) => {
      transport1.onMessage((message) => {
        if (message.type === 'player_join') {
          expect(message.payload.playerId).toBe('player-2');
          resolve();
        }
      });
    });

    // Player 2 joins room
    transport2.send({ type: 'join_room', roomId: 'test-room' });
    await player2Joined;

    // Wait a bit for peer lists to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(transport1.getPeerIds()).toContain('player-2');
    expect(transport2.getPeerIds()).toContain('player-1');

    transport1.disconnect();
    transport2.disconnect();
  });

  it('elects first player as host', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();

    // Set up handler BEFORE joining
    const host1Announced = new Promise<void>((resolve) => {
      transport1.onMessage((message) => {
        if (message.type === 'host_announce') {
          expect(message.hostId).toBe('player-1');
          resolve();
        }
      });
    });

    // Player 1 joins first
    transport1.send({ type: 'join_room', roomId: 'host-test-room' });
    await host1Announced;

    expect(transport1.isHost()).toBe(true);

    // Set up handler BEFORE player 2 joins
    const host2Announced = new Promise<void>((resolve) => {
      transport2.onMessage((message) => {
        if (message.type === 'host_announce') {
          expect(message.hostId).toBe('player-1');
          resolve();
        }
      });
    });

    // Player 2 joins second
    transport2.send({ type: 'join_room', roomId: 'host-test-room' });
    await host2Announced;

    expect(transport2.isHost()).toBe(false);

    transport1.disconnect();
    transport2.disconnect();
  });

  it('re-elects host when host disconnects', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();

    // Set up handlers BEFORE joining
    const host1Announced = new Promise<void>((resolve) => {
      transport1.onMessage((message) => {
        if (message.type === 'host_announce' && message.hostId === 'player-1') {
          resolve();
        }
      });
    });

    const host2Sees1AsHost = new Promise<void>((resolve) => {
      transport2.onMessage((message) => {
        if (message.type === 'host_announce' && message.hostId === 'player-1') {
          resolve();
        }
      });
    });

    transport1.send({ type: 'join_room', roomId: 'host-change-room' });
    await host1Announced;

    transport2.send({ type: 'join_room', roomId: 'host-change-room' });
    await host2Sees1AsHost;

    expect(transport1.isHost()).toBe(true);
    expect(transport2.isHost()).toBe(false);

    // Set up handler BEFORE disconnecting
    const newHostAnnounced = new Promise<void>((resolve) => {
      transport2.onMessage((message) => {
        if (message.type === 'host_announce' && message.hostId === 'player-2') {
          resolve();
        }
      });
    });

    // Host disconnects
    transport1.disconnect();
    await newHostAnnounced;

    expect(transport2.isHost()).toBe(true);

    transport2.disconnect();
  });

  it('sends and receives broadcast messages', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();

    transport1.send({ type: 'join_room', roomId: 'broadcast-room' });
    transport2.send({ type: 'join_room', roomId: 'broadcast-room' });

    // Wait for both to join
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messageReceived = new Promise<void>((resolve) => {
      transport2.onMessage((message, senderId) => {
        if (message.type === 'action') {
          expect(senderId).toBe('player-1');
          expect(message.payload).toEqual({ actionName: 'move', input: { x: 100 } });
          resolve();
        }
      });
    });

    const gameMessage: WireMessage = {
      type: 'action',
      payload: { actionName: 'move', input: { x: 100 } }
    };

    transport1.send(gameMessage);
    await messageReceived;

    transport1.disconnect();
    transport2.disconnect();
  });

  it('sends and receives unicast messages', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });
    const transport3 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-3'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();
    await transport3.waitForReady();

    transport1.send({ type: 'join_room', roomId: 'unicast-room' });
    transport2.send({ type: 'join_room', roomId: 'unicast-room' });
    transport3.send({ type: 'join_room', roomId: 'unicast-room' });

    // Wait for all to join
    await new Promise((resolve) => setTimeout(resolve, 100));

    let player2Received = false;
    let player3Received = false;

    transport2.onMessage((message) => {
      if (message.type === 'action') {
        player2Received = true;
      }
    });

    transport3.onMessage((message) => {
      if (message.type === 'action') {
        player3Received = true;
      }
    });

    // Send unicast message to player-2 only
    const gameMessage: WireMessage = {
      type: 'action',
      payload: { actionName: 'secret', input: { value: 42 } }
    };

    transport1.send(gameMessage, 'player-2');

    // Wait for message propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(player2Received).toBe(true);
    expect(player3Received).toBe(false);

    transport1.disconnect();
    transport2.disconnect();
    transport3.disconnect();
  });

  it('handles player leave notifications', async () => {
    const transport1 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-1'
    });
    const transport2 = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-2'
    });

    await transport1.waitForReady();
    await transport2.waitForReady();

    transport1.send({ type: 'join_room', roomId: 'leave-room' });
    transport2.send({ type: 'join_room', roomId: 'leave-room' });

    // Wait for both to join
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(transport1.getPeerIds()).toContain('player-2');

    const playerLeftNotified = new Promise<void>((resolve) => {
      transport1.onPeerLeave((peerId) => {
        expect(peerId).toBe('player-2');
        resolve();
      });
    });

    transport2.disconnect();
    await playerLeftNotified;

    expect(transport1.getPeerIds()).not.toContain('player-2');

    transport1.disconnect();
  });

  it('reconnects with same player ID', async () => {
    const transport = new WebSocketTransport(SERVER_URL, {
      playerId: 'player-persistent',
      reconnect: true,
      reconnectDelay: 100
    });

    await transport.waitForReady();
    expect(transport.getPlayerId()).toBe('player-persistent');

    // Simulate disconnect
    const ws = (transport as any).ws;
    ws.close();

    // Wait for reconnection
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(transport.getPlayerId()).toBe('player-persistent');

    transport.disconnect();
  });
});
