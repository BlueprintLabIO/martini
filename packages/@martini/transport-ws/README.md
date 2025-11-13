# @martini/transport-ws

**Production-ready WebSocket transport for Martini multiplayer games.**

Use this transport when you need:
- Server-authoritative games
- Scalable infrastructure
- Room management
- Backend integration (auth, persistence, matchmaking)

---

## Quick Start

### 1. Install

```bash
pnpm add @martini/transport-ws @martini/core @martini/phaser
```

### 2. Start the Server

Create a relay server using the example from [examples/server.ts](./examples/server.ts):

```bash
pnpm tsx examples/server.ts
```

Or use the provided example:

```typescript
import { WebSocketServer, WebSocket } from 'ws';

class MartiniServer {
  private wss: WebSocketServer;
  private players = new Map<WebSocket, Player>();
  private rooms = new Map<string, Room>();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`[MartiniServer] Listening on port ${port}`);

    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
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
      default:
        // Relay messages to appropriate recipients
        this.forwardMessage(ws, message);
        break;
    }
  }
}

const PORT = parseInt(process.env.PORT || '8080');
new MartiniServer(PORT);
```

### 3. Connect Clients

```typescript
import { defineGame } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import { WebSocketTransport } from '@martini/transport-ws';

const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      input: { x: 'number', y: 'number' },
      apply(state, context, input) {
        state.players[context.targetId].x = input.x;
        state.players[context.targetId].y = input.y;
      }
    }
  }
});

// Create transport
const transport = new WebSocketTransport('ws://localhost:8080', {
  playerId: 'player-123', // Optional - auto-generated if not provided
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10
});

// Wait for connection
await transport.waitForReady();

// Join a room
transport.send({ type: 'join_room', roomId: 'room-abc' });

// Start Phaser adapter
PhaserAdapter.start({
  game,
  transport,
  scenes: [GameScene]
});
```

---

## API Reference

### `WebSocketTransport`

```typescript
class WebSocketTransport implements Transport {
  constructor(url: string, config?: WebSocketTransportConfig);

  // Transport interface
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): () => void;
  onPeerJoin(handler: PeerHandler): () => void;
  onPeerLeave(handler: PeerHandler): () => void;
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;

  // Additional methods
  waitForReady(): Promise<void>;
  onError(handler: ErrorHandler): () => void;
  disconnect(): void;
}
```

### `WebSocketTransportConfig`

```typescript
interface WebSocketTransportConfig {
  /** Player ID (generated if not provided) */
  playerId?: string;

  /** Enable automatic reconnection (default: true) */
  reconnect?: boolean;

  /** Reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;

  /** Max reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number;
}
```

---

## Server Implementation

The WebSocket server acts as a **relay** - it forwards messages between clients without running game logic. The host client runs the actual game logic.

### Message Protocol

**Client → Server:**

```typescript
// Handshake (sent automatically on connection)
{ type: 'handshake', playerId: 'player-123' }

// Join room
{ type: 'join_room', roomId: 'room-abc' }

// Leave room
{ type: 'leave_room' }

// Game messages (relayed to other players)
{
  type: 'action',
  senderId: 'player-123',
  targetId: 'player-456', // Optional - omit for broadcast
  payload: { actionName: 'move', input: { x: 100, y: 200 } }
}
```

**Server → Client:**

```typescript
// Handshake confirmation
{ type: 'handshake_ack', playerId: 'player-123' }

// Current peers in room
{ type: 'peers_list', payload: { peers: ['player-456', 'player-789'] } }

// Host announcement
{ type: 'host_announce', hostId: 'player-123' }

// Player joined
{ type: 'player_join', payload: { playerId: 'player-456' } }

// Player left
{ type: 'player_leave', payload: { playerId: 'player-456' } }

// Relayed game messages
{
  type: 'action',
  senderId: 'player-456',
  payload: { actionName: 'move', input: { x: 100, y: 200 } }
}
```

### Host Election

The server automatically elects the first player in a room as the host:

```typescript
private handleJoinRoom(ws: WebSocket, message: any): void {
  const room = this.rooms.get(roomId);

  // First player becomes host
  if (!room.hostId) {
    room.hostId = player.id;
    console.log(`Player ${player.id} is now host`);
  }

  // Announce host to all players
  this.send(ws, {
    type: 'host_announce',
    hostId: room.hostId
  });
}
```

When the host disconnects, the server elects a new host:

```typescript
private removePlayerFromRoom(player: Player, room: Room): void {
  const wasHost = room.hostId === player.id;

  room.players.delete(player.id);

  // Notify remaining players
  this.broadcast(room, {
    type: 'player_leave',
    payload: { playerId: player.id }
  });

  // Re-elect host if needed
  if (wasHost && room.players.size > 0) {
    const newHostId = Array.from(room.players.keys())[0];
    room.hostId = newHostId;

    this.broadcast(room, {
      type: 'host_announce',
      hostId: newHostId
    });
  }
}
```

---

## Error Handling

The transport provides error callbacks for connection issues:

```typescript
const transport = new WebSocketTransport('ws://localhost:8080');

transport.onError((error) => {
  console.error('WebSocket error:', error);

  // Handle connection failures
  if (error.message.includes('ECONNREFUSED')) {
    alert('Cannot connect to server. Please try again later.');
  }
});
```

### Reconnection

By default, the transport automatically reconnects on disconnect:

```typescript
const transport = new WebSocketTransport('ws://localhost:8080', {
  reconnect: true,
  reconnectDelay: 1000, // Wait 1 second between attempts
  maxReconnectAttempts: 10 // Give up after 10 attempts
});
```

The transport maintains the same `playerId` across reconnections, so the server can restore the player's session.

---

## Production Deployment

### Scaling Considerations

**Horizontal Scaling:**
- Use a load balancer (e.g., Nginx, HAProxy) to distribute connections
- Each server instance manages its own set of rooms
- Consider sticky sessions to keep players on the same instance

**Room Distribution:**
- Store room state in Redis for multi-instance deployments
- Use pub/sub to relay messages between server instances

**Example with Redis:**

```typescript
import { createClient } from 'redis';

class ScalableMartiniServer {
  private redis = createClient();

  async handleJoinRoom(ws: WebSocket, message: any): Promise<void> {
    const { roomId } = message;

    // Subscribe to room channel
    await this.redis.subscribe(`room:${roomId}`, (message) => {
      // Forward messages to local players
      this.broadcast(roomId, JSON.parse(message));
    });

    // Store player in room
    await this.redis.sAdd(`room:${roomId}:players`, player.id);
  }

  private forwardMessage(ws: WebSocket, message: any): void {
    const { roomId } = this.players.get(ws);

    // Publish to Redis for all server instances
    this.redis.publish(`room:${roomId}`, JSON.stringify(message));
  }
}
```

### Security

**Authentication:**
```typescript
this.wss.on('connection', async (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');

  // Verify JWT token
  const user = await verifyToken(token);
  if (!user) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Associate player with authenticated user
  const player: Player = {
    id: user.id,
    ws,
    roomId: null
  };

  this.players.set(ws, player);
});
```

**Rate Limiting:**
```typescript
private rateLimiter = new Map<string, number>();

private handleMessage(ws: WebSocket, message: any): void {
  const player = this.players.get(ws);

  // Simple rate limit (100 messages per second)
  const now = Date.now();
  const count = this.rateLimiter.get(player.id) || 0;

  if (count > 100 && now - (count as any).timestamp < 1000) {
    ws.close(1008, 'Rate limit exceeded');
    return;
  }

  this.rateLimiter.set(player.id, count + 1);

  this.handleMessageInternal(ws, message);
}
```

---

## Comparison: WebSocket vs P2P

| Feature | WebSocket (`@martini/transport-ws`) | P2P (`@martini/transport-p2p`) |
|---------|-------------------------------------|--------------------------------|
| **Architecture** | Client-server (relay) | Peer-to-peer (WebRTC) |
| **Latency** | Higher (2 hops: client → server → client) | Lower (direct connection) |
| **NAT Traversal** | Not needed (server has public IP) | Required (STUN/TURN servers) |
| **Scalability** | Scales horizontally (add servers) | Limited by peer bandwidth |
| **Backend Integration** | Easy (auth, persistence, matchmaking) | Hard (needs coordination server) |
| **Infrastructure** | Requires server | Can work without server |
| **Connection Reliability** | High (server is stable) | Medium (peers may disconnect) |
| **Use Cases** | Production games, competitive games | Prototypes, local multiplayer, casual games |

**Rule of thumb:**
- **Use WebSocket** for production games, games with backend needs, or games requiring >4 players
- **Use P2P** for prototypes, game jams, or simple local multiplayer

---

## Integration with Colyseus

You can use Colyseus for room management and Martini for game logic:

**Server (Colyseus):**
```typescript
import { Room } from 'colyseus';

class GameRoom extends Room {
  onCreate() {
    // Just relay Martini actions
    this.onMessage('action', (client, action) => {
      this.broadcast('action', action, { except: client });
    });
  }
}
```

**Client (Martini):**
```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');
const room = await client.joinOrCreate('game_room');

// Bridge Colyseus to WebSocketTransport
class ColyseusTransport implements Transport {
  constructor(private room: Room) {
    room.onMessage('action', (message) => {
      this.notifyMessage(message, message.senderId);
    });
  }

  send(message: WireMessage, targetId?: string): void {
    this.room.send('action', { ...message, senderId: this.getPlayerId(), targetId });
  }

  // ... implement other Transport methods
}

const transport = new ColyseusTransport(room);
PhaserAdapter.start({ game, transport });
```

See [08-platform-comparison.md](../../docs/martini-sdk-v2/08-platform-comparison.md) for more integration patterns.

---

## Troubleshooting

### "WebSocket connection failed"

**Cause:** Server is not running or wrong URL

**Fix:**
```bash
# Start the example server
cd packages/@martini/transport-ws
pnpm tsx examples/server.ts

# Check server is listening
curl http://localhost:8080 # Should fail (WebSocket only)
```

### "Cannot connect after disconnect"

**Cause:** Reconnection disabled or max attempts reached

**Fix:**
```typescript
const transport = new WebSocketTransport('ws://localhost:8080', {
  reconnect: true,
  maxReconnectAttempts: Infinity // Never give up
});
```

### "Messages not received by other players"

**Cause:** Server not relaying messages, or players in different rooms

**Fix:**
```typescript
// Ensure all players join the same room
transport.send({ type: 'join_room', roomId: 'room-123' });

// Wait for peers_list before sending game messages
transport.onMessage((message) => {
  if (message.type === 'peers_list') {
    console.log('Connected peers:', message.payload.peers);
  }
});
```

---

## Examples

See [examples/](./examples/) for:
- `server.ts` - Basic relay server with room management
- `client.html` - Browser client example
- `integration.test.ts` - End-to-end test with real server

---

## Contributing

Contributions welcome! Please:
1. Add tests for new features
2. Update this README
3. Run `pnpm test` before submitting PR

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines.

---

## License

MIT
