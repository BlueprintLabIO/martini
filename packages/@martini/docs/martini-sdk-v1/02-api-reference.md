# API Reference

Complete API surface for the Martini Multiplayer SDK.

---

## createGame()

Define game logic (runs on server + clients).

```typescript
import { createGame } from '@martini/multiplayer';

export default createGame({
  // Required: Initial state factory
  setup: (context: { playerIds: string[]; time: number }) => GameState,

  // Required: Player actions
  actions: {
    [name: string]: {
      input?: Record<string, SchemaRule | string>;
      requires?: {
        cooldown?: number;
        proximity?: { get: Function; distance: number };
        rateLimit?: { max: number; window: number };
      };
      apply: (ctx: ActionContext) => void;
      predict?: boolean;
    }
  },

  // Optional: Server-only systems
  systems?: {
    [name: string]: {
      rate: number;           // Executions per second (may be <, =, or > server tickRate)
      tick: (ctx: SystemContext) => void;
      predict?: boolean;      // If true, clients also run (MUST be 100% deterministic!)
    }
  },

  // Optional: Schema validation
  schema?: Record<string, SchemaRule>,

  // Optional: Configuration
  config?: {
    minPlayers?: number;
    maxPlayers?: number;
    determinism?: { strict?: boolean; autoWrap?: boolean };
    maxRollbackTicks?: number;
  }
});
```

### Determinism Configuration

| Option | Behavior | When to use |
|--------|----------|-------------|
| `determinism.strict` | Throws immediately if user code calls `Math.random()`, `Date.now()`, `performance.now()`, or touches non-deterministic browser APIs while inside actions/systems/hooks. Guard rails only, no automatic fixes. | Production-ready code where you want to catch bugs at development time. Minimal overhead outside of guard checks. |
| `determinism.autoWrap` | Temporarily monkey-patches the globals above at the start of every action/system/hook so they transparently proxy to `context.random` and `game.time`. Also rewrites `setTimeout`/`setInterval` to deterministic schedulers when dev mode is enabled. Adds ~3-5% overhead due to patch/unpatch on every call. | Fast iteration/prototyping or AI-generated code where you cannot guarantee deterministic APIs are used yet. Ship with caution—prefer rewriting code to call the deterministic helpers directly. |

Both flags can be enabled together. In that case `autoWrap` rewrites the calls and `strict` still throws if a new API slips through the shim.

---

## createRuntime()

Initialize runtime with transport.

```typescript
import { createRuntime } from '@martini/multiplayer';

const runtime = await createRuntime(gameLogic, transport, {
  isHost: boolean,              // True for server/P2P host, false for clients

  // Initial player IDs to call setup()
  // ONLY required for P2P hosts creating empty room
  // Dedicated servers call setup() when first player joins via onPeerJoin
  playerIds?: string[],

  tickRate?: number,            // Server tick rate (default: 30)
  maxRollbackTicks?: number,    // Rollback window (default: 64 ticks)
  maxDiffGap?: number,          // Max diff revisions before forcing snapshot (default: 32)
  maxPredictionFrames?: number, // Client ahead limit (default: 6)
  devMode?: boolean,

  // Callbacks
  onReady?: () => void,
  onError?: (error: Error) => void,
  onDesync?: (details: DesyncEvent) => void
});

const game = runtime.getAPI();
```

**When to use `playerIds`:**

| Scenario | `playerIds` | When `setup()` is called |
|----------|-------------|--------------------------|
| **P2P host (new room)** | `[room.selfId]` | Immediately during `createRuntime()` |
| **Dedicated server** | Omit | Deferred until first player joins via `transport.onPeerJoin()` |
| **P2P client** | Omit | Never (receives snapshot from host) |
| **Client (any type)** | Omit | Never (receives snapshot from server) |

**Example - Dedicated Server Initialization:**
```typescript
// Server doesn't know playerIds until players connect
const runtime = await createRuntime(gameLogic, transport, {
  isHost: true,
  // playerIds omitted - setup() called when first player joins
});

// Runtime internally handles this:
transport.onPeerJoin((playerId) => {
  if (!state) {
    // First player - initialize game
    state = gameLogic.setup([playerId]);
  } else {
    // Add to existing game
    gameLogic.onPlayerJoin?.({ game: state, playerId, random });
  }
});
```

---

## GameAPI

Methods available on `game` object.

```typescript
// Identity
game.myId: string;
game.playerIds: string[];
game.isHost: boolean;

// State access (read-only)
game.getState(): Readonly<GameState>;
game.getTick(): number;
game.getRevision(): number;
game.getLatency(): number;

// Actions (call from UI)
game.actions.move({ dx: 5 });
game.actions.collect({ coinId: 'c1' });

// Subscriptions
game.onChange((state, meta) => {
  // meta: { tick, predicted, rollback, changed, revision }
});

game.onPlayerJoin((playerId) => {});
game.onPlayerLeave((playerId, reason) => {});

// Deterministic helpers
game.random.next(): number;           // 0.0 - 1.0
game.random.range(min, max): number;  // Integer in range [min, max)
game.random.choice(array): any;       // Pick random element
game.time: number;

// Dev mode (if enabled)
game.dev.setTick(100);
game.dev.exportReplay(): ActionLog[];
```

### Deterministic Helpers

#### `game.random`

Seeded random number generator. **Always use this instead of `Math.random()`** to ensure deterministic gameplay.

**⚠️ IMPORTANT:** When inside actions, systems, or hooks, use `context.random` instead of `game.random`. See detailed explanation below.

```javascript
// ❌ WRONG: Non-deterministic (causes desyncs)
const x = Math.random() * 100;
const enemy = enemies[Math.floor(Math.random() * enemies.length)];

// ✅ CORRECT: Deterministic random
const x = game.random.range(0, 100);
const enemy = game.random.choice(enemies);

// Available methods:
game.random.next();           // Returns 0.0 - 1.0
game.random.range(10, 20);    // Returns integer 10-19
game.random.choice([1,2,3]);  // Returns random element
game.random.shuffle(array);   // In-place shuffle (modifies array)
```

**Why required:** Same seed + same actions = identical results on all clients. Using `Math.random()` breaks this guarantee.

**IMPORTANT: `game.random` vs `context.random`**

The SDK provides random generators in two contexts:

| Context | Use | Scope | Deterministic? | Example |
|---------|-----|-------|----------------|---------|
| **`context.random`** (in actions/systems/hooks) | ✅ **Use this** | Per-action/tick seed | Yes (replicated) | `context.random.range(5, 10)` |
| **`game.random`** (global API) | ⚠️ Client rendering only | Global seed | No (cosmetic) | `game.random.next()` |
| **`Math.random()`** | ❌ **Never use** | N/A | No (throws error if `strictDeterminism: true`) | N/A |

**Rule:** Always prefer `context.random` when available. It has a unique seed per action, ensuring determinism even if action execution order varies slightly.

**When to use each:**

| Scenario | Correct API | Why |
|----------|-------------|-----|
| Action logic (damage, loot drops, etc.) | `context.random` | ✅ Replicated across all clients |
| System logic (spawning, AI, physics) | `context.random` | ✅ Replicated across all clients |
| Player join/leave hooks | `context.random` | ✅ Replicated across all clients |
| Client rendering (particles, animations) | `game.random` | ✅ Cosmetic only, not replicated |
| Outside action/system contexts | `game.random` | ⚠️ Only if non-gameplay (UI, effects) |

```javascript
actions: {
  attack: {
    apply: ({ game, playerId, random }) => {  // ← context.random parameter
      // ❌ WRONG: Global random (may desync if action order changes)
      // const damage = game.random.range(5, 10);

      // ✅ CORRECT: Context random (unique seed per action)
      const damage = random.range(5, 10);
      target.health -= damage;
    }
  }
}

systems: {
  spawner: {
    rate: 30,
    tick: ({ game, random }) => {  // ← context.random parameter
      if (game.time % 5000 === 0) {
        const enemy = random.choice(['goblin', 'orc', 'troll']);
        game.enemies.push({ type: enemy, x: random.range(0, 800) });
      }
    }
  }
}

onPlayerJoin: ({ game, playerId, random }) => {
  // ✅ CORRECT: Use context.random for deterministic spawn position
  const spawnX = random.range(100, 700);
  game.players[playerId].x = spawnX;
},

// Client-side rendering (non-replicated, cosmetic only)
scene.update = () => {
  particles.forEach(p => {
    // ✅ OK: render-only effect, not part of game state
    p.x += game.random.range(-1, 1);
  });
};

// ❌ WRONG: Never use Math.random() anywhere
const badRandom = Math.random();  // Throws error in dev mode (strictDeterminism: true)
```

#### `game.time`

Deterministic game time based on tick count. **Always use this instead of `Date.now()`**.

```javascript
// ❌ WRONG: Non-deterministic (causes desyncs)
const now = Date.now();
if (now - lastSpawn > 5000) spawnEnemy();

// ✅ CORRECT: Deterministic time
if (game.time - lastSpawn > 5000) spawnEnemy();

// Or use modulo for periodic events:
if (game.time % 5000 === 0) spawnEnemy();  // Every 5 seconds
```

**Value:** `tick * tickDuration`

| Tick Rate | Tick # | game.time (ms) | Real Time |
|-----------|--------|----------------|-----------|
| 30 FPS | 30 | 1000 | 1 second |
| 30 FPS | 100 | 3333 | 3.33 seconds |
| 30 FPS | 300 | 10000 | 10 seconds |
| 60 FPS | 60 | 1000 | 1 second |
| 60 FPS | 100 | 1666 | 1.66 seconds |

**Calculation:** `tickDuration = 1000 / tickRate`

**Example:**
```javascript
// At 30 FPS: tickDuration = 1000 / 30 ≈ 33.33ms
// Tick 100: game.time = 100 * 33.33 = 3333ms
```

---

See [03-data-structures.md](./03-data-structures.md) for all types.
