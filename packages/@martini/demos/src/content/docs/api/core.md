---
title: "@martini/core"
description: Core multiplayer engine with declarative game definitions
section: api
order: 1
---

<script>
  import PackageBadge from '$lib/components/docs/PackageBadge.svelte';
  import CodeBlock from '$lib/components/docs/CodeBlock.svelte';
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# @martini/core

<PackageBadge package="@martini/core" />

The core multiplayer engine. Provides declarative game definitions, automatic state synchronization, and transport-agnostic networking.

## Installation

<CodeBlock
  code="pnpm add @martini/core"
  language="bash"
/>

## Overview

`@martini/core` is the foundation of the Martini SDK. It provides:

- **`defineGame()`** - Declarative game state and actions
- **`GameRuntime`** - State management and synchronization
- **`PlayerManager`** - Player lifecycle management helpers
- **Sync Utilities** - Efficient diff/patch algorithms
- **Transport Interface** - Abstract networking layer

<Callout type="info" title="Engine Agnostic">

`@martini/core` works with any game engine or rendering library. Use [@martini/phaser](/docs/api/phaser) for Phaser 3 integration, or integrate with Unity, Godot, Three.js, etc.

</Callout>

## Core Exports

### Game Definition

```typescript
import { defineGame } from '@martini/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    // Initial state
  }),

  actions: {
    // State mutations
  },

  onPlayerJoin: (state, playerId) => {
    // Handle player join
  },

  onPlayerLeave: (state, playerId) => {
    // Handle player leave
  }
});
```

[Learn more about defineGame →](/docs/api/core/define-game)

### Runtime

```typescript
import { GameRuntime } from '@martini/core';

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2']
});

// Submit actions
runtime.submitAction('move', { x: 100, y: 200 });

// Listen for changes
runtime.onChange((state) => {
  console.log('State updated:', state);
});
```

[Learn more about GameRuntime →](/docs/api/core/game-runtime)

### Player Management

```typescript
import { createPlayerManager } from '@martini/core';

const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  factory: (playerId, index) => ({
    x: 100,
    y: 100,
    role: index === 0 ? 'fire' : 'ice'
  })
});

// Initialize players
const players = playerManager.initialize(playerIds);

// Handle joins
playerManager.handleJoin(state.players, newPlayerId);
```

[Learn more about PlayerManager →](/docs/api/core/player-manager)

### Helpers

```typescript
import { createInputAction } from '@martini/core';

// Create standardized input action
const actions = {
  move: createInputAction('inputs')
};
```

[Learn more about Helpers →](/docs/api/core/helpers)

## Architecture

```
┌─────────────────────────────────────┐
│         @martini/core               │
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
│ @martini/  │   │ Custom Engine  │
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

Martini automatically handles:
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
