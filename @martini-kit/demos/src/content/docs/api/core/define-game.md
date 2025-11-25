---
title: defineGame()
description: Define a multiplayer game with full TypeScript type safety
---

# defineGame()

The `defineGame()` function is the foundation of every martini-kit multiplayer game. It provides a declarative API for defining your game's state, actions, and player lifecycle hooks with full TypeScript type safety.

## API Reference

```typescript
function defineGame<TState>(definition: GameDefinition<TState>): GameDefinition<TState>
```

### GameDefinition Interface

```typescript
interface GameDefinition<TState> {
  setup?: (context: SetupContext) => TState;
  actions?: Record<string, ActionDefinition<TState>>;
  onPlayerJoin?: (state: TState, playerId: string) => void;
  onPlayerLeave?: (state: TState, playerId: string) => void;
}
```

## Properties

### setup()

**Optional** - Creates the initial game state when the game runtime starts.

```typescript
setup?: (context: SetupContext) => TState
```

**Parameters:**
- `context.playerIds` - Array of initial player IDs
- `context.random` - Deterministic [SeededRandom](./seeded-random) instance

**When it's called:**
- Once when the `GameRuntime` is created
- On both host and clients (with the same seed)
- Before any actions are processed

**Returns:** The initial game state

**Example:**
```typescript
const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, {
        x: random.range(100, 700),  // Random spawn position
        y: random.range(100, 500),
        health: 100,
        score: 0
      }])
    ),
    projectiles: [],
    gameStatus: 'waiting' as const
  })
});
```

### actions

**Optional** - Defines all the ways state can be modified. Actions are the **only** way to modify game state (besides sprite auto-sync).

```typescript
actions?: Record<string, ActionDefinition<TState>>
```

Each action has this structure:

```typescript
interface ActionDefinition<TState, TInput> {
  input?: any;  // Optional validation schema
  apply: (state: TState, context: ActionContext, input: TInput) => void;
}
```

**ActionContext:**

```typescript
interface ActionContext {
  playerId: string;   // Who submitted the action
  targetId: string;   // Who the action affects (⚠️ USE THIS for state mutations!)
  isHost: boolean;    // Whether this is running on the host
  random: SeededRandom;  // Deterministic RNG
}
```

:::warning[Critical: playerId vs targetId]
**Always use `context.targetId` for state mutations!**

- `playerId` = Who submitted the action (pressed the button)
- `targetId` = Who should be affected by the action

These are usually the same, but **not always**. For example, when Player A shoots Player B, `playerId` is Player A but `targetId` should be Player B for the damage action.
:::

**Example:**
```typescript
const game = defineGame({
  actions: {
    // Simple movement action
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];  // ✅ Correct!
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    },

    // Shooting action with RNG
    shoot: {
      apply(state, context, input: { angle: number }) {
        const shooter = state.players[context.targetId];
        if (!shooter) return;

        // ✅ Use context.random for determinism
        const spread = context.random.float(-0.1, 0.1);

        state.projectiles.push({
          id: `proj-${Date.now()}-${context.random.range(0, 9999)}`,
          x: shooter.x,
          y: shooter.y,
          angle: input.angle + spread,
          ownerId: context.targetId,
          damage: 10
        });
      }
    },

    // Taking damage (targetId is the victim)
    takeDamage: {
      apply(state, context, input: { amount: number }) {
        const victim = state.players[context.targetId];  // Target = who gets hurt
        if (victim) {
          victim.health -= input.amount;

          if (victim.health <= 0) {
            victim.health = 0;
            // Handle death...
          }
        }
      }
    }
  }
});
```

**Calling actions:**
```typescript
// Move myself
runtime.submitAction('move', { x: 200, y: 300 });

// Shoot (also myself)
runtime.submitAction('shoot', { angle: Math.PI / 4 });

// Player 1 shoots Player 2
runtime.submitAction('shoot', { angle: 0 }, 'player-1');

// Player 2 takes damage
runtime.submitAction('takeDamage', { amount: 10 }, 'player-2');
```

### onPlayerJoin()

**Optional** - Called when a player joins mid-game (after setup).

```typescript
onPlayerJoin?: (state: TState, playerId: string) => void
```

**When it's called:**
- When a new player connects after the game has started
- **Not** called for initial players (those are handled in `setup()`)
- Only runs on the host

**Example:**
```typescript
const game = defineGame({
  onPlayerJoin(state, playerId) {
    // Add new player to the game
    state.players[playerId] = {
      x: 400,
      y: 300,
      health: 100,
      score: 0
    };

    // Log the join
    console.log(`${playerId} joined the game`);
  }
});
```

**Using with createPlayerManager:**
```typescript
import { createPlayerManager } from '@martini-kit/core';

const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 100 + index * 100,
    y: 200,
    health: 100
  }),
  roles: ['fire', 'ice'],  // Optional role assignment
  spawnPoints: [           // Optional spawn points
    { x: 200, y: 400 },
    { x: 600, y: 400 }
  ]
});

const game = defineGame({
  onPlayerJoin: playerManager.createHandlers().onPlayerJoin
  // Or manually:
  // onPlayerJoin: (state, playerId) => {
  //   playerManager.handleJoin(state.players, playerId);
  // }
});
```

### onPlayerLeave()

**Optional** - Called when a player disconnects.

```typescript
onPlayerLeave?: (state: TState, playerId: string) => void
```

**When it's called:**
- When a player's transport disconnects
- Only runs on the host
- The player's state is **not** automatically removed (you must do this yourself)

**Example:**
```typescript
const game = defineGame({
  onPlayerLeave(state, playerId) {
    // Clean up player state
    delete state.players[playerId];
    delete state.inputs[playerId];

    // Award points to remaining players?
    // Transfer resources?
    // etc.

    console.log(`${playerId} left the game`);
  }
});
```

## Type Safety

`defineGame()` is fully type-safe when you provide a state interface:

```typescript
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    health: number;
    score: number;
  }>;
  projectiles: Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
  gameStatus: 'waiting' | 'playing' | 'ended';
}

const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: {},      // ✅ Autocomplete works!
    projectiles: [],  // ✅ Type-checked!
    gameStatus: 'waiting'
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        // ✅ state.players is fully typed
        // ✅ input.x and input.y have autocomplete
        state.players[context.targetId].x = input.x;
      }
    }
  }
});
```

## Complete Example

Here's a complete working game definition from the Fire & Ice demo:

```typescript
import { defineGame, createPlayerManager, createInputAction } from '@martini-kit/core';

// Define state shape
interface FireAndIceState {
  players: Record<string, {
    x: number;
    y: number;
    role: 'fire' | 'ice';
  }>;
  inputs: Record<string, any>;
}

// Create player manager
const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  factory: (playerId, index) => ({
    x: index === 0 ? 200 : 600,
    y: 400,
    role: index === 0 ? 'fire' as const : 'ice' as const,
  }),
});

// Define the game
export const fireAndIceGame = defineGame<FireAndIceState>({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {},
  }),

  actions: {
    // Use helper for input handling
    move: createInputAction('inputs'),
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  },
});
```

## Best Practices

### ✅ Do

- **Use TypeScript** - Define your state interface for autocomplete and type safety
- **Use `context.targetId`** - For all state mutations in actions
- **Use `context.random`** - For any randomness (not `Math.random()`)
- **Keep state serializable** - No functions, classes, or circular references
- **Use helpers** - `createPlayerManager()`, `createInputAction()`, etc.
- **Keep actions pure** - No side effects, API calls, or DOM manipulation

### ❌ Don't

- **Don't use `Math.random()`** - Use `context.random` instead
- **Don't use `Date.now()`** - Different on each client; use deterministic alternatives
- **Don't mutate input** - It's shared across all clients
- **Don't call external APIs** - Actions should be deterministic
- **Don't store classes in state** - Only plain objects, arrays, primitives
- **Don't use `context.playerId` for mutations** - Use `context.targetId` instead

## Common Patterns

### Game Loop with Tick Action

```typescript
import { createTickAction } from '@martini-kit/core';

const game = defineGame({
  actions: {
    tick: createTickAction((state, context) => {
      // Update physics
      for (const player of Object.values(state.players)) {
        player.y += player.vy;
        player.vy += 0.5; // Gravity
      }

      // Update projectiles
      state.projectiles = state.projectiles.filter(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        return proj.x >= 0 && proj.x <= 800; // Remove off-screen
      });
    })
  }
});

// Call tick regularly
setInterval(() => {
  runtime.submitAction('tick');
}, 16); // 60 FPS
```

### Input Tracking

```typescript
import { createInputAction } from '@martini-kit/core';

const game = defineGame({
  setup: () => ({
    players: {},
    inputs: {}  // Store each player's input
  }),

  actions: {
    // Automatically stores input in state.inputs[targetId]
    setInput: createInputAction('inputs')
  }
});

// Usage:
runtime.submitAction('setInput', { left: true, jump: false });
```

### Role-Based Player Assignment

```typescript
const playerManager = createPlayerManager({
  roles: ['tank', 'healer', 'damage'],
  factory: (playerId, index, role) => ({
    x: 100,
    y: 100,
    role,
    health: role === 'tank' ? 200 : 100,
    damage: role === 'damage' ? 20 : 10
  })
});
```

## See Also

- [GameRuntime](./game-runtime) - Running your game
- [Actions Guide](/docs/latest/concepts/actions) - Deep dive into actions
- [State Management](/docs/latest/concepts/state-management) - State best practices
- [SeededRandom](./seeded-random) - Deterministic randomness
- [Helper Functions](./helpers) - Utility functions
