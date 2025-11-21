---
title: Transport Interface
description: Network abstraction layer for multiplayer communication
---

# Transport Interface

The `Transport` interface is martini-kit's network abstraction layer. It defines how game instances communicate, whether through in-memory message passing, WebRTC peer-to-peer, WebSockets, or any other protocol.

## Why Transport Abstraction?

martini-kit is **transport-agnostic** - your game logic doesn't need to know whether players are connected via:
- In-memory (same page)
- P2P WebRTC
- WebSocket server
- HTTP polling
- Custom signaling

You write your game once, then swap transports based on your deployment needs.

## API Reference

### Transport Interface

```typescript
interface Transport {
  // Message handling
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): Unsubscribe;

  // Peer lifecycle
  onPeerJoin(handler: PeerHandler): Unsubscribe;
  onPeerLeave(handler: PeerHandler): Unsubscribe;
  getPeerIds(): string[];

  // Identity
  getPlayerId(): string;
  isHost(): boolean;

  // Optional observability
  metrics?: TransportMetrics;
}
```

### Type Definitions

```typescript
type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type Unsubscribe = () => void;
```

## Methods

### send()

Sends a message to one peer or broadcasts to all peers.

```typescript
send(message: WireMessage, targetId?: string): void
```

**Parameters:**
- `message` - The message to send (must include `type` field)
- `targetId` - Optional peer ID to send to (omit to broadcast to all)

**Message Types:**
- `state_sync` - State updates from host to clients
- `action` - Action submissions from clients to host
- `event` - Custom events (chat, sounds, etc.)
- `player_join` - Player joined notification
- `player_leave` - Player left notification
- `heartbeat` - Keep-alive ping

**Example:**
```typescript
// Broadcast to all peers
transport.send({
  type: 'event',
  payload: { eventName: 'chat', message: 'Hello!' },
  senderId: transport.getPlayerId()
});

// Send to specific peer
transport.send({
  type: 'state_sync',
  payload: { fullState: currentState }
}, 'player-2');
```

### onMessage()

Listens for incoming messages from other peers.

```typescript
onMessage(handler: MessageHandler): Unsubscribe
```

**Parameters:**
- `handler` - `(message, senderId) => void`

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = transport.onMessage((msg, senderId) => {
  console.log(`Received ${msg.type} from ${senderId}`, msg.payload);

  switch (msg.type) {
    case 'action':
      applyAction(msg.payload);
      break;
    case 'state_sync':
      updateState(msg.payload);
      break;
    case 'event':
      handleEvent(msg.payload);
      break;
  }
});

// Later: stop listening
unsubscribe();
```

### onPeerJoin()

Listens for new peers connecting.

```typescript
onPeerJoin(handler: PeerHandler): Unsubscribe
```

**Parameters:**
- `handler` - `(peerId: string) => void`

**Returns:** Unsubscribe function

**When it fires:**
- When a new peer connects to the same room/session
- May fire multiple times if multiple peers join
- Fires on both the joining peer and existing peers

**Example:**
```typescript
const unsubscribe = transport.onPeerJoin((peerId) => {
  console.log(`${peerId} joined the game`);

  // Host: Send full state to new peer
  if (transport.isHost()) {
    transport.send({
      type: 'state_sync',
      payload: { fullState: getState() }
    }, peerId);
  }
});
```

### onPeerLeave()

Listens for peers disconnecting.

```typescript
onPeerLeave(handler: PeerHandler): Unsubscribe
```

**Parameters:**
- `handler` - `(peerId: string) => void`

**Returns:** Unsubscribe function

**When it fires:**
- When a peer disconnects (intentional or network failure)
- When a peer's transport is destroyed

**Example:**
```typescript
const unsubscribe = transport.onPeerLeave((peerId) => {
  console.log(`${peerId} left the game`);

  // Clean up player state
  if (isHost()) {
    delete state.players[peerId];
  }
});
```

### getPlayerId()

Returns this peer's unique ID.

```typescript
getPlayerId(): string
```

**Returns:** Unique string identifier for this peer

**ID format varies by transport:**
- LocalTransport: `"local-{timestamp}-{random}"`
- IframeBridge: `"iframe-{role}-{random}"`
- Trystero: WebRTC peer ID

**Example:**
```typescript
const myId = transport.getPlayerId();
console.log('My ID:', myId);

// Use to identify your own player
const myPlayer = state.players[myId];
```

### getPeerIds()

Returns array of all connected peer IDs (excluding self).

```typescript
getPeerIds(): string[]
```

**Returns:** Array of peer IDs

**Example:**
```typescript
const peers = transport.getPeerIds();
console.log(`Connected to ${peers.length} peers:`, peers);

// Check if specific player is connected
if (peers.includes('player-123')) {
  console.log('Player 123 is online');
}

// Total player count (including self)
const totalPlayers = peers.length + 1;
```

### isHost()

Checks if this peer is the authoritative host.

```typescript
isHost(): boolean
```

**Returns:** `true` if host, `false` if client

**Host responsibilities:**
- Run authoritative game logic
- Apply all actions to state
- Generate and broadcast state diffs
- Handle player join/leave

**Client responsibilities:**
- Send actions to host
- Apply state patches from host
- Mirror host's state locally

**Example:**
```typescript
if (transport.isHost()) {
  console.log('I am the host - running game logic');
  startGameLoop();
} else {
  console.log('I am a client - mirroring state');
}
```

### metrics (Optional)

Optional observability interface for debugging and monitoring.

```typescript
metrics?: TransportMetrics
```

See [TransportMetrics](#transportmetrics) below.

## TransportMetrics Interface

Optional interface for transport observability.

```typescript
interface TransportMetrics {
  getConnectionState(): ConnectionState;
  onConnectionChange(callback: (state: ConnectionState) => void): Unsubscribe;
  getPeerCount(): number;
  getMessageStats(): MessageStats;
  getLatencyMs?(): number | undefined;
  resetStats?(): void;
}
```

### ConnectionState

```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'connected';
```

### MessageStats

```typescript
interface MessageStats {
  sent: number;      // Total messages sent
  received: number;  // Total messages received
  errors: number;    // Failed sends/receives
}
```

### Example Usage

```typescript
const transport = new LocalTransport({ roomId: 'demo', isHost: true });

if (transport.metrics) {
  // Check connection state
  console.log('State:', transport.metrics.getConnectionState());

  // Monitor connection changes
  transport.metrics.onConnectionChange((state) => {
    console.log('Connection:', state);
    if (state === 'disconnected') {
      showReconnectingUI();
    }
  });

  // Get peer count
  console.log('Peers:', transport.metrics.getPeerCount());

  // Get message stats
  const stats = transport.metrics.getMessageStats();
  console.log(`Sent: ${stats.sent}, Received: ${stats.received}`);

  // Get latency (if supported)
  const latency = transport.metrics.getLatencyMs?.();
  if (latency !== undefined) {
    console.log(`Latency: ${latency}ms`);
  }
}
```

## WireMessage Format

All messages sent through a transport must conform to this interface:

```typescript
interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  sessionId?: string;
  [key: string]: any;  // Allow additional properties
}
```

**Standard message types:**

### state_sync

Host → Clients: State updates

```typescript
{
  type: 'state_sync',
  payload: {
    patches: [
      { op: 'replace', path: ['players', 'p1', 'x'], value: 200 }
    ]
  }
}
```

### action

Client → Host: Action submission

```typescript
{
  type: 'action',
  payload: {
    actionName: 'move',
    input: { x: 200, y: 300 },
    context: { playerId: 'p1', targetId: 'p1' },
    actionSeed: 100001
  }
}
```

### event

Any → Any: Custom events

```typescript
{
  type: 'event',
  payload: {
    eventName: 'chat',
    payload: { message: 'Hello!', sender: 'p1' }
  },
  senderId: 'p1'
}
```

## Available Transports

martini-kit provides several official transport implementations:

### LocalTransport

**Package:** `@martini-kit/transport-local`

**Use case:** Same-page multiplayer, testing, demos

**Latency:** 0ms (in-memory)

**Setup:**
```typescript
import { LocalTransport } from '@martini-kit/transport-local';

const transport = new LocalTransport({
  roomId: 'my-room',
  isHost: true
});
```

**Pros:**
- Zero latency
- No network configuration
- Perfect for testing

**Cons:**
- Same page only
- No real network conditions

[Full docs →](/docs/api/transports/local)

### IframeBridgeTransport

**Package:** `@martini-kit/transport-iframe-bridge`

**Use case:** Sandboxed iframes (IDE, embedded demos)

**Latency:** ~1ms (postMessage)

**Setup:**
```typescript
// In iframe
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';

const transport = new IframeBridgeTransport({
  isHost: false
});

// In parent
import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';

const relay = new IframeBridgeRelay();
relay.registerIframe(iframeElement, 'client');
```

**Pros:**
- Sandboxed execution
- Fast communication
- Great for IDEs

**Cons:**
- Requires parent-iframe setup
- Same origin policy applies

[Full docs →](/docs/api/transports/iframe-bridge)

### TrysteroTransport

**Package:** `@martini-kit/transport-trystero`

**Use case:** P2P production games

**Latency:** 20-100ms (WebRTC)

**Setup:**
```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  appId: 'my-game',
  roomId: 'room-123',
  isHost: true
});
```

**Pros:**
- No server needed
- True P2P
- Works across internet

**Cons:**
- WebRTC complexity
- NAT traversal issues
- Limited to 8-10 players

[Full docs →](/docs/api/transports/trystero)

## Implementing a Custom Transport

You can implement your own transport for custom networking needs (WebSocket, HTTP polling, etc.).

### Basic Template

```typescript
import type { Transport, WireMessage } from '@martini-kit/core';

export class MyCustomTransport implements Transport {
  private playerId: string;
  private _isHost: boolean;
  private peerIds: string[] = [];

  private messageHandlers: Array<(msg: WireMessage, senderId: string) => void> = [];
  private peerJoinHandlers: Array<(peerId: string) => void> = [];
  private peerLeaveHandlers: Array<(peerId: string) => void> = [];

  constructor(config: { isHost: boolean }) {
    this.playerId = `custom-${Date.now()}-${Math.random()}`;
    this._isHost = config.isHost;

    // Connect to your network...
    this.connect();
  }

  send(message: WireMessage, targetId?: string): void {
    // Implement message sending
    if (targetId) {
      // Unicast to specific peer
      this.unicast(targetId, message);
    } else {
      // Broadcast to all peers
      this.broadcast(message);
    }
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

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    return [...this.peerIds];
  }

  isHost(): boolean {
    return this._isHost;
  }

  // Private helpers
  private connect(): void {
    // Connect to your network
    // Set up listeners
  }

  private broadcast(message: WireMessage): void {
    // Broadcast implementation
  }

  private unicast(targetId: string, message: WireMessage): void {
    // Unicast implementation
  }

  // Call when receiving messages
  private handleIncomingMessage(msg: WireMessage, senderId: string): void {
    for (const handler of this.messageHandlers) {
      handler(msg, senderId);
    }
  }

  // Call when peer joins
  private handlePeerJoin(peerId: string): void {
    this.peerIds.push(peerId);
    for (const handler of this.peerJoinHandlers) {
      handler(peerId);
    }
  }

  // Call when peer leaves
  private handlePeerLeave(peerId: string): void {
    this.peerIds = this.peerIds.filter(id => id !== peerId);
    for (const handler of this.peerLeaveHandlers) {
      handler(peerId);
    }
  }
}
```

### Adding Metrics (Optional)

```typescript
import type { TransportMetrics, ConnectionState, MessageStats } from '@martini-kit/core';

class MyTransportMetrics implements TransportMetrics {
  private connectionState: ConnectionState = 'disconnected';
  private stats = { sent: 0, received: 0, errors: 0 };
  private connectionHandlers: Array<(state: ConnectionState) => void> = [];

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionHandlers.push(callback);
    return () => {
      const idx = this.connectionHandlers.indexOf(callback);
      if (idx >= 0) this.connectionHandlers.splice(idx, 1);
    };
  }

  getPeerCount(): number {
    return this.transport.getPeerIds().length;
  }

  getMessageStats(): MessageStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { sent: 0, received: 0, errors: 0 };
  }

  // Internal methods
  trackSent(): void { this.stats.sent++; }
  trackReceived(): void { this.stats.received++; }
  trackError(): void { this.stats.errors++; }

  setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      for (const handler of this.connectionHandlers) {
        handler(state);
      }
    }
  }
}
```

## Best Practices

### ✅ Do

- **Implement all methods** - All transport methods are required
- **Handle errors gracefully** - Network can fail anytime
- **Generate unique IDs** - Use timestamp + random for peer IDs
- **Support broadcast and unicast** - Handle both `send()` modes
- **Clean up on disconnect** - Remove listeners, close connections
- **Add metrics** - Helps with debugging and monitoring

### ❌ Don't

- **Don't assume ordering** - Messages may arrive out of order
- **Don't assume reliability** - Messages can be lost
- **Don't block send()** - Should be non-blocking/async under the hood
- **Don't mutate messages** - Messages may be reused

## Testing Your Transport

```typescript
import { describe, it, expect } from 'vitest';
import { MyCustomTransport } from './MyCustomTransport';

describe('MyCustomTransport', () => {
  it('should connect two peers', async () => {
    const host = new MyCustomTransport({ isHost: true });
    const client = new MyCustomTransport({ isHost: false });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(host.getPeerIds()).toContain(client.getPlayerId());
    expect(client.getPeerIds()).toContain(host.getPlayerId());
  });

  it('should send messages', async () => {
    const host = new MyCustomTransport({ isHost: true });
    const client = new MyCustomTransport({ isHost: false });

    let receivedMessage = null;
    client.onMessage((msg, senderId) => {
      receivedMessage = msg;
    });

    host.send({ type: 'event', payload: { test: 123 } });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(receivedMessage).toEqual({
      type: 'event',
      payload: { test: 123 }
    });
  });
});
```

## See Also

- [LocalTransport](/docs/api/transports/local) - In-memory transport
- [IframeBridgeTransport](/docs/api/transports/iframe-bridge) - Iframe transport
- [TrysteroTransport](/docs/api/transports/trystero) - P2P WebRTC transport
- [Transport Layer Concepts](/docs/concepts/transport-layer) - Deep dive
- [GameRuntime](./game-runtime) - Using transports with runtime
