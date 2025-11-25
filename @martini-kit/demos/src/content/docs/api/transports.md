---
title: "Transports"
description: Network backends for martini-kit multiplayer games
section: api
order: 3
---

<script>
  import PackageBadge from '$lib/components/docs/PackageBadge.svelte';
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Transports

martini-kit is transport-agnostic - swap networking backends without changing game code. Choose based on your deployment needs.

## Available Transports

### LocalTransport

<PackageBadge package="@martini-kit/transport-local" />

**Use case:** Local development, testing, side-by-side demos

In-memory transport for same-page multiplayer. Perfect for testing and demos where multiple "players" run in the same browser.

```bash
pnpm add @martini-kit/transport-local
```

```typescript
import { LocalTransport } from '@martini-kit/transport-local';

const transport = new LocalTransport();
```

**Features:**
- Zero network latency
- No server required
- Perfect for development
- Side-by-side player views

**Limitations:**
- Same browser only
- Not suitable for production

**When to use:**
- Local testing
- IDE dual-view mode
- Demos with multiple tabs
- Development

---

### TrysteroTransport

<PackageBadge package="@martini-kit/transport-trystero" />

**Use case:** P2P prototypes, classrooms, serverless games

WebRTC peer-to-peer transport using Trystero for signaling. No server needed - players connect directly.

```bash
pnpm add @martini-kit/transport-trystero
```

```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  appId: 'my-game-v1',      // Unique app identifier
  roomId: 'room-123',       // Room/session ID
  password: 'optional-pwd'  // Optional room password
});
```

#### Configuration

```typescript
interface TrysteroConfig {
  appId: string;        // Unique app ID (change for incompatible versions)
  roomId: string;       // Room/session ID
  password?: string;    // Optional password
  relayUrls?: string[]; // Custom STUN/TURN servers
}
```

**Features:**
- No hosting costs
- Low latency (direct connections)
- URL-based host selection
- Works offline on LAN

**Limitations:**
- NAT/firewall issues (~5-10% of users)
- Host must stay online
- No persistence
- Not suitable for large-scale games

<Callout type="warning" title="NAT Traversal">

WebRTC works ~90% of the time. Some school/corporate networks block P2P connections. Use WebSocket transport for production.

</Callout>

**When to use:**
- Quick prototypes
- Classroom demos
- Local LAN parties
- Low-cost MVPs

---

### WebSocketTransport

<PackageBadge package="@martini-kit/transport-ws" />

**Use case:** Production deployments, reliable connectivity

Server-based transport using WebSockets. Reliable, works everywhere, requires server hosting.

```bash
pnpm add @martini-kit/transport-ws
```

```typescript
import { WebSocketTransport } from '@martini-kit/transport-ws';

const transport = new WebSocketTransport({
  url: 'wss://game.example.com',
  roomId: 'room-123',
  autoReconnect: true
});
```

#### Configuration

```typescript
interface WebSocketConfig {
  url: string;              // WebSocket server URL
  roomId: string;           // Room/session ID
  autoReconnect?: boolean;  // Auto-reconnect on disconnect (default: true)
  reconnectDelay?: number;  // Delay between reconnect attempts (ms)
}
```

**Features:**
- Reliable on any network
- Works behind firewalls
- Server can add auth, matchmaking, persistence
- Scalable

**Limitations:**
- Requires server hosting
- Slightly higher latency than P2P
- Operating costs

**When to use:**
- Production games
- Commercial deployments
- Locked-down networks
- Games requiring matchmaking/auth

---

### IframeBridgeTransport

<PackageBadge package="@martini-kit/transport-iframe-bridge" />

**Use case:** IDE sandboxing, embedded games

Iframe-to-parent communication via `postMessage`. Enables the martini-kit IDE's dual-view mode.

```bash
pnpm add @martini-kit/transport-iframe-bridge
```

```typescript
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';

const transport = new IframeBridgeTransport({
  targetOrigin: 'https://ide.martini-kit.com'
});
```

**Features:**
- Sandboxed execution
- IDE integration
- Dual-view testing

**Limitations:**
- Specific to iframe embedding
- Not for general use

**When to use:**
- martini-kit IDE integration
- Embedded game platforms
- Sandboxed testing

---

## Transport Selection

| Need | Recommended Transport |
|------|----------------------|
| Local testing | `LocalTransport` |
| Quick prototype | `TrysteroTransport` |
| Production game | `WebSocketTransport` |
| Classroom demo | `TrysteroTransport` |
| Behind firewall | `WebSocketTransport` |
| IDE integration | `IframeBridgeTransport` |

---

## Transport Interface

All transports implement the same interface. This is what makes them swappable.

```typescript
interface Transport {
  // Send messages
  send(message: WireMessage, targetId?: string): void;

  // Receive messages
  onMessage(
    handler: (message: WireMessage, senderId: string) => void
  ): () => void;

  // Peer lifecycle
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;

  // State
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;

  // Lifecycle
  disconnect(): void;

  // Observability (optional)
  metrics?: TransportMetrics;
}
```

---

## Platform Configuration

When using `initializeGame()`, the transport is auto-selected based on `__martini-kit_CONFIG__`:

```typescript
// Set by platform (IDE, hosting platform, etc.)
window.__martini-kit_CONFIG__ = {
  transport: {
    type: 'local' | 'iframe-bridge' | 'trystero' | 'websocket',
    roomId: 'room-123',
    isHost: true,
    // ... transport-specific config
  }
};

// initializeGame() reads this and creates the right transport
initializeGame({ game, scene, phaserConfig });
```

For manual setup:

```typescript
const transport = new LocalTransport();
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1']
});
```

---

## Migration Path

**Development → Production:**

```typescript
// Development
const transport = new LocalTransport();

// Prototype
const transport = new TrysteroTransport({ appId: 'game', roomId: 'test' });

// Production
const transport = new WebSocketTransport({ url: 'wss://game.com', roomId });
```

Game code stays identical - just swap the transport.

---

## Next Steps

- **[@martini-kit/core](/docs/latest/api/core)** - Core runtime and game definition
- **[@martini-kit/phaser](/docs/latest/api/phaser)** - Phaser integration
- **[Quick Start](/docs/getting-started/quick-start)** - Build your first game

## Examples

Working transport examples:
- [Fire & Ice](/preview/fire-and-ice) - Uses LocalTransport for IDE
- [Blob Battle](/preview/blob-battle) - Supports all transports
- [Paddle Battle](/preview/paddle-battle) - Local + Trystero ready
