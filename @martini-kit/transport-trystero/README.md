# @martini-kit/transport-trystero

**P2P WebRTC transport** for [@martini-kit/core](../core) using Trystero.

Enables serverless peer-to-peer multiplayer with zero infrastructure costs.

---

## Features

- ✅ **Zero server costs** - Fully P2P via WebRTC
- ✅ **Sticky host pattern** - First peer = permanent host (simple, predictable)
- ✅ **URL-based host selection** - Jackbox-style room joining
- ✅ **Reliable messaging** - Trystero handles message delivery
- ✅ **Auto host discovery** - Finds existing host or becomes host
- ✅ **Host disconnect detection** - Game ends if host leaves

---

## Installation

```bash
pnpm add @martini-kit/transport-trystero @martini-kit/core trystero
```

---

## Quick Start

### Jackbox-Style Room Joining

```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';
import { GameRuntime, defineGame } from '@martini-kit/core';

// Determine host from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const isHost = !roomId; // No room ID = host

// Generate room ID if host
const finalRoomId = isHost
  ? 'room-' + Math.random().toString(36).substring(2, 8)
  : roomId;

// Create transport with explicit host mode
const transport = new TrysteroTransport({
  roomId: finalRoomId,
  isHost: isHost // URL determines host!
});

// Create runtime
const runtime = new GameRuntime(gameLogic, transport, {
  isHost: isHost,
  playerIds: [transport.getPlayerId()]
});

// Show join link for clients
if (isHost) {
  const joinUrl = `${window.location.origin}?room=${finalRoomId}`;
  console.log('Share this link:', joinUrl);
}
```

---

## How It Works

### Sticky Host Pattern

```
HOST (opens without ?room param)
  ↓
  Creates new room ID
  ↓
  Shares link: https://game.com?room=ABC123
  ↓
CLIENT clicks link
  ↓
  Joins room ABC123
  ↓
  Connects to HOST via WebRTC
  ↓
  ✅ Game session established
```

**Key Points:**
- Host is determined by URL (no `?room` = host)
- Host never changes during session
- If host disconnects, game ends
- Simple, predictable, works like Jackbox

### WebRTC + Nostr Signaling

```
┌─────────┐         Nostr Relays        ┌─────────┐
│  HOST   │◄──────(signal only)────────►│ CLIENT  │
└─────────┘                              └─────────┘
     │                                        │
     └────────── WebRTC Direct P2P ──────────┘
             (game data flows here)
```

- Nostr relays only for WebRTC signaling (establishing connection)
- Game data flows directly peer-to-peer (no server)
- Low latency, zero server costs
- Decentralized protocol with 18+ relay redundancy

---

## API

### Constructor

```typescript
new TrysteroTransport(options: TrysteroTransportOptions)
```

**Options:**

```typescript
interface TrysteroTransportOptions {
  /** Unique room identifier for P2P session */
  roomId: string;

  /** Application ID for Trystero (prevents cross-app collisions) */
  appId?: string;

  /** Custom STUN/TURN servers for NAT traversal */
  rtcConfig?: RTCConfiguration;

  /**
   * Explicitly set this peer as host (industry standard: separate host/join URLs)
   * - true: This peer becomes host immediately
   * - false: This peer will never be host (always client)
   * - undefined: Automatic election (alphabetically lowest peer ID)
   */
  isHost?: boolean;
}
```

**Example:**

```typescript
const transport = new TrysteroTransport({
  roomId: 'game-room-123',
  appId: 'my-game',
  isHost: true,
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
});
```

### Methods

Implements the [`Transport` interface](https://martini-kit.com/docs/latest/api/core/transport):

- `send(message, targetId?)` - Send message to peer or broadcast
- `onMessage(handler)` - Listen for messages
- `onPeerJoin(handler)` - Listen for peer joins
- `onPeerLeave(handler)` - Listen for peer leaves
- `getPlayerId()` - Get this peer's ID
- `getPeerIds()` - Get connected peer IDs
- `isHost()` - Check if this peer is host

**Additional Methods:**

#### `waitForReady(): Promise<void>`

Wait for host discovery to complete (useful for automatic election mode).

```typescript
const transport = new TrysteroTransport({ roomId: 'room-123' });
await transport.waitForReady();

const isHost = transport.isHost(); // Now reliable!
```

#### `getCurrentHost(): string | null`

Get the current host's peer ID.

```typescript
const hostId = transport.getCurrentHost();
console.log('Host:', hostId);
```

#### `onHostDisconnect(callback): () => void`

Listen for host disconnection (game should end).

```typescript
transport.onHostDisconnect(() => {
  alert('Host left the game!');
  window.location.reload();
});
```

#### `getRoom(): Room`

Get the Trystero room instance (for advanced use).

```typescript
const room = transport.getRoom();
```

---

## Host Selection Modes

### 1. URL-Based (Recommended)

**Best for:** Jackbox-style games, classroom multiplayer

```typescript
const isHost = !new URLSearchParams(window.location.search).get('room');

const transport = new TrysteroTransport({
  roomId: isHost ? generateRoomId() : roomIdFromUrl,
  isHost: isHost // Explicit
});
```

**Pros:**
- Predictable (URL determines everything)
- User understands who's host
- No race conditions

### 2. Automatic Election

**Best for:** Symmetric multiplayer (no designated host)

```typescript
const transport = new TrysteroTransport({
  roomId: 'shared-room-123',
  isHost: undefined // Auto-elect
});

await transport.waitForReady(); // Wait for election
const isHost = transport.isHost();
```

**Pros:**
- No URL manipulation needed
- First peer auto-becomes host

**Cons:**
- Race condition if multiple peers join simultaneously
- Uses `waitForReady()` for host discovery

---

## Host Discovery Protocol

When `isHost: undefined` (automatic mode), the transport performs active host discovery:

```
1. Broadcast "host_query" message
   ↓
2. Wait 3 seconds for "host_announce" response
   ↓
3a. If response received → Use announced host
3b. If no response && no peers → Become solo host
3c. If conflict (two hosts) → Deterministic tiebreaker (lowest ID)
```

**Tiebreaker:**
If multiple peers think they're host, the peer with the alphabetically lowest ID wins.

---

## NAT Traversal

WebRTC requires STUN/TURN servers for NAT traversal:

### Default (Good for 90% of users)

```typescript
const transport = new TrysteroTransport({
  roomId: 'room-123',
  // Uses Google's public STUN server
});
```

### Custom TURN Server (99%+ success rate)

```typescript
const transport = new TrysteroTransport({
  roomId: 'room-123',
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com',
        username: 'user',
        credential: 'pass'
      }
    ]
  }
});
```

**When to use TURN:**
- Corporate firewalls
- Symmetric NAT
- 5-10% of users that STUN can't help

**TURN Providers:**
- [Twilio](https://www.twilio.com/stun-turn)
- [xirsys](https://xirsys.com/)
- Self-hosted: [coturn](https://github.com/coturn/coturn)

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

**Current coverage:** Comprehensive transport interface tests ✅

---

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

---

## Troubleshooting

### Peers can't connect

**Symptoms:** `onPeerJoin` never fires, peers list stays empty

**Solutions:**
1. Check if both peers use same `roomId`
2. Check if both peers use same `appId`
3. Try custom TURN server (NAT traversal)
4. Check browser console for WebRTC errors

### Host election conflicts

**Symptoms:** Both peers think they're host

**Solutions:**
- Use URL-based mode (`isHost: true/false`)
- Or use `waitForReady()` in automatic mode
- Check for race conditions (both opening simultaneously)

### Game ends when host refreshes

**This is by design!** Sticky host pattern = game ends if host leaves.

**Solutions:**
- Implement host migration (advanced, not currently supported)
- Or use WebSocket transport where server persists state

---

## Limitations

### P2P Limitations

- **No host migration:** If host disconnects, game ends
- **NAT traversal:** 5-10% of users may fail without TURN
- **Limited scale:** 2-8 players optimal (WebRTC mesh doesn't scale)
- **No persistence:** State lost when all peers disconnect

### When to Use WebSocket Instead

- Need host migration
- Need 8+ players
- Need state persistence
- Corporate/enterprise users (strict firewalls)

---

## See Also

- [@martini-kit/core](../core) - Core multiplayer SDK
- [@martini-kit/phaser](../phaser) - Phaser adapter
- [Trystero](https://github.com/dmotz/trystero) - Underlying P2P library
- [Live demos](https://martini-kit.com/preview) - Playable examples
- [API Reference](https://martini-kit.com/docs/latest/api/core/transport)

---

## License

MIT - See [LICENSE](../../LICENSE)
