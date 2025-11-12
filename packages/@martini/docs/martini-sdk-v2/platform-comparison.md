# Platform Comparison: Martini vs Colyseus vs Nakama vs Photon vs Rune

This guide clarifies where Martini fits in the multiplayer ecosystem and when to use it (alone or with other platforms).

---

## TL;DR: Different Layers, Different Problems

```
┌──────────────────────────────────────────────────────────┐
│ FULL PLATFORMS (Backend + State + Matchmaking + Auth)   │
│ Rune, Photon, Nakama                                    │
│ → All-in-one, vendor lock-in, managed hosting           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ BACKEND FRAMEWORKS (Rooms + Transport + Auth)           │
│ Colyseus                                                 │
│ → Server-side framework, you write room logic           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ STATE-SYNC RUNTIMES (Game Logic + State Sync)           │
│ Martini ← YOU ARE HERE                                  │
│ → Client-side runtime, you write declarative logic      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ LOW-LEVEL LIBRARIES (Sockets, WebRTC)                   │
│ Socket.io, Trystero, PeerJS                             │
│ → Raw networking, you write everything                  │
└──────────────────────────────────────────────────────────┘
```

---

## Detailed Comparison

### Rune (Full Platform)

**What it is:** Closed-source platform for mobile social games.

**Architecture:**
```
Your Game ──> Rune Platform (hosted) ──> Mobile Apps
   ↑                                         ↑
   └── Declarative logic                     └── Rune handles rendering
```

**Strengths:**
- ✅ Zero infrastructure setup
- ✅ Declarative game logic (similar to Martini)
- ✅ Matchmaking, leaderboards, social features built-in

**Weaknesses:**
- ❌ Closed-source (can't audit or modify)
- ❌ Vendor lock-in (can't self-host)
- ❌ Mobile-only (no desktop/web support)
- ❌ Engine integration is limited—you can’t drop it into Phaser
- ❌ Pricing scales with usage

**When to use Rune:**
- Mobile social games
- Don't want to manage infrastructure
- Accept vendor lock-in for convenience

**Can you use Martini instead?**
- ✅ Yes, if you want open-source
- ✅ Yes, if you want self-hosting
- ✅ Yes, if you want to use Phaser physics
- ❌ No, if you need mobile-specific social features

---

### Photon (Full Platform)

**What it is:** Commercial multiplayer platform for Unity/Unreal/Cocos.

**Architecture:**
```
Your Game ──> Photon Cloud (hosted) ──> Other Clients
   ↑                                        ↑
   └── RPCs, state sync                     └── Photon handles networking
```

**Strengths:**
- ✅ Battle-tested for 10+ years
- ✅ Excellent Unity integration
- ✅ Matchmaking, lobbies, voice chat
- ✅ Works with engine physics

**Weaknesses:**
- ❌ Expensive ($95-$500+/month)
- ❌ Imperative networking code (RPCs, callbacks)
- ❌ Vendor lock-in (can't self-host free tier)
- ❌ Not transport-agnostic

**When to use Photon:**
- Unity/Unreal games
- Need enterprise support
- Have budget for hosting

**Can you use Martini instead?**
- ✅ Yes, for declarative logic (cleaner code)
- ✅ Yes, to save costs (self-host)
- ⚠️ Partial (Unity bindings not ready yet)
- ❌ No, if you need voice chat or advanced matchmaking

**Can you use BOTH?**
- ✅ Yes! Use Photon for rooms/matchmaking, Martini for game logic:
  ```csharp
  // Use Photon rooms, Martini logic
  var transport = new PhotonTransport(room);
  var game = MartiniRuntime.Create(gameLogic, transport);
  ```

---

### Nakama (Backend Platform)

**What it is:** Open-source game server (Go) with client SDKs.

**Architecture:**
```
Your Game ──> Nakama Server (self-hosted or cloud) ──> Database
   ↑                  ↑
   └── Socket/RPC     └── Matchmaking, leaderboards, storage
```

**Strengths:**
- ✅ Open-source (can modify/audit)
- ✅ Self-hostable
- ✅ Auth, matchmaking, leaderboards, storage
- ✅ Multi-engine support (Unity, Godot, Unreal, etc.)

**Weaknesses:**
- ❌ Imperative networking (Lua scripts, RPCs)
- ❌ Complex setup (Go server, Postgres, config)
- ❌ Must write server-side game logic in Lua
- ❌ Not transport-agnostic (locked to Nakama protocol)

**When to use Nakama:**
- Need full backend (auth, storage, matchmaking)
- Want self-hosting
- OK writing server-side Lua

**Can you use Martini instead?**
- ❌ No—Nakama solves different problems (backend services)
- ✅ Use Martini FOR game logic, Nakama FOR infrastructure

**Can you use BOTH?**
- ✅ **YES, this is a great combo:**
  ```javascript
  // Use Nakama for auth/matchmaking/storage
  const nakamaClient = new Client(/* ... */);
  await nakamaClient.authenticateDevice(deviceId);
  const match = await nakamaClient.createMatch();

  // Use Martini for game logic (declarative, no Lua!)
  const transport = new NakamaTransport(nakamaClient, match);
  const game = defineGame({ /* your logic */ });
  PhaserAdapter.start({ game, transport });
  ```

---

### Colyseus (Backend Framework)

**What it is:** Node.js framework for multiplayer game servers.

**Architecture:**
```
Your Game ──> Colyseus Server (Node.js) ──> Room State
   ↑                  ↑
   └── WebSocket      └── You write room logic (TypeScript)
```

**Strengths:**
- ✅ Open-source
- ✅ Self-hostable
- ✅ TypeScript/JavaScript (familiar for web devs)
- ✅ Built-in state sync (@colyseus/schema)
- ✅ Room management, matchmaking

**Weaknesses:**
- ❌ Server-authoritative only (no P2P)
- ❌ Imperative room logic (you write socket handlers)
- ❌ Must run Node.js server
- ❌ Not transport-agnostic (WebSocket only)

**When to use Colyseus:**
- Want server-authoritative games
- Comfortable with Node.js/TypeScript
- Need room management

**Can you use Martini instead?**
- ❌ No—Colyseus is server-side, Martini is client-side
- ✅ Use Martini FOR game logic, Colyseus FOR rooms/transport

**Can you use BOTH?**
- ✅ **YES, highly recommended:**
  ```javascript
  // Server: Colyseus room acts as a "dumb relay"
  import { Room } from 'colyseus';

  class GameRoom extends Room {
    onCreate() {
      this.onMessage('action', (client, action) => {
        // Just broadcast actions, Martini handles logic
        this.broadcast('action', action, { except: client });
      });
    }
  }

  // Client: Martini handles all game logic
  const transport = new ColyseusTransport(client, room);
  const game = defineGame({ /* declarative logic */ });
  PhaserAdapter.start({ game, transport });
  ```

**Benefits of Colyseus + Martini:**
- ✅ Colyseus handles rooms, matchmaking, persistence
- ✅ Martini handles game logic (declarative, no socket handlers!)
- ✅ Room becomes a "dumb relay" (simple, easy to debug)

---

## Decision Matrix

### Choose Rune if:
- [ ] Mobile-only game
- [ ] Want zero infrastructure
- [ ] Accept vendor lock-in
- [ ] Need social features built-in

### Choose Photon if:
- [ ] Unity/Unreal game
- [ ] Need enterprise support
- [ ] Have budget ($95+/month)
- [ ] Need voice chat

### Choose Nakama if:
- [ ] Need full backend (auth, storage, leaderboards)
- [ ] Want self-hosting
- [ ] OK writing Lua server logic
- [ ] Multi-platform game

### Choose Colyseus if:
- [ ] Server-authoritative game
- [ ] Comfortable with Node.js
- [ ] Want lightweight backend
- [ ] Need room management

### Choose Martini if:
- [ ] Want declarative game logic
- [ ] Avoid writing networking code
- [ ] Transport flexibility (P2P, WebSocket, UDP)
- [ ] Self-hosting or no backend
- [ ] Open-source requirement

### Choose Martini + Platform if:
- [ ] Want declarative logic + backend services
- [ ] Best of both worlds:
  - **Martini:** Game state/logic (declarative)
  - **Platform:** Infrastructure (auth, rooms, matchmaking)

---

## Common Combinations

### 1. Martini Solo (No Backend)

**Use case:** Prototypes, local multiplayer, peer-to-peer games

```javascript
import { P2PTransport } from '@martini/transport-p2p';

const transport = new P2PTransport('room-123');
const game = defineGame({ /* logic */ });
PhaserAdapter.start({ game, transport });
```

**Pros:** Zero infrastructure, free, simple
**Cons:** No matchmaking, no persistence, NAT traversal issues

---

### 2. Martini + Colyseus (Best for Web Games)

**Use case:** Web games needing rooms, matchmaking, persistence

**Server (Colyseus):**
```typescript
import { Room } from 'colyseus';

class GameRoom extends Room {
  onCreate() {
    // Just relay Martini actions
    this.onMessage('action', (client, action) => {
      this.broadcast('action', action, { except: client });
    });
  }
}
```

**Client (Martini):**
```javascript
const client = new Colyseus.Client('ws://localhost:2567');
const room = await client.joinOrCreate('game_room');

const transport = new ColyseusTransport(client, room);
const game = defineGame({ /* declarative logic */ });
PhaserAdapter.start({ game, transport });
```

**Benefits:**
- ✅ Declarative game logic (Martini)
- ✅ Room management (Colyseus)
- ✅ Simple server (just a relay)

---

### 3. Martini + Nakama (Best for Mobile/Cross-Platform)

**Use case:** Games needing auth, leaderboards, storage, matchmaking

```javascript
// 1. Use Nakama for auth
const client = new Client(/* ... */);
await client.authenticateDevice(deviceId);

// 2. Use Nakama for matchmaking
const match = await client.createMatch();

// 3. Use Martini for game logic
const transport = new NakamaTransport(client, match);
const game = defineGame({ /* declarative logic */ });
PhaserAdapter.start({ game, transport });
```

**Benefits:**
- ✅ Declarative game logic (Martini)
- ✅ Auth, leaderboards, storage (Nakama)
- ✅ Self-hostable

---

### 4. Martini + Custom Server (Full Control)

**Use case:** High-performance games, custom infrastructure

```javascript
// Use any WebSocket/UDP server
const transport = new WebSocketTransport('wss://your-server.com');
const game = defineGame({ /* logic */ });
PhaserAdapter.start({ game, transport });
```

**Benefits:**
- ✅ Full control over infrastructure
- ✅ Optimize for your specific needs
- ✅ No vendor lock-in

---

## Summary

**Martini is NOT a replacement for Colyseus/Nakama/Photon.**

**Martini is a complementary layer** that gives you:
- Declarative game logic
- Transport independence
- Engine compatibility (Phaser, Unity, Godot)

**Use Martini:**
- **Alone:** For simple P2P games (no backend needed)
- **With Colyseus:** For web games (rooms + declarative logic)
- **With Nakama:** For mobile games (backend services + declarative logic)
- **With Custom Server:** For full control

**The goal:** Write game logic once, swap infrastructure easily.
