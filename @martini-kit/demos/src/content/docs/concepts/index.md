---
title: Core Concepts
description: Understanding martini-kit's architecture and fundamental principles
section: concepts
order: 1
---

# Core Concepts

martini-kit is a **host-authoritative, deterministic multiplayer framework** that works with any rendering engine. This page explains the core architecture and how all the pieces fit together.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Game Code                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Game Logic   │  │   Actions    │  │    State     │     │
│  │ (defineGame) │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  @martini-kit/core                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ GameRuntime  │  │  Transport   │  │ State Sync   │     │
│  │              │  │   Layer      │  │ (diff/patch) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            Rendering Engine (Optional)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Phaser     │  │    Godot     │  │   Three.js   │     │
│  │  (adapter)   │  │  (adapter)   │  │   (custom)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Host-Authoritative Model

One player (the **host**) runs the authoritative game simulation. All other players (the **clients**) receive state updates and mirror what's happening on the host.

**Why?**
- Prevents cheating (clients can't modify game state)
- Simplifies logic (one source of truth)
- Easier to debug (deterministic execution)

### 2. Declarative State Management

You define your game state as a plain JavaScript object. martini-kit handles all synchronization automatically.

```typescript
setup: ({ playerIds }) => ({
  players: { /* ... */ },
  projectiles: [],
  score: 0
})
```

### 3. Action-Based Mutations

The **only** way to change state is through actions. This ensures all state changes are synchronized across all players.

```typescript
actions: {
  move: {
    apply(state, context, input) {
      state.players[context.targetId].x = input.x;
    }
  }
}
```

### 4. Deterministic Execution

All random operations use seeded random generators to ensure the host and clients stay in sync.

```typescript
// ❌ Wrong - causes desyncs
const x = Math.random() * 800;

// ✅ Correct - deterministic
const x = context.random.range(0, 800);
```

## Key Components

### defineGame()

Defines your game logic, state structure, and actions. Framework-agnostic - works with any engine.

[Learn more →](/docs/latest/api/core/define-game)

### GameRuntime

Manages the game loop, action submission, and state synchronization. Created automatically when you initialize your game.

[Learn more →](/docs/latest/api/core/game-runtime)

### Transport Layer

Handles network communication. Swap between P2P, WebSocket, or local testing without changing game code.

[Learn more →](/docs/latest/concepts/transport-layer)

### Adapters (Optional)

Framework-specific helpers for Phaser, Godot, etc. Provide automatic sprite syncing, input management, and more.

[Phaser Adapter →](/docs/latest/api/phaser/adapter)

## How It Works

### 1. Initialization

```typescript
const game = defineGame({
  setup: ({ playerIds }) => ({ /* initial state */ }),
  actions: { /* state mutations */ }
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['player-1', 'player-2']
});
```

### 2. Action Flow

```
Player Input → submitAction() → Host Applies → Broadcast → Clients Apply
```

1. Player presses a key
2. Calls `runtime.submitAction('move', { x: 100, y: 200 })`
3. Host applies action to state immediately
4. Host broadcasts action to all clients via transport
5. Clients receive and apply the same action
6. All players now have identical state

### 3. State Synchronization

martini-kit uses an efficient diff/patch algorithm to minimize bandwidth:

```
Host State (t=1) → Diff → Patch → Client State (t=1)
     ↓                                    ↓
Host State (t=2) → Diff → Patch → Client State (t=2)
```

Only changed properties are sent over the network.

## Framework-Agnostic vs Framework-Specific

### Framework-Agnostic (`@martini-kit/core`)

Works with **any** rendering engine or no engine at all:

- Game logic (state, actions)
- Player lifecycle
- Networking
- Determinism
- Testing

### Framework-Specific (`@martini-kit/phaser`, etc.)

Engine-specific helpers for common tasks:

- Sprite synchronization
- Input management
- Physics integration
- Camera controls
- UI helpers

## Next Steps

- **[State Management →](/docs/latest/concepts/state-management)** - How to structure your game state
- **[Actions →](/docs/latest/concepts/actions)** - Understanding the action system
- **[Determinism →](/docs/latest/concepts/determinism)** - Why determinism matters
- **[Transport Layer →](/docs/latest/concepts/transport-layer)** - Network communication
- **[Player Lifecycle →](/docs/latest/concepts/player-lifecycle)** - Managing player join/leave
