# LocalTransport

**LocalTransport** is an in-memory transport implementation perfect for same-page multiplayer demos, unit tests, and local development. It uses a global registry to enable instant (0ms latency) communication between multiple game instances on the same page.

## When to Use

✅ **Perfect for:**
- Side-by-side demo instances on the same page
- Unit and integration testing
- Local development without network overhead
- Prototyping multiplayer games quickly

❌ **Not suitable for:**
- Production games (no real networking)
- Cross-page/cross-tab communication
- Real-world latency simulation

## Installation

```bash
pnpm add @martini/transport-local
# or
npm install @martini/transport-local
```

## API Reference

### Constructor

```typescript
class LocalTransport implements Transport {
  constructor(config: LocalTransportConfig);
}

interface LocalTransportConfig {
  roomId: string;      // Unique room identifier
  playerId?: string;   // Optional custom player ID (auto-generated if omitted)
  isHost: boolean;     // Whether this instance is the host
}
```

### Properties

```typescript
readonly playerId: string;           // This peer's unique ID
readonly metrics: TransportMetrics;  // Connection metrics and stats
```

### Methods

All methods from the [Transport interface](../core/transport):

```typescript
// Messaging
send(message: WireMessage, targetId?: string): void;
onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;

// Peer lifecycle
onPeerJoin(handler: (peerId: string) => void): () => void;
onPeerLeave(handler: (peerId: string) => void): () => void;
getPeerIds(): string[];

// Identity
getPlayerId(): string;
isHost(): boolean;

// Cleanup
disconnect(): void;
```

## Quick Start

### Single-Page Multiplayer Demo

```typescript
import { LocalTransport } from '@martini/transport-local';
import { GameRuntime } from '@martini/core';
import { game } from './my-game';

// Create host instance
const hostTransport = new LocalTransport({
  roomId: 'my-game-room',
  isHost: true
});

const hostRuntime = new GameRuntime(game, hostTransport, {
  isHost: true,
  playerIds: [hostTransport.getPlayerId()]
});

// Create client instance
const clientTransport = new LocalTransport({
  roomId: 'my-game-room',  // Same room ID!
  isHost: false
});

const clientRuntime = new GameRuntime(game, clientTransport, {
  isHost: false,
  playerIds: [hostTransport.getPlayerId(), clientTransport.getPlayerId()]
});

// Both instances are now connected!
console.log('Host sees peers:', hostTransport.getPeerIds());    // ["player-xxx"]
console.log('Client sees peers:', clientTransport.getPeerIds()); // ["player-yyy"]
```

## How It Works

LocalTransport uses a **global in-memory registry** (`LocalTransportRegistry`) to coordinate all instances in the same JavaScript context:

```
┌──────────────────────────────────────────┐
│     LocalTransportRegistry (Singleton)    │
│  ┌────────────────────────────────────┐  │
│  │  Room: "my-game-room"              │  │
│  │  ├─ LocalTransport (host)          │  │
│  │  ├─ LocalTransport (client 1)      │  │
│  │  └─ LocalTransport (client 2)      │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         ▲                    │
         │ send()             │ deliver()
         │                    ▼
   LocalTransport ◄─────► Other instances
```

### Message Flow

1. **Send**: `transport.send(message)` → Registry broadcasts to all peers in the same room
2. **Receive**: Registry calls `peer.deliver(message, senderId)` on each peer
3. **Handlers**: Each peer's `onMessage` handlers are invoked synchronously

### Peer Discovery

When a new `LocalTransport` is created:

1. Registry adds it to the room
2. Existing peers are notified via `onPeerJoin`
3. New peer is notified of existing peers via `onPeerJoin`

When a transport calls `disconnect()`:

1. Registry removes it from the room
2. Remaining peers are notified via `onPeerLeave`

## Examples

### Testing Player Join/Leave

```typescript
import { describe, it, expect } from 'vitest';
import { LocalTransport } from '@martini/transport-local';

describe('Player Lifecycle', () => {
  it('should notify peers when player joins', () => {
    const host = new LocalTransport({ roomId: 'test', isHost: true });

    let joinedPeer: string | null = null;
    host.onPeerJoin((peerId) => {
      joinedPeer = peerId;
    });

    // Create second peer - host should be notified
    const client = new LocalTransport({ roomId: 'test', isHost: false });

    expect(joinedPeer).toBe(client.getPlayerId());
    expect(host.getPeerIds()).toContain(client.getPlayerId());

    // Cleanup
    host.disconnect();
    client.disconnect();
  });

  it('should notify peers when player leaves', () => {
    const host = new LocalTransport({ roomId: 'test', isHost: true });
    const client = new LocalTransport({ roomId: 'test', isHost: false });

    let leftPeer: string | null = null;
    host.onPeerLeave((peerId) => {
      leftPeer = peerId;
    });

    // Client disconnects
    const clientId = client.getPlayerId();
    client.disconnect();

    expect(leftPeer).toBe(clientId);
    expect(host.getPeerIds()).not.toContain(clientId);

    // Cleanup
    host.disconnect();
  });
});
```

### Testing Message Passing

```typescript
it('should deliver messages between peers', () => {
  const host = new LocalTransport({ roomId: 'test', isHost: true });
  const client = new LocalTransport({ roomId: 'test', isHost: false });

  let receivedMessage: any = null;
  client.onMessage((message, senderId) => {
    receivedMessage = { message, senderId };
  });

  // Host sends message
  host.send({ type: 'action', payload: { x: 100 } });

  // Client should receive it immediately
  expect(receivedMessage).not.toBeNull();
  expect(receivedMessage.message.type).toBe('action');
  expect(receivedMessage.message.payload.x).toBe(100);
  expect(receivedMessage.senderId).toBe(host.getPlayerId());

  // Cleanup
  host.disconnect();
  client.disconnect();
});
```

### Testing Unicast (Targeted Messages)

```typescript
it('should send message to specific peer', () => {
  const host = new LocalTransport({ roomId: 'test', isHost: true });
  const client1 = new LocalTransport({ roomId: 'test', isHost: false });
  const client2 = new LocalTransport({ roomId: 'test', isHost: false });

  let client1Received = false;
  let client2Received = false;

  client1.onMessage(() => { client1Received = true; });
  client2.onMessage(() => { client2Received = true; });

  // Host sends to client1 only
  host.send({ type: 'action', payload: 'test' }, client1.getPlayerId());

  expect(client1Received).toBe(true);
  expect(client2Received).toBe(false);

  // Cleanup
  host.disconnect();
  client1.disconnect();
  client2.disconnect();
});
```

## Metrics

LocalTransport provides full metrics support:

```typescript
const transport = new LocalTransport({ roomId: 'test', isHost: true });

// Connection state (always 'connected' for LocalTransport)
console.log(transport.metrics.getConnectionState()); // "connected"

// Message statistics
const stats = transport.metrics.getMessageStats();
console.log('Sent:', stats.sent);
console.log('Received:', stats.received);
console.log('Errors:', stats.errors);

// Peer count
console.log('Peers:', transport.metrics.getPeerCount());

// Reset stats
transport.metrics.resetStats();
```

### Tracking Messages

```typescript
const host = new LocalTransport({ roomId: 'test', isHost: true });
const client = new LocalTransport({ roomId: 'test', isHost: false });

// Send some messages
host.send({ type: 'state_sync', payload: {} });
host.send({ type: 'state_sync', payload: {} });
client.send({ type: 'action', payload: {} });

// Check stats
const hostStats = host.metrics.getMessageStats();
console.log('Host sent:', hostStats.sent);      // 2
console.log('Host received:', hostStats.received); // 1

const clientStats = client.metrics.getMessageStats();
console.log('Client sent:', clientStats.sent);     // 1
console.log('Client received:', clientStats.received); // 2
```

## Advanced Usage

### Custom Player IDs

```typescript
const host = new LocalTransport({
  roomId: 'my-game',
  playerId: 'host-player',  // Custom ID instead of auto-generated
  isHost: true
});

console.log(host.getPlayerId()); // "host-player"
```

### Multiple Rooms

Different rooms are isolated from each other:

```typescript
// Room 1
const room1Host = new LocalTransport({ roomId: 'room-1', isHost: true });
const room1Client = new LocalTransport({ roomId: 'room-1', isHost: false });

// Room 2
const room2Host = new LocalTransport({ roomId: 'room-2', isHost: true });
const room2Client = new LocalTransport({ roomId: 'room-2', isHost: false });

// Peers in different rooms don't see each other
console.log(room1Host.getPeerIds().length); // 1 (only room1Client)
console.log(room2Host.getPeerIds().length); // 1 (only room2Client)
```

### Host Disconnect Handling

When the host disconnects, clients are notified:

```typescript
const host = new LocalTransport({ roomId: 'test', isHost: true });
const client = new LocalTransport({ roomId: 'test', isHost: false });

client.onHostDisconnect(() => {
  console.log('Host disconnected! Game over.');
  // Show "Host left" screen
});

host.disconnect(); // Client's onHostDisconnect handler is called
```

## Cleanup

Always call `disconnect()` when done to remove the transport from the global registry:

```typescript
const transport = new LocalTransport({ roomId: 'test', isHost: true });

// Use the transport...

// Cleanup
transport.disconnect();
```

**Important**: Failing to call `disconnect()` will keep the transport in the global registry, which can cause memory leaks and unexpected behavior in tests.

### Cleanup in Tests

```typescript
import { describe, it, afterEach } from 'vitest';

let transports: LocalTransport[] = [];

afterEach(() => {
  // Clean up all transports after each test
  transports.forEach(t => t.disconnect());
  transports = [];
});

it('should work', () => {
  const host = new LocalTransport({ roomId: 'test', isHost: true });
  const client = new LocalTransport({ roomId: 'test', isHost: false });

  transports.push(host, client);

  // Test logic...
  // No manual cleanup needed - afterEach handles it
});
```

## Performance Characteristics

- **Latency**: 0ms (synchronous, in-memory)
- **Bandwidth**: N/A (no network)
- **Peer Limit**: No practical limit (memory only)
- **Message Size Limit**: No limit (in-memory objects)
- **Connection State**: Always "connected"

## Limitations

1. **Same Page Only**: Only works within a single JavaScript context
2. **No Real Latency**: Can't simulate network delays (use custom transport for that)
3. **No Persistence**: Messages are not persisted anywhere
4. **Dev Only**: Not suitable for production games

## Debugging

### Enable Logging

```typescript
import { Logger } from '@martini/core';

const logger = new Logger('LocalTransport');
logger.log('Created transport:', transport.getPlayerId());
logger.log('Peers:', transport.getPeerIds());
```

### Common Issues

**Problem**: Peers not discovering each other
**Solution**: Ensure both use the same `roomId`

```typescript
// ❌ Wrong - different room IDs
const host = new LocalTransport({ roomId: 'room-1', isHost: true });
const client = new LocalTransport({ roomId: 'room-2', isHost: false });

// ✅ Correct - same room ID
const host = new LocalTransport({ roomId: 'my-game', isHost: true });
const client = new LocalTransport({ roomId: 'my-game', isHost: false });
```

**Problem**: Tests failing with "unexpected peer"
**Solution**: Call `disconnect()` in test cleanup to prevent cross-test contamination

```typescript
afterEach(() => {
  transport.disconnect(); // Always cleanup!
});
```

## See Also

- [Transports Overview](./overview)
- [IframeBridgeTransport](./iframe-bridge) - For iframe-based multiplayer
- [TrysteroTransport](./trystero) - For P2P production games
- [Testing Guide](../../guides/testing)
