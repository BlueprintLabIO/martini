---
title: "@martini-kit/core"
description: Core multiplayer engine with declarative game definitions
section: api
order: 1
---

<script>
  import PackageBadge from '$lib/components/docs/PackageBadge.svelte';
  import CodeBlock from '$lib/components/docs/CodeBlock.svelte';
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# @martini-kit/core

<PackageBadge package="@martini-kit/core" />

The core multiplayer engine. Provides declarative game definitions, automatic state synchronization, and transport-agnostic networking.

## Installation

<CodeBlock
  code="pnpm add @martini-kit/core"
  language="bash"
/>

## Overview

`@martini-kit/core` is the foundation of the martini-kit SDK. It provides:

- **`defineGame()`** - Declarative game state and actions
- **`GameRuntime`** - State management and synchronization
- **`PlayerManager`** - Player lifecycle management helpers
- **Sync Utilities** - Efficient diff/patch algorithms
- **Transport Interface** - Abstract networking layer

<Callout type="info" title="Engine Agnostic">

`@martini-kit/core` works with any game engine or rendering library. Use [@martini-kit/phaser](/docs/api/phaser) for Phaser 3 integration, or integrate with Unity, Godot, Three.js, etc.

</Callout>

## Core Exports

### defineGame()

Define your game logic declaratively. This is the heart of martini-kit - you describe **what** your game state looks like and **how** actions change it, not **how** to sync it over the network.

```typescript
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: random.range(100, 700),
          y: random.range(100, 500),
          score: 0
        }
      ])
    ),
    inputs: {}
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      }
    }
  },

  onPlayerJoin: (state, playerId) => {
    state.players[playerId] = { x: 100, y: 100, score: 0 };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
```

#### Setup Context

```typescript
interface SetupContext {
  playerIds: string[];     // All connected player IDs
  random: SeededRandom;    // Deterministic RNG (same seed on all clients)
}
```

**Critical:** Always use `random` instead of `Math.random()` to ensure all clients generate identical initial state.

#### Action Definition

```typescript
interface ActionDefinition<TState, TInput> {
  apply(state: TState, context: ActionContext, input: TInput): void;
}
```

Actions directly mutate state (Immer-style). No need to return anything.

#### Action Context

```typescript
interface ActionContext {
  playerId: string;      // Who submitted the action
  targetId: string;      // Who is affected (defaults to playerId)
  isHost: boolean;       // Is this running on the host?
  random: SeededRandom;  // Deterministic RNG scoped to this action
}
```

**Key Distinction:** Use `context.targetId` for state mutations, `context.playerId` for audit/permissions.

#### Lifecycle Hooks

```typescript
onPlayerJoin?(state: TState, playerId: string): void;
onPlayerLeave?(state: TState, playerId: string): void;
```

Handle dynamic player connections. Called on all peers when a player joins/leaves.

### GameRuntime

The runtime manages state, processes actions, and synchronizes everything across the network.

```typescript
import { GameRuntime } from '@martini-kit/core';

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2']
});
```

#### Constructor

```typescript
new GameRuntime<TState>(
  game: GameDefinition<TState>,
  transport: Transport,
  config: GameRuntimeConfig
)
```

**Config:**
```typescript
interface GameRuntimeConfig {
  isHost: boolean;           // Is this peer the host?
  playerIds: string[];       // Initial player IDs
  syncInterval?: number;     // State sync rate in ms (default: 50ms / 20 FPS)
}
```

#### Methods

**State Access:**
```typescript
runtime.getState(): TState               // Get current state (read-only)
runtime.isHost(): boolean                // Check if this is the host
runtime.getMyPlayerId(): string          // Get current player's ID
```

**Actions:**
```typescript
runtime.submitAction(
  name: string,
  input?: any,
  targetId?: string  // Defaults to current player
): void
```

**Events:**
```typescript
runtime.onChange(callback: (state: TState) => void): () => void
runtime.broadcastEvent(name: string, payload: any): void
runtime.onEvent(name: string, callback: (senderId: string, payload: any) => void): () => void
```

**Lifecycle:**
```typescript
runtime.mutateState(mutator: (state: TState) => void): void  // Direct mutation (adapters only)
runtime.destroy(): void                                       // Cleanup
```

#### Example Usage

```typescript
// Submit player input
runtime.submitAction('move', {
  left: true,
  right: false,
  up: false
});

// Listen for state changes
const unsubscribe = runtime.onChange((state) => {
  console.log('Players:', state.players);
});

// Broadcast custom event
runtime.broadcastEvent('coin-collected', { coinId: 'coin-1' });

// Listen for events
runtime.onEvent('coin-collected', (senderId, payload) => {
  console.log(`${senderId} collected coin ${payload.coinId}`);
});

// Cleanup
unsubscribe();
runtime.destroy();
```

### PlayerManager

Standardized player lifecycle management.

```typescript
import { createPlayerManager } from '@martini-kit/core';

const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  factory: (playerId, index) => ({
    x: index === 0 ? 200 : 600,
    y: 300,
    health: 100,
    score: 0,
    role: index === 0 ? 'fire' : 'ice'
  })
});

// In setup()
setup: ({ playerIds }) => ({
  players: playerManager.initialize(playerIds)
}),

// In onPlayerJoin
onPlayerJoin: (state, playerId) => {
  playerManager.handleJoin(state.players, playerId);
},

// In onPlayerLeave
onPlayerLeave: (state, playerId) => {
  playerManager.handleLeave(state.players, playerId);
}
```

#### Configuration

```typescript
interface PlayerManagerConfig<TPlayer> {
  roles?: string[];                        // Optional role assignment
  factory: (playerId: string, index: number) => TPlayer;
}
```

#### Methods

```typescript
initialize(playerIds: string[]): Record<string, TPlayer>
handleJoin(players: Record<string, TPlayer>, playerId: string): void
handleLeave(players: Record<string, TPlayer>, playerId: string): void
```

---

## Helper Functions

### createInputAction()

Standard helper for input storage actions. Eliminates boilerplate and ensures correct `targetId` usage.

```typescript
import { createInputAction } from '@martini-kit/core';

const actions = {
  move: createInputAction('inputs')
};

// Equivalent to:
const actions = {
  move: {
    apply: (state, context, input) => {
      if (!state.inputs) state.inputs = {};
      state.inputs[context.targetId] = input;
    }
  }
};
```

#### Options

```typescript
createInputAction(stateKey: string, options?: {
  validate?: (input: any) => boolean;
  onApply?: (state: TState, context: ActionContext, input: TInput) => void;
})
```

---

### createTickAction()

Host-only game loop action for physics/AI/collision logic.

```typescript
import { createTickAction } from '@martini-kit/core';

const actions = {
  tick: createTickAction((state, context) => {
    // Only runs on host
    for (const [id, player] of Object.entries(state.players)) {
      // Update AI
      // Check collisions
      // Apply physics
    }
  })
};

// Equivalent to:
const actions = {
  tick: {
    apply: (state, context) => {
      if (!context.isHost) return;

      for (const [id, player] of Object.entries(state.players)) {
        // Update AI
        // Check collisions
        // Apply physics
      }
    }
  }
};
```

---

### createPlayers()

Type-safe player initialization helper.

```typescript
import { createPlayers } from '@martini-kit/core';

setup: ({ playerIds }) => ({
  players: createPlayers(playerIds, (id, index) => ({
    x: index === 0 ? 200 : 600,
    y: 300,
    health: 100,
    score: 0
  }))
})

// Returns: Record<string, TPlayer>
```

---

## SeededRandom

Deterministic random number generator. **Always use this instead of `Math.random()`** to prevent state desyncs.

```typescript
// Available in setup context
setup: ({ playerIds, random }) => ({
  enemies: Array.from({ length: 10 }, () => ({
    x: random.range(0, 800),
    y: random.range(0, 600),
    type: random.choice(['zombie', 'skeleton', 'ghost'])
  }))
})

// Available in action context
actions: {
  spawnPowerup: {
    apply: (state, context) => {
      state.powerups.push({
        x: context.random.range(100, 700),
        y: context.random.range(100, 500),
        type: context.random.choice(['health', 'speed', 'shield']),
        value: context.random.range(10, 50)
      });
    }
  }
}
```

### API Methods

```typescript
random.next(): number                              // Float in [0, 1)
random.range(min: number, max: number): number     // Integer in [min, max)
random.float(min: number, max: number): number     // Float in [min, max]
random.choice<T>(array: T[]): T                    // Random element
random.shuffle<T>(array: T[]): T[]                 // New shuffled copy
random.boolean(probability?: number): boolean      // true with probability (default 0.5)
```

<Callout type="warning" title="Critical for State Consistency">

Using `Math.random()` will cause different state on each client, leading to immediate desyncs. Always use `context.random` or `setupContext.random`.

</Callout>

---

## Logger

Unity-inspired logging system with channels and performance timers.

```typescript
import { logger } from '@martini-kit/core';

// Basic logging
logger.log('Player joined:', playerId);
logger.warn('Low health!', health);
logger.error('Failed to connect', error);

// Channels
const gameLog = logger.channel('game');
gameLog.log('Round started');

// Performance timing
logger.time('physics-update');
// ... physics logic ...
logger.timeEnd('physics-update');  // Logs elapsed time

// Assertions
logger.assert(health > 0, 'Player health must be positive');
```

### Log Listeners

```typescript
logger.addListener((entry) => {
  console.log(`[${entry.level}] ${entry.channel}: ${entry.message}`);
  // Send to analytics, DevTools, etc.
});
```

---

## Transport Interface

While you typically use pre-built transports, understanding the interface helps when building custom ones.

```typescript
interface Transport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
  disconnect(): void;
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;
  metrics?: TransportMetrics;  // Optional observability
}
```

### WireMessage Types

- `state_sync` - State patches from host to clients
- `action` - Action submission from client to host
- `event` - Custom events between peers
- `player_join` / `player_leave` - Lifecycle events
- `heartbeat` / `host_migration` / `host_query` / `host_announce` - Advanced

See [Transports](/docs/api/transports) for available implementations.

## Architecture

```
┌─────────────────────────────────────┐
│         @martini-kit/core               │
│                                     │
│  defineGame()     GameRuntime       │
│  PlayerManager    Sync Utils        │
│  Transport Interface                │
└──────────────┬──────────────────────┘
               │
      Used by  │
               │
     ┌─────────┴──────────┐
     │                    │
┌────────────┐   ┌────────────────┐
│ @martini-kit/  │   │ Custom Engine  │
│ phaser     │   │ Integration    │
└────────────┘   └────────────────┘
```

## Key Concepts

### Host-Authoritative

The **host** runs the real game logic. Clients send inputs and receive state updates.

```
HOST                    CLIENT
  │                        │
  │  ◄─── action ─────     │
  │                        │
  │  ──── state ─────►     │
  │                        │
```

### Declarative State

Define what your state looks like, not how to sync it:

```typescript
setup: () => ({
  players: {},
  score: 0,
  gameState: 'waiting'
})
```

martini-kit automatically handles:
- Serialization
- Diff/patch
- Network transmission
- Deserialization

### Transport Agnostic

Swap networking backends without changing game code:

```typescript
// Development: Local testing
const transport = new LocalTransport();

// Production: P2P
const transport = new TrysteroTransport({ roomId: 'game-123' });

// Scale: WebSocket
const transport = new WebSocketTransport({ url: 'wss://server.com' });
```

## Next Steps

- **[defineGame API →](/docs/api/core/define-game)** - Full API reference
- **[GameRuntime API →](/docs/api/core/game-runtime)** - Runtime methods
- **[Core Concepts Guide →](/docs/guides/core-concepts)** - Deep dive
- **[Quick Start →](/docs/getting-started/quick-start)** - Build your first game
