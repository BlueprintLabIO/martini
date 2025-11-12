# Data Structures

This document defines all TypeScript types used in the Martini SDK wire protocol and internal runtime.

**Fixes Issues:** #15 (QueuedAction), #16 (ActionResult), #20 (ActionLog)

---

## Table of Contents

1. [Wire Protocol Types](#wire-protocol-types)
2. [Internal Runtime Types](#internal-runtime-types)
3. [User-Facing Types](#user-facing-types)
4. [Utility Types](#utility-types)

---

## Wire Protocol Types

These types are serialized over the network. All transport adapters must use these exact shapes.

### WireSnapshot

Full game state sent when client joins or falls behind.

```typescript
type WireSnapshot = {
  kind: 'snapshot';
  tick: number;        // Absolute tick of this snapshot
  revision: number;    // Monotonically increasing state version
  state: GameState;    // Full canonical state (JSON-serializable)
};
```

**Example:**
```typescript
{
  kind: 'snapshot',
  tick: 100,
  revision: 42,
  state: {
    players: {
      'p1': { x: 100, y: 200, score: 10 },
      'p2': { x: 300, y: 400, score: 20 }
    },
    coins: [
      { id: 'c1', x: 150, y: 250, collected: false }
    ]
  }
}
```

---

### WireDiff

Incremental state changes (bandwidth-efficient).

```typescript
type WireDiff = {
  kind: 'diff';
  tick: number;          // Tick this diff was produced on
  revision: number;      // Revision AFTER applying diff
  baseRevision: number;  // Revision the diff should apply to
  patches: Patch[];      // Array of state mutations
};
```

**Example:**
```typescript
{
  kind: 'diff',
  tick: 101,
  revision: 43,
  baseRevision: 42,
  patches: [
    { op: 'set', path: ['players', 'p1', 'x'], value: 105 },
    { op: 'set', path: ['coins', '0', 'collected'], value: true }
  ]
}
```

---

### Patch

Individual state mutation operation.

```typescript
type Patch = {
  op: 'set' | 'delete' | 'push' | 'splice';
  path: string[];     // Array of path segments (e.g., ['players', 'p1', 'x'])
  value?: any;        // New value for set/push/splice
  index?: number;     // Required for splice operations
  id?: string;        // Optional stable ID for list items
};
```

**Examples:**

```typescript
// Set nested property
{ op: 'set', path: ['players', 'p1', 'x'], value: 150 }

// Delete object property
{ op: 'delete', path: ['players', 'p3'] }

// Delete array element by ID
{ op: 'delete', path: ['coins', '0'], id: 'c1' }

// Delete array element by index (no ID)
{ op: 'delete', path: ['particles', '5'] }

// Push to array
{ op: 'push', path: ['bullets'], value: { x: 100, y: 200, angle: 45 } }

// Splice array (replace element)
{ op: 'splice', path: ['enemies'], index: 2, value: newEnemy, id: 'e5' }
```

**Important:** If array elements have `id` field, patches MUST use that ID (not index) to prevent reorder bugs.

---

### WireMessage

Union of all network message types.

```typescript
type WireMessage =
  | ActionMessage
  | WireSnapshot
  | WireDiff
  | JoinMessage
  | LeaveMessage
  | HeartbeatMessage
  | HostMigrationMessage
  | ResyncRequestMessage
  | ResyncResponseMessage
  | ActionRejectedMessage
  | ChecksumMessage;
```

#### ActionMessage

Player input sent to server.

```typescript
type ActionMessage = {
  type: 'action';
  actionName: string;  // Action name (e.g., 'move', 'shoot')
  payload: any;        // Action input (validated by action.input schema)
  tick: number;        // Client tick when action was queued
  playerId: string;    // Who performed the action
  actionIndex: number; // Client's local index (0 for predicted actions); IGNORED by server
  timestamp: number;   // Client timestamp (for ordering same-tick actions)
};

**Authoritative ordering rules:**
- **Clients:** Set `actionIndex: 0` for all predicted actions (actual value doesn't matter, server ignores it)
- **Server:** IGNORES client's `actionIndex` completely when determining execution order
- **Server:** Sorts incoming actions by `(tick, timestamp, playerId)` and assigns fresh indices `[0, 1, 2...]` per tick
- **Server:** Only the server-assigned indices are written to `QueuedAction`, heartbeats (`queueTail`), and host-migration payloads
- **Determinism:** `createActionRandom(tick, actionIndex)` MUST use the server-assigned index so all replicas (warm standbys, resyncs, migrations) replay identical RNG sequences

**Example flow:**
```typescript
// CLIENT: Predict action
game.actions.move({ dx: 5 });
→ Send: { actionIndex: 0, tick: 100, timestamp: 1234567890, ... }

// SERVER: Receives 3 actions at same tick
// Action A: { playerId: 'p1', tick: 100, timestamp: 1234567890, actionIndex: 0 }
// Action B: { playerId: 'p2', tick: 100, timestamp: 1234567891, actionIndex: 0 }
// Action C: { playerId: 'p1', tick: 100, timestamp: 1234567892, actionIndex: 0 }

// SERVER: Sorts by timestamp, assigns fresh indices
sorted = sortBy(actions, ['tick', 'timestamp', 'playerId']);
sorted[0].actionIndex = 0;  // Action A (earliest timestamp)
sorted[1].actionIndex = 1;  // Action B
sorted[2].actionIndex = 2;  // Action C

// These authoritative indices are used in createActionRandom(tick, actionIndex)
```
```

#### JoinMessage

Server notifies clients of new player (includes full snapshot for joiner).

```typescript
type JoinMessage = {
  type: 'join';
  playerId: string;
  tick: number;
  snapshot: WireSnapshot;  // Full state for joining player
};
```

#### LeaveMessage

Server notifies clients of player disconnect.

```typescript
type LeaveMessage = {
  type: 'leave';
  playerId: string;
  tick: number;
  reason: string;  // 'disconnect', 'timeout', 'kicked', etc.
};
```

#### HeartbeatMessage

**Fixes Issue #2** - Added missing fields for warm standby replication.

```typescript
type HeartbeatMessage = {
  type: 'heartbeat';
  tick: number;
  revision: number;
  sessionId: string;           // Current host's session ID
  queueChecksum: string;       // ✅ FIX: Checksum of action queue
  queueTail: QueuedAction[];   // ✅ FIX: Actions since last heartbeat
  snapshotTick: number;        // ✅ FIX: Latest snapshot available for warm standby
};
```

#### HostMigrationMessage

Broadcast when P2P host changes (failover).

```typescript
type HostMigrationMessage = {
  type: 'host_migration';
  newHost: string;               // New host's session ID
  snapshot: WireSnapshot;        // Last confirmed state
  actionQueue: QueuedAction[];   // Actions to replay
};
```

#### ResyncRequestMessage

Client requests full snapshot (fell behind or detected desync).

```typescript
type ResyncRequestMessage = {
  type: 'resync_request';
  requesterId: string;
  lastKnownTick: number;
  reason: string;  // 'revision_mismatch', 'desync', 'reconnect', etc.
};
```

#### ResyncResponseMessage

Server responds to resync request with full snapshot.

```typescript
type ResyncResponseMessage = {
  type: 'resync_response';
  snapshot: WireSnapshot;
  diffsSince: WireDiff[];  // Any diffs newer than snapshot
};
```

#### ActionRejectedMessage

Server notifies client that action was rejected.

```typescript
type ActionRejectedMessage = {
  type: 'action_rejected';
  playerId: string;
  actionName: string;
  reason: string;  // 'cooldown', 'invalid_input', 'proximity', etc.
  tick: number;
};
```

#### ChecksumMessage

Server broadcasts periodic state checksum for desync detection.

```typescript
type ChecksumMessage = {
  type: 'checksum';
  tick: number;
  checksum: string;  // FNV-1a hash of deterministic JSON
};
```

---

## Internal Runtime Types

These types are used internally by the runtime. Not serialized over network.

### RuntimeState

**Fixes Issue #15** - Complete definition including QueuedAction.

```typescript
interface RuntimeState {
  tick: number;                      // Current simulation tick
  revision: number;                  // State version (increments on mutation)
  state: any;                        // User's game state (wrapped in Proxy)
  snapshots: StateSnapshot[];        // Ring buffer for rollback
  actionQueue: QueuedAction[];       // Pending actions to process
  playerCooldowns: Map<string, Map<string, number>>;  // playerId → actionName → lastTick
  rateLimitTracker: Map<string, Map<string, number[]>>;  // playerId → actionName → [ticks]
}
```

### StateSnapshot

Point-in-time state capture for rollback.

```typescript
interface StateSnapshot {
  tick: number;
  revision: number;
  state: any;  // Deep cloned game state
}
```

### QueuedAction

**Fixes Issue #15** - Complete QueuedAction type definition.

```typescript
interface QueuedAction {
  name: string;          // Action name
  payload: any;          // Action input (already validated)
  playerId: string;      // Who queued this action
  tick: number;          // When action should execute
  actionIndex: number;   // Stable per-tick ordering for RNG seeding
  predicted: boolean;    // Client-predicted vs server-confirmed
  timestamp: number;     // For ordering same-tick actions
}
```

**Usage:**
```typescript
// Client predicts action (stored locally):
{
  name: 'move',
  payload: { dx: 5, dy: 0 },
  playerId: 'p1',
  tick: 100,
  actionIndex: 0,        // Client assigns 0 for predicted actions
  predicted: true,
  timestamp: Date.now()
}

// Server receives, sorts, and assigns final actionIndex:
{
  name: 'move',
  payload: { dx: 5, dy: 0 },
  playerId: 'p1',
  tick: 103,
  actionIndex: 4,        // Server assigns based on (tick, timestamp) sort order
  predicted: false,
  timestamp: 1234567890
}

**Why both `actionIndex` and `timestamp`?**
- `timestamp` - Client-reported time when action was queued (used for sorting on server)
- `actionIndex` - Server-assigned index after sorting; ensures all replicas use identical `(tick, actionIndex)` pairs for `createActionRandom()`, guaranteeing deterministic RNG even when multiple actions arrive in same tick
```

### ActionResult

**Fixes Issue #16** - ActionResult type definition.

```typescript
type ActionResult =
  | { success: true }
  | { rejected: true; reason: string };
```

**Usage:**
```typescript
const result = executeAction(action);

if (result.rejected) {
  console.warn(`Action rejected: ${result.reason}`);
  // Rollback if predicted
}
```

### ActionLog

**Fixes Issue #20** - ActionLog type for replay export.

```typescript
interface ActionLog {
  tick: number;
  playerId: string;
  actionName: string;
  payload: any;
  predicted: boolean;
  actionIndex: number;
  timestamp: number;
  result?: ActionResult;  // Optional: outcome of action
}
```

**Usage:**
```typescript
const replay = runtime.dev.exportReplay();
// Returns ActionLog[] for deterministic replay
```

### ConnectionState

State machine for connection status.

```typescript
type ConnectionState =
  | 'connecting'    // Initial connection attempt
  | 'connected'     // Successfully connected
  | 'reconnecting'  // Lost connection, attempting reconnect
  | 'disconnected'; // Permanently disconnected
```

---

## User-Facing Types

These types are exposed in the public API.

### GameState

User-defined game state structure. Can be any JSON-serializable object.

```typescript
// GameState is defined by the user's setup() function
type GameState = any;

// Example GameState structures:
type ExampleGameState = {
  players: Record<string, { x: number; y: number; score: number }>;
  coins: Array<{ id: string; x: number; y: number; collected: boolean }>;
  tick: number;
};
```

**Requirements:**
- Must be JSON-serializable (no functions, symbols, or circular references)
- Should be flat or nested objects/arrays
- If using arrays with IDs, include `id` field for efficient diffing

**Note:** The SDK treats GameState as opaque - it just clones, diffs, and patches it. The structure is entirely up to the game developer.

---

### GameConfig

Top-level game definition.

```typescript
interface GameConfig {
  // Required: Initial state factory
  // Returns user-defined GameState structure
  setup: (context: { playerIds: string[]; time: number }) => GameState;

  // Required: Player actions
  actions: Record<string, ActionConfig>;

  // Optional: Server-only systems
  systems?: Record<string, SystemConfig>;

  // Optional: Runtime schema validation
  schema?: Schema;

  // Optional: Configuration
  config?: {
    minPlayers?: number;
    maxPlayers?: number;
      determinism?: {
        strict?: boolean;    // Throw on Math.random(), Date.now()
        autoWrap?: boolean;  // Monkey-patch Math.random()/Date.now() to deterministic wrappers
      };
    maxRollbackTicks?: number;  // Snapshot ring buffer size (default: 64)
  };

  // Optional: Phaser rendering (convenience API)
  // Requires: npm install phaser @types/phaser --save-dev
  render?: {
    setup?: (scene: any, context: RenderContext) => void;  // Use Phaser.Scene if @types/phaser installed
    update?: (scene: any, context: RenderContext) => void;
  };

  // Optional: Player lifecycle hooks
  onPlayerJoin?: (context: { game: GameState; playerId: string; random: SeededRandom; time: number }) => void;
  onPlayerLeave?: (context: { game: GameState; playerId: string; reason: string; random: SeededRandom; time: number }) => void;
}
```

### ActionConfig

Single action definition.

```typescript
interface ActionConfig {
  // Optional: Input validation schema
  input?: Record<string, SchemaRule | string>;

  // Optional: Built-in requirement checks
  requires?: ActionRequirements;

  // Required: Mutation function
  apply: (context: ActionContext) => void;

  // Optional: Enable client-side prediction (default: false)
  predict?: boolean;
}

interface ActionContext {
  game: GameState;      // Mutable game state (proxied if schema defined)
  playerId: string;     // Who performed this action
  input: any;           // Validated input payload
  random: SeededRandom; // Deterministic random (unique per action)
  time: number;         // Deterministic time (tick * tickDuration)
}

interface ActionRequirements {
  cooldown?: number;  // Milliseconds between calls

  proximity?: {
    get: (context: { game: GameState; input: any }) => { x: number; y: number } | null;
    distance: number;
  };

  rateLimit?: {
    max: number;      // Max calls
    window: number;   // Per window (ms)
  };
}
```

### SystemConfig

Server-only loop (physics, AI, spawning, etc.).

```typescript
interface SystemConfig {
  rate: number;  // Executions per second (may be <, =, or > server tickRate)
                 // rate < tickRate → system runs every Nth server tick
                 // rate > tickRate → system runs multiple times per server tick

  tick: (context: SystemContext) => void;

  predict?: boolean;  // ⚠️ WARNING: If true, clients also run
                      // System MUST be 100% deterministic (no Math.random, Date.now)
                      // Use game.random() and game.time instead
                      // Recommended: false for most systems (physics, AI, etc.)
}

interface SystemContext {
  game: GameState;      // Mutable game state
  dt: number;           // Delta time (1.0 / rate)
  random: SeededRandom; // Deterministic random (seeded by tick)
  time: number;         // Deterministic time
}
```

**System Rate Calculation Examples:**

| Server Tick Rate | System Rate | Executions per Tick | `dt` Value | Use Case |
|------------------|-------------|---------------------|------------|----------|
| 30 FPS | 30 | 1x | 1/30 ≈ 0.0333 | Normal physics |
| 30 FPS | 60 | 2x | 1/60 ≈ 0.0166 | High-precision physics |
| 30 FPS | 120 | 4x | 1/120 ≈ 0.0083 | Extremely precise simulation |
| 60 FPS | 60 | 1x | 1/60 ≈ 0.0166 | Fast-paced game |
| 30 FPS | 1 | 1x per 30 ticks | 1.0 | Slow periodic spawner (once/second) |

```javascript
// Example 1: 60 FPS physics on 30 FPS server (rate > tickRate)
systems: {
  physics: {
    rate: 60,  // System runs at 60 FPS
    tick: ({ game, dt }) => {
      // Called TWICE per server tick
      // dt = 1/60 = 0.0166... (NOT 1/30)

      // First call: server tick 100, system execution 0/2
      // Second call: server tick 100, system execution 1/2

      for (const player of Object.values(game.players)) {
        player.vy += 0.8 * dt;  // Gravity
        player.y += player.vy * dt;
      }
    }
  }
}

// Example 2: 1 FPS spawner on 30 FPS server (rate < tickRate)
systems: {
  spawner: {
    rate: 1,  // Runs once per second (1 FPS)
    tick: ({ game, dt }) => {
      // Called once every 30 ticks (at tick 0, 30, 60, 90...)
      // dt = 1.0 (one full second)

      console.log(`Spawning enemy at tick ${game.getTick()}`);
      game.enemies.push({
        type: 'goblin',
        x: game.random.range(0, 800),  // Use game.random (global seed)
        y: 100
      });
    }
  }
}
```

**Important notes:**
- `dt` is always `1 / system.rate`, NOT `1 / tickRate`
- System executions are distributed evenly across each server tick when `rate >= tickRate`, and are skipped until their interval elapses when `rate < tickRate`
- Higher system rate = more CPU per tick but smoother simulation
- For most games, `rate === tickRate` is sufficient
- Very low rates (e.g., 1 Hz spawn systems) are supported—runtime simply runs them every `tickRate / rate` ticks

### Schema

State validation rules.

```typescript
type Schema = Record<string, SchemaRule>;

interface SchemaRule {
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  min?: number;      // For numbers
  max?: number;      // For numbers
  enum?: any[];      // Allowed values
  strict?: boolean;  // If true, reject instead of clamp (default: false)
                     // Example: strict=false → 1000 clamped to max:10
                     //          strict=true  → 1000 rejected with error
}
```

**Example:**
```typescript
schema: {
  'players.*.health': { type: 'number', min: 0, max: 100 },  // Clamps by default
  'players.*.state': { type: 'string', enum: ['idle', 'running', 'jumping'] }
}
```

**Strict Mode Guidance:**

| Field Type | Use `strict: false` (clamp) | Use `strict: true` (reject) |
|------------|----------------------------|----------------------------|
| **Player-controlled values** | ✅ Position, health, score | ❌ Prone to client bugs |
| **Enum-like values** | ❌ Allows invalid states | ✅ State machines, action types |
| **Untrusted input** | ✅ Prevents exploits via clamping | ❌ May reject legitimate edge cases |
| **Trusted systems** | Either (personal preference) | Either (personal preference) |

**Examples:**

```typescript
schema: {
  // ✅ Clamp player position (prevents hacked clients from teleporting)
  'players.*.x': { type: 'number', min: 0, max: 800, strict: false },

  // ✅ Reject invalid player state (indicates bug, not hack)
  'players.*.state': {
    type: 'string',
    enum: ['idle', 'walking', 'jumping'],
    strict: true  // Error on typo/bug
  },

  // ✅ Clamp health (prevents instakill exploits)
  'players.*.health': { type: 'number', min: 0, max: 100, strict: false },

  // ✅ Reject invalid item IDs (should never happen)
  'inventory.*.itemId': {
    type: 'string',
    enum: ['sword', 'shield', 'potion'],
    strict: true
  }
}
```

**Anti-cheat consideration:**
- `strict: false` with clamping is **more secure** for numeric values (attackers can't exceed limits)
- `strict: true` is **better for debugging** (fails fast on bugs rather than silently correcting)

### GameAPI

Runtime API returned by `createRuntime().getAPI()`.

```typescript
interface GameAPI {
  // Identity
  myId: string;
  playerIds: string[];
  isHost: boolean;

  // State access (read-only)
  getState(): Readonly<GameState>;
  getTick(): number;
  getRevision(): number;
  getLatency(): number;

  // Actions (callable by user)
  actions: Record<string, (payload: any) => void>;

  // Subscriptions
  onChange(callback: (state: GameState, meta: ChangeMeta) => void): () => void;
  onPlayerJoin(callback: (playerId: string) => void): () => void;
  onPlayerLeave(callback: (playerId: string, reason: string) => void): () => void;

  // Deterministic helpers
  random: SeededRandom;  // Seeded random for current tick (use .range(), .choice(), etc.)
  time: number;          // Deterministic game time (tick * dt)

  // Debugging (dev mode only)
  dev?: DevAPI;
}

interface ChangeMeta {
  tick: number;
  predicted: boolean;     // Client prediction vs server confirmation
  rollback: boolean;      // Correction after misprediction
  changed: string[];      // Top-level state keys that changed
  revision: number;       // State version
}
```

### DevAPI

Development tools (only available in dev mode).

```typescript
interface DevAPI {
  setTick(tick: number): void;
  getSnapshot(tick: number): GameState | null;
  replayActions(fromTick: number): void;
  exportReplay(): ActionLog[];
  getChecksums(): Map<number, string>;  // tick → checksum
}
```

### RenderContext

**Fixes Issue #12** - Standardized render context.

```typescript
interface RenderContext {
  game: GameState;
  changed?: string[];     // Top-level keys that changed
  predicted?: boolean;    // Is this predicted state?
  tick?: number;
  revision?: number;
}
```

---

## Utility Types

### SeededRandom

Deterministic PRNG for actions/systems.

```typescript
class SeededRandom {
  constructor(seed: number);

  // Returns number in [0, 1)
  next(): number;

  // Returns integer in [min, max)
  range(min: number, max: number): number;

  // Returns random element from array
  choice<T>(array: T[]): T;

  // Shuffle array in-place (Fisher-Yates)
  shuffle<T>(array: T[]): T[];

  // Clone with same internal state
  clone(): SeededRandom;
}

// Factory: unique seed per action
function createActionRandom(tick: number, actionIndex: number): SeededRandom;
```

**Example:**
```typescript
// In action:
apply: ({ game, random }) => {
  const damage = random.range(10, 20);  // 10-19
  const target = random.choice(game.enemies);
  target.health -= damage;
}
```

---

## Type Exports

All types are exported from `@martini/core`:

```typescript
// User-facing
export type {
  GameConfig,
  ActionConfig,
  SystemConfig,
  ActionContext,
  SystemContext,
  GameState,
  GameAPI,
  ChangeMeta,
  Schema,
  SchemaRule
};

// Wire protocol (for adapter authors)
export type {
  WireMessage,
  WireSnapshot,
  WireDiff,
  Patch,
  ActionMessage,
  JoinMessage,
  LeaveMessage,
  HeartbeatMessage,
  HostMigrationMessage,
  ResyncRequestMessage,
  ResyncResponseMessage,
  ActionRejectedMessage,
  ChecksumMessage
};

// Internal (advanced usage)
export type {
  RuntimeState,
  StateSnapshot,
  QueuedAction,
  ActionResult,
  ActionLog,
  ConnectionState,
  RenderContext
};

// Classes
export { SeededRandom, createActionRandom };
```

---

## Next Steps

- **Need transport details?** → See [04-transport-interface.md](./04-transport-interface.md)
- **Need implementation details?** → See [06-implementation-guide.md](./06-implementation-guide.md)
- **Building a game?** → See [02-api-reference.md](./02-api-reference.md)
