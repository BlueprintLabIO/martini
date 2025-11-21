---
title: Helper Functions
description: Utilities to reduce boilerplate and prevent common mistakes
---

# Helper Functions

martini-kit provides several helper functions to reduce boilerplate code and prevent common mistakes in game development. These utilities handle common patterns like player management, input handling, and game loops.

## Overview

```typescript
// Player management
function createPlayerManager<TPlayer>(config: PlayerManagerConfig<TPlayer>): PlayerManager<TPlayer>
function createPlayers<TPlayer>(playerIds: string[], factory: PlayerFactory<TPlayer>): Record<string, TPlayer>

// Action helpers
function createInputAction<TState, TInput>(stateKey?: string, options?: InputActionOptions): ActionDefinition<TState, TInput>
function createTickAction<TState>(tickFn: TickFunction<TState>): ActionDefinition<TState>
```

## createPlayerManager()

Creates a unified player lifecycle manager that handles both initial players (in `setup()`) and late-joining players consistently.

### Why Use It?

**Without PlayerManager** (error-prone):
```typescript
// ❌ Bug: Different logic in setup vs onPlayerJoin
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, i) => [id, { x: i * 100, y: 400 }])  // Index-based spawn
    )
  }),

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 400, y: 400 };  // ❌ Different! No index logic
  }
});
```

**With PlayerManager** (consistent):
```typescript
// ✅ Same logic for all players
const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: index * 100,
    y: 400
  })
});

const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds)
  }),

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  }
});
```

### API Reference

```typescript
function createPlayerManager<TPlayer>(
  config: PlayerManagerConfig<TPlayer>
): PlayerManager<TPlayer>

interface PlayerManagerConfig<TPlayer> {
  factory: (playerId: string, index: number) => TPlayer;
  roles?: readonly string[];
  spawnPoints?: Array<{ x: number; y: number; [key: string]: any }>;
}

interface PlayerManager<TPlayer> {
  initialize(playerIds: string[]): Record<string, TPlayer>;
  handleJoin(players: Record<string, TPlayer>, playerId: string): void;
  handleLeave(players: Record<string, TPlayer>, playerId: string): void;
  getConfig(index: number): { role?: string; spawn?: { x: number; y: number } };
  createHandlers<TState>(): Partial<GameDefinition<TState>>;
}
```

### Basic Usage

```typescript
import { createPlayerManager, defineGame } from '@martini-kit/core';

const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 100 + index * 200,
    y: 300,
    health: 100,
    score: 0
  })
});

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    projectiles: []
  }),

  onPlayerJoin(state, playerId) {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave(state, playerId) {
    playerManager.handleLeave(state.players, playerId);
  },

  actions: {
    // ... your actions
  }
});
```

### With Roles

Assign specific roles to players in order:

```typescript
const playerManager = createPlayerManager({
  roles: ['fire', 'ice', 'earth', 'wind'],
  factory: (playerId, index) => ({
    x: 400,
    y: 300,
    health: 100,
    role: null  // Will be auto-assigned by roles array
  })
});

// First player gets 'fire', second gets 'ice', etc.
const players = playerManager.initialize(['p1', 'p2']);
console.log(players.p1.role);  // 'fire'
console.log(players.p2.role);  // 'ice'
```

### With Spawn Points

Define spawn positions for each player index:

```typescript
const playerManager = createPlayerManager({
  spawnPoints: [
    { x: 200, y: 400 },  // Player 0
    { x: 600, y: 400 },  // Player 1
    { x: 400, y: 200 },  // Player 2
    { x: 400, y: 600 }   // Player 3
  ],
  factory: (playerId, index) => ({
    // x and y will be auto-set from spawnPoints
    health: 100,
    speed: 150
  })
});

const players = playerManager.initialize(['p1', 'p2']);
console.log(players.p1.x, players.p1.y);  // 200, 400
console.log(players.p2.x, players.p2.y);  // 600, 400
```

### Complete Example (Fire & Ice)

```typescript
import { createPlayerManager, createInputAction, defineGame } from '@martini-kit/core';

interface FireIcePlayer {
  x: number;
  y: number;
  role: 'fire' | 'ice';
}

const playerManager = createPlayerManager<FireIcePlayer>({
  roles: ['fire', 'ice'],
  spawnPoints: [
    { x: 200, y: 400 },
    { x: 600, y: 400 }
  ],
  factory: (playerId, index) => ({
    x: 0,  // Will be overridden by spawnPoints
    y: 0,
    role: 'fire'  // Will be overridden by roles
  })
});

export const fireAndIceGame = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {}
  }),

  actions: {
    move: createInputAction('inputs')
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  }
});
```

### Using createHandlers()

Shortcut to generate all lifecycle methods automatically:

```typescript
const playerManager = createPlayerManager({
  factory: (id, index) => ({ x: 100, y: 100, score: 0 })
});

export const game = defineGame({
  // ✅ Spread all handlers at once
  ...playerManager.createHandlers(),

  actions: {
    // ... your actions
  }
});

// Equivalent to:
// setup: ({ playerIds }) => ({ players: playerManager.initialize(playerIds) }),
// onPlayerJoin: (state, playerId) => playerManager.handleJoin(state.players, playerId),
// onPlayerLeave: (state, playerId) => playerManager.handleLeave(state.players, playerId)
```

:::warning[Partial Setup]
`createHandlers()` only provides `setup()` that initializes `players`. If your state has other fields, you need to add them manually:

```typescript
export const game = defineGame({
  // ❌ This doesn't include other state fields
  ...playerManager.createHandlers(),

  // ✅ Do this instead:
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    projectiles: [],  // Add your other fields
    score: 0
  })
});
```
:::

## createPlayers()

Simple utility to create a players record without full PlayerManager features.

### API Reference

```typescript
function createPlayers<TPlayer>(
  playerIds: string[],
  factory: (playerId: string, index: number) => TPlayer
): Record<string, TPlayer>
```

### Usage

```typescript
import { defineGame, createPlayers } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds, (id, index) => ({
      x: index * 100,
      y: 400,
      health: 100,
      score: 0
    })),
    projectiles: []
  })
});
```

### When to Use

- **Use `createPlayers()`** when you only need `setup()` initialization
- **Use `createPlayerManager()`** when you also need `onPlayerJoin/Leave` handlers

## createInputAction()

Creates an action that stores player input in state for later processing (common pattern in physics-based games).

### Why Store Input?

Many games separate **input collection** from **physics updates**:

1. **Collect input** - Players submit their controls (WASD, mouse, etc.)
2. **Process in tick** - Physics loop reads input and updates positions

This separates concerns and makes physics updates deterministic.

### API Reference

```typescript
function createInputAction<TState, TInput>(
  stateKey?: string,
  options?: {
    validate?: (input: TInput) => boolean;
    onApply?: (state: TState, context: ActionContext, input: TInput) => void;
  }
): ActionDefinition<TState, TInput>
```

**Parameters:**
- `stateKey` - Where to store input in state (default: `'inputs'`)
- `options.validate` - Optional input validation
- `options.onApply` - Optional callback after storing input

**Behavior:**
- Stores input at `state[stateKey][context.targetId]`
- Uses `targetId` (not `playerId`) - correct for multi-player
- Initializes state key if it doesn't exist

### Basic Usage

```typescript
import { defineGame, createInputAction, createTickAction } from '@martini-kit/core';

interface GameState {
  players: Record<string, { x: number; y: number; vx: number; vy: number }>;
  inputs: Record<string, { left: boolean; right: boolean; up: boolean; down: boolean }>;
}

export const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds, () => ({ x: 400, y: 300, vx: 0, vy: 0 })),
    inputs: {}
  }),

  actions: {
    // Stores input in state.inputs[playerId]
    setInput: createInputAction('inputs'),

    // Physics loop processes inputs
    tick: createTickAction((state, delta) => {
      for (const [playerId, player] of Object.entries(state.players)) {
        const input = state.inputs[playerId];
        if (!input) continue;

        // Apply input to velocity
        const speed = 200;
        player.vx = (input.right ? speed : 0) - (input.left ? speed : 0);
        player.vy = (input.down ? speed : 0) - (input.up ? speed : 0);

        // Update position
        player.x += player.vx * (delta / 1000);
        player.y += player.vy * (delta / 1000);
      }
    })
  }
});

// Usage in client:
runtime.submitAction('setInput', { left: true, right: false, up: false, down: false });
```

### With Validation

```typescript
actions: {
  setInput: createInputAction('inputs', {
    validate: (input) => {
      // Ensure required fields exist
      return typeof input.left === 'boolean' &&
             typeof input.right === 'boolean' &&
             typeof input.up === 'boolean' &&
             typeof input.down === 'boolean';
    }
  })
}

// Invalid input is rejected and warned in dev mode
runtime.submitAction('setInput', { left: true });  // ⚠️ Rejected
```

### With Callback

```typescript
actions: {
  setInput: createInputAction('inputs', {
    onApply: (state, context, input) => {
      // Log input changes
      console.log(`${context.targetId} input:`, input);

      // Track last input time
      const player = state.players[context.targetId];
      if (player) {
        player.lastInputTime = Date.now();
      }
    }
  })
}
```

### Custom State Key

```typescript
interface GameState {
  players: Record<string, Player>;
  playerInputs: Record<string, Input>;  // Custom key
  aiInputs: Record<string, Input>;      // Separate AI inputs
}

export const game = defineGame<GameState>({
  actions: {
    playerInput: createInputAction('playerInputs'),
    aiInput: createInputAction('aiInputs')
  }
});
```

## createTickAction()

Creates a host-only action for game loop logic (physics, AI, collision detection, etc.).

### Why Host-Only?

Game loop logic should only run on the **host** to avoid duplication:
- Host runs physics and broadcasts state
- Clients just mirror the state

`createTickAction()` automatically wraps your logic to only run on the host.

### API Reference

```typescript
function createTickAction<TState>(
  tickFn: (state: TState, delta: number, context: ActionContext) => void
): ActionDefinition<TState, { delta: number }>
```

**Parameters:**
- `tickFn` - Function to run each tick
  - `state` - Current game state
  - `delta` - Time since last tick (ms)
  - `context` - Action context (with `random`, etc.)

**Behavior:**
- Only runs on host (`if (!context.isHost) return`)
- Receives `delta` from input
- Can use `context.random` for deterministic randomness

### Basic Usage

```typescript
import { defineGame, createTickAction } from '@martini-kit/core';

export const game = defineGame({
  setup: () => ({
    players: {},
    projectiles: []
  }),

  actions: {
    tick: createTickAction((state, delta, context) => {
      // Update projectiles
      state.projectiles = state.projectiles.filter(proj => {
        proj.x += proj.vx * (delta / 1000);
        proj.y += proj.vy * (delta / 1000);

        // Remove off-screen
        return proj.x >= 0 && proj.x <= 800 && proj.y >= 0 && proj.y <= 600;
      });

      // Random enemy spawn (10% chance per second)
      const spawnChance = 0.1 * (delta / 1000);
      if (context.random.boolean(spawnChance)) {
        state.enemies.push({
          id: `enemy-${Date.now()}`,
          x: context.random.range(0, 800),
          y: 0,
          health: 50
        });
      }
    })
  }
});

// Call from host or client (only runs on host)
setInterval(() => {
  const delta = 16;  // 60 FPS
  runtime.submitAction('tick', { delta });
}, 16);
```

### Complete Physics Example

```typescript
import { defineGame, createInputAction, createTickAction } from '@martini-kit/core';

interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
  inputs: Record<string, {
    left: boolean;
    right: boolean;
    jump: boolean;
  }>;
}

export const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds, () => ({
      x: 400,
      y: 300,
      vx: 0,
      vy: 0
    })),
    inputs: {}
  }),

  actions: {
    // Players submit their input
    setInput: createInputAction('inputs'),

    // Host processes physics
    tick: createTickAction((state, delta) => {
      const dt = delta / 1000;  // Convert to seconds

      for (const [playerId, player] of Object.entries(state.players)) {
        const input = state.inputs[playerId];
        if (!input) continue;

        // Horizontal movement
        const speed = 200;
        player.vx = (input.right ? speed : 0) - (input.left ? speed : 0);

        // Jump
        if (input.jump && player.y >= 300) {
          player.vy = -400;  // Jump velocity
        }

        // Gravity
        player.vy += 800 * dt;  // Gravity acceleration

        // Update position
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        // Ground collision
        if (player.y >= 300) {
          player.y = 300;
          player.vy = 0;
        }

        // Wall collision
        if (player.x < 0) player.x = 0;
        if (player.x > 800) player.x = 800;
      }
    })
  }
});
```

### With Collision Detection

```typescript
actions: {
  tick: createTickAction((state, delta, context) => {
    // Update positions
    updatePositions(state, delta);

    // Check collisions
    for (const proj of state.projectiles) {
      for (const enemy of state.enemies) {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
          // Hit!
          enemy.health -= proj.damage;
          proj.dead = true;

          // Spawn hit particles with randomness
          for (let i = 0; i < 5; i++) {
            state.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: context.random.float(-100, 100),
              vy: context.random.float(-100, 100),
              life: context.random.float(0.5, 1.5)
            });
          }
        }
      }
    }

    // Remove dead entities
    state.projectiles = state.projectiles.filter(p => !p.dead);
    state.enemies = state.enemies.filter(e => e.health > 0);
  })
}
```

## Best Practices

### ✅ Do

- **Use `createPlayerManager()`** - For consistent player lifecycle
- **Use `createInputAction()`** - To separate input from physics
- **Use `createTickAction()`** - For host-only game loop logic
- **Use `context.random` in tick** - For deterministic randomness
- **Validate input** - Use `validate` option to prevent bad data

### ❌ Don't

- **Don't skip PlayerManager** - Manual join/leave is error-prone
- **Don't process input immediately** - Store it, process in tick
- **Don't run physics on clients** - Use tick action (host-only)
- **Don't forget delta time** - Physics needs time-based updates

## See Also

- [defineGame](./define-game) - Game definition basics
- [Actions Concepts](/docs/concepts/actions) - Understanding actions
- [State Management](/docs/concepts/state-management) - State best practices
- [SeededRandom](./seeded-random) - Using randomness in tick actions
