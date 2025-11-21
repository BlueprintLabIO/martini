/**
 * Example WebSocket Server for martini-kit
 *
 * This is a simple relay server that manages rooms, players, and host election.
 * It forwards messages between clients without running game logic.
 *
 * Features:
 * - Room management
 * - Host election (first player in room)
 * - Player join/leave notifications
 * - Message relay (broadcast and unicast)
 *
 * Usage:
 * ```bash
 * pnpm tsx examples/server.ts
 * ```
 */

import { WebSocketServer, WebSocket } from 'ws';

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

class martini-kitServer {
  private wss: WebSocketServer;
  private players = new Map<WebSocket, Player>();
  private rooms = new Map<string, Room>();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    console.log(`[martini-kitServer] Listening on port ${port}`);

    this.wss.on('connection', (ws) => {
      console.log('[martini-kitServer] New connection');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('[martini-kitServer] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        const player = this.players.get(ws);
        if (player) {
          console.log(`[martini-kitServer] Player ${player.id} disconnected`);
          this.handlePlayerDisconnect(player);
        }
      });

      ws.on('error', (error) => {
        console.error('[martini-kitServer] WebSocket error:', error);
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

    console.log(`[martini-kitServer] Player ${playerId} connected`);

    // Send handshake confirmation
    this.send(ws, {
      type: 'handshake_ack',
      playerId
    });
  }

  private handleJoinRoom(ws: WebSocket, message: any): void {
    const player = this.players.get(ws);
    if (!player) return;

    const { roomId } = message;

    // Create room if it doesn't exist
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

    console.log(`[martini-kitServer] Player ${player.id} joined room ${roomId}`);

    // Elect host if this is the first player
    if (!room.hostId) {
      room.hostId = player.id;
      console.log(`[martini-kitServer] Player ${player.id} is now host of room ${roomId}`);
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

    console.log(`[martini-kitServer] Player ${player.id} left room ${room.id}`);

    // Notify remaining players
    this.broadcast(room, {
      type: 'player_leave',
      payload: { playerId: player.id }
    });

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(room.id);
      console.log(`[martini-kitServer] Room ${room.id} deleted (empty)`);
      return;
    }

    // If host left, elect new host
    if (wasHost) {
      const newHostId = Array.from(room.players.keys())[0];
      room.hostId = newHostId;

      console.log(`[martini-kitServer] Player ${newHostId} is now host of room ${room.id}`);

      // Announce new host to all players
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
}

// Start server
const PORT = parseInt(process.env.PORT || '8080');
new martini-kitServer(PORT);
