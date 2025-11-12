# Core Concepts

This document explains the fundamental architecture, data flow, and runtime behavior of the Martini Multiplayer SDK.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Runtime Architecture](#runtime-architecture)
3. [Host Selection & Failover](#host-selection--failover)
4. [Data Flow](#data-flow)
5. [State Synchronization Format](#state-synchronization-format)

---

## Design Principles

### 1. Server Authority

The host (server or designated peer) runs the **canonical simulation**. Clients predict optimistically but always defer to server state.

**Why?** Prevents cheating. Client modifications can't affect other players.

### 2. Zero Networking

Users never write `send()`, `receive()`, or synchronization code. The runtime handles all network operations automatically.

**Why?** Reduces complexity. Same logic file works with any transport (Colyseus, Nakama, P2P).

### 3. Plain JavaScript

No custom DSL, no code generation. Just functions and objects.

**Why?** AI can generate code directly. Developers can debug with standard tools.

### 4. Optional Safety

Schema validation and input checking are opt-in. Simple games can skip them.

**Why?** Faster iteration for prototypes. Add safety when needed.

### 5. Transport Agnostic

Runtime works with any transport adapter that implements the [Transport interface](./04-transport-interface.md).

**Why?** Start with P2P for prototyping, upgrade to hosted servers for production without changing game logic.

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User Game Logic (game.js)                                   │
│  - setup()           → Initialize state                     │
│  - actions: {}       → Player inputs (move, shoot, etc.)    │
│  - systems: {}       → Server-only loops (physics, AI)      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Martini Runtime                                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Action Queue │  │ State Store  │  │ Schema Proxy │      │
│  │              │  │              │  │              │      │
│  │ [action1,    │  │ current:     │  │ Validates    │      │
│  │  action2,    │─▶│ { tick: 100, │◀─│ mutations    │      │
│  │  action3]    │  │   state: {} }│  │ Auto-clamps  │      │
│  └──────────────┘  │              │  └──────────────┘      │
│                    │ snapshots:   │                         │
│  ┌──────────────┐  │ [96, 97, 98, │  ┌──────────────┐      │
│  │ Predict-     │  │  99, 100]    │  │ Determinism  │      │
│  │ Rollback     │─▶│              │◀─│ Wrappers     │      │
│  │ Engine       │  │ (ring buffer)│  │              │      │
│  └──────────────┘  └──────────────┘  │ random()     │      │
│                                       │ time         │      │
│                                       └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Transport Layer (pluggable)                                 │
│                                                              │
│  Colyseus  │  Nakama  │  Trystero (P2P)  │  Custom         │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| **Action Queue** | Buffers player inputs, processes in tick order |
| **State Store** | Maintains current state + N snapshots for rollback |
| **Schema Proxy** | Runtime validation, auto-clamping, mutation tracking |
| **Predict-Rollback Engine** | Optimistic execution + reconciliation |
| **Determinism Wrappers** | Seeded random, tick-based time |
| **Transport Layer** | Network abstraction (send/receive messages) |

---

## Host Selection & Failover

### Mode 1: Dedicated Host (Colyseus/Nakama)

When `createRuntime` runs with `isHost: true` inside a server process:
- That process is the **sole authority** for the room's lifetime
- Infrastructure-level restarts spin up a fresh room
- Clients **never self-elect** in this mode

### Mode 2: Peer Host (P2P Adapters)

When using P2P transports (Trystero, WebRTC):

#### Initial Host Selection
- **First peer** to create/join an empty room becomes host (`isHost: true`)
- Determined by: `room.getPeers().length === 0` when joining
- Subsequent peers join as clients (`isHost: false`)

#### Warm Standby Replication
- Host emits **heartbeat** every 500ms:
  ```typescript
  {
    type: 'heartbeat',
    tick: number,
    revision: number,
    sessionId: string,
    queueChecksum: string,      // Checksum of action log
    queueTail: QueuedAction[],  // Actions since last heartbeat
    snapshotTick: number         // Latest snapshot tick available
  }
  ```
- Designated **warm-standby peer** maintains:
  - Replicated action log (via `queueTail` from heartbeats)
  - Periodic snapshots (requested every N ticks, default 60)

#### Failover Trigger
- Missing **3 consecutive heartbeats** (1.5s) triggers election

#### Deterministic Election & Announcement
- When election is triggered, warm-standby peers independently sort candidates by **lexical sessionId** (tie-breaker only)
- The winner loads its replicated snapshot/action log and immediately broadcasts a `host_migration` message that includes `newHost`, `snapshot`, and `actionQueue`
- All clients update their `currentHost` only after receiving `host_migration` (or the first heartbeat from the new host). Joining peers never re-elect on their own.

**Note:** RTT-based election would require peers to measure latency to each other, which adds complexity. Lexical sorting ensures all peers agree on the winner without coordination.

#### Handoff Payload
New host broadcasts:
```typescript
{
  type: 'host_migration',
  newHost: string,
  snapshot: WireSnapshot,        // Last confirmed snapshot
  actionQueue: QueuedAction[]    // Replayed from warm standby
}
```

**Source:** Warm standby data already stored locally. No messages from terminated host required.

### Compliance Rules

1. **Single Authority Guarantee**: Only one runtime may advertise `isHost: true` at any given time
2. **Continuous Queue Replication**: Adapters that cannot guarantee action log replication are non-compliant
3. **Split-Brain Prevention**: Transports must drop conflicting host announcements

### Split-Brain Prevention

If two peers simultaneously announce as host (rare edge case):

1. Peers compare the competing `host_migration` announcements lexically by `sessionId`
2. Lower sessionId wins; higher sessionId immediately steps down and resumes client mode
3. Losing peer discards their `host_migration` broadcast
4. All peers converge on same host within 1 RTT

**Example:**
```
Peer A (sessionId: "abc") detects host timeout, announces as new host
Peer B (sessionId: "xyz") detects host timeout, announces as new host

Both peers receive both announcements:
  - A sees: "abc" < "xyz" → I am host ✅
  - B sees: "abc" < "xyz" → A is host, I step down ✅

Result: All peers agree A is host within ~100ms
```

**Transport requirement:** Must deliver all broadcasts to all peers (no message loss during election)

---

## Data Flow

### Client-Side Prediction Flow

**Note:** Prediction is **opt-in** via `predict: true` in action config. Actions with `predict: false` (default) wait for server confirmation before updating UI.

```
User Input
    ↓
Predict Locally (instant, 0ms lag) ← Only if predict: true
    ↓
Update UI Optimistically
    ↓
Queue Action → Send to Server
    ↓
Wait for Server Response...
    ↓
Server State Arrives
    ↓
Compare with Prediction
    ↓
Rollback if Mismatch (rare)
```

**Example:**
```javascript
// User presses 'A' key
game.actions.move({ dx: -5 });

// Instant (tick 100):
//   Client predicts: player.x = 95
//   UI updates immediately (0ms lag)

// Server receives (tick 103):
//   Server validates and executes
//   Server broadcasts to all clients

// Client receives (tick 106):
//   If server agrees: player.x = 95 ✅ (no correction needed)
//   If server rejected: rollback to tick 103, replay (rare)
```

### Server Authority Flow

```
Receive Action
    ↓
Validate Input Schema
    ↓
Check Requirements (cooldown, proximity, etc.)
    ↓
Execute action.apply() on Canonical State
    ↓
Increment Revision Number
    ↓
Generate State Diff (patches)
    ↓
Broadcast Diff to All Clients
```

**Example:**
```javascript
// Client sends:
{ type: 'action', actionName: 'move', payload: { dx: 1000 }, tick: 100, actionIndex: 0 }

// Server validates:
input: { dx: { type: 'number', min: -10, max: 10 } }
// → Clamps 1000 to 10 (cheat prevented)

// Server applies:
game.players[playerId].x += 10;  // Not 1000!

// Server broadcasts:
{
  kind: 'diff',
  tick: 100,
  revision: 42,
  baseRevision: 41,
  patches: [{ op: 'set', path: ['players', 'p1', 'x'], value: 110 }]
}
```

---

## State Synchronization Format

To ensure all transport adapters remain interoperable, we define a standard wire format.

### Full Snapshot (Join/Reconnect)

```typescript
type WireSnapshot = {
  kind: 'snapshot';
  tick: number;        // Absolute tick of this snapshot
  revision: number;    // Monotonically increasing state version
  state: GameState;    // Full canonical state (JSON-serializable)
};
```

**When sent:**
- Player joins
- Player reconnects after timeout
- Client falls behind by >32 revisions (configurable `maxDiffGap`)

### Incremental Diff (Normal Updates)

```typescript
type WireDiff = {
  kind: 'diff';
  tick: number;          // Tick this diff was produced on
  revision: number;      // Revision AFTER applying diff
  baseRevision: number;  // Revision the diff should apply to
  patches: Patch[];
};

type Patch = {
  op: 'set' | 'delete' | 'push' | 'splice';
  path: string[];     // Array of path segments (e.g., ['players', 'p1', 'x'])
  value?: any;        // New value for set/push/splice
  index?: number;     // Required for splice operations
  id?: string;        // Optional stable ID for list items
};
```

**Example patches:**
```javascript
// Set nested property
{ op: 'set', path: ['players', 'p1', 'x'], value: 150 }

// Delete array element by ID
{ op: 'delete', path: ['coins', '0'], id: 'coin-123' }

// Push to array
{ op: 'push', path: ['particles'], value: { x: 100, y: 200 } }

// Splice array (replace element)
{ op: 'splice', path: ['enemies'], index: 2, value: newEnemy }
```

### Path Format

Paths are **arrays of strings**, not dot-notation strings:
- ✅ `['players', 'p1', 'score']`
- ❌ `'players.p1.score'`

**Why?** Keys can contain dots/brackets without escaping issues.

### ID-Based Array Updates

If array elements have an `id` field, patches MUST use that ID:
```javascript
// State:
coins: [
  { id: 'coin-1', x: 100 },
  { id: 'coin-2', x: 200 }
]

// Patch uses ID (not index):
{ op: 'delete', path: ['coins', '1'], id: 'coin-2' }
```

**Why?** Prevents reorder bugs when arrays change between client/server.

### Snapshot Ring Buffer

The runtime keeps **`maxRollbackTicks`** snapshots (default: 64 ticks) to satisfy:
- Client rollback (predict-rollback engine needs history)
- Client resync requests (fell behind due to network issues)
- Warm standby peers (host migration recovery)

**Configuration relationship:**
- `maxRollbackTicks` (default: 64) - How many snapshots to keep in memory for rollback
- `maxDiffGap` (default: 32) - When to send full snapshot vs incremental diff

**Why `maxDiffGap` is typically half of `maxRollbackTicks`:**
If a client falls behind by >32 revisions, the server sends a full snapshot instead of cumulative patches (more bandwidth-efficient). The server keeps 64 snapshots, so even if we send a snapshot at revision N-32, the server still has snapshots N-64 through N available for other clients.

**Example:** At tick 100, server has snapshots for ticks 36-100. If client is at tick 68 (32 ticks behind), server sends full snapshot. If client is at tick 80 (20 ticks behind), server sends incremental diffs.

### Resync Protocol

Client detects revision mismatch:
```javascript
// Received diff.baseRevision = 50
// My revision = 48 (I'm behind!)

// Request full snapshot:
transport.send({
  type: 'resync_request',
  requesterId: myId,
  lastKnownTick: 98,
  reason: 'revision_mismatch'
}, hostSessionId);  // Unicast to host only

// Host responds:
{
  type: 'resync_response',
  snapshot: WireSnapshot,  // Full state
  diffsSince: WireDiff[]   // Any diffs newer than snapshot
}
```

**Fan-out Prevention:** Clients always unicast `resync_request` to the currently elected host (announced via heartbeat `sessionId`). Only that host replies.

---

## Next Steps

- **Understand the API?** → See [02-api-reference.md](./02-api-reference.md)
- **Need type definitions?** → See [03-data-structures.md](./03-data-structures.md)
- **Want to implement?** → See [06-implementation-guide.md](./06-implementation-guide.md)
