---
title: Codebase Architecture
description: Understanding the Martini SDK architecture and design patterns
---

# Codebase Architecture

This guide provides an overview of the Martini SDK architecture to help contributors understand how the codebase is organized.

## Core Philosophy

Martini SDK is built on four key principles:

1. **Host-Authoritative** - The host (or server) runs the game logic; clients mirror the state
2. **Declarative API** - Define your game's state and actions, not the networking layer
3. **Transport-Agnostic** - Works with any network backend (P2P, WebSockets, etc.)
4. **Engine-Agnostic** - Core package works with any rendering engine

## Package Overview

### @martini/core

**Purpose:** The foundation of the multiplayer system

**Key Responsibilities:**
- State synchronization via diff/patch algorithm
- Action system (definition, application, routing)
- Player lifecycle management
- Transport abstraction
- Deterministic random number generation
- Logging infrastructure

**Main Files:**
- [`GameRuntime.ts`](../../../packages/@martini/core/src/GameRuntime.ts) - Main runtime that coordinates everything
- [`sync.ts`](../../../packages/@martini/core/src/sync.ts) - Diff/patch algorithm
- [`SeededRandom.ts`](../../../packages/@martini/core/src/SeededRandom.ts) - Deterministic RNG
- [`helpers.ts`](../../../packages/@martini/core/src/helpers.ts) - Helper utilities
- [`Logger.ts`](../../../packages/@martini/core/src/Logger.ts) - Logging system

### @martini/phaser

**Purpose:** Integration layer for Phaser 3

**Key Responsibilities:**
- Sprite tracking and synchronization
- Input management (keyboard, mouse, touch)
- Physics behavior profiles
- Collision detection wiring
- UI/HUD helpers
- Scene lifecycle integration

**Main Files:**
- [`PhaserAdapter.ts`](../../../packages/@martini/phaser/src/PhaserAdapter.ts) - Main adapter class
- [`SpriteManager.ts`](../../../packages/@martini/phaser/src/helpers/SpriteManager.ts) - Sprite lifecycle management
- [`InputManager.ts`](../../../packages/@martini/phaser/src/helpers/InputManager.ts) - Input handling
- [`PhysicsManager.ts`](../../../packages/@martini/phaser/src/helpers/PhysicsManager.ts) - Physics profiles
- [`CollisionManager.ts`](../../../packages/@martini/phaser/src/helpers/CollisionManager.ts) - Collision rules

### @martini/transport-*

**Purpose:** Network transport implementations

**Available Transports:**
- **transport-local** - In-memory transport for testing (0ms latency)
- **transport-iframe-bridge** - Parent-iframe communication for IDE (~1ms latency)
- **transport-trystero** - P2P WebRTC using Trystero (20-100ms latency)
- **transport-ws** - WebSocket transport for server-based games
- **transport-colyseus** - Colyseus server integration

All transports implement the same `Transport` interface from `@martini/core`.

### @martini/devtools

**Purpose:** Development and debugging tools

**Key Features:**
- State snapshot capture
- Action history tracking
- Performance metrics
- Memory usage monitoring

**Main Files:**
- [`StateInspector.ts`](../../../packages/@martini/devtools/src/StateInspector.ts) - Main inspector class

### @martini/ide

**Purpose:** In-browser IDE for live coding

**Key Features:**
- Code editor with TypeScript support
- Live preview with Phaser games
- State visualization
- Hot module reloading

**Built With:**
- Svelte for UI
- CodeMirror for code editing
- Sandpack for code execution

### @martini/demos

**Purpose:** Documentation site and example games

**Key Features:**
- Documentation (MDsveX + Shiki)
- Example games (Fire & Ice, Paddle Battle, etc.)
- Interactive demos
- Recipe code snippets

## Architecture Patterns

### 1. Host-Authoritative Pattern

```
┌──────────────────┐         ┌──────────────────┐
│  Host (Player 1) │         │ Client (Player 2)│
│                  │         │                  │
│ ┌──────────────┐ │         │ ┌──────────────┐ │
│ │ Game Runtime │ │         │ │ Game Runtime │ │
│ │ (Authority)  │ │         │ │  (Mirror)    │ │
│ └──────┬───────┘ │         │ └──────▲───────┘ │
│        │         │         │        │         │
│        │ Actions │         │        │ State   │
│        │ Applied │         │        │ Patches │
│        ▼         │         │        │         │
│ ┌──────────────┐ │◄────────┼────────┼─────────┤
│ │  Transport   │ │  State  │ ┌──────┴───────┐ │
│ └──────────────┘ │  Sync   │ │  Transport   │ │
└──────────────────┘         │ └──────────────┘ │
                             └──────────────────┘
```

**Key Points:**
- Host runs game logic and applies actions
- Host generates state diffs (patches)
- Clients receive and apply patches
- Clients mirror host state exactly

### 2. Action Flow

```
1. Player submits action via InputManager
   ↓
2. Action sent to host via Transport
   ↓
3. Host applies action to state (GameRuntime)
   ↓
4. Host generates state diff (sync.ts)
   ↓
5. Host broadcasts patches to all clients
   ↓
6. Clients apply patches to their state
   ↓
7. UI re-renders with updated state
```

### 3. State Synchronization

The diff/patch algorithm minimizes bandwidth:

```typescript
// Example state change
Old State: { players: { p1: { x: 100, y: 200 } } }
New State: { players: { p1: { x: 150, y: 200 }, p2: { x: 50, y: 100 } } }

// Generated patches (minimal)
[
  { op: 'replace', path: ['players', 'p1', 'x'], value: 150 },
  { op: 'add', path: ['players', 'p2'], value: { x: 50, y: 100 } }
]
```

### 4. Sprite Tracking (Phaser)

```
1. Host creates sprite and calls adapter.trackSprite(sprite, id)
   ↓
2. Adapter stores sprite data in state._sprites[id]
   ↓
3. State sync broadcasts sprite data
   ↓
4. Client adapter receives state update
   ↓
5. Client creates/updates sprites from state._sprites
   ↓
6. Optional interpolation for smooth movement
```

## Build System

### Turborepo

The project uses Turborepo for:
- **Dependency-aware builds** - Packages build in correct order
- **Caching** - Builds are cached and reused
- **Parallel execution** - Independent tasks run concurrently

Configuration: [`turbo.json`](../../../turbo.json)

### TypeScript

Each package has its own `tsconfig.json`:
- Strict mode enabled for type safety
- ES modules output format
- Declaration files generated for library packages

### Build Tools

- **esbuild** - Fast bundling for libraries
- **Vite** - Dev server and bundling for demos
- **Vitest** - Testing framework

## Testing Strategy

### Unit Tests

Located in `__tests__` directories within each package:

```typescript
// Example test structure
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '../GameRuntime';

describe('GameRuntime', () => {
  it('should initialize state correctly', () => {
    // Test implementation
  });
});
```

### Integration Tests

Test multiple packages working together:
- Use `LocalTransport` for deterministic testing
- Create multi-player scenarios
- Test state synchronization

### Manual Testing

Use the demos and IDE:
- Test with real browsers
- Multi-tab testing for multiplayer
- Performance profiling

## Release Process

The project uses semantic versioning:

```
MAJOR.MINOR.PATCH
e.g., 2.1.0
```

**Version Bumps:**
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

## Key Design Decisions

### Why Host-Authoritative?

**Pros:**
- Simpler than deterministic lockstep
- Works with existing physics engines
- Easier to debug and test
- Less susceptible to cheating

**Cons:**
- Host has advantage (0ms latency)
- Requires good interpolation for smooth client experience

### Why Transport-Agnostic?

Different use cases need different transports:
- **P2P** for casual games (no server costs)
- **WebSocket** for competitive games (lower latency, anti-cheat)
- **Local** for testing and development

### Why Engine-Agnostic Core?

Allows integration with any game engine:
- Phaser (current)
- Unity (planned)
- Godot (planned)
- Three.js (planned)
- Custom engines

## Code Organization Principles

1. **Separation of Concerns**
   - Core has no rendering logic
   - Phaser adapter has no networking logic
   - Transports are pure communication

2. **Type Safety**
   - Strict TypeScript everywhere
   - Generics for state typing
   - Explicit error handling

3. **Minimal Dependencies**
   - Core has zero dependencies
   - Each package minimizes its dependency tree

4. **Progressive Enhancement**
   - Core provides primitives
   - Helpers add convenience
   - Adapters add integration

## Next Steps

- **Read [Where to Contribute](/docs/latest/contributing/where-to-contribute)** to find areas needing work
- **Review [Development Workflow](/docs/latest/contributing/development-workflow)** for PR process
- **Study [Coding Standards](/docs/latest/contributing/coding-standards)** before writing code

---

Have questions about the architecture? Open a discussion on GitHub!
