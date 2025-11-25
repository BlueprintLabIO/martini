---
title: Choosing a Transport
description: Comparing P2P vs Client-Server architectures for multiplayer games
section: guides
subsection: networking
order: 2
---

# Choosing a Transport

martini-kit supports multiple transport layers. This guide helps you choose the right one for your game.

## Architecture Comparison

### Peer-to-Peer (P2P) Architecture

```
┌─────────┐         ┌─────────┐
│ Player1 │ ←─WebRTC─→ Player2 │
│ (Host)  │         │ (Client)│
└─────────┘         └─────────┘
      ↓                  ↑
      └─────────WebRTC───┘
           Player3 (Client)
```

**Pros:**
- ✅ No server costs
- ✅ Low latency (direct connection)
- ✅ Scales naturally
- ✅ Easy deployment (static hosting)

**Cons:**
- ❌ Host migration complexity
- ❌ NAT traversal issues (some networks block P2P)
- ❌ Host has all power (cheating concerns)
- ❌ Limited to 2-8 players typically

**Best for:** Casual games, prototypes, cooperative games

---

### Client-Server Architecture

```
┌─────────┐         ┌─────────┐
│ Player1 │ ←─WSS──→ │ Server  │
│         │         │ (Host)  │
└─────────┘         └─────────┘
                         ↑
┌─────────┐              │
│ Player2 │ ─────WSS─────┘
└─────────┘
```

**Pros:**
- ✅ Server-authoritative (anti-cheat)
- ✅ Reliable connections
- ✅ Host never disconnects
- ✅ Scales to many players (10+)

**Cons:**
- ❌ Server hosting costs
- ❌ Latency depends on server location
- ❌ Requires backend infrastructure

**Best for:** Competitive games, large player counts, games requiring anti-cheat

---

## Transport Options

### LocalTransport (Development)

```typescript
import { LocalTransport } from '@martini-kit/transport-local';

const transport = new LocalTransport({
  roomId: 'test-room',
  isHost: true
});
```

**Use case:** Local testing, development, CI/CD

[Learn more →](./local-testing)

---

### TrysteroTransport (P2P Production)

```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  appId: 'my-game-v1',
  roomId: getRoomCode(),
  isHost: determineIfHost(),
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
});
```

**Use case:** Casual multiplayer, 2-8 players, no server costs

**Room Management:**

```typescript
// Generate room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Join room from URL
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || generateRoomCode();

// Share room link
const shareableLink = `${window.location.origin}?room=${roomId}`;
```

[API Reference →](/docs/latest/api/transports/trystero)

---

### WebSocket Server (Custom)

```typescript
// Client-side
class WebSocketTransport implements Transport {
  private ws: WebSocket;
  
  constructor(url: string, roomId: string) {
    this.ws = new WebSocket(url);
    // ... implementation
  }
}

const transport = new WebSocketTransport('wss://your-server.com', 'room-123');
```

**Use case:** Production games, competitive, 10+ players

[Custom Transport Guide →](/docs/latest/api/transports/custom)

---

### IframeBridge (IDE Integration)

```typescript
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';

const transport = new IframeBridgeTransport({
  isHost: window.parent !== window
});
```

**Use case:** Embedded games, IDE previews

[API Reference →](/docs/latest/api/transports/iframe-bridge)

---

## Decision Matrix

| Requirement | Recommended Transport |
|-------------|----------------------|
| Local testing | LocalTransport |
| 2-4 players, casual | TrysteroTransport (P2P) |
| 5-8 players, casual | TrysteroTransport (P2P) |
| 10+ players | WebSocket Server |
| Competitive/ranked | WebSocket Server |
| Anti-cheat required | WebSocket Server |
| Zero server costs | TrysteroTransport (P2P) |
| IDE integration | IframeBridge |

## NAT Traversal Considerations

P2P connections may fail on restrictive networks:

**Solutions:**
1. Provide TURN servers (relay traffic when direct P2P fails)
2. Fall back to WebSocket server for failed P2P connections
3. Show clear error messages to users

```typescript
const transport = new TrysteroTransport({
  appId: 'my-game',
  roomId: 'room-123',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'username',
        credential: 'password'
      }
    ]
  }
});
```

## Next Steps

- **[Local Testing →](./local-testing)** - Development workflow
- **[Security →](./security)** - Best practices
- **[Custom Transports →](/docs/latest/api/transports/custom)** - Build your own
