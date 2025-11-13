# @martini/transport-iframe-bridge

Iframe-based transport for sandboxed multiplayer testing. Enables local two-player testing in sandboxed iframes, perfect for IDE dual-view mode.

## Features

- ✅ Works across sandboxed iframe boundaries
- ✅ Fast local testing (postMessage instead of WebRTC)
- ✅ Simple parent-child architecture
- ✅ Supports unicast and broadcast messages
- ✅ Automatic peer discovery

## Architecture

```
┌─────────────────────────────────────┐
│   Parent Window (IDE Component)    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   IframeBridgeRelay         │   │
│  │   (message hub)             │   │
│  └──────────┬──────────────┬───┘   │
│             │              │        │
│      postMessage      postMessage   │
│             │              │        │
│  ┌──────────▼──────┐ ┌─────▼──────┐│
│  │ Host Iframe     │ │Client Iframe││
│  │ IframeBridge    │ │IframeBridge ││
│  │ Transport       │ │Transport    ││
│  └─────────────────┘ └────────────┘│
└─────────────────────────────────────┘
```

## Usage

### In Parent Window

```typescript
import { IframeBridgeRelay } from '@martini/transport-iframe-bridge';

// Create relay (message hub)
const relay = new IframeBridgeRelay();

// Iframes will auto-register when they create transport instances
```

### In Iframe (User's Game Code)

```typescript
import { IframeBridgeTransport } from '@martini/transport-iframe-bridge';
import { GameRuntime } from '@martini/core';
import { myGame } from './game';

// Create transport (auto-registers with parent relay)
const transport = new IframeBridgeTransport({
  roomId: 'my-room',
  isHost: true
});

// Create runtime
const runtime = new GameRuntime(myGame, transport, { isHost: true });
```

## Comparison with LocalTransport

| Feature | LocalTransport | IframeBridgeTransport |
|---------|---------------|----------------------|
| **Use Case** | Same JS context | Sandboxed iframes |
| **Speed** | Instant (direct calls) | Near-instant (postMessage) |
| **Isolation** | No sandbox | Full sandbox isolation |
| **Testing** | Unit tests, DualViewDemo | IDE dual-view, sandboxed tests |

## When to Use

- ✅ **IDE dual-view mode** - Two sandboxed iframes on same page
- ✅ **Sandboxed testing** - When you need iframe isolation
- ✅ **Local development** - Fast iteration without network

## When NOT to Use

- ❌ **Production multiplayer** - Use `TrysteroTransport` for P2P
- ❌ **Unit tests** - Use `LocalTransport` (faster, simpler)
- ❌ **Same-page without iframes** - Use `LocalTransport`

## API

### IframeBridgeTransport

```typescript
class IframeBridgeTransport implements Transport {
  constructor(config: IframeBridgeConfig);

  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (msg: WireMessage, senderId: string) => void): () => void;
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
  onHostDisconnect(handler: () => void): () => void;

  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;
  disconnect(): void;
}
```

### IframeBridgeRelay

```typescript
class IframeBridgeRelay {
  constructor();

  // Auto-registers iframes via postMessage
  // No manual registration needed in most cases

  getPeers(): PeerInfo[];
  getPeersInRoomById(roomId: string): PeerInfo[];
  destroy(): void;
}
```

## License

MIT
