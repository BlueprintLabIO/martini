# Transports Overview

Transports are the networking layer that enables multiplayer functionality in Martini. They handle peer-to-peer or client-server communication, allowing the host to broadcast state updates and clients to send actions.

## What is a Transport?

A **transport** is any implementation of the `Transport` interface that can:
- Send messages to specific peers or broadcast to all
- Receive messages from other peers
- Notify when peers join or leave
- Track connection state and metrics

Martini is **transport-agnostic** - the core multiplayer engine works with any transport implementation, whether it's in-memory, P2P WebRTC, WebSocket, or a custom solution.

## Available Transports

| Transport | Latency | Use Case | Setup | Production Ready |
|-----------|---------|----------|-------|------------------|
| **[LocalTransport](./local)** | 0ms | Same-page testing, unit tests | Easy | ❌ Dev only |
| **[IframeBridgeTransport](./iframe-bridge)** | ~1ms | IDE sandboxes, iframe isolation | Medium | ❌ Dev only |
| **[TrysteroTransport](./trystero)** | 20-100ms | P2P games, no server needed | Medium | ✅ Yes |
| **[Custom (WebSocket)](./custom)** | 10-50ms | Server-based games, scalability | Hard | ✅ Yes |

## Choosing a Transport

### For Development & Testing

**Use [LocalTransport](./local)** when:
- Building demo pages with side-by-side instances
- Writing unit or integration tests
- Rapid local development without network overhead
- Testing game logic in isolation

**Use [IframeBridgeTransport](./iframe-bridge)** when:
- Building sandboxed IDEs (like Martini IDE)
- Testing across multiple iframe contexts
- Isolating peer instances for security

### For Production Games

**Use [TrysteroTransport](./trystero)** (P2P) when:
- Building small multiplayer games (2-8 players)
- No server infrastructure budget
- Players can tolerate 50-100ms peer-to-peer latency
- NAT traversal is acceptable (works for ~80% of connections)

**Build a Custom Transport** (WebSocket/WebRTC server) when:
- Building larger multiplayer games (8+ players)
- Need reliable, low-latency connections
- Have server infrastructure
- Want full control over networking topology

## The Transport Interface

All transports implement this interface:

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

  // Optional metrics for debugging/monitoring
  metrics?: TransportMetrics;
}
```

### Key Methods

#### `send(message, targetId?)`
Send a message to peer(s):
- **Broadcast**: Omit `targetId` to send to all peers
- **Unicast**: Provide `targetId` to send to specific peer

```typescript
// Broadcast to all peers
transport.send({ type: 'state_sync', payload: stateDiff });

// Send to specific peer
transport.send({ type: 'action', payload: action }, 'player-2');
```

#### `onMessage(handler)`
Listen for incoming messages from other peers:

```typescript
const unsubscribe = transport.onMessage((message, senderId) => {
  console.log('Received', message.type, 'from', senderId);
});

// Clean up when done
unsubscribe();
```

#### `onPeerJoin(handler)` / `onPeerLeave(handler)`
Listen for peers connecting or disconnecting:

```typescript
transport.onPeerJoin((peerId) => {
  console.log('Player joined:', peerId);
  runtime.addPlayer(peerId);
});

transport.onPeerLeave((peerId) => {
  console.log('Player left:', peerId);
  runtime.removePlayer(peerId);
});
```

#### `getPeerIds()` / `getPlayerId()` / `isHost()`
Get identity information:

```typescript
const myId = transport.getPlayerId();        // "player-abc123"
const peers = transport.getPeerIds();        // ["player-def456", "player-ghi789"]
const amHost = transport.isHost();           // true or false
```

## Transport Metrics

Transports can optionally implement `TransportMetrics` for debugging and monitoring:

```typescript
export interface TransportMetrics {
  getConnectionState(): 'disconnected' | 'connecting' | 'connected';
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;
  getPeerCount(): number;
  getMessageStats(): { sent: number; received: number; errors: number };
  getLatencyMs?(): number | undefined;  // Optional
  resetStats?(): void;                    // Optional
}
```

### Using Metrics

```typescript
const transport = new LocalTransport({ roomId: 'my-game', isHost: true });

if (transport.metrics) {
  // Check connection state
  console.log('State:', transport.metrics.getConnectionState()); // "connected"

  // Listen for state changes
  transport.metrics.onConnectionChange((state) => {
    console.log('Connection state changed:', state);
  });

  // Get message statistics
  const stats = transport.metrics.getMessageStats();
  console.log(`Sent: ${stats.sent}, Received: ${stats.received}, Errors: ${stats.errors}`);

  // Get peer count
  console.log('Connected peers:', transport.metrics.getPeerCount());
}
```

## Message Flow Architecture

### Host-Authoritative Pattern

```
┌─────────────────────────────────────────────────┐
│                    Host                          │
│  ┌─────────────────────────────────────────┐   │
│  │  1. Receives actions from clients        │   │
│  │  2. Applies actions to authoritative state│  │
│  │  3. Generates state diffs (patches)      │   │
│  │  4. Broadcasts patches to all clients    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
          ▲                        │
          │ actions                │ state patches
          │                        ▼
┌─────────────────┐      ┌─────────────────┐
│    Client 1     │      │    Client 2     │
│  1. Send action │      │  1. Send action │
│  2. Recv patches│      │  2. Recv patches│
│  3. Apply patches│     │  3. Apply patches│
│  4. Re-render   │      │  4. Re-render   │
└─────────────────┘      └─────────────────┘
```

### Message Types

The `WireMessage` type supports these message types:

```typescript
export interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  [key: string]: any;
}
```

- **`state_sync`**: Host broadcasts state diffs to clients
- **`action`**: Any peer sends an action to the host
- **`player_join`**: Notify peers when a player joins
- **`player_leave`**: Notify peers when a player leaves
- **`event`**: Custom events emitted via `context.emit()`
- **`heartbeat`**: Keep-alive messages for connection monitoring

## Comparison with Other Frameworks

### vs Colyseus (Server-based only)
- **Colyseus**: Requires server infrastructure, client-server only
- **Martini**: Transport-agnostic - use P2P or server-based

### vs Photon (Hosted service)
- **Photon**: Proprietary hosted service, costs money at scale
- **Martini**: Open-source, self-hosted, free

### vs Netcode for GameObjects (Unity)
- **Netcode**: Unity-specific, C# only
- **Martini**: Engine-agnostic, works with any renderer (Phaser, Three.js, etc.)

## Performance Considerations

### Bandwidth Usage

Martini uses a **diff/patch algorithm** to minimize bandwidth:

```typescript
// Instead of sending full state every frame (wasteful):
{ players: { p1: { x: 150, y: 200, health: 80 } } }  // ~50 bytes

// Martini only sends what changed:
[{ op: 'replace', path: ['players', 'p1', 'x'], value: 150 }]  // ~20 bytes
```

Typical bandwidth usage:
- **Small games** (2 players): 1-3 KB/s per client
- **Medium games** (4-8 players): 5-15 KB/s per client
- **Large games** (16+ players): 20-50 KB/s per client

### Sync Rate

Default sync rate is **50ms (20 FPS)**. You can adjust this:

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2'],
  syncInterval: 100  // Slower sync (10 FPS) - lower bandwidth
});
```

**Recommendations:**
- **Fast-paced games** (shooters, racing): 16-33ms (30-60 FPS)
- **Medium-paced games** (platformers): 33-50ms (20-30 FPS)
- **Slow-paced games** (turn-based, strategy): 100-200ms (5-10 FPS)

## Debugging Transports

### Log Messages

Use metrics to track message flow:

```typescript
const stats = transport.metrics?.getMessageStats();
console.log('Messages sent:', stats?.sent);
console.log('Messages received:', stats?.received);
console.log('Errors:', stats?.errors);
```

### Connection State

Monitor connection changes:

```typescript
transport.metrics?.onConnectionChange((state) => {
  if (state === 'disconnected') {
    console.error('Lost connection!');
    // Show reconnection UI
  }
});
```

### Peer Discovery

Track peer join/leave events:

```typescript
transport.onPeerJoin((peerId) => {
  console.log('Peer joined:', peerId);
  console.log('Total peers:', transport.getPeerIds().length);
});

transport.onPeerLeave((peerId) => {
  console.log('Peer left:', peerId);
  console.log('Remaining peers:', transport.getPeerIds().length);
});
```

## Next Steps

- **[LocalTransport](./local)** - In-memory transport for testing
- **[IframeBridgeTransport](./iframe-bridge)** - Iframe-based transport for IDEs
- **[TrysteroTransport](./trystero)** - P2P WebRTC transport for production
- **[Custom Transports](./custom)** - Build your own transport

## See Also

- [Transport Interface Reference](../core/transport)
- [GameRuntime](../core/game-runtime)
- [Testing Guide](../../guides/testing)
