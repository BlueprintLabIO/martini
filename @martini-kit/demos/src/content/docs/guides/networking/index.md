---
title: Networking Overview
description: Understanding transports, deployment, and production networking
section: guides
subsection: networking
order: 3
scope: agnostic
---

# Networking Overview

martini-kit is **transport-agnostic** - your game logic works with any networking backend. This guide helps you choose the right transport and understand networking concepts.

## Transport Options

### LocalTransport (Development)

**Best for:** Local testing, development, CI/CD

```typescript
import { LocalTransport } from '@martini-kit/transport-local';

const transport = new LocalTransport({
  roomId: 'test-room',
  isHost: true
});
```

**Pros:**
- ✅ No server needed
- ✅ Test multiplayer in multiple tabs
- ✅ Fast iteration

**Cons:**
- ❌ Only works on same machine
- ❌ Not for production

[Learn more →](./local-testing)

---

### TrysteroTransport (P2P Production)

**Best for:** Casual games, 2-8 players, no server costs

```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  appId: 'my-game-v1',
  roomId: getRoomCode(),
  isHost: determineIfHost()
});
```

**Pros:**
- ✅ No server costs
- ✅ Low latency (direct P2P)
- ✅ Easy deployment (static hosting)

**Cons:**
- ❌ NAT traversal issues (some networks block P2P)
- ❌ Host has all power (cheating concerns)
- ❌ Host migration complexity

[Learn more →](/docs/latest/api/transports/trystero)

---

### WebSocket Server (Client-Server)

**Best for:** Competitive games, 10+ players, anti-cheat

```typescript
// Custom WebSocket transport
const transport = new WebSocketTransport({
  url: 'wss://your-server.com',
  roomId: 'game-123'
});
```

**Pros:**
- ✅ Server-authoritative (anti-cheat)
- ✅ Reliable connections
- ✅ Host never disconnects
- ✅ Scales to many players

**Cons:**
- ❌ Server hosting costs
- ❌ Requires backend infrastructure
- ❌ Latency depends on server location

[Learn more →](/docs/latest/api/transports/custom)

---

### IframeBridge (IDE Integration)

**Best for:** Embedded games, IDE previews

```typescript
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';

const transport = new IframeBridgeTransport({
  isHost: window.parent !== window
});
```

[Learn more →](/docs/latest/api/transports/iframe-bridge)

---

## Choosing a Transport

### Decision Tree

```
Do you need production deployment?
├─ No → LocalTransport
└─ Yes
   ├─ Is it a casual game (2-8 players)?
   │  └─ Yes → TrysteroTransport (P2P)
   └─ Is it competitive or 10+ players?
      └─ Yes → WebSocket Server
```

### Comparison Table

| Feature | Local | Trystero (P2P) | WebSocket |
|---------|-------|----------------|-----------|
| **Cost** | Free | Free | $$ (server) |
| **Latency** | 0ms | Low (direct) | Medium (server hop) |
| **Players** | 2-4 | 2-8 | 10+ |
| **Anti-cheat** | ❌ | ❌ | ✅ |
| **NAT issues** | ❌ | ⚠️ Sometimes | ❌ |
| **Setup** | Easy | Easy | Complex |

[Detailed comparison →](./choosing-transport)

## Key Concepts

### Host vs Client

- **Host**: Runs the authoritative game simulation
- **Client**: Receives state updates, mirrors host

The transport layer handles identifying who is the host.

### Room Codes

Most transports use room codes to group players:

```typescript
// Generate room code
const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

// Share with other players
const shareableLink = `${window.location.origin}?room=${roomId}`;
```

### State Synchronization

martini-kit automatically syncs state via the transport:

```
Host: state change → transport.send(diff) → Client: apply diff
```

You never call `transport.send()` directly - martini-kit handles it.

## Next Steps

- **[Choosing a Transport →](./choosing-transport)** - Detailed comparison
- **[Local Testing →](./local-testing)** - Development workflow
- **[Production Deployment →](./production)** - Hosting and deployment
- **[Security →](./security)** - Best practices for production
