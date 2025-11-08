# Multiplayer System Overview

**Last Updated:** 2025-11-08
**Status:** MVP Complete (P2P Mode)
**Next Phase:** Server-Authoritative Mode

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation (P2P)](#current-implementation-p2p)
3. [Future Implementation (Server Mode)](#future-implementation-server-mode)
4. [Migration Path](#migration-path)
5. [API Reference](#api-reference)
6. [Deployment Guide](#deployment-guide)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Current: Peer-to-Peer (P2P) Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser 1 (Host)                            │
│  ┌──────────────────────┐         ┌────────────────────────┐   │
│  │  GamePreview.svelte  │────────►│ MultiplayerHost.ts    │   │
│  │  (Parent Window)     │         │ - SimplePeer          │   │
│  └──────────────────────┘         │ - Socket.IO Client    │   │
│           │                        └───────┬────────────────┘   │
│           │ postMessage                    │                    │
│  ┌────────▼──────────────┐                │                    │
│  │  sandbox-runtime.html │                │                    │
│  │  gameAPI.multiplayer  │                │                    │
│  └───────────────────────┘                │                    │
└────────────────────────────────────────────┼────────────────────┘
                                             │
                                             │ WebRTC
                                             │ Data Channel
                                             │
                     ┌───────────────────────▼───────────┐
                     │   Signaling Server (apps/signaling)│
                     │   - Socket.IO                      │
                     │   - Room management                │
                     │   - Lobby approval                 │
                     │   - Code expiration                │
                     └───────────────────────┬────────────┘
                                             │
                                             │ WebRTC
                                             │ Data Channel
┌────────────────────────────────────────────▼────────────────────┐
│                     Browser 2 (Client)                          │
│  ┌──────────────────────┐         ┌────────────────────────┐   │
│  │  GamePreview.svelte  │────────►│ MultiplayerClient.ts  │   │
│  │  (Parent Window)     │         │ - SimplePeer          │   │
│  └──────────────────────┘         │ - Socket.IO Client    │   │
│           │                        └────────────────────────┘   │
│           │ postMessage                                         │
│  ┌────────▼──────────────┐                                     │
│  │  sandbox-runtime.html │                                     │
│  │  gameAPI.multiplayer  │                                     │
│  └───────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- ✅ Zero server compute cost (only signaling)
- ✅ Sub-100ms latency (direct peer connection)
- ✅ Scales to ~6 players per game
- ❌ Host is authoritative (cheating possible)
- ❌ Host disconnection = game ends

---

## Current Implementation (P2P)

### Components

#### 1. Signaling Server (`apps/signaling/`)

**Purpose:** Facilitate WebRTC handshake between peers

**Responsibilities:**
- Create rooms with 6-digit share codes
- Relay SDP offers/answers and ICE candidates
- Manage lobby approval (pending joiners)
- Expire codes after 15 minutes
- Clean up stale rooms

**NOT Responsible For:**
- Game state management
- Data validation
- Anti-cheat
- Persistence

**Technology:**
- Socket.IO (WebSocket + polling fallback)
- In-memory room storage (Map)
- Express (health endpoints)

**Deployment:**
- Coolify with Nixpacks
- Scales vertically (single instance handles ~10k concurrent rooms)
- Stateless (can scale horizontally with Redis adapter)

#### 2. P2P Connection Layer

**MultiplayerHost (`lib/multiplayer/MultiplayerHost.ts`)**
- Manages SimplePeer instances for each client
- Broadcasts data to all connected peers
- Handles lobby approval (approve/deny)
- Forwards data between sandbox and peers

**MultiplayerClient (`lib/multiplayer/MultiplayerClient.ts`)**
- Creates SimplePeer connection to host
- Waits for lobby approval
- Forwards data between sandbox and host

**SimplePeer:**
- WebRTC wrapper library
- Handles ICE candidate gathering
- Creates RTCDataChannel for data transfer
- Uses STUN server for NAT traversal

#### 3. Sandbox API (`lib/multiplayer/gameAPI.ts`)

**Injected into sandbox iframe when multiplayer starts**

```javascript
gameAPI.multiplayer = {
  send(data),              // Send to all peers
  onData(callback),        // Receive from peers
  onPlayerJoined(callback),
  onPlayerLeft(callback),
  getPlayers(),
  isHost(),
  getPlayerId(),
  getRoomCode(),
  getTransport()           // For advanced users
}
```

**Communication Flow:**
```
Game Code → gameAPI.multiplayer.send()
    ↓ postMessage
Parent Window → SimplePeer.send()
    ↓ RTCDataChannel
Remote Peer → SimplePeer.on('data')
    ↓ postMessage
Game Code → gameAPI.multiplayer.onData()
```

#### 4. Security

**Sandbox Restrictions:**
- ✅ Allows: RTCPeerConnection, RTCDataChannel, RTCSessionDescription, RTCIceCandidate
- ❌ Blocks: WebSocket, fetch, XMLHttpRequest, localStorage

**Signaling Server Security:**
- ✅ 15-minute code expiration
- ✅ Host approval lobby
- ✅ CORS origin validation
- ❌ No JWT validation (MVP - anonymous)
- ❌ No rate limiting (future)

**Attack Vectors:**
- Brute-force: ~19 years with expiration + lobby (acceptable for MVP)
- DDoS: Possible (mitigate with rate limiting in production)
- Cheating: Host can manipulate state (acceptable for kids' games)

---

## Future Implementation (Server Mode)

### What Needs to Change for Server-Authoritative Games?

**Short Answer:** Not much! The abstraction layer (`gameAPI.multiplayer`) was designed for this.

### Architecture Changes

```
Current (P2P):
Game Code → SimplePeer → Remote Peer

Future (Server):
Game Code → Socket.IO → Game Server → Socket.IO → Remote Clients
```

### Required Additions

#### 1. Game Server (`apps/game-server/`) - **NEW**

**Purpose:** Host authoritative game instances

**Responsibilities:**
- ✅ Run game logic on server (Node.js + Phaser headless)
- ✅ Validate all player inputs
- ✅ Broadcast authoritative state to all clients
- ✅ Prevent cheating
- ✅ Handle disconnections gracefully
- ✅ Support 7-100+ players

**Technology Stack:**
```javascript
// Option 1: Headless Phaser on Node.js
import Phaser from 'phaser';

const config = {
  type: Phaser.HEADLESS,
  physics: { default: 'arcade' },
  scene: GameScene
};

const game = new Phaser.Game(config);
```

```javascript
// Option 2: Custom game loop
class GameServer {
  private state: GameState;
  private players: Map<string, Player>;

  update(deltaTime: number) {
    // Apply physics
    // Check collisions
    // Validate inputs
    // Broadcast state
  }
}
```

**Deployment:**
- Kubernetes (auto-scaling)
- 1 pod per game instance
- ~512MB RAM, 0.5 CPU per instance
- Estimated cost: $0.01/hour per game

#### 2. Modified Client (`lib/multiplayer/MultiplayerServerClient.ts`) - **NEW**

```typescript
class MultiplayerServerClient {
  private socket: Socket;

  send(action: PlayerAction) {
    // Send input to server (not state!)
    this.socket.emit('player-action', action);
  }

  onStateUpdate(callback: (state: GameState) => void) {
    // Receive authoritative state from server
    this.socket.on('state-update', callback);
  }
}
```

#### 3. Game Code Changes - **ZERO!**

The magic of the abstraction layer:

```javascript
// This code works for BOTH P2P and Server modes!
gameAPI.multiplayer.send({ action: 'move', x: 100, y: 200 });

gameAPI.multiplayer.onData((playerId, data) => {
  // In P2P: receives raw data from peer
  // In Server: receives validated state from server
});
```

**Under the hood:**
- P2P mode: `send()` → SimplePeer
- Server mode: `send()` → Socket.IO → Server validates → Broadcast

---

## Migration Path: P2P → Server

### Phase 1: MVP (Current - P2P Only) ✅

**Complexity:** Low
**Players:** 2-6
**Latency:** <100ms
**Cost:** $0 (only signaling)

### Phase 2: Hybrid (P2P + Server Option)

**Add:**
1. Game server codebase (`apps/game-server/`)
2. Server mode toggle in UI
3. Billing for server-hosted games

**Game Code Changes:** Zero

**Business Model:**
- Free: P2P mode (2-6 players)
- Paid: Server mode ($10/month, 7-100 players)

### Phase 3: Server-First (Deprecate P2P)

**When:**
- Platform has revenue
- Need anti-cheat
- Supporting competitive games

**Migration:**
- Automatically upgrade all games to server mode
- Keep P2P as fallback for small games

---

## How Complex is Server-Authoritative Mode?

### Complexity Comparison

| Aspect | P2P (Current) | Server Mode | Complexity Increase |
|--------|--------------|-------------|---------------------|
| **Signaling** | Socket.IO relay | Same | 0% |
| **Game Server** | None | Node.js + Phaser | **+100% (new component)** |
| **Client Code** | SimplePeer | Socket.IO | **+30% (similar)** |
| **Game API** | Already abstracted | No changes | **0%** |
| **Deployment** | 1 server | N pods (K8s) | **+200% (DevOps)** |
| **Monitoring** | Basic | Need game metrics | **+50%** |
| **Cost** | $0 | $0.01/hour/game | **+∞% (new cost)** |

**Total Estimated Effort:** ~2-3 weeks for MVP server mode

### What Makes It Complex?

#### 1. Game Server Implementation (Hardest Part)

**Challenge:** Running game logic on server

**Options:**

**Option A: Headless Phaser (Easier)**
```javascript
// Pros: Reuse existing game code
// Cons: ~100MB memory per game, CPU intensive

import Phaser from 'phaser';

const config = {
  type: Phaser.HEADLESS,
  width: 800,
  height: 600,
  physics: { default: 'arcade' }
};
```

**Option B: Custom Simulation (Better)**
```javascript
// Pros: Lightweight, optimized
// Cons: Must rewrite physics/collision

class GameSimulator {
  update(inputs: PlayerInput[]) {
    // Manual physics
    // Manual collision detection
    // State updates
  }
}
```

**Recommendation:** Start with Option A (headless Phaser), optimize to Option B later.

#### 2. State Synchronization

**Challenge:** 60 updates/sec to all players

**Current P2P:** Each peer sends full state (~1KB)
**Server Mode:** Server sends delta state (~200 bytes)

**Example:**
```typescript
interface GameStateDelta {
  frame: number;
  players: {
    [playerId: string]: {
      x?: number;  // Only if changed
      y?: number;
      vx?: number;
      vy?: number;
    }
  };
  entities: EntityUpdate[];
}
```

**Bandwidth:**
- 60 updates/sec × 200 bytes × 100 players = 1.2 MB/sec per game
- With delta compression: ~300 KB/sec

#### 3. Scalability & Orchestration

**Challenge:** Spin up/down game servers on demand

**Stack:**
```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-server-pool
spec:
  replicas: 10
  template:
    spec:
      containers:
      - name: game-server
        image: martini-game-server
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
```

**Auto-scaling:**
- Horizontal Pod Autoscaler (HPA)
- Scale based on active games
- Estimated: 1 pod per 10 concurrent games

#### 4. Monitoring

**What to Track:**
- Active games count
- Players per game
- Server FPS (should be 60)
- Latency (server → clients)
- Packet loss
- Server CPU/memory usage

**Tools:**
- Prometheus + Grafana
- OpenTelemetry for tracing

---

## Complexity Breakdown

### Minimal Server Mode (2 weeks)

**Week 1:**
- [ ] Create `apps/game-server/` with headless Phaser
- [ ] Load user game code into server
- [ ] Accept player inputs via Socket.IO
- [ ] Broadcast state updates (60 FPS)
- [ ] Test with 2 players locally

**Week 2:**
- [ ] Kubernetes deployment config
- [ ] API endpoint to provision game servers
- [ ] Client connects to game server (not peer)
- [ ] Test with 10 players
- [ ] Basic monitoring

**Result:** MVP server mode working

### Production-Ready Server Mode (+2 weeks)

**Week 3:**
- [ ] Delta compression for state updates
- [ ] Lag compensation
- [ ] Reconnection handling
- [ ] Host migration
- [ ] Rate limiting

**Week 4:**
- [ ] Comprehensive monitoring
- [ ] Load testing (100 players)
- [ ] Cost optimization
- [ ] Documentation

---

## Estimated Costs

### P2P Mode (Current)
- **Signaling Server:** $5/month (1 VPS)
- **Per Game:** $0
- **Total:** $5/month (unlimited games)

### Server Mode (Future)
- **Signaling Server:** $5/month
- **Game Server Pool:** $50/month base (10 pods)
- **Per Game:** $0.01/hour (~$7.20/month if 24/7)
- **Total:** $55/month (handles ~100 concurrent games)

**Break-even:** Need ~10 paid users ($10/month each)

---

## Recommendation

**For MVP:** Stick with P2P ✅
- Zero cost
- Faster to iterate
- Good enough for kids' games
- Learn user behavior first

**Add Server Mode When:**
- ✅ You have 100+ active users
- ✅ Users request 7+ player support
- ✅ Competitive games need anti-cheat
- ✅ Revenue to justify server costs

**Migration Path:** Already built-in via `gameAPI.multiplayer` abstraction!

---

## Quick Reference

### Current System Files

```
apps/signaling/          # Signaling server (done)
apps/web/
  src/lib/multiplayer/
    MultiplayerHost.ts   # P2P host (done)
    MultiplayerClient.ts # P2P client (done)
    gameAPI.ts           # Abstraction layer (done)
```

### To Add Server Mode

```
apps/game-server/        # NEW - Server-authoritative game engine
  src/
    GameServer.ts        # Main server class
    Simulator.ts         # Game simulation (headless Phaser or custom)
    StateManager.ts      # State synchronization

apps/web/
  src/lib/multiplayer/
    MultiplayerServerClient.ts  # NEW - Socket.IO client for server mode
```

### Complexity Rating

| Component | Complexity | Lines of Code | Time |
|-----------|-----------|---------------|------|
| P2P Signaling | ⭐⭐ | ~500 | ✅ Done |
| P2P Client | ⭐⭐⭐ | ~600 | ✅ Done |
| Server Engine | ⭐⭐⭐⭐⭐ | ~2000 | 2 weeks |
| State Sync | ⭐⭐⭐⭐ | ~500 | 3 days |
| Kubernetes | ⭐⭐⭐⭐ | ~200 (YAML) | 3 days |
| Monitoring | ⭐⭐⭐ | ~300 | 2 days |

**Total for Server Mode:** ~3600 LOC, 2-3 weeks

---

**Bottom Line:** You've built 90% of what's needed. Server mode is an extension, not a rewrite, thanks to the abstraction layer. Start with P2P, add server mode when you have product-market fit.
