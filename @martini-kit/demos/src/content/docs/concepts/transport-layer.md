---
title: Transport Layer
description: How martini-kit abstracts networking with pluggable transports
section: concepts
order: 5
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Transport Layer

The **transport layer** is how martini-kit sends and receives messages between peers. martini-kit is **transport-agnostic**, meaning you can swap networking backends without changing your game code.

## What is a Transport?

A transport is an implementation of the `Transport` interface that handles:
- **Message sending** - Broadcast or send to specific peers
- **Message receiving** - Handle incoming messages
- **Peer lifecycle** - Track when players join/leave
- **Identity** - Know who you are and who's connected

```typescript
interface Transport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): () => void;
  onPeerJoin(handler: PeerHandler): () => void;
  onPeerLeave(handler: PeerHandler): () => void;
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;
  metrics?: TransportMetrics;  // Optional observability
}
```

---

## Available Transports

martini-kit provides three built-in transports:

| Transport | Use Case | Latency | Setup | Peers |
|-----------|----------|---------|-------|-------|
| **LocalTransport** | Demos, testing | 0ms (instant) | Easy | Same page |
| **IframeBridgeTransport** | IDE sandboxes | ~1ms | Medium | Parent ↔ Iframe |
| **TrysteroTransport** | P2P production | 20-100ms | Medium | 2-8 players |

---

### LocalTransport

**Use case**: Testing, demos, prototyping

**How it works**: In-memory message passing using a global registry

**Pros**:
- Zero latency (instant)
- No server needed
- Perfect for development

**Cons**:
- Only works on same page
- Can't test real network conditions

**Example**:
```typescript
import { LocalTransport } from '@martini-kit/transport-local';
import { GameRuntime } from '@martini-kit/core';

// Create host
const hostTransport = new LocalTransport({
  roomId: 'my-game',
  isHost: true
});

const hostRuntime = new GameRuntime(game, hostTransport, {
  isHost: true,
  playerIds: [hostTransport.getPlayerId()]
});

// Create client (same page)
const clientTransport = new LocalTransport({
  roomId: 'my-game',
  isHost: false
});

const clientRuntime = new GameRuntime(game, clientTransport, {
  isHost: false,
  playerIds: [hostTransport.getPlayerId(), clientTransport.getPlayerId()]
});
```

<Callout type="info">

`LocalTransport` uses a global registry keyed by `roomId`. All transports in the same room can communicate instantly.

</Callout>

---

### IframeBridgeTransport

**Use case**: Sandboxed code execution (martini-kit IDE)

**How it works**: `postMessage` API for parent ↔ iframe communication

**Pros**:
- Sandboxed execution (security)
- Very low latency (~1ms)
- Works across origins

**Cons**:
- Requires iframe setup
- More complex than LocalTransport

**Example**:
```typescript
// In parent window (sets up relay)
import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';

const relay = new IframeBridgeRelay();
const hostIframe = document.querySelector('#host-iframe');
const clientIframe = document.querySelector('#client-iframe');

relay.registerIframe(hostIframe, 'host');
relay.registerIframe(clientIframe, 'client');

// In iframe (host)
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';

const transport = new IframeBridgeTransport({
  isHost: true
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: [transport.getPlayerId()]
});

// In iframe (client)
const transport = new IframeBridgeTransport({
  isHost: false
});

const runtime = new GameRuntime(game, transport, {
  isHost: false,
  playerIds: [/* host and client IDs */]
});
```

See [IframeBridge API](/docs/latest/api/transports/iframe-bridge) for details.

---

### TrysteroTransport

**Use case**: Peer-to-peer production games

**How it works**: WebRTC via Trystero library (BitTorrent trackers for signaling)

**Pros**:
- No server needed (P2P)
- Low latency (direct connections)
- Free to use

**Cons**:
- NAT traversal can fail
- Limited to ~8 players
- WebRTC complexity

**Example**:
```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  roomId: 'my-game-room',
  appId: 'my-app',  // Unique app identifier
  isHost: true,
  config: {
    // Optional STUN/TURN servers
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: [transport.getPlayerId()]
});
```

See [Trystero API](/docs/latest/api/transports/trystero) for details.

---

## Transport Interface Deep Dive

### Core Methods

#### send(message, targetId?)

Send a message to specific peer or broadcast to all:

```typescript
// Broadcast to all peers
transport.send({
  type: 'action',
  payload: { actionName: 'move', input: { x: 100, y: 200 } }
});

// Send to specific peer
transport.send({
  type: 'event',
  payload: { eventName: 'chat', message: 'Hello!' }
}, 'player-2');
```

---

#### onMessage(handler)

Listen for incoming messages:

```typescript
const unsubscribe = transport.onMessage((message, senderId) => {
  console.log('Received message from', senderId, ':', message);

  if (message.type === 'action') {
    // Handle action
  }
});

// Cleanup
unsubscribe();
```

---

#### onPeerJoin(handler)

Listen for new peers connecting:

```typescript
transport.onPeerJoin((peerId) => {
  console.log('Peer joined:', peerId);

  // Update player list
  if (isHost) {
    // Host handles new player join
    runtime.submitAction('playerJoin', { playerId: peerId });
  }
});
```

---

#### onPeerLeave(handler)

Listen for peers disconnecting:

```typescript
transport.onPeerLeave((peerId) => {
  console.log('Peer left:', peerId);

  // Handle player disconnect
  if (isHost) {
    // Host handles player leave
    runtime.submitAction('playerLeave', { playerId: peerId });
  }
});
```

---

#### getPlayerId()

Get your own unique player ID:

```typescript
const myId = transport.getPlayerId();
console.log('My player ID:', myId);
```

---

#### getPeerIds()

Get all connected peer IDs (excluding self):

```typescript
const peers = transport.getPeerIds();
console.log('Connected peers:', peers);

const allPlayers = [transport.getPlayerId(), ...peers];
```

---

#### isHost()

Check if you're the host:

```typescript
if (transport.isHost()) {
  console.log('I am the host');
  // Start game loop
  startGameLoop();
} else {
  console.log('I am a client');
}
```

---

### Optional: Transport Metrics

Transports can implement `TransportMetrics` for observability:

```typescript
interface TransportMetrics {
  getConnectionState(): ConnectionState;
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;
  getPeerCount(): number;
  getMessageStats(): MessageStats;
  getLatencyMs?(): number;
  resetStats?(): void;
}
```

**Example**:
```typescript
if (transport.metrics) {
  // Get connection state
  console.log('State:', transport.metrics.getConnectionState());

  // Listen for changes
  transport.metrics.onConnectionChange((state) => {
    if (state === 'connected') {
      console.log('Connected!');
    } else if (state === 'disconnected') {
      console.log('Disconnected!');
    }
  });

  // Get stats
  const stats = transport.metrics.getMessageStats();
  console.log(`Sent: ${stats.sent}, Received: ${stats.received}`);

  // Get latency (if supported)
  const latency = transport.metrics.getLatencyMs?.();
  console.log('Latency:', latency, 'ms');
}
```

---

## Message Types

Transports send `WireMessage` objects:

```typescript
interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  [key: string]: any;  // Extensible
}
```

### Message Flow

```
Client                          Host
  │                              │
  │  ─── action ────────────>    │  (Receive action from client)
  │                              │
  │                              │  (Apply action to state)
  │                              │
  │  <──── state_sync ──────     │  (Broadcast state patches)
  │                              │
```

**Action message**:
```typescript
{
  type: 'action',
  payload: {
    actionName: 'move',
    input: { x: 100, y: 200 },
    context: { playerId: 'p1', targetId: 'p1', ... },
    actionSeed: 12345
  },
  senderId: 'player-1'
}
```

**State sync message**:
```typescript
{
  type: 'state_sync',
  payload: {
    patches: [
      { op: 'replace', path: ['players', 'p1', 'x'], value: 100 },
      { op: 'replace', path: ['players', 'p1', 'y'], value: 200 }
    ]
  },
  senderId: 'host'
}
```

---

## Choosing a Transport

### Decision Tree

```
Need real network testing?
├─ No → Use LocalTransport (instant, easy)
└─ Yes
    ├─ Building for IDE? → Use IframeBridgeTransport
    └─ Building production game?
        ├─ P2P acceptable? → Use TrysteroTransport
        └─ Need dedicated server? → Implement WebSocket transport
```

### Comparison Table

| Feature | LocalTransport | IframeBridge | Trystero | WebSocket (custom) |
|---------|----------------|--------------|----------|-------------------|
| **Latency** | 0ms | ~1ms | 20-100ms | 10-50ms |
| **Players** | Unlimited* | 2-4 | 2-8 | Unlimited |
| **Server** | None | None | None | Required |
| **NAT Issues** | No | No | Yes | No |
| **Scalability** | Low | Low | Low | High |
| **Setup** | Easy | Medium | Medium | Hard |

*Same page only

---

## Implementing a Custom Transport

You can implement any networking backend:

```typescript
import type { Transport, WireMessage } from '@martini-kit/core';

class MyCustomTransport implements Transport {
  private messageHandlers: Set<(msg: WireMessage, senderId: string) => void> = new Set();
  private peerJoinHandlers: Set<(peerId: string) => void> = new Set();
  private peerLeaveHandlers: Set<(peerId: string) => void> = new Set();

  constructor(private config: { isHost: boolean; playerId: string }) {}

  send(message: WireMessage, targetId?: string): void {
    // Implement your sending logic
    if (targetId) {
      // Send to specific peer
      this.sendToSpecificPeer(targetId, message);
    } else {
      // Broadcast to all
      this.broadcastToAll(message);
    }
  }

  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onPeerJoin(handler: (peerId: string) => void): () => void {
    this.peerJoinHandlers.add(handler);
    return () => this.peerJoinHandlers.delete(handler);
  }

  onPeerLeave(handler: (peerId: string) => void): () => void {
    this.peerLeaveHandlers.add(handler);
    return () => this.peerLeaveHandlers.delete(handler);
  }

  getPlayerId(): string {
    return this.config.playerId;
  }

  getPeerIds(): string[] {
    // Return list of connected peer IDs (excluding self)
    return this.getConnectedPeers();
  }

  isHost(): boolean {
    return this.config.isHost;
  }

  // Implement your custom logic
  private sendToSpecificPeer(peerId: string, message: WireMessage) {
    // ...
  }

  private broadcastToAll(message: WireMessage) {
    // ...
  }

  private getConnectedPeers(): string[] {
    // ...
    return [];
  }
}
```

See [Custom Transports Guide](/docs/latest/api/transports/custom) for details.

---

## Best Practices

### 1. Handle Connection Failures

```typescript
if (transport.metrics) {
  transport.metrics.onConnectionChange((state) => {
    if (state === 'disconnected') {
      // Show "Connection lost" UI
      showReconnectDialog();

      // Attempt reconnect
      setTimeout(() => attemptReconnect(), 3000);
    }
  });
}
```

---

### 2. Validate Peer Identity

```typescript
transport.onPeerJoin((peerId) => {
  if (!isValidPeerId(peerId)) {
    console.warn('Invalid peer ID:', peerId);
    return;
  }

  // Handle valid peer
  handleNewPlayer(peerId);
});
```

---

### 3. Cleanup on Destroy

```typescript
class GameScene extends Phaser.Scene {
  private unsubscribes: Array<() => void> = [];

  create() {
    // Store unsubscribe functions
    this.unsubscribes.push(
      transport.onMessage(this.handleMessage),
      transport.onPeerJoin(this.handlePeerJoin),
      transport.onPeerLeave(this.handlePeerLeave)
    );
  }

  shutdown() {
    // Cleanup all listeners
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }
}
```

---

### 4. Test with Different Transports

```typescript
// Development: LocalTransport
const devTransport = new LocalTransport({ roomId: 'dev', isHost: true });

// Production: TrysteroTransport
const prodTransport = new TrysteroTransport({ roomId: 'prod', appId: 'my-app', isHost: true });

// Use same game code for both!
const runtime = new GameRuntime(game, devTransport, { isHost: true, playerIds: [...] });
```

---

### 5. Log Transport Metrics

```typescript
if (process.env.NODE_ENV === 'development' && transport.metrics) {
  setInterval(() => {
    const stats = transport.metrics!.getMessageStats();
    const peers = transport.metrics!.getPeerCount();
    const latency = transport.metrics!.getLatencyMs?.() ?? 'N/A';

    console.log(`[Transport] Peers: ${peers}, Sent: ${stats.sent}, Received: ${stats.received}, Latency: ${latency}ms`);
  }, 5000);
}
```

---

## Common Issues

### Issue: "No peers found"

**Cause**: Room ID mismatch or timing issue

**Solution**:
```typescript
// Ensure both host and clients use same roomId
const ROOM_ID = 'my-game-v1';

const transport = new LocalTransport({
  roomId: ROOM_ID,
  isHost: true
});
```

---

### Issue: WebRTC connection fails

**Cause**: NAT traversal issues, firewall

**Solution**: Use STUN/TURN servers
```typescript
const transport = new TrysteroTransport({
  roomId: 'my-room',
  appId: 'my-app',
  isHost: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:turnserver.com:3478',
        username: 'user',
        credential: 'pass'
      }
    ]
  }
});
```

---

### Issue: Messages not received

**Cause**: Handler not registered or unsubscribed too early

**Solution**: Store unsubscribe functions, call on cleanup
```typescript
const unsub = transport.onMessage(handler);

// Keep reference until cleanup
this.unsubscribes.push(unsub);
```

---

## Next Steps

- [LocalTransport API](/docs/latest/api/transports/local) - In-memory transport details
- [IframeBridge API](/docs/latest/api/transports/iframe-bridge) - Iframe transport setup
- [Trystero API](/docs/latest/api/transports/trystero) - P2P WebRTC configuration
- [Custom Transports](/docs/latest/api/transports/custom) - Implement your own backend
- [Architecture](/docs/latest/concepts/architecture) - How transports fit into martini-kit
