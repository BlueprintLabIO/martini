# @martini-kit/transport-local

In-memory transport for same-page multiplayer demos and testing.

## Why?

When building demos or testing multiplayer game logic, you often want to run multiple game instances on the same page without the complexity of WebRTC signaling, STUN servers, or network latency.

`LocalTransport` provides instant, synchronous communication between game instances in the same JavaScript context.

## Use Cases

- **Side-by-side demos**: Show host and client views simultaneously
- **Unit testing**: Test multiplayer logic without network mocking
- **Local development**: Fast iteration without opening multiple tabs
- **Documentation**: Interactive examples in docs

## Features

- ✅ Zero latency - messages delivered synchronously
- ✅ No network setup - works offline
- ✅ Instant peer discovery - no async connection phase
- ✅ Same API as other transports - drop-in replacement
- ✅ Automatic cleanup - garbage collected with instances

## Installation

```bash
pnpm add @martini-kit/transport-local
```

## Usage

```typescript
import { LocalTransport } from '@martini-kit/transport-local';
import { GameRuntime } from '@martini-kit/core';

// Create two instances in the same room
const hostTransport = new LocalTransport({
  roomId: 'demo-room',
  isHost: true,
});

const clientTransport = new LocalTransport({
  roomId: 'demo-room',
  isHost: false,
});

// They instantly see each other - no waiting!
console.log(hostTransport.getPeerIds());   // [clientTransport.playerId]
console.log(clientTransport.getPeerIds()); // [hostTransport.playerId]

// Create game runtimes
const hostRuntime = new GameRuntime(gameLogic, hostTransport, {
  isHost: true,
  playerIds: [hostTransport.getPlayerId()],
});

const clientRuntime = new GameRuntime(gameLogic, clientTransport, {
  isHost: false,
  playerIds: [clientTransport.getPlayerId()],
});

// Messages are delivered instantly
hostRuntime.submitAction('move', { x: 100, y: 200 });
// Client sees the update immediately - no network delay!
```

## API

### `new LocalTransport(config)`

```typescript
interface LocalTransportConfig {
  roomId: string;      // Room identifier - instances with same roomId connect
  playerId?: string;   // Optional custom player ID (auto-generated if omitted)
  isHost: boolean;     // Whether this instance is the authoritative host
}
```

### Methods

All standard `Transport` interface methods:

- `send(message, targetId?)` - Send message to all peers or specific peer
- `onMessage(handler)` - Listen for incoming messages
- `onPeerJoin(handler)` - Called when peer joins (instant)
- `onPeerLeave(handler)` - Called when peer leaves
- `onHostDisconnect(handler)` - Called when host disconnects
- `getPlayerId()` - Get this instance's player ID
- `getPeerIds()` - Get all peer IDs in the room
- `isHost()` - Check if this is the host
- `disconnect()` - Leave the room

## Comparison with Other Transports

| Feature | LocalTransport | TrysteroTransport |
|---------|---------------|-------------------|
| Latency | 0ms (synchronous) | 10-100ms (network) |
| Setup | Instant | WebRTC signaling required |
| Use case | Same-page demos/tests | Real multiplayer |
| Offline | ✅ Yes | ❌ Needs STUN server |
| Cross-tab | ❌ No | ✅ Yes |

## When NOT to Use

Don't use `LocalTransport` for:
- Real multiplayer games (use `@martini-kit/transport-trystero` or custom transport)
- Cross-tab/cross-device communication
- Testing network latency/lag scenarios

## License

MIT
