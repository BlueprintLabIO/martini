---
title: State Management
description: How martini-kit structures, synchronizes, and optimizes game state
section: concepts
order: 2
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# State Management

In martini-kit, **state is the single source of truth** for your game. Understanding how state works is crucial to building robust multiplayer games.

## What is State?

State is a **plain JavaScript object** that represents everything about your game at a given moment:

```typescript
interface GameState {
  players: Record<string, Player>;
  projectiles: Projectile[];
  score: Record<string, number>;
  gameStatus: 'waiting' | 'playing' | 'ended';
  timer: number;
}
```

**Key principle**: If it affects gameplay, it belongs in state.

## State Definition

### Setup Function

The `setup()` function initializes your state when the game starts:

```typescript
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds, random }) => ({
    // Initialize players
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 100 + index * 200,
          y: 300,
          health: 100,
          score: 0
        }
      ])
    ),

    // Initialize game entities
    projectiles: [],
    powerups: [],

    // Game metadata
    gameStatus: 'playing',
    timer: 60,
    round: 1
  })
});
```

<Callout type="warning" title="Setup Runs on All Clients">

The `setup()` function runs on **both host and clients** to initialize their local state. This is why you must use `random` instead of `Math.random()` - to ensure all clients start with identical state.

</Callout>

### Setup Context

The setup function receives a context object:

```typescript
interface SetupContext {
  playerIds: string[];      // All connected player IDs
  random: SeededRandom;     // Deterministic RNG (same seed on all clients)
}
```

**Example**:
```typescript
setup: ({ playerIds, random }) => {
  const spawnPoints = [
    { x: 100, y: 300 },
    { x: 700, y: 300 }
  ];

  return {
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          ...spawnPoints[index],
          // Random color (same on all clients!)
          color: random.choice(['red', 'blue', 'green', 'yellow'])
        }
      ])
    )
  };
}
```

---

## State Structure Best Practices

### 1. Keep State Flat

❌ **Avoid deep nesting**:
```typescript
// Bad - too nested
interface BadState {
  game: {
    session: {
      players: {
        data: {
          [id: string]: {
            stats: {
              health: number;
              mana: number;
            }
          }
        }
      }
    }
  }
}

// Accessing deeply nested data is cumbersome
state.game.session.players.data[playerId].stats.health -= 10;
```

✅ **Prefer flat structures**:
```typescript
// Good - flat and organized
interface GoodState {
  players: Record<string, Player>;
  health: Record<string, number>;      // Player ID → health
  mana: Record<string, number>;        // Player ID → mana
  projectiles: Projectile[];
  powerups: Powerup[];
}

// Much cleaner
state.health[playerId] -= 10;
```

---

### 2. Use Records for Collections

Use `Record<string, T>` for player-indexed data:

```typescript
interface GameState {
  // ✅ Good - easy to look up by player ID
  players: Record<string, Player>;
  scores: Record<string, number>;

  // ✅ Good - arrays for ordered collections
  projectiles: Projectile[];
  events: GameEvent[];
}
```

---

### 3. Keep State Serializable

State must be **JSON-serializable** (no functions, class instances, or circular references):

```typescript
// ❌ Bad - not serializable
interface BadState {
  players: Map<string, Player>;           // Maps don't serialize
  myFunction: () => void;                 // Functions don't serialize
  sprite: Phaser.GameObjects.Sprite;      // Class instances don't serialize
}

// ✅ Good - all plain data
interface GoodState {
  players: Record<string, Player>;        // Plain objects
  projectiles: Projectile[];              // Plain arrays
  config: { speed: number; damage: number };  // Plain values
}
```

<Callout type="info" title="Why Serializable?">

State is sent over the network as JSON. Non-serializable data will be lost or cause errors during synchronization.

</Callout>

---

### 4. Separate Rendering State from Game State

Keep Phaser sprites, textures, and UI **separate from game state**:

```typescript
// ❌ Bad - mixing game logic with rendering
interface BadState {
  players: Record<string, {
    x: number;
    y: number;
    sprite: Phaser.GameObjects.Sprite;  // Don't store sprites in state!
  }>;
}

// ✅ Good - game state only
interface GoodState {
  players: Record<string, {
    x: number;
    y: number;
    health: number;
  }>;

  // Rendering happens in Phaser scene
  // Sprites are created/updated based on state
}
```

The `PhaserAdapter` handles syncing state → sprites automatically.

---

## State Synchronization

### How Sync Works

martini-kit uses a **diff/patch algorithm** to minimize bandwidth:

1. **Host generates diff**: Compare old state to new state
2. **Create patches**: Minimal set of changes
3. **Broadcast patches**: Send only the changes
4. **Clients apply patches**: Update their local state

### Patch Format

Patches use a JSON Patch-like format:

```typescript
interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];       // Path to the changed property
  value?: any;          // New value (for replace/add)
}
```

**Example**: Player moves from (100, 200) to (150, 200)

```typescript
// Before:
{ players: { p1: { x: 100, y: 200 } } }

// After:
{ players: { p1: { x: 150, y: 200 } } }

// Patch generated:
[
  { op: 'replace', path: ['players', 'p1', 'x'], value: 150 }
]
// Only 1 field changed, so only 1 patch sent!
```

**Example**: New projectile added

```typescript
// Before:
{ projectiles: [] }

// After:
{ projectiles: [{ id: '1', x: 100, y: 100, vx: 5, vy: 0 }] }

// Patch generated:
[
  { op: 'add', path: ['projectiles', '0'], value: { id: '1', x: 100, y: 100, vx: 5, vy: 0 } }
]
```

**Example**: Player disconnects

```typescript
// Before:
{ players: { p1: { ... }, p2: { ... } } }

// After:
{ players: { p1: { ... } } }

// Patch generated:
[
  { op: 'remove', path: ['players', 'p2'] }
]
```

---

### Sync Frequency

By default, state syncs **every 16ms (60 FPS)**:

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2'],
  syncInterval: 16  // Sync every 16ms (60 FPS)
});
```

**Tuning sync rate**:

| Game Type | Recommended Sync Rate |
|-----------|----------------------|
| Turn-based | 200-500ms (2-5 FPS) |
| Slow-paced (puzzle, card) | 100ms (10 FPS) |
| Medium-paced (platformer) | 16ms (60 FPS) - **default** |
| Fast-paced (shooter, racing) | 30ms (33 FPS) |

<Callout type="tip">

Lower sync interval = smoother updates, but higher bandwidth. Balance based on your game's needs.

</Callout>

---

## Mutability in Actions

Unlike Redux or other state management libraries, **actions can directly mutate state**:

```typescript
actions: {
  move: {
    apply(state, context, input: { x: number; y: number }) {
      // ✅ Direct mutation is OK and encouraged!
      state.players[context.targetId].x = input.x;
      state.players[context.targetId].y = input.y;
    }
  }
}
```

<Callout type="info" title="Why Mutable?">

**Performance**: Mutating state directly is faster than creating new objects.

**Simplicity**: No need for immer, spread operators, or reducers.

**Isolation**: Actions run in isolation, so mutation is safe.

</Callout>

martini-kit internally snapshots state before/after actions to generate diffs, so you don't need to worry about immutability.

---

## State Validation (Development)

In development mode, martini-kit validates state structure:

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2'],

  // Throw errors for invalid state (development only)
  strict: true,

  // Validate that all playerIds are initialized in setup()
  strictPlayerInit: true,

  // Key in state where players are stored
  playersKey: 'players'
});
```

**Validation checks**:
- All `playerIds` are initialized in `setup()`
- State is JSON-serializable
- Actions don't create circular references

---

## Bandwidth Optimization

### 1. Minimize State Size

Smaller state = less bandwidth:

```typescript
// ❌ Wasteful
interface WastefulState {
  players: Record<string, {
    id: string;              // Redundant (already the key)
    position: { x: number; y: number };  // Extra nesting
    velocity: { x: number; y: number };
    metadata: {
      createdAt: string;     // Unnecessary for gameplay
      lastUpdate: string;
    };
  }>;
}

// ✅ Optimized
interface OptimizedState {
  players: Record<string, {
    x: number;               // Flat
    y: number;
    vx: number;              // Velocity inline
    vy: number;
  }>;
}
```

---

### 2. Use Compact Data Types

```typescript
// ❌ Wasteful
{
  health: 100.0,
  angle: 3.141592653589793,
  isAlive: true
}

// ✅ Optimized
{
  health: 100,           // Integer instead of float
  angle: 3.14,           // Round to 2 decimals
  alive: 1               // Use 1/0 instead of boolean (saves bytes)
}
```

---

### 3. Avoid Redundant Data

```typescript
// ❌ Wasteful - storing derived data
{
  players: {
    p1: { x: 100, y: 200 },
    p2: { x: 300, y: 400 }
  },
  playerCount: 2,        // Redundant - can calculate from players
  playerIds: ['p1', 'p2'] // Redundant - can get from Object.keys(players)
}

// ✅ Optimized
{
  players: {
    p1: { x: 100, y: 200 },
    p2: { x: 300, y: 400 }
  }
  // Derive playerCount and playerIds on the client
}
```

---

### 4. Quantize Large Numbers

For large worlds, quantize coordinates:

```typescript
// ❌ Full precision
{ x: 1234.5678, y: 9876.5432 }

// ✅ Quantized (rounded to nearest integer)
{ x: 1235, y: 9877 }

// Or use fixed-point math (multiply by 10)
{ x: 12345, y: 98765 }  // Store as integers, divide by 10 on client
```

---

## State Inspection (DevTools)

Use `StateInspector` to debug state during development:

```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector({
  maxSnapshots: 100,
  snapshotThrottleMs: 500
});

inspector.attach(runtime);

// View snapshots
console.log(inspector.getSnapshots());

// View action history
console.log(inspector.getActionHistory());
```

See [StateInspector API](/docs/latest/api/devtools/state-inspector) for details.

---

## Common Patterns

### Pattern 1: Player-Indexed Data

Store data per player using their ID as key:

```typescript
interface GameState {
  players: Record<string, Player>;
  health: Record<string, number>;
  inventory: Record<string, Item[]>;
  cooldowns: Record<string, number>;
}

// Access by player ID
state.health[playerId] -= damage;
state.inventory[playerId].push(newItem);
```

---

### Pattern 2: Entity Lists with IDs

For dynamic entities (projectiles, enemies), use arrays with unique IDs:

```typescript
interface GameState {
  projectiles: Array<{
    id: string;
    x: number;
    y: number;
    ownerId: string;  // Who shot it
  }>;
}

// Add projectile
state.projectiles.push({
  id: crypto.randomUUID(),
  x: playerX,
  y: playerY,
  ownerId: playerId
});

// Remove projectile
const index = state.projectiles.findIndex(p => p.id === targetId);
if (index !== -1) state.projectiles.splice(index, 1);
```

---

### Pattern 3: Separate Input from State

Use an `inputs` object to store player input separately:

```typescript
interface GameState {
  players: Record<string, Player>;
  inputs: Record<string, PlayerInput>;  // Separate input state
}

// In action:
actions: {
  move: {
    apply(state, context, input) {
      state.inputs[context.targetId] = input;  // Store input
      // Physics loop will read inputs and update player positions
    }
  }
}
```

This pattern is useful for physics-based games where input is processed in a separate tick action.

---

## Next Steps

- [Actions](/docs/latest/concepts/actions) - Learn how to modify state with actions
- [Determinism](/docs/latest/concepts/determinism) - Why seeded random is critical for state consistency
- [Sync API](/docs/latest/api/core/sync) - Deep dive into diff/patch algorithm
- [GameRuntime API](/docs/latest/api/core/game-runtime) - Full API for state management
