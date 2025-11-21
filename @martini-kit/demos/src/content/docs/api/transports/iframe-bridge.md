# IframeBridgeTransport

**IframeBridgeTransport** enables multiplayer communication between sandboxed iframes through a parent window relay. Perfect for building browser-based IDEs, code playgrounds, and any scenario where game instances run in isolated iframe contexts.

## When to Use

✅ **Perfect for:**
- Browser-based game IDEs (like martini-kit IDE)
- Code sandboxes with live multiplayer preview
- Testing across multiple sandboxed iframe environments
- Isolating untrusted user code while enabling multiplayer

❌ **Not suitable for:**
- Production games (use P2P or server-based transports)
- Same-page multiplayer (use [LocalTransport](./local) instead)
- Cross-domain iframes (security restrictions apply)

## Architecture

```
┌──────────────────────────────────────────────┐
│           Parent Window (IDE/App)             │
│  ┌────────────────────────────────────────┐  │
│  │     IframeBridgeRelay (Message Hub)    │  │
│  └────────────────────────────────────────┘  │
│           ▲                    ▼              │
│      postMessage          postMessage         │
│           │                    │              │
│  ┌────────┴────────┐  ┌────────┴────────┐   │
│  │ <iframe> (Host) │  │ <iframe>(Client)│   │
│  │  IframeBridge   │  │  IframeBridge   │   │
│  │   Transport     │  │   Transport     │   │
│  └─────────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────┘
```

### Message Flow

1. **Send**: iframe → `window.parent.postMessage()` → Relay
2. **Route**: Relay receives message, identifies target iframe(s)
3. **Deliver**: Relay → `iframe.contentWindow.postMessage()` → Target iframe(s)
4. **Receive**: Target iframe's message listener → handlers invoked

## Installation

```bash
pnpm add @martini-kit/transport-iframe-bridge
# or
npm install @martini-kit/transport-iframe-bridge
```

## API Reference

### IframeBridgeTransport (Iframe Side)

```typescript
class IframeBridgeTransport implements Transport {
  constructor(config: IframeBridgeConfig);
}

interface IframeBridgeConfig {
  roomId: string;      // Unique room identifier
  playerId?: string;   // Optional custom player ID
  isHost: boolean;     // Whether this instance is the host
}
```

### IframeBridgeRelay (Parent Side)

```typescript
class IframeBridgeRelay {
  constructor();

  // Manual registration (optional)
  registerIframe(
    playerId: string,
    roomId: string,
    iframe: HTMLIFrameElement,
    isHost: boolean
  ): void;

  // Query methods
  getPeers(): PeerInfo[];
  getPeersInRoomById(roomId: string): PeerInfo[];

  // Cleanup
  destroy(): void;
}

interface PeerInfo {
  playerId: string;
  roomId: string;
  iframe: HTMLIFrameElement;
  isHost: boolean;
}
```

### Transport Methods

All standard [Transport interface](../core/transport) methods:

```typescript
// Messaging
send(message: WireMessage, targetId?: string): void;
onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;

// Peer lifecycle
onPeerJoin(handler: (peerId: string) => void): () => void;
onPeerLeave(handler: (peerId: string) => void): () => void;
onHostDisconnect(handler: () => void): () => void;
getPeerIds(): string[];

// Identity
getPlayerId(): string;
isHost(): boolean;

// Cleanup
disconnect(): void;
```

## Quick Start

### Parent Window Setup

```typescript
import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';

// Create relay in parent window
const relay = new IframeBridgeRelay();

// Create iframes
const hostIframe = document.createElement('iframe');
hostIframe.src = '/game.html?role=host';
document.body.appendChild(hostIframe);

const clientIframe = document.createElement('iframe');
clientIframe.src = '/game.html?role=client';
document.body.appendChild(clientIframe);

// Relay automatically discovers and coordinates iframes
// (Iframes register themselves via postMessage)

// Cleanup when done
window.addEventListener('beforeunload', () => {
  relay.destroy();
});
```

### Iframe (Game) Setup

```typescript
// game.html - runs in iframe
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';
import { GameRuntime } from '@martini-kit/core';
import { game } from './my-game';

// Determine role from URL
const params = new URLSearchParams(window.location.search);
const isHost = params.get('role') === 'host';

// Create transport
const transport = new IframeBridgeTransport({
  roomId: 'my-game-room',
  isHost
});

// Create runtime
const runtime = new GameRuntime(game, transport, {
  isHost,
  playerIds: [transport.getPlayerId()]
});

// Start the game
// The transport automatically registers with parent relay
```

## Complete Example

### Parent Window (IDE)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Multiplayer IDE</title>
</head>
<body>
  <h1>Multiplayer Game IDE</h1>

  <div style="display: flex; gap: 1rem;">
    <div>
      <h2>Host</h2>
      <iframe id="host" src="/game.html?role=host" width="400" height="300"></iframe>
    </div>

    <div>
      <h2>Client</h2>
      <iframe id="client" src="/game.html?role=client" width="400" height="300"></iframe>
    </div>
  </div>

  <script type="module">
    import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';

    // Create relay to coordinate iframes
    const relay = new IframeBridgeRelay();

    // Optional: Monitor peer connections
    setInterval(() => {
      const peers = relay.getPeers();
      console.log('Connected peers:', peers.length);
      peers.forEach(p => {
        console.log(`  - ${p.playerId} (${p.isHost ? 'host' : 'client'})`);
      });
    }, 2000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      relay.destroy();
    });
  </script>
</body>
</html>
```

### Game Code (Runs in Iframe)

```typescript
// game.html
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';
import { defineGame, GameRuntime } from '@martini-kit/core';

// Define game
const game = defineGame({
  setup: () => ({
    players: {}
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    }
  },

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100 };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});

// Get role from URL
const params = new URLSearchParams(window.location.search);
const isHost = params.get('role') === 'host';

// Create transport
const transport = new IframeBridgeTransport({
  roomId: 'my-game',
  isHost
});

// Wait for connection
transport.metrics?.onConnectionChange((state) => {
  console.log('Connection state:', state);
  if (state === 'connected') {
    console.log('Connected! Peers:', transport.getPeerIds());
  }
});

// Create runtime
const runtime = new GameRuntime(game, transport, {
  isHost,
  playerIds: [transport.getPlayerId()]
});

// Listen for state changes
runtime.onChange((state) => {
  console.log('State updated:', state);
  renderGame(state);
});

// Submit actions
document.addEventListener('click', (e) => {
  runtime.submitAction('move', { x: e.clientX, y: e.clientY });
});

function renderGame(state) {
  // Render game visuals
  console.log('Players:', Object.keys(state.players).length);
}
```

## Advanced Usage

### Manual Iframe Registration

If you need explicit control over registration:

```typescript
// Parent window
const relay = new IframeBridgeRelay();

const hostIframe = document.getElementById('host-iframe') as HTMLIFrameElement;
const clientIframe = document.getElementById('client-iframe') as HTMLIFrameElement;

// Manually register iframes
relay.registerIframe('host-player', 'my-room', hostIframe, true);
relay.registerIframe('client-player', 'my-room', clientIframe, false);
```

### Multiple Rooms

The relay supports multiple isolated rooms:

```typescript
// Parent window with multiple games
const relay = new IframeBridgeRelay();

// Room 1: Fire & Ice game
const fireHost = document.getElementById('fire-host') as HTMLIFrameElement;
const fireClient = document.getElementById('fire-client') as HTMLIFrameElement;

// Room 2: Paddle Battle game
const paddleHost = document.getElementById('paddle-host') as HTMLIFrameElement;
const paddleClient = document.getElementById('paddle-client') as HTMLIFrameElement;

// Each iframe registers with its own roomId
// Room 1 peers: roomId = 'fire-ice'
// Room 2 peers: roomId = 'paddle-battle'
// Rooms are isolated - messages don't cross over
```

### Monitoring Connections

```typescript
// Parent window
const relay = new IframeBridgeRelay();

// Check peers in a specific room
setInterval(() => {
  const peers = relay.getPeersInRoomById('my-game-room');
  console.log(`Room 'my-game-room' has ${peers.length} peers:`);

  peers.forEach(peer => {
    console.log(`  - ${peer.playerId} (${peer.isHost ? 'HOST' : 'client'})`);
  });
}, 1000);
```

## Message Protocol

IframeBridgeTransport uses a custom message protocol via `window.postMessage`:

```typescript
interface BridgeMessage {
  type: 'BRIDGE_REGISTER' | 'BRIDGE_SEND' | 'BRIDGE_DELIVER' |
        'BRIDGE_PEER_JOIN' | 'BRIDGE_PEER_LEAVE' | 'BRIDGE_HOST_DISCONNECT';
  roomId: string;
  playerId: string;
  payload?: {
    message?: WireMessage;
    targetId?: string;
    peerId?: string;
    wasHost?: boolean;
  };
}
```

### Message Types

- **`BRIDGE_REGISTER`**: Iframe registers with relay
- **`BRIDGE_SEND`**: Iframe sends message to peer(s)
- **`BRIDGE_DELIVER`**: Relay delivers message to iframe
- **`BRIDGE_PEER_JOIN`**: Relay notifies about peer joining
- **`BRIDGE_PEER_LEAVE`**: Relay notifies about peer leaving
- **`BRIDGE_HOST_DISCONNECT`**: Relay notifies clients that host left

## Metrics

IframeBridgeTransport provides full metrics support:

```typescript
const transport = new IframeBridgeTransport({ roomId: 'test', isHost: true });

// Connection state
console.log(transport.metrics.getConnectionState());
// "connecting" → "connected" when relay responds

// Listen for connection changes
transport.metrics.onConnectionChange((state) => {
  if (state === 'connected') {
    console.log('Connected to relay!');
  }
});

// Message stats
const stats = transport.metrics.getMessageStats();
console.log('Sent:', stats.sent);
console.log('Received:', stats.received);
console.log('Errors:', stats.errors);

// Peer count
console.log('Peers:', transport.metrics.getPeerCount());
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';

describe('IframeBridgeRelay', () => {
  let relay: IframeBridgeRelay;

  beforeEach(() => {
    relay = new IframeBridgeRelay();
  });

  afterEach(() => {
    relay.destroy();
  });

  it('should track registered peers', () => {
    const iframe1 = document.createElement('iframe');
    const iframe2 = document.createElement('iframe');

    relay.registerIframe('p1', 'room1', iframe1, true);
    relay.registerIframe('p2', 'room1', iframe2, false);

    const peers = relay.getPeersInRoomById('room1');
    expect(peers).toHaveLength(2);
    expect(peers.find(p => p.playerId === 'p1')?.isHost).toBe(true);
    expect(peers.find(p => p.playerId === 'p2')?.isHost).toBe(false);
  });

  it('should isolate different rooms', () => {
    const iframe1 = document.createElement('iframe');
    const iframe2 = document.createElement('iframe');

    relay.registerIframe('p1', 'room1', iframe1, true);
    relay.registerIframe('p2', 'room2', iframe2, true);

    expect(relay.getPeersInRoomById('room1')).toHaveLength(1);
    expect(relay.getPeersInRoomById('room2')).toHaveLength(1);
  });
});
```

## Performance Characteristics

- **Latency**: ~1-5ms (postMessage overhead)
- **Bandwidth**: Same as network transport (messages are serialized)
- **Peer Limit**: Browser-dependent (typically 10-20 iframes max)
- **Message Size Limit**: Browser-dependent (~1MB typical)
- **Connection State**: "connecting" → "connected" on relay response

## Security Considerations

### Cross-Origin Restrictions

IframeBridgeTransport uses `postMessage` with `targetOrigin: '*'` by default. For production use, restrict to specific origins:

```typescript
// In IframeBridgeRelay.ts (modify source)
iframe.contentWindow.postMessage(message, 'https://your-domain.com');

// In IframeBridgeTransport.ts (modify source)
window.parent.postMessage(bridgeMessage, 'https://your-domain.com');
```

### Sandboxing Iframes

Use iframe `sandbox` attribute to restrict capabilities:

```html
<iframe
  src="/game.html"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

**Recommended sandbox flags:**
- `allow-scripts` - Required for JavaScript execution
- `allow-same-origin` - Required for postMessage (use with caution)

**Security trade-offs:**
- `allow-same-origin` allows iframe to access parent (needed for postMessage)
- Avoid `allow-same-origin` if iframe loads untrusted code
- Use separate domains for untrusted content

## Limitations

1. **Same-domain only** (by default): Iframes must be same-origin unless CORS is configured
2. **Parent dependency**: Requires parent window to run `IframeBridgeRelay`
3. **No persistence**: Messages are not persisted
4. **Dev/Testing focus**: Not optimized for production games (use P2P or server transports)

## Debugging

### Enable Logging

```typescript
// In iframe
const transport = new IframeBridgeTransport({ roomId: 'test', isHost: true });

transport.metrics?.onConnectionChange((state) => {
  console.log('[IframeBridge] Connection:', state);
});

transport.onPeerJoin((peerId) => {
  console.log('[IframeBridge] Peer joined:', peerId);
});

transport.onMessage((msg, senderId) => {
  console.log('[IframeBridge] Message from', senderId, msg);
});
```

### Common Issues

**Problem**: Iframe not connecting to relay
**Solution**: Ensure parent window has created `IframeBridgeRelay` before iframe loads

```typescript
// ❌ Wrong - relay created after iframes load
setTimeout(() => {
  const relay = new IframeBridgeRelay(); // Too late!
}, 1000);

// ✅ Correct - relay created before iframes
const relay = new IframeBridgeRelay();
const iframe = document.createElement('iframe');
iframe.src = '/game.html';
```

**Problem**: Messages not delivering
**Solution**: Check that both iframes use the same `roomId`

```typescript
// ❌ Wrong - different room IDs
// Host iframe
const hostTransport = new IframeBridgeTransport({ roomId: 'room-1', isHost: true });

// Client iframe
const clientTransport = new IframeBridgeTransport({ roomId: 'room-2', isHost: false });

// ✅ Correct - same room ID
const roomId = 'my-game';
const hostTransport = new IframeBridgeTransport({ roomId, isHost: true });
const clientTransport = new IframeBridgeTransport({ roomId, isHost: false });
```

**Problem**: Connection state stuck on "connecting"
**Solution**: Check browser console for postMessage errors

## Cleanup

Always destroy the relay when done:

```typescript
// Parent window
const relay = new IframeBridgeRelay();

// When page unloads or component unmounts
window.addEventListener('beforeunload', () => {
  relay.destroy();
});

// Or in framework cleanup (React, Vue, Svelte, etc.)
onDestroy(() => {
  relay.destroy();
});
```

Iframes should also disconnect:

```typescript
// In iframe
const transport = new IframeBridgeTransport({ roomId: 'test', isHost: true });

window.addEventListener('beforeunload', () => {
  transport.disconnect();
});
```

## See Also

- [Transports Overview](./overview)
- [LocalTransport](./local) - For same-page multiplayer
- [TrysteroTransport](./trystero) - For P2P production games
- [Custom Transports](./custom) - Build your own
