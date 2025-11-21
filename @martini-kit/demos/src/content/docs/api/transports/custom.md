# Custom Transports

Learn how to implement your own transport layer for martini-kit, enabling server-based multiplayer, custom networking protocols, or integration with existing backend infrastructure.

## When to Build a Custom Transport

✅ **Build a custom transport when:**
- You need server-authoritative multiplayer (not P2P)
- You have existing backend infrastructure (WebSocket server, game servers)
- You need to scale beyond 8-10 players
- You require guaranteed low latency (&lt;20ms)
- You want to integrate with matchmaking systems
- You need server-side game state validation
- P2P solutions don't work for your network environment

## The Transport Interface

All transports must implement this interface:

```typescript
export interface Transport {
  // Message handling
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;

  // Peer management
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
  getPeerIds(): string[];

  // Identity
  getPlayerId(): string;
  isHost(): boolean;

  // Optional metrics for debugging
  metrics?: TransportMetrics;
}
```

### Message Types

Your transport will send/receive these message types:

```typescript
export interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  [key: string]: any;  // Allow custom properties
}
```

## Example: WebSocket Transport

Here's a complete implementation using WebSockets:

### Client-Side Transport

```typescript
import type { Transport, WireMessage, TransportMetrics, ConnectionState, MessageStats } from '@martini-kit/core';

export interface WebSocketTransportConfig {
  url: string;           // WebSocket server URL
  roomId: string;        // Room to join
  playerId?: string;     // Optional custom player ID
}

export class WebSocketTransport implements Transport {
  private ws: WebSocket;
  private messageHandlers: Array<(msg: WireMessage, senderId: string) => void> = [];
  private peerJoinHandlers: Array<(peerId: string) => void> = [];
  private peerLeaveHandlers: Array<(peerId: string) => void> = [];
  private hostDisconnectHandlers: Array<() => void> = [];

  public readonly playerId: string;
  private _isHost: boolean = false;
  private peers: Set<string> = new Set();
  private connectionState: ConnectionState = 'connecting';

  constructor(config: WebSocketTransportConfig) {
    this.playerId = config.playerId || `player-${Math.random().toString(36).substr(2, 9)}`;

    // Connect to WebSocket server
    this.ws = new WebSocket(config.url);

    this.ws.onopen = () => {
      // Send join request
      this.ws.send(JSON.stringify({
        type: 'join',
        roomId: config.roomId,
        playerId: this.playerId
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleServerMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocketTransport] Error:', error);
      this.connectionState = 'disconnected';
    };

    this.ws.onclose = () => {
      this.connectionState = 'disconnected';
    };
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'welcome':
        // Server tells us if we're the host
        this._isHost = data.isHost;
        this.peers = new Set(data.peers);
        this.connectionState = 'connected';
        break;

      case 'peer_join':
        this.peers.add(data.peerId);
        this.peerJoinHandlers.forEach(h => h(data.peerId));
        break;

      case 'peer_leave':
        this.peers.delete(data.peerId);
        this.peerLeaveHandlers.forEach(h => h(data.peerId));

        // If host left, notify
        if (data.wasHost) {
          this.hostDisconnectHandlers.forEach(h => h());
        }
        break;

      case 'message':
        // Relay from server
        const { message, senderId } = data;
        this.messageHandlers.forEach(h => h(message, senderId));
        break;
    }
  }

  send(message: WireMessage, targetId?: string): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketTransport] Not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'message',
      targetId,
      message
    }));
  }

  onMessage(handler: (msg: WireMessage, senderId: string) => void): () => void {
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

  onHostDisconnect(handler: () => void): () => void {
    this.hostDisconnectHandlers.push(handler);
    return () => {
      const idx = this.hostDisconnectHandlers.indexOf(handler);
      if (idx >= 0) this.hostDisconnectHandlers.splice(idx, 1);
    };
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    return Array.from(this.peers);
  }

  isHost(): boolean {
    return this._isHost;
  }

  disconnect(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'leave' }));
      this.ws.close();
    }
  }
}
```

### Server-Side (Node.js + ws)

```typescript
import { WebSocketServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  playerId: string;
  roomId: string;
}

const rooms = new Map<string, Set<Client>>();

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  let client: Client | null = null;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'join':
        // Create client
        client = {
          ws,
          playerId: message.playerId,
          roomId: message.roomId
        };

        // Add to room
        if (!rooms.has(message.roomId)) {
          rooms.set(message.roomId, new Set());
        }
        const room = rooms.get(message.roomId)!;
        const isHost = room.size === 0; // First to join is host
        room.add(client);

        // Send welcome
        ws.send(JSON.stringify({
          type: 'welcome',
          isHost,
          peers: Array.from(room).filter(c => c !== client).map(c => c.playerId)
        }));

        // Notify other peers
        broadcast(message.roomId, {
          type: 'peer_join',
          peerId: message.playerId
        }, client);

        break;

      case 'leave':
        if (client) {
          handleDisconnect(client);
        }
        break;

      case 'message':
        // Relay message
        if (message.targetId) {
          // Unicast
          const target = findClient(client!.roomId, message.targetId);
          if (target) {
            target.ws.send(JSON.stringify({
              type: 'message',
              senderId: client!.playerId,
              message: message.message
            }));
          }
        } else {
          // Broadcast
          broadcast(client!.roomId, {
            type: 'message',
            senderId: client!.playerId,
            message: message.message
          }, client);
        }
        break;
    }
  });

  ws.on('close', () => {
    if (client) {
      handleDisconnect(client);
    }
  });
});

function broadcast(roomId: string, message: any, exclude?: Client) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const client of room) {
    if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

function findClient(roomId: string, playerId: string): Client | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return Array.from(room).find(c => c.playerId === playerId);
}

function handleDisconnect(client: Client) {
  const room = rooms.get(client.roomId);
  if (!room) return;

  const wasHost = Array.from(room)[0] === client;
  room.delete(client);

  // Notify remaining peers
  broadcast(client.roomId, {
    type: 'peer_leave',
    peerId: client.playerId,
    wasHost
  });

  // Clean up empty rooms
  if (room.size === 0) {
    rooms.delete(client.roomId);
  }
}

console.log('WebSocket server running on ws://localhost:8080');
```

### Usage

```typescript
import { WebSocketTransport } from './WebSocketTransport';
import { GameRuntime } from '@martini-kit/core';
import { game } from './my-game';

const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  roomId: 'my-game-room'
});

// Wait for connection (simple version)
await new Promise(resolve => setTimeout(resolve, 1000));

const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()]
});
```

## Adding Metrics (Optional)

Implement `TransportMetrics` for debugging:

```typescript
class WebSocketTransportMetrics implements TransportMetrics {
  private messagesSent = 0;
  private messagesReceived = 0;
  private messagesErrored = 0;
  private connectionState: ConnectionState = 'connecting';
  private connectionChangeHandlers: Array<(state: ConnectionState) => void> = [];

  constructor(private transport: WebSocketTransport) {}

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionChangeHandlers.push(callback);
    return () => {
      const idx = this.connectionChangeHandlers.indexOf(callback);
      if (idx >= 0) this.connectionChangeHandlers.splice(idx, 1);
    };
  }

  getPeerCount(): number {
    return this.transport.getPeerIds().length;
  }

  getMessageStats(): MessageStats {
    return {
      sent: this.messagesSent,
      received: this.messagesReceived,
      errors: this.messagesErrored
    };
  }

  trackMessageSent() {
    this.messagesSent++;
  }

  trackMessageReceived() {
    this.messagesReceived++;
  }

  trackMessageError() {
    this.messagesErrored++;
  }

  setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.connectionChangeHandlers.forEach(h => h(state));
    }
  }
}

// Add to WebSocketTransport:
export class WebSocketTransport implements Transport {
  public readonly metrics: TransportMetrics;

  constructor(config: WebSocketTransportConfig) {
    this.metrics = new WebSocketTransportMetrics(this);
    // ... rest of constructor
  }

  send(message: WireMessage, targetId?: string): void {
    // ... existing code
    (this.metrics as WebSocketTransportMetrics).trackMessageSent();
  }

  private handleServerMessage(data: any) {
    if (data.type === 'message') {
      (this.metrics as WebSocketTransportMetrics).trackMessageReceived();
    }
    // ... rest of handler
  }
}
```

## Best Practices

### 1. Connection State Management

Track connection state properly:

```typescript
this.ws.onopen = () => {
  this.connectionState = 'connected';
  this.notifyConnectionChange();
};

this.ws.onerror = () => {
  this.connectionState = 'disconnected';
  this.notifyConnectionChange();
};

this.ws.onclose = () => {
  this.connectionState = 'disconnected';
  this.notifyConnectionChange();
};
```

### 2. Reconnection Logic

Add automatic reconnection:

```typescript
private reconnect() {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++;
    setTimeout(() => {
      this.ws = new WebSocket(this.url);
      this.setupWebSocket();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }
}
```

### 3. Message Buffering

Buffer messages when disconnected:

```typescript
private messageQueue: any[] = [];

send(message: WireMessage, targetId?: string): void {
  if (this.ws.readyState !== WebSocket.OPEN) {
    this.messageQueue.push({ message, targetId });
    return;
  }

  this.ws.send(JSON.stringify({ type: 'message', targetId, message }));
}

private flushMessageQueue() {
  while (this.messageQueue.length > 0) {
    const { message, targetId } = this.messageQueue.shift()!;
    this.send(message, targetId);
  }
}
```

### 4. Error Handling

Provide detailed error messages:

```typescript
this.ws.onerror = (error) => {
  console.error('[WebSocketTransport] Error:', error);
  this.errorHandlers.forEach(h => h(new Error('WebSocket error')));
};

this.ws.onclose = (event) => {
  if (!event.wasClean) {
    console.error('[WebSocketTransport] Connection closed unexpectedly:', event.code, event.reason);
  }
};
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from './WebSocketTransport';

describe('WebSocketTransport', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    server = new WebSocketServer({ port: 8081 });
  });

  afterEach(() => {
    server.close();
  });

  it('should connect to server', async () => {
    const transport = new WebSocketTransport({
      url: 'ws://localhost:8081',
      roomId: 'test'
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(transport.getPlayerId()).toBeDefined();

    transport.disconnect();
  });

  it('should handle peer join/leave', async () => {
    const transport1 = new WebSocketTransport({
      url: 'ws://localhost:8081',
      roomId: 'test'
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    let joinedPeer: string | null = null;
    transport1.onPeerJoin(peerId => {
      joinedPeer = peerId;
    });

    const transport2 = new WebSocketTransport({
      url: 'ws://localhost:8081',
      roomId: 'test'
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(joinedPeer).toBe(transport2.getPlayerId());

    transport1.disconnect();
    transport2.disconnect();
  });
});
```

## Production Considerations

### Scalability

- Use a load balancer to distribute connections across multiple servers
- Implement server-side room sharding for large player counts
- Consider using Redis for cross-server state synchronization

### Security

- Validate all incoming messages
- Implement authentication/authorization
- Rate-limit message sending
- Sanitize player IDs

### Monitoring

- Track connection counts, message rates, error rates
- Log connection/disconnection events
- Monitor bandwidth usage

## See Also

- [Transports Overview](./overview)
- [Transport Interface](../core/transport)
- [LocalTransport](./local) - Reference implementation
- [TrysteroTransport](./trystero) - P2P implementation
