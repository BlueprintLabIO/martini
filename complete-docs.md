# Martini SDK - Complete Documentation Plan

**Generated:** 2025-11-17
**Last Updated:** 2025-11-17 (Updated after Phase 7 completion)
**Status:** In Progress (Phases 4, 5, 6 & 7 Complete! 🎉 - 62% Milestone!)
**Documentation Site:** http://localhost:5173/docs

## Current Status Summary

### ✅ Completed
- Navigation structure in `navigation.ts` (all sections defined)
- Landing page: `index.md` (created, nested link bug fixed)
- **Phase 1**: Getting Started - `installation.md`, `quick-start.md`, `first-game.md` ✅
- **Phase 3**: Core Concepts - ALL 6 DOCS COMPLETE! 🎉
  - `architecture.md` ✅
  - `state-management.md` ✅
  - `actions.md` ✅
  - `determinism.md` ✅
  - `transport-layer.md` ✅
  - `player-lifecycle.md` ✅
- **Phase 4**: API Reference - @martini/core - ALL 7 DOCS COMPLETE! 🎉
  - `api/core/define-game.md` ✅
  - `api/core/game-runtime.md` ✅
  - `api/core/transport.md` ✅
  - `api/core/seeded-random.md` ✅
  - `api/core/helpers.md` ✅
  - `api/core/logger.md` ✅
  - `api/core/sync.md` ✅
- **Phase 5**: API Reference - @martini/phaser - ALL 8 DOCS COMPLETE! 🎉
  - `api/phaser/adapter.md` ✅
  - `api/phaser/sprite-manager.md` ✅
  - `api/phaser/input-manager.md` ✅
  - `api/phaser/camera-manager.md` ✅
  - `api/phaser/physics-sync.md` ✅
  - `api/phaser/animation-sync.md` ✅
  - `api/phaser/scene-integration.md` ✅
  - `api/phaser/helpers.md` ✅
- **Phase 6**: API Reference - Transports - ALL 5 DOCS COMPLETE! 🎉
  - `api/transports/overview.md` ✅
  - `api/transports/local.md` ✅
  - `api/transports/iframe-bridge.md` ✅
  - `api/transports/trystero.md` ✅
  - `api/transports/custom.md` ✅
- **Phase 7**: API Reference - DevTools - COMPLETE! 🎉
  - `api/devtools/state-inspector.md` ✅
- Guides (partial): `phaser-integration.md`, `best-practices.md`
- API (partial, high-level): `core.md`, `phaser.md`, `transports.md`
- **UI Enhancement**: API Reference sidebar section now folded by default ✅

### 🚧 In Progress
- Ready to start Phase 8: Advanced Guides (6 docs)

### ⏳ Not Started
- Phase 8: Advanced Guides (6 docs)
- Phase 9: Examples & Recipes (6 docs)
- Phase 10: Contributing (6 docs)
- Phase 11: Troubleshooting & FAQ (3 docs)
- Phase 12: Migration & Changelog (2 docs)

### 📊 Progress Metrics
- Files created: 37/60+ (~62%) 🎊
- **Getting Started: 3/3 complete (100%)** ✅
- **Core Concepts: 6/6 complete (100%)** 🎉✅
- **Phase 4 - @martini/core API: 7/7 complete (100%)** 🎉✅
- **Phase 5 - @martini/phaser API: 8/8 complete (100%)** 🎉✅
- **Phase 6 - Transports API: 5/5 complete (100%)** 🎉✅
- **Phase 7 - DevTools API: 1/1 complete (100%)** 🎉✅
- **🎊 NEW MILESTONE: 62% DOCUMENTATION COMPLETE! 🎊**
- Next priority: Phase 8 - Advanced Guides (6 docs)

---

## Table of Contents

- [Overview](#overview)
- [Documentation Phases](#documentation-phases)
  - [Phase 1: Documentation Structure & Navigation](#phase-1-documentation-structure--navigation)
  - [Phase 2: Getting Started](#phase-2-getting-started)
  - [Phase 3: Core Concepts](#phase-3-core-concepts)
  - [Phase 4: API Reference - @martini/core](#phase-4-api-reference---martinicore)
  - [Phase 5: API Reference - @martini/phaser](#phase-5-api-reference---martiniphaser)
  - [Phase 6: API Reference - Transports](#phase-6-api-reference---transports)
  - [Phase 7: API Reference - @martini/devtools](#phase-7-api-reference---martinidevtools)
  - [Phase 8: Advanced Guides](#phase-8-advanced-guides)
  - [Phase 9: Examples & Recipes](#phase-9-examples--recipes)
  - [Phase 10: Contributing Section](#phase-10-contributing-section)
  - [Phase 11: Troubleshooting & FAQ](#phase-11-troubleshooting--faq)
  - [Phase 12: Migration & Changelog](#phase-12-migration--changelog)
- [SDK Architecture Overview](#sdk-architecture-overview)
- [Implementation Strategy](#implementation-strategy)
- [Documentation Tooling](#documentation-tooling)
- [Key Principles](#key-principles)

---

## Overview

This document outlines a comprehensive plan to document the Martini SDK based on the actual source code. The Martini SDK is an **engine-agnostic, host-authoritative multiplayer framework** designed for rapid game development.

### Core Philosophy
- **Host-authoritative** - Host runs the game, clients mirror state
- **Declarative API** - Define state and actions, not networking
- **Transport-agnostic** - Works with any network backend
- **Engine-agnostic** - Works with Phaser, Unity, Godot, Three.js, etc.

### Package Structure
- `@martini/core` - Foundation (engine-agnostic multiplayer SDK)
- `@martini/phaser` - Phaser 3 integration
- `@martini/transport-local` - In-memory transport for demos/testing
- `@martini/transport-iframe-bridge` - Iframe-based transport for IDE
- `@martini/transport-trystero` - P2P WebRTC transport
- `@martini/devtools` - State inspection and debugging tools
- `@martini/ide` - In-browser IDE for live coding
- `@martini/demos` - Documentation site and example games

---

## Documentation Phases

### Phase 1: Documentation Structure & Navigation

**Goal:** Set up the documentation architecture

#### Tasks

1. **Create navigation structure** in `src/lib/docs/navigation.ts`
   - Getting Started section
   - Core Concepts section
   - API Reference section (Core, Phaser, Transports, DevTools)
   - Guides section
   - Examples & Recipes section
   - Contributing section ✨
   - Troubleshooting section

2. **Set up version routing** (already started in `src/params/version.js`)
   - Support `/docs/latest/`, `/docs/stable/`, `/docs/v0.1/`

3. **Create landing page** at `/docs`
   - Quick overview
   - Key features
   - Quick links to popular sections
   - Hero section with value proposition
   - Feature highlights
   - Getting started CTA

#### File Structure
```
src/content/docs/
├── index.md                           # Landing page
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── first-game.md
├── concepts/
│   ├── architecture.md
│   ├── state-management.md
│   ├── actions.md
│   ├── transport-layer.md
│   ├── player-lifecycle.md
│   └── determinism.md
├── api/
│   ├── core/
│   │   ├── define-game.md
│   │   ├── game-runtime.md
│   │   ├── transport.md
│   │   ├── seeded-random.md
│   │   ├── helpers.md
│   │   ├── logger.md
│   │   └── sync.md
│   ├── phaser/
│   │   ├── adapter.md
│   │   ├── sprite-manager.md
│   │   ├── reactive-apis.md
│   │   ├── input-manager.md
│   │   ├── physics-manager.md
│   │   ├── collision-manager.md
│   │   ├── ui-helpers.md
│   │   └── spawner.md
│   ├── transports/
│   │   ├── overview.md
│   │   ├── local.md
│   │   ├── iframe-bridge.md
│   │   ├── trystero.md
│   │   └── custom.md
│   └── devtools/
│       └── state-inspector.md
├── guides/
│   ├── phaser-integration.md
│   ├── physics-and-collision.md
│   ├── ui-and-hud.md
│   ├── testing.md
│   ├── deployment.md
│   └── optimization.md
├── recipes/
│   ├── overview.md
│   ├── player-movement.md
│   ├── shooting-mechanics.md
│   ├── health-and-damage.md
│   ├── power-ups.md
│   └── game-modes.md
├── examples/
│   └── overview.md
├── contributing/
│   ├── getting-started.md
│   ├── architecture.md
│   ├── where-to-contribute.md
│   ├── development-workflow.md
│   ├── coding-standards.md
│   └── adding-examples.md
├── troubleshooting/
│   ├── common-issues.md
│   └── debugging.md
├── faq.md
├── migration/
│   └── v1-to-v2.md
└── changelog.md
```

---

### Phase 2: Getting Started

**Goal:** Help new users build their first multiplayer game in <15 minutes

#### Documents to Create

#### 1. `getting-started/installation.md`

**Content:**
- Prerequisites (Node.js 18+, package manager)
- Installing packages:
  ```bash
  pnpm add @martini/core @martini/phaser
  # or
  npm install @martini/core @martini/phaser
  ```
- Choosing a transport layer:
  - `@martini/transport-local` - For demos and testing
  - `@martini/transport-trystero` - For P2P production games
- Basic project structure setup
- TypeScript configuration recommendations
- Phaser setup and initialization

**Code Examples:**
- Minimal package.json
- tsconfig.json recommendations
- Basic project folder structure

---

#### 2. `getting-started/quick-start.md`

**Content:**
- Minimal working example (30-40 LOC)
- Host/client setup with LocalTransport
- Basic state with one player
- One action (e.g., move)
- Running the game

**Code Example:**
```typescript
import { defineGame, GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';

// Define your game
const game = defineGame({
  setup: () => ({
    players: {}
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    }
  },

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100 };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});

// Create transport and runtime
const transport = new LocalTransport({
  roomId: 'my-game',
  isHost: true
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: [transport.getPlayerId()]
});

// Submit actions
runtime.submitAction('move', { x: 200, y: 300 });

// Listen for state changes
runtime.onChange((state) => {
  console.log('State updated:', state);
});
```

---

#### 3. `getting-started/first-game.md`

**Content:**
- Complete tutorial: Building a simple multiplayer paddle game
- Step-by-step breakdown:
  1. Setting up the project
  2. Defining game state
  3. Adding player movement
  4. Integrating Phaser
  5. Adding physics
  6. Adding input handling
  7. Testing with multiple clients

**Code Examples:**
- Extract from actual Paddle Battle game
- Fully commented code
- Screenshots/GIFs of the game in action

---

### Phase 3: Core Concepts

**Goal:** Deep dive into fundamental concepts

#### Documents to Create

#### 1. `concepts/architecture.md`

**Content:**
- Host-authoritative pattern explained
  - What it means
  - Why it's simpler than deterministic lockstep
  - Trade-offs (latency vs simplicity)
- Architecture diagram:
  ```
  Host (authoritative)          Clients (mirroring)
  ├─ Runs game logic            ├─ Sends input
  ├─ Applies actions            ├─ Receives state patches
  ├─ Runs physics               ├─ Mirrors state
  ├─ Generates patches          └─ Renders locally
  └─ Broadcasts state
  ```
- Package responsibilities diagram
- Message flow diagrams (action submission → state sync)
- Comparison with other multiplayer architectures

---

#### 2. `concepts/state-management.md`

**Content:**
- State shape and TypeScript typing
  - Defining state interfaces
  - Nested state structures
  - Best practices for state organization
- Immutability principles
  - Why mutation is okay in action handlers
  - How state is internally managed
- State synchronization (diff/patch algorithm)
  - How diffs are generated
  - Patch format (JSON Patch-like)
  - Bandwidth optimization
- Best practices for state structure
  - Keep state serializable (no functions, classes)
  - Avoid deeply nested structures
  - Use maps/objects for collections

**Code Examples:**
```typescript
// Good state structure
interface GameState {
  players: Record<string, Player>;
  projectiles: Record<string, Projectile>;
  gameStatus: 'waiting' | 'playing' | 'ended';
  score: Record<string, number>;
}

// Avoid this (too nested)
interface BadState {
  game: {
    session: {
      players: {
        data: {
          [id: string]: {
            stats: { health: number }
          }
        }
      }
    }
  }
}
```

---

#### 3. `concepts/actions.md`

**Content:**
- Action definition anatomy
  ```typescript
  interface ActionDefinition<TState, TInput> {
    input?: any;  // Optional validation schema
    apply: (state: TState, context: ActionContext, input: TInput) => void;
  }
  ```
- **Critical:** `context.playerId` vs `context.targetId` ⚠️
  - `playerId` - Who submitted the action
  - `targetId` - Who the action affects (defaults to playerId)
  - Common mistake: using playerId instead of targetId
- Input validation (optional schemas)
- Action context properties:
  - `context.random` - Seeded random generator
  - `context.emit()` - Emit custom events
  - `context.playerId` - Submitter
  - `context.targetId` - Target
- Helper functions:
  - `createInputAction(stateKey)`
  - `createTickAction(tickFn)`
- Best practices:
  - Keep actions pure and deterministic
  - Use context.random, not Math.random()
  - Don't call external APIs in actions

**Code Examples:**
```typescript
// CORRECT ✅
actions: {
  takeDamage: {
    apply(state, context, input: { amount: number }) {
      const player = state.players[context.targetId]; // Use targetId!
      if (player) {
        player.health -= input.amount;
      }
    }
  }
}

// WRONG ❌
actions: {
  takeDamage: {
    apply(state, context, input: { amount: number }) {
      const player = state.players[context.playerId]; // Wrong! This is who submitted
      if (player) {
        player.health -= input.amount;
      }
    }
  }
}

// Usage:
// Player 1 shoots Player 2
runtime.submitAction('takeDamage', { amount: 10 }, 'player-2'); // targetId = player-2
```

---

#### 4. `concepts/transport-layer.md`

**Content:**
- Transport interface explained
  ```typescript
  interface Transport {
    send(message: WireMessage, targetId?: string): void;
    onMessage(handler: (msg, senderId) => void): () => void;
    onPeerJoin(handler: (peerId) => void): () => void;
    onPeerLeave(handler: (peerId) => void): () => void;
    getPlayerId(): string;
    getPeerIds(): string[];
    isHost(): boolean;
    metrics?: TransportMetrics;
  }
  ```
- Available transports comparison table:
  | Transport | Latency | Use Case | Setup Complexity |
  |-----------|---------|----------|------------------|
  | LocalTransport | 0ms | Demos, testing | Easy |
  | IframeBridgeTransport | ~1ms | IDE sandboxes | Medium |
  | TrysteroTransport | 20-100ms | P2P production | Medium |
  | Custom (WebSocket) | 10-50ms | Server-based | Hard |
- When to use which transport
- Implementing custom transports
- Transport metrics interface

**Diagrams:**
- Message flow through transport layer
- P2P vs client-server topology

---

#### 5. `concepts/player-lifecycle.md`

**Content:**
- Player join/leave flow
- Using `createPlayerManager` helper:
  ```typescript
  const playerManager = createPlayerManager({
    factory: (playerId, index) => ({
      x: 100 + index * 50,
      y: 200,
      health: 100
    }),
    roles: ['fire', 'ice'],
    spawnPoints: [
      { x: 200, y: 400 },
      { x: 600, y: 400 }
    ]
  });
  ```
- Roles and spawn points
- Handling disconnections
- Graceful player removal
- Reconnection strategies

**Code Examples:**
- From Fire & Ice game (roles pattern)
- Custom spawn logic
- Player state cleanup

---

#### 6. `concepts/determinism.md`

**Content:**
- Why determinism matters in multiplayer games
- Why `SeededRandom` is essential
  - Same seed = same sequence on all clients
  - Critical for fair gameplay
- Using RNG correctly:
  ```typescript
  // CORRECT ✅
  const angle = context.random.float(0, Math.PI * 2);

  // WRONG ❌
  const angle = Math.random() * Math.PI * 2;
  ```
- Common pitfalls:
  - `Math.random()` - Non-deterministic
  - `Date.now()` - Different on each client
  - External API calls - Unpredictable
  - Iteration order of objects (use arrays for deterministic order)
- Testing determinism
- Debugging non-deterministic behavior

---

### Phase 4: API Reference - @martini/core

**Goal:** Complete API documentation for core package

#### Documents to Create

#### 1. `api/core/define-game.md`

**Full API reference:**

```typescript
function defineGame<TState>(definition: GameDefinition<TState>): GameDefinition<TState>

interface GameDefinition<TState> {
  setup?: (context: SetupContext) => TState;
  actions?: Record<string, ActionDefinition<TState>>;
  onPlayerJoin?: (state: TState, playerId: string) => void;
  onPlayerLeave?: (state: TState, playerId: string) => void;
}

interface SetupContext {
  playerIds: string[];
  random: SeededRandom;
}

interface ActionDefinition<TState, TInput = any> {
  input?: any;
  apply: (state: TState, context: ActionContext, input: TInput) => void;
}

interface ActionContext {
  playerId: string;      // Who submitted the action
  targetId: string;      // Who the action affects
  random: SeededRandom;  // Deterministic RNG
  emit: (name: string, payload?: any) => void;  // Emit custom events
}
```

**Content:**
- Detailed explanation of each property
- When setup() is called
- Action registration
- Player lifecycle hooks
- Complete code examples

---

#### 2. `api/core/game-runtime.md`

**Full API reference:**

```typescript
class GameRuntime<TState> {
  constructor(
    game: GameDefinition<TState>,
    transport: Transport,
    config: GameRuntimeConfig
  );

  // Methods
  submitAction(name: string, input?: any, targetId?: string): void;
  getState(): TState;
  onChange(listener: (state: TState) => void): () => void;
  onEvent(name: string, listener: (senderId: string, payload: any) => void): () => void;
  destroy(): void;

  // Properties
  readonly isHost: boolean;
  readonly playerId: string;
}

interface GameRuntimeConfig {
  isHost: boolean;
  playerIds: string[];
  seed?: number;
  syncRateMs?: number;  // Default: 50ms (20 FPS)
}
```

**Content:**
- Constructor parameters explained
- Method descriptions with examples
- Lifecycle (initialization → destroy)
- Event handling patterns
- Configuration options
- Performance tuning (syncRateMs)

---

#### 3. `api/core/transport.md`

**Full Transport interface specification:**

```typescript
interface Transport {
  // Message handling
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): Unsubscribe;

  // Peer management
  onPeerJoin(handler: PeerHandler): Unsubscribe;
  onPeerLeave(handler: PeerHandler): Unsubscribe;
  getPeerIds(): string[];

  // Identity
  getPlayerId(): string;
  isHost(): boolean;

  // Optional metrics
  metrics?: TransportMetrics;
}

interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  sessionId?: string;
  [key: string]: any;
}

interface TransportMetrics {
  getConnectionState(): ConnectionState;
  onConnectionChange(callback: (state: ConnectionState) => void): Unsubscribe;
  getPeerCount(): number;
  getMessageStats(): MessageStats;
  getLatencyMs?(): number;
  resetStats?(): void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface MessageStats {
  sent: number;
  received: number;
  errors: number;
}
```

**Content:**
- Detailed explanation of each method
- Message types and their payloads
- Implementing custom transports
- Best practices for transport implementation
- Error handling
- Metrics integration

---

#### 4. `api/core/seeded-random.md`

**Full API reference:**

```typescript
class SeededRandom {
  constructor(seed: number);

  // Methods
  next(): number;                           // 0.0-1.0
  range(min: number, max: number): number;  // Integer in [min, max)
  float(min: number, max: number): number;  // Float in [min, max)
  choice<T>(array: T[]): T;                 // Random element
  shuffle<T>(array: T[]): T[];              // Shuffled copy
  boolean(probability?: number): boolean;   // true with probability (default 0.5)

  // Properties
  readonly seed: number;
}
```

**Content:**
- Algorithm explanation (LCG - Linear Congruential Generator)
- Method descriptions with examples
- Usage patterns from actual games
- When to use each method
- Performance characteristics
- Limitations (not cryptographically secure)

**Code Examples:**
```typescript
const rng = new SeededRandom(12345);

// Random position
const x = rng.range(0, 800);
const y = rng.range(0, 600);

// Random direction
const angle = rng.float(0, Math.PI * 2);

// Random power-up
const powerUp = rng.choice(['health', 'speed', 'shield']);

// Shuffled deck
const deck = rng.shuffle(['A', 'B', 'C', 'D']);

// 70% chance
if (rng.boolean(0.7)) {
  // Spawn enemy
}
```

---

#### 5. `api/core/helpers.md`

**Full API reference:**

```typescript
// Player Manager
function createPlayerManager<TPlayer>(config: PlayerManagerConfig<TPlayer>): PlayerManager<TPlayer>

interface PlayerManagerConfig<TPlayer> {
  factory: (playerId: string, index: number) => TPlayer;
  roles?: string[];
  spawnPoints?: Array<{ x: number; y: number }>;
}

interface PlayerManager<TPlayer> {
  createHandlers(): {
    onPlayerJoin: (state: any, playerId: string) => void;
    onPlayerLeave: (state: any, playerId: string) => void;
  };
}

// Create Players
function createPlayers<TPlayer>(
  playerIds: string[],
  factory: (playerId: string, index: number) => TPlayer
): Record<string, TPlayer>

// Input Action
function createInputAction<TState>(stateKey: string): ActionDefinition<TState>

// Tick Action
function createTickAction<TState>(
  tickFn: (state: TState, context: ActionContext) => void
): ActionDefinition<TState>
```

**Content:**
- Detailed explanation of each helper
- When to use each one
- Complete code examples from real games
- Combining helpers for common patterns

**Code Examples from Fire & Ice:**
```typescript
const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 400,
    y: 300,
    health: 100,
    role: null as 'fire' | 'ice' | null
  }),
  roles: ['fire', 'ice'],
  spawnPoints: [
    { x: 200, y: 400 },
    { x: 600, y: 400 }
  ]
});

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds, playerManager.config.factory),
    projectiles: []
  }),

  ...playerManager.createHandlers(),

  actions: {
    move: createInputAction('players'),

    tick: createTickAction((state, context) => {
      // Game loop logic
      updateProjectiles(state);
      checkCollisions(state);
    })
  }
});
```

---

#### 6. `api/core/logger.md`

**Full API reference:**

```typescript
class Logger {
  constructor(channelName: string);

  // Logging methods
  log(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;

  // Listeners
  addListener(listener: LogListener): () => void;
  removeListener(listener: LogListener): void;

  // Static configuration
  static setLevel(level: LogLevel): void;
  static getLevel(): LogLevel;
}

// Global singleton
const logger: Logger;

type LogLevel = 'debug' | 'log' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  channel: string;
  message: string;
  args: any[];
  timestamp: number;
}

type LogListener = (entry: LogEntry) => void;
```

**Content:**
- Unity-inspired logging system
- Channel-based organization
- Integration with DevTools
- Creating custom loggers
- Log level filtering
- Adding custom listeners
- Performance considerations

**Code Examples:**
```typescript
import { Logger } from '@martini/core';

const gameLogger = new Logger('Game');
const physicsLogger = new Logger('Physics');

gameLogger.log('Player joined', playerId);
physicsLogger.debug('Collision detected', body1, body2);

// Add DevTools integration
gameLogger.addListener((entry) => {
  // Send to DevTools panel
  devtools.logEntry(entry);
});

// Set global log level
Logger.setLevel('warn'); // Only show warnings and errors
```

---

#### 7. `api/core/sync.md`

**Full API reference:**

```typescript
// Generate diff between states
function generateDiff(oldState: any, newState: any): Patch[]

// Apply a single patch
function applyPatch(state: any, patch: Patch): void

// Apply multiple patches
function applyPatches(state: any, patches: Patch[]): void

interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];  // e.g., ['players', 'p1', 'x']
  value?: any;
}
```

**Content:**
- How the diff/patch algorithm works
- Patch format (JSON Patch-like)
- Performance characteristics
- When patches are generated
- Bandwidth optimization
- Custom sync strategies (advanced)
- Debugging sync issues

**Example patches:**
```typescript
// State changed from:
// { players: { p1: { x: 100, y: 200 } } }
// to:
// { players: { p1: { x: 150, y: 200 }, p2: { x: 50, y: 100 } } }

const patches = [
  { op: 'replace', path: ['players', 'p1', 'x'], value: 150 },
  { op: 'add', path: ['players', 'p2'], value: { x: 50, y: 100 } }
];
```

---

### Phase 5: API Reference - @martini/phaser

**Goal:** Complete Phaser integration documentation

#### Documents to Create

#### 1. `api/phaser/adapter.md`

**Full API reference:**

```typescript
class PhaserAdapter<TState> {
  constructor(
    runtime: GameRuntime<TState>,
    scene: Phaser.Scene,
    config?: PhaserAdapterConfig
  );

  // Sprite tracking
  trackSprite(sprite: Phaser.GameObjects.Sprite, id: string): void;
  untrackSprite(id: string): void;
  getTrackedSprite(id: string): Phaser.GameObjects.Sprite | undefined;

  // Sprite manager
  createSpriteManager<TData>(config: SpriteManagerConfig<TData>): SpriteManager<TData>;

  // Player utilities
  getMyPlayer<T>(stateKey: string): T | undefined;
  watchMyPlayer<T, R>(
    selector: (player: T | undefined) => R,
    callback: (value: R) => void
  ): () => void;
  onMyPlayerChange<T>(callback: (player: T | undefined) => void): () => void;

  // Input
  createInputManager(config: InputManagerConfig): InputManager;

  // Lifecycle
  update(time: number, delta: number): void;
  destroy(): void;

  // Properties
  readonly runtime: GameRuntime<TState>;
  readonly scene: Phaser.Scene;
  readonly playerId: string;
}

interface PhaserAdapterConfig {
  spriteNamespace?: string;    // Default: '_sprites'
  autoInterpolate?: boolean;   // Default: true
  lerpFactor?: number;         // Default: 0.3 (30% lerp per frame)
}
```

**Content:**
- Detailed explanation of adapter setup
- Sprite namespace concept
- Auto-interpolation for smooth movement
- Integration with Phaser scene lifecycle
- Best practices
- Performance tuning

---

#### 2. `api/phaser/sprite-manager.md`

**Full API reference:**

```typescript
interface SpriteManager<TData> {
  add(key: string, data: TData): void;
  remove(key: string): void;
  update(key: string, data: TData): void;
  get(key: string): Phaser.GameObjects.Sprite | undefined;
  getAll(): Map<string, Phaser.GameObjects.Sprite>;
  destroy(): void;
}

interface SpriteManagerConfig<TData> {
  // Required: Create sprite
  onCreate: (key: string, data: TData, scene: Phaser.Scene) => Phaser.GameObjects.Sprite;

  // Optional: Add physics
  onCreatePhysics?: (sprite: Phaser.GameObjects.Sprite, key: string, data: TData) => void;

  // Optional: Update sprite from data
  onUpdate?: (sprite: Phaser.GameObjects.Sprite, data: TData) => void;

  // Optional: Inter-sprite setup (called after all sprites created)
  onReady?: (sprite: Phaser.GameObjects.Sprite, key: string, data: TData) => void;

  // Optional: Cleanup on destroy
  onDestroy?: (sprite: Phaser.GameObjects.Sprite, key: string) => void;
}
```

**Content:**
- Sprite lifecycle management
- Automatic creation/destruction from state
- Physics integration pattern
- Update hook for syncing visual properties
- Ready hook for inter-sprite wiring (collisions, etc.)
- Examples from actual games

**Code Example from Fire & Ice:**
```typescript
const projectileManager = adapter.createSpriteManager({
  onCreate: (key, data, scene) => {
    return scene.add.sprite(data.x, data.y, 'projectile');
  },

  onCreatePhysics: (sprite, key, data) => {
    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(8);
    body.setVelocity(data.vx, data.vy);
  },

  onUpdate: (sprite, data) => {
    sprite.x = data.x;
    sprite.y = data.y;
    sprite.rotation = data.rotation;
  },

  onReady: (sprite, key, data) => {
    // Set up collisions with other sprites
    this.physics.add.overlap(sprite, playerSprites, handleHit);
  },

  onDestroy: (sprite, key) => {
    // Play explosion animation
    this.add.sprite(sprite.x, sprite.y, 'explosion').play('explode');
  }
});

// Usage in update loop
this.runtime.onChange((state) => {
  state.projectiles.forEach((proj) => {
    projectileManager.add(proj.id, proj);
  });
});
```

---

#### 3. `api/phaser/reactive-apis.md`

**Full API reference:**

```typescript
// Direct access (polling)
getMyPlayer<T>(stateKey: string): T | undefined

// Reactive watching (selector + callback)
watchMyPlayer<T, R>(
  selector: (player: T | undefined) => R,
  callback: (value: R) => void
): () => void  // Returns unsubscribe function

// Event-based listening
onMyPlayerChange<T>(
  callback: (player: T | undefined) => void
): () => void  // Returns unsubscribe function
```

**Content:**
- Three patterns for accessing player state
- When to use each approach
- Performance considerations
- Examples from Fire & Ice game

**Code Examples:**
```typescript
// Pattern 1: Direct access (in update loop)
update() {
  const player = this.adapter.getMyPlayer<Player>('players');
  if (player) {
    this.healthText.setText(`HP: ${player.health}`);
  }
}

// Pattern 2: Reactive watching (specific property)
const unwatch = this.adapter.watchMyPlayer(
  (player) => player?.health,
  (health) => {
    this.healthText.setText(`HP: ${health ?? 0}`);
    if (health && health <= 20) {
      this.healthText.setColor('#ff0000'); // Red when low
    }
  }
);

// Pattern 3: Event-based listening (full player)
const unlisten = this.adapter.onMyPlayerChange((player) => {
  if (!player) {
    this.scene.start('GameOverScene');
  } else {
    this.updateAllUI(player);
  }
});

// Cleanup
this.events.on('shutdown', () => {
  unwatch();
  unlisten();
});
```

---

#### 4. `api/phaser/input-manager.md`

**Full API reference:**

```typescript
interface InputManager {
  enable(): void;
  disable(): void;
  destroy(): void;
  setDebounceMs(action: string, ms: number): void;
}

interface InputManagerConfig {
  keyBindings?: KeyBindings;
  pointerBindings?: PointerBindings;
  debounceMs?: number;  // Default debounce for all actions
}

interface KeyBindings {
  [key: string]: {  // Phaser key code
    action: string;
    input?: any;
    targetId?: string;
  }
}

interface PointerBindings {
  click?: { action: string; input?: any };
  move?: { action: string; input?: any };
}
```

**Content:**
- Setting up keyboard input
- Pointer/mouse input
- Touch support
- Debouncing to prevent spam
- Action submission integration
- Examples with different control schemes

**Code Examples:**
```typescript
// Keyboard controls
const inputManager = adapter.createInputManager({
  keyBindings: {
    'W': { action: 'move', input: { direction: 'up' } },
    'S': { action: 'move', input: { direction: 'down' } },
    'A': { action: 'move', input: { direction: 'left' } },
    'D': { action: 'move', input: { direction: 'right' } },
    'SPACE': { action: 'shoot' }
  },
  debounceMs: 100  // Prevent spamming
});

// Pointer controls
const inputManager = adapter.createInputManager({
  pointerBindings: {
    click: {
      action: 'shoot',
      input: (pointer) => ({
        targetX: pointer.x,
        targetY: pointer.y
      })
    },
    move: {
      action: 'aim',
      input: (pointer) => ({
        x: pointer.x,
        y: pointer.y
      })
    }
  }
});

// Dynamic debouncing
inputManager.setDebounceMs('shoot', 500); // 500ms cooldown
```

---

#### 5. `api/phaser/physics-manager.md`

**Full API reference:**

```typescript
class PhysicsManager {
  constructor(scene: Phaser.Scene);

  applyBehavior(
    sprite: Phaser.GameObjects.Sprite,
    profile: PhysicsBehaviorProfile
  ): void;

  createCustomBehavior(config: PhysicsBehaviorConfig): PhysicsBehaviorProfile;

  // Built-in profiles
  static readonly PLATFORMER: PhysicsBehaviorProfile;
  static readonly TOPDOWN: PhysicsBehaviorProfile;
  static readonly RACING: PhysicsBehaviorProfile;
  static readonly SPACE: PhysicsBehaviorProfile;
}

interface PhysicsBehaviorProfile {
  gravity?: { x: number; y: number };
  drag?: { x: number; y: number };
  bounce?: number;
  maxVelocity?: { x: number; y: number };
  collideWorldBounds?: boolean;
}
```

**Content:**
- Pre-built physics profiles
- Creating custom behaviors
- Integration with Arcade Physics
- Common patterns for different game types
- Performance considerations

**Code Examples:**
```typescript
const physicsManager = new PhysicsManager(this);

// Platformer physics
physicsManager.applyBehavior(playerSprite, PhysicsManager.PLATFORMER);
// Result: gravity.y = 800, drag.x = 400, collideWorldBounds = true

// Top-down physics
physicsManager.applyBehavior(playerSprite, PhysicsManager.TOPDOWN);
// Result: gravity = 0, drag = 300, collideWorldBounds = true

// Custom behavior
const waterPhysics = physicsManager.createCustomBehavior({
  gravity: { x: 0, y: 100 },  // Slight downward pull
  drag: { x: 800, y: 800 },   // High resistance
  maxVelocity: { x: 100, y: 100 }
});

physicsManager.applyBehavior(underwaterSprite, waterPhysics);
```

---

#### 6. `api/phaser/collision-manager.md`

**Full API reference:**

```typescript
class CollisionManager {
  constructor(scene: Phaser.Scene);

  addRule(rule: CollisionRule): void;
  removeRule(id: string): void;
  clearRules(): void;
  destroy(): void;
}

interface CollisionRule {
  id: string;
  object1: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group;
  object2: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group;
  type: 'collide' | 'overlap';
  callback: (obj1: any, obj2: any) => void;
  processCallback?: (obj1: any, obj2: any) => boolean;
}
```

**Content:**
- Setting up collision rules
- Collide vs overlap
- Group-based collisions
- Processing callbacks for conditional collisions
- Examples from games

**Code Examples:**
```typescript
const collisionManager = new CollisionManager(this);

// Player vs walls
collisionManager.addRule({
  id: 'player-walls',
  object1: playerSprite,
  object2: wallsGroup,
  type: 'collide',
  callback: () => {
    // Player blocked by wall
  }
});

// Projectiles vs enemies
collisionManager.addRule({
  id: 'projectiles-enemies',
  object1: projectilesGroup,
  object2: enemiesGroup,
  type: 'overlap',
  callback: (projectile, enemy) => {
    runtime.submitAction('enemyHit', {
      enemyId: enemy.getData('id'),
      damage: projectile.getData('damage')
    });
    projectile.destroy();
  }
});

// Conditional collision (one-way platform)
collisionManager.addRule({
  id: 'player-platform',
  object1: playerSprite,
  object2: platformsGroup,
  type: 'collide',
  processCallback: (player, platform) => {
    // Only collide if player is falling
    return player.body.velocity.y > 0;
  },
  callback: () => {
    // Player landed on platform
  }
});
```

---

#### 7. `api/phaser/ui-helpers.md`

**Full API reference:**

```typescript
// Player UI Manager
class PlayerUIManager {
  constructor(scene: Phaser.Scene, playerId: string);

  addText(key: string, x: number, y: number, config?: TextConfig): Phaser.GameObjects.Text;
  addBar(key: string, x: number, y: number, config?: BarConfig): UIBar;
  update(playerData: any): void;
  destroy(): void;
}

// HUD Helper
class HUDHelper {
  static createPlayerHUD(
    scene: Phaser.Scene,
    player: any,
    layout: HUDLayout
  ): PlayerHUD;
}

interface HUDLayout {
  healthBar?: { x: number; y: number; width: number; height: number };
  nameplate?: { x: number; y: number };
  speedDisplay?: { x: number; y: number };
}

// Health Bar Manager
class HealthBarManager {
  constructor(scene: Phaser.Scene);

  createBar(sprite: Phaser.GameObjects.Sprite, config?: HealthBarConfig): HealthBar;
  updateBar(barId: string, health: number, maxHealth: number): void;
  destroyBar(barId: string): void;
}

// Speed Display
class SpeedDisplay extends Phaser.GameObjects.Container {
  update(velocity: { x: number; y: number }): void;
}

// Directional Indicator
class DirectionalIndicator extends Phaser.GameObjects.Sprite {
  setDirection(angle: number): void;
}
```

**Content:**
- Building player HUDs
- Health bars that follow sprites
- Speed indicators
- Directional arrows
- Layout helpers
- Examples from games

**Code Examples:**
```typescript
// Create player HUD
const hud = HUDHelper.createPlayerHUD(this, player, {
  healthBar: { x: 20, y: 20, width: 200, height: 20 },
  nameplate: { x: 20, y: 50 },
  speedDisplay: { x: 20, y: 80 }
});

// Health bar above sprite
const healthBarManager = new HealthBarManager(this);
const healthBar = healthBarManager.createBar(playerSprite, {
  width: 50,
  height: 6,
  offsetY: -40,
  backgroundColor: 0x000000,
  fillColor: 0x00ff00
});

// Update health bar
adapter.watchMyPlayer(
  (player) => player?.health,
  (health) => {
    healthBarManager.updateBar(healthBar.id, health ?? 0, 100);
  }
);

// Speed display
const speedDisplay = new SpeedDisplay(this, 20, 100);
this.add.existing(speedDisplay);

// Update in game loop
update() {
  const player = adapter.getMyPlayer('players');
  if (player) {
    speedDisplay.update({ x: player.vx, y: player.vy });
  }
}
```

---

#### 8. `api/phaser/spawner.md`

**Full API reference:**

```typescript
class StateDrivenSpawner<TData> {
  constructor(
    scene: Phaser.Scene,
    config: SpawnerConfig<TData>
  );

  update(items: TData[]): void;
  destroy(): void;
}

interface SpawnerConfig<TData> {
  getId: (item: TData) => string;
  onCreate: (item: TData, scene: Phaser.Scene) => Phaser.GameObjects.GameObject;
  onUpdate?: (sprite: Phaser.GameObjects.GameObject, item: TData) => void;
  onDestroy?: (sprite: Phaser.GameObjects.GameObject) => void;
}
```

**Content:**
- Dynamic sprite creation from state arrays
- Automatic cleanup of removed items
- Use cases: projectiles, pickups, particles
- Examples from games

**Code Examples:**
```typescript
const projectileSpawner = new StateDrivenSpawner(this, {
  getId: (proj) => proj.id,

  onCreate: (proj, scene) => {
    const sprite = scene.add.sprite(proj.x, proj.y, 'bullet');
    scene.physics.add.existing(sprite);
    return sprite;
  },

  onUpdate: (sprite, proj) => {
    sprite.x = proj.x;
    sprite.y = proj.y;
    sprite.rotation = proj.angle;
  },

  onDestroy: (sprite) => {
    // Play explosion
    this.add.sprite(sprite.x, sprite.y, 'explosion').play('explode');
    sprite.destroy();
  }
});

// In state change handler
runtime.onChange((state) => {
  projectileSpawner.update(state.projectiles);
});
```

---

### Phase 6: API Reference - Transports

**Goal:** Document all transport implementations

#### Documents to Create

#### 1. `api/transports/overview.md`

**Comparison table:**

| Transport | Latency | Use Case | Setup | Pros | Cons |
|-----------|---------|----------|-------|------|------|
| LocalTransport | 0ms | Demos, testing | Easy | Zero latency, simple | Same-page only |
| IframeBridgeTransport | ~1ms | IDE sandboxes | Medium | Sandboxed, fast | Iframe overhead |
| TrysteroTransport | 20-100ms | P2P games | Medium | No server needed | NAT issues, WebRTC complexity |
| WebSocket (custom) | 10-50ms | Production | Hard | Low latency, reliable | Requires server |

**Decision guide:**
```
Need to test locally? → LocalTransport
Building for IDE? → IframeBridgeTransport
No server budget? → TrysteroTransport
Production game? → WebSocket or custom transport
```

---

#### 2. `api/transports/local.md`

**Full API reference:**

```typescript
class LocalTransport implements Transport {
  constructor(config: LocalTransportConfig);

  // Transport interface
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): Unsubscribe;
  onPeerJoin(handler: PeerHandler): Unsubscribe;
  onPeerLeave(handler: PeerHandler): Unsubscribe;
  getPeerIds(): string[];
  getPlayerId(): string;
  isHost(): boolean;

  // Metrics
  metrics: TransportMetrics;

  // Cleanup
  destroy(): void;
}

interface LocalTransportConfig {
  roomId: string;
  isHost: boolean;
  playerId?: string;  // Optional, auto-generated if not provided
}

// Static registry
class LocalTransportRegistry {
  static getInstance(roomId: string, playerId: string): LocalTransport;
  static removeInstance(roomId: string, playerId: string): void;
  static getRoomPeers(roomId: string): LocalTransport[];
}
```

**Content:**
- How LocalTransport works (in-memory registry)
- Instant peer discovery
- Use cases and examples
- Testing patterns
- Metrics integration

---

#### 3. `api/transports/iframe-bridge.md`

**Full API reference:**

```typescript
// Parent window relay
class IframeBridgeRelay {
  constructor();

  registerIframe(iframe: HTMLIFrameElement, role: 'host' | 'client'): void;
  unregisterIframe(iframe: HTMLIFrameElement): void;
  destroy(): void;
}

// Iframe transport
class IframeBridgeTransport implements Transport {
  constructor(config: IframeBridgeConfig);

  // Transport interface (same as LocalTransport)
  // ...

  metrics: TransportMetrics;
}

interface IframeBridgeConfig {
  isHost: boolean;
  playerId?: string;
}

// Message protocol
interface BridgeMessage {
  type: 'BRIDGE_REGISTER' | 'BRIDGE_SEND' | 'BRIDGE_DELIVER' | 'BRIDGE_PEER_JOIN' | 'BRIDGE_PEER_LEAVE';
  playerId?: string;
  isHost?: boolean;
  targetId?: string;
  message?: WireMessage;
  peerId?: string;
}
```

**Content:**
- Architecture diagram (parent ↔ iframe communication)
- Setup in parent window
- Setup in iframe
- Message flow
- Security considerations
- Examples from IDE

---

#### 4. `api/transports/trystero.md`

**Content:**
- P2P transport overview
- WebRTC basics
- Trystero integration
- STUN/TURN configuration
- NAT traversal
- Production considerations
- Fallback strategies

---

#### 5. `api/transports/custom.md`

**Content:**
- Implementing the Transport interface
- Required methods
- Message handling best practices
- Error handling
- Testing your transport
- Example: WebSocket transport implementation

---

### Phase 7: API Reference - @martini/devtools

#### Documents to Create

#### 1. `api/devtools/state-inspector.md`

**Full API reference:**

```typescript
class StateInspector {
  constructor(options?: StateInspectorOptions);

  // Attachment
  attach(runtime: GameRuntime): void;
  detach(): void;

  // Data access
  getSnapshots(): StateSnapshot[];
  getActionHistory(): ActionRecord[];
  getStats(): InspectorStats;

  // Manual control
  captureManualSnapshot(): void;
  clear(): void;

  // Listeners
  onStateChange(listener: (snapshot: StateSnapshot) => void): Unsubscribe;
  onAction(listener: (action: ActionRecord) => void): Unsubscribe;

  // Lifecycle
  destroy(): void;
}

interface StateInspectorOptions {
  maxSnapshots?: number;           // Default: 100
  maxActions?: number;              // Default: 1000
  snapshotThrottleMs?: number;      // Default: 1000
  captureMode?: 'manual' | 'throttled' | 'auto';  // Default: 'throttled'
  actionFilter?: {
    exclude?: string[];             // Actions to ignore
    aggregateWindow?: number;       // ms to group actions
  };
}

interface StateSnapshot {
  timestamp: number;
  state: any;               // Full state for first snapshot
  diff?: Patch[];           // Diff from previous for others
}

interface ActionRecord {
  timestamp: number;
  actionName: string;
  input: any;
  playerId: string;
  targetId: string;
  count?: number;           // For aggregated actions
}

interface InspectorStats {
  snapshotCount: number;
  actionCount: number;
  memoryUsageBytes: number;
  oldestSnapshotTimestamp: number;
  newestSnapshotTimestamp: number;
}
```

**Content:**
- Setting up state inspection
- Configuration options
- Snapshot vs action history
- Memory management
- Filtering strategies
- Integration with IDE
- Performance impact

**Code Examples:**
```typescript
const inspector = new StateInspector({
  maxSnapshots: 50,
  maxActions: 500,
  snapshotThrottleMs: 500,
  actionFilter: {
    exclude: ['tick', 'physicsStep'],  // Ignore high-frequency actions
    aggregateWindow: 250               // Group rapid-fire actions
  }
});

inspector.attach(runtime);

// Listen for state changes
inspector.onStateChange((snapshot) => {
  console.log('State at', snapshot.timestamp, snapshot.state);
});

// Listen for actions
inspector.onAction((action) => {
  console.log(`${action.actionName} by ${action.playerId}`, action.input);
});

// Get current stats
const stats = inspector.getStats();
console.log('Memory usage:', stats.memoryUsageBytes / 1024, 'KB');

// Cleanup
inspector.detach();
```

---

### Phase 8: Advanced Guides

**Goal:** In-depth tutorials for complex features

#### Documents to Create

#### 1. `guides/phaser-integration.md`

**Content:**
- Deep dive into Phaser + Martini
- Scene lifecycle integration
  - Where to create GameRuntime
  - When to call adapter.update()
  - Cleanup in shutdown event
- Best practices for scene structure
- Multi-scene games
- Sharing runtime across scenes
- Preloading assets
- Performance optimization

**Code Example:**
```typescript
export class GameScene extends Phaser.Scene {
  private runtime!: GameRuntime<GameState>;
  private adapter!: PhaserAdapter<GameState>;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Create transport
    const transport = new LocalTransport({
      roomId: 'my-game',
      isHost: true
    });

    // Create runtime
    this.runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: [transport.getPlayerId()]
    });

    // Create adapter
    this.adapter = new PhaserAdapter(this.runtime, this, {
      spriteNamespace: '_sprites',
      autoInterpolate: true
    });

    // Set up game objects
    this.setupPlayers();
    this.setupInput();

    // Listen for state changes
    this.runtime.onChange((state) => {
      this.updateUI(state);
    });

    // Cleanup on shutdown
    this.events.once('shutdown', () => {
      this.adapter.destroy();
      this.runtime.destroy();
    });
  }

  update(time: number, delta: number) {
    // Update adapter (handles interpolation)
    this.adapter.update(time, delta);
  }
}
```

---

#### 2. `guides/physics-and-collision.md`

**Content:**
- Physics-based multiplayer games
- Host vs client physics
  - Host runs physics, clients mirror
  - Client-side prediction (optional)
- Syncing physics state
  - What to sync (position, velocity)
  - What not to sync (forces, impulses)
- Handling collisions
  - Collision detection on host only
  - Broadcasting collision events
  - Client-side visual effects
- Performance optimization
  - Reducing sync frequency for distant objects
  - Physics sleeping
  - Spatial partitioning

**Code Examples from games:**
- Projectile physics
- Player collision with walls
- Overlap detection for pickups

---

#### 3. `guides/ui-and-hud.md`

**Content:**
- Building reactive UIs
- Player-specific HUD elements
- Team scoreboards
- Chat systems
- Health bars and status indicators
- Minimap implementation
- Respawn timers
- Victory/defeat screens

**Examples:**
- Fire & Ice team UI
- Arena Blaster scoreboard
- Health bar following sprite

---

#### 4. `guides/testing.md`

**Content:**
- Unit testing game logic
  - Testing actions in isolation
  - Mocking contexts
- Integration testing with LocalTransport
  - Multi-player scenarios
  - Simulating network conditions (future)
- Testing Phaser integration
  - Headless Phaser for CI
- Mocking strategies
  - When to mock, when not to
- CI/CD setup
  - GitHub Actions example
  - Test coverage reporting

**Code Examples:**
```typescript
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
import { game } from './my-game';

describe('Player Movement', () => {
  it('should move player to target position', () => {
    const transport = new LocalTransport({ roomId: 'test', isHost: true });
    const runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: ['p1']
    });

    // Submit move action
    runtime.submitAction('move', { x: 200, y: 300 }, 'p1');

    // Check state updated
    const state = runtime.getState();
    expect(state.players.p1.x).toBe(200);
    expect(state.players.p1.y).toBe(300);

    runtime.destroy();
  });

  it('should handle multiple players', () => {
    // Multi-player test with LocalTransport
    const host = new LocalTransport({ roomId: 'test', isHost: true });
    const client = new LocalTransport({ roomId: 'test', isHost: false });

    const hostRuntime = new GameRuntime(game, host, {
      isHost: true,
      playerIds: [host.getPlayerId(), client.getPlayerId()]
    });

    const clientRuntime = new GameRuntime(game, client, {
      isHost: false,
      playerIds: [host.getPlayerId(), client.getPlayerId()]
    });

    // Client submits action
    clientRuntime.submitAction('move', { x: 100, y: 100 });

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 100));

    // Both runtimes should have updated state
    expect(hostRuntime.getState().players[client.getPlayerId()].x).toBe(100);
    expect(clientRuntime.getState().players[client.getPlayerId()].x).toBe(100);

    hostRuntime.destroy();
    clientRuntime.destroy();
  });
});
```

---

#### 5. `guides/deployment.md`

**Content:**
- Building for production
  - Bundling and minification
  - Tree-shaking
  - Code splitting
- Choosing production transport
  - WebSocket vs WebRTC
  - Server hosting options (Heroku, Railway, Fly.io)
  - Serverless considerations
- Performance monitoring
  - Metrics collection
  - Error tracking (Sentry)
  - Analytics integration
- Scaling considerations
  - Room-based architecture
  - Load balancing
  - Database integration for persistence

---

#### 6. `guides/optimization.md`

**Content:**
- State size optimization
  - Use compact data structures
  - Avoid redundant data
  - Reference by ID, not duplication
- Action batching
  - Grouping multiple actions
  - Reducing network overhead
- Sync rate tuning
  - Adjusting syncRateMs based on game type
  - Adaptive sync rates
- Bandwidth reduction techniques
  - Delta compression
  - State quantization
  - Culling distant entities
- Memory optimization
  - Object pooling
  - Sprite reuse
  - Texture atlases
- CPU optimization
  - Profiling with DevTools
  - Reducing calculations in actions
  - Optimizing physics

**Benchmarks and examples**

---

### Phase 9: Examples & Recipes

**Goal:** Practical code patterns from real games

#### Documents to Create

#### 1. `examples/overview.md`

**Content:**
- Gallery of example games
- Screenshots and GIFs
- Links to source code
- Live demos
- Complexity ratings

**Games to feature:**
- Fire & Ice (team-based, roles)
- Paddle Battle (simple 1v1)
- Arena Blaster (combat, projectiles)
- Blob Battle (physics-based)
- (Future: more genres)

---

#### 2. `recipes/player-movement.md`

**Content:**
- Keyboard movement (WASD, arrow keys)
- Platformer movement (jump, double-jump, wall-jump)
- Top-down movement (8-direction, free-angle)
- Mouse/pointer movement
- Touch controls
- Smooth acceleration/deceleration
- Speed limits

**Code from:**
- Fire & Ice (top-down)
- Paddle Battle (restricted movement)
- Platform game examples

---

#### 3. `recipes/shooting-mechanics.md`

**Content:**
- Projectile spawning
- Aiming (toward cursor, fixed direction)
- Bullet patterns
- Hit detection
- Weapon cooldowns
- Weapon switching
- Ammo management

**Code from:**
- Fire & Ice (directional shooting)
- Arena Blaster (auto-aim)

---

#### 4. `recipes/health-and-damage.md`

**Content:**
- Health system implementation
- Damage calculation
- Invincibility frames
- Death and respawn
- Health regeneration
- Team damage / friendly fire
- Damage numbers (visual feedback)

**Code from actual games**

---

#### 5. `recipes/power-ups.md`

**Content:**
- Collectible items
- Temporary effects (buffs/debuffs)
- Spawn management
- Pickup detection
- Visual effects
- Stacking effects

**Examples:**
- Speed boost
- Shield
- Weapon upgrade
- Health pack

---

#### 6. `recipes/game-modes.md`

**Content:**
- Team-based games (team assignment, team score)
- Round-based gameplay (countdown, round transitions)
- Match timers
- Victory conditions (score limit, time limit, elimination)
- Sudden death
- Tournament brackets

**Examples from Fire & Ice and other games**

---

### Phase 10: Contributing Section

**Goal:** Help contributors get up to speed quickly

#### Documents to Create

#### 1. `contributing/getting-started.md`

**Content:**

**Quick Start for Contributors**
```bash
# Clone the repo
git clone https://github.com/yourusername/martini.git
cd martini

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Run dev server (demos + docs)
pnpm --filter @martini/demos dev

# Run tests
pnpm test
```

**Project Structure**
```
martini/
├── packages/
│   ├── @martini/core/              # Core multiplayer engine
│   ├── @martini/phaser/            # Phaser integration
│   ├── @martini/transport-local/   # Local transport
│   ├── @martini/transport-iframe-bridge/  # Iframe transport
│   ├── @martini/transport-trystero/       # P2P transport
│   ├── @martini/devtools/          # Dev tools
│   ├── @martini/ide/               # In-browser IDE
│   └── @martini/demos/             # Documentation + examples
├── pnpm-workspace.yaml             # Monorepo config
├── turbo.json                      # Build pipeline
└── package.json                    # Root package
```

**Development Workflow**
- Run specific package: `pnpm --filter @martini/core dev`
- Build specific package: `pnpm --filter @martini/core build`
- Test specific package: `pnpm --filter @martini/core test`
- Hot reload: Changes auto-rebuild in dev mode

**Key Directories**
- `/packages/@martini/core/src` - Core engine source
- `/packages/@martini/phaser/src` - Phaser adapter source
- `/packages/@martini/demos/src/lib/games` - Example games
- `/packages/@martini/demos/src/content/docs` - Documentation

---

#### 2. `contributing/architecture.md`

**Content:**
- Condensed version of the comprehensive codebase analysis
- Package dependency graph
- Key design patterns
- Build system (TypeScript, esbuild, Vitest)
- Release process

---

#### 3. `contributing/where-to-contribute.md`

**Content:**

**🔥 High Priority Areas**
- [ ] More transport implementations
  - Socket.io transport
  - Colyseus integration
  - Supabase Realtime transport
  - Ably transport
- [ ] Performance optimizations
  - State compression
  - Delta encoding
  - Bandwidth profiling tools
- [ ] Documentation improvements
  - This documentation initiative!
  - API reference completeness
  - More code examples
- [ ] Example games
  - More genres (RTS, card game, racing)
  - Mobile-optimized examples
  - 3D examples (Three.js integration)

**🎯 Good First Issues**
- [ ] Add more physics behavior profiles
  - Swimming physics
  - Flying physics
  - Vehicle physics variants
- [ ] Create UI component library
  - Reusable HUD components
  - Chat bubble system
  - Damage numbers
- [ ] Write tests for uncovered edge cases
  - Edge cases in sync logic
  - Transport error handling
  - Player join/leave races
- [ ] Improve error messages
  - More descriptive errors
  - Suggestions for common mistakes
  - TypeScript error improvements

**🚀 Advanced Contributions**
- [ ] Host migration support
  - Automatic host failover
  - State transfer protocol
- [ ] Replay/recording system
  - Action recording
  - Playback functionality
  - Time travel debugging
- [ ] Unity adapter (C# bindings)
  - Unity WebGL integration
  - C# API surface
- [ ] Three.js adapter
  - 3D sprite tracking
  - Camera synchronization
  - 3D physics integration

---

#### 4. `contributing/development-workflow.md`

**Content:**

**Making Changes**
- Branch naming: `feature/my-feature`, `fix/bug-description`
- Commit messages: Use conventional commits
  ```
  feat(core): add host migration support
  fix(phaser): resolve sprite interpolation bug
  docs(api): update GameRuntime documentation
  test(core): add tests for player join/leave
  ```
- Testing requirements: All new features must have tests
- Type safety: Strict TypeScript, no `any` without justification

**Testing Your Changes**
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @martini/core test

# Run tests in watch mode
pnpm --filter @martini/core test --watch

# Run tests with coverage
pnpm test --coverage
```

**Manual Testing**
- Use demo games to test changes
- Test with LocalTransport first
- Test multi-player scenarios
- Test in production transport

**Submitting PRs**
- Fill out PR template
- Link related issues
- Add screenshots/GIFs for UI changes
- Request review from maintainers
- CI must pass (tests, type-check, build)

**Code Review Process**
- Maintainers review within 2-3 days
- Address feedback in new commits
- Don't force-push after review starts
- Squash before merge (optional)

---

#### 5. `contributing/coding-standards.md`

**Content:**

**TypeScript Patterns**
- Strict mode enabled (`tsconfig.json`)
- Type-first design (interfaces before implementation)
- Generic constraints for type safety
- Avoid `any`, prefer `unknown` if needed
- Use `readonly` for immutable properties

**Code Style**
- Prettier for formatting (auto-format on save)
- 2-space indentation
- Single quotes for strings
- Trailing commas
- Semicolons required

**Naming Conventions**
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (with `I` prefix if ambiguous)
- Types: `PascalCase`
- Files: `kebab-case.ts` or `PascalCase.ts` for classes

**File Organization**
```
package/
├── src/
│   ├── index.ts              # Public exports
│   ├── GameRuntime.ts        # Main classes
│   ├── types.ts              # Type definitions
│   ├── helpers/              # Helper functions
│   └── __tests__/            # Tests
├── dist/                     # Build output
├── package.json
├── tsconfig.json
└── README.md
```

**Documentation Standards**
- TSDoc comments for all public APIs
  ```typescript
  /**
   * Creates a new game runtime instance.
   *
   * @param game - The game definition
   * @param transport - The transport layer
   * @param config - Runtime configuration
   * @returns A new GameRuntime instance
   *
   * @example
   * ```typescript
   * const runtime = new GameRuntime(game, transport, {
   *   isHost: true,
   *   playerIds: ['p1']
   * });
   * ```
   */
  constructor(game, transport, config) { }
  ```
- README.md in each package
- Inline comments for complex logic
- Examples in JSDoc

**Testing Standards**
- Test file naming: `ClassName.test.ts`
- Use `describe` and `it` blocks
- Descriptive test names
- Arrange-Act-Assert pattern
- Clean up resources (destroy runtimes)
- Aim for >80% coverage

---

#### 6. `contributing/adding-examples.md`

**Content:**

**How to Add a New Example Game**

1. **Create game directory**
   ```
   packages/@martini/demos/src/lib/games/my-game/
   ├── definition.ts       # Game definition
   ├── scene.ts           # Phaser scene
   └── index.ts           # Exports
   ```

2. **Implement game definition**
   ```typescript
   // definition.ts
   import { defineGame } from '@martini/core';

   export const game = defineGame({
     setup: () => ({ /* initial state */ }),
     actions: { /* actions */ },
     onPlayerJoin: () => { },
     onPlayerLeave: () => { }
   });
   ```

3. **Create Phaser scene**
   ```typescript
   // scene.ts
   import Phaser from 'phaser';
   import { PhaserAdapter } from '@martini/phaser';
   import { game } from './definition';

   export class MyGameScene extends Phaser.Scene {
     // Implementation
   }
   ```

4. **Add route for demo**
   ```
   packages/@martini/demos/src/routes/demo/my-game/
   └── +page.svelte
   ```

5. **Update navigation**
   Add to `src/lib/docs/navigation.ts`

6. **Write documentation**
   - Add to examples overview
   - Create recipe if it demonstrates new pattern
   - Add screenshots

---

### Phase 11: Troubleshooting & FAQ

#### Documents to Create

#### 1. `troubleshooting/common-issues.md`

**Content:**

**State Not Syncing**
- **Symptom:** Client state doesn't update
- **Causes:**
  - Transport not connected
  - Host not sending state updates
  - Client not receiving messages
- **Solutions:**
  - Check `transport.metrics.getConnectionState()`
  - Verify host's `syncRateMs` configuration
  - Check browser console for errors
  - Test with LocalTransport first

**Actions Not Applying**
- **Symptom:** `submitAction` doesn't affect state
- **Causes:**
  - Wrong `targetId` used
  - Action handler has error
  - State structure mismatch
- **Solutions:**
  - Use `context.targetId`, not `context.playerId`
  - Check console for errors
  - Verify state shape matches types
  - Add logging in action handler

**Sprites Not Appearing on Client**
- **Symptom:** Sprites visible on host, not on client
- **Causes:**
  - Wrong sprite namespace
  - Sprite not tracked
  - Preloading issue
- **Solutions:**
  - Verify `spriteNamespace` matches state key
  - Ensure `adapter.trackSprite()` called on host
  - Check assets loaded in both host and client

**TypeScript Errors**
- **Common errors and fixes**
  - "Type 'any' is not assignable..." - Add proper typing
  - "Property 'x' does not exist..." - Update state interface
  - "Cannot find module..." - Check imports and build

**Performance Issues**
- **Symptoms:** Lag, stuttering, high CPU
- **Causes:**
  - Sync rate too high
  - Too many sprites
  - Inefficient actions
- **Solutions:**
  - Increase `syncRateMs` (lower sync frequency)
  - Use object pooling
  - Profile with DevTools
  - Optimize action handlers

---

#### 2. `troubleshooting/debugging.md`

**Content:**

**Using StateInspector**
```typescript
import { StateInspector } from '@martini/devtools';

const inspector = new StateInspector();
inspector.attach(runtime);

// View snapshots
console.log(inspector.getSnapshots());

// View action history
console.log(inspector.getActionHistory());

// Get stats
console.log(inspector.getStats());
```

**Browser DevTools Integration**
- Using React DevTools with Svelte components
- Network tab for transport debugging
- Console logging best practices
- Performance profiling

**Network Debugging**
- Inspecting messages
- Measuring latency
- Simulating network conditions (future)
- Testing with different transports

**Performance Profiling**
- Chrome DevTools Performance tab
- Identifying bottlenecks
- Memory leaks detection
- CPU usage analysis

---

#### 3. `faq.md`

**Content:**

**General Questions**

**Q: Is Martini suitable for production games?**
A: Yes! Martini is production-ready. Use a production transport like TrysteroTransport (P2P) or implement a WebSocket transport for server-based games.

**Q: Can I use Martini with Unity or Unreal?**
A: Currently, Martini has official adapters for Phaser and vanilla JS. Unity and Unreal adapters are planned. You can implement custom adapters using the core package.

**Q: Does Martini support server-authoritative games?**
A: Yes! The "host" can be a dedicated server instead of a player's client. The architecture is the same.

**Q: What's the maximum number of players?**
A: This depends on your transport and game complexity. LocalTransport and IframeBridge are for development only. P2P (Trystero) works well with 2-8 players. For larger games, use a server-based transport.

**Q: Can I use Martini for real-time chat or non-game apps?**
A: Absolutely! Martini's state sync works for any real-time application.

**Architecture Questions**

**Q: Why host-authoritative instead of deterministic lockstep?**
A: Host-authoritative is simpler and works with existing physics engines. Deterministic lockstep requires careful handling of floating-point math and input timing, making it complex. Host-authoritative provides a better developer experience for most games.

**Q: How does state synchronization work?**
A: The host generates diffs (patches) between old and new state, then broadcasts these minimal patches to clients. Clients apply patches to mirror the host's state. This is bandwidth-efficient.

**Q: Can I implement client-side prediction?**
A: Yes, but it's not built-in. You can implement prediction by running actions optimistically on the client, then reconciling when the authoritative state arrives.

**Q: What happens if the host disconnects?**
A: Currently, the game ends. Host migration is planned for a future release.

**Development Questions**

**Q: Do I need to use TypeScript?**
A: No, but it's highly recommended for type safety and better DX.

**Q: Can I use Martini with Vite/Webpack/Parcel?**
A: Yes! Martini works with any bundler that supports ES modules.

**Q: How do I debug state sync issues?**
A: Use the StateInspector from `@martini/devtools` to view snapshots and action history.

**Q: Can I test my game without a server?**
A: Yes! Use `LocalTransport` for same-page testing or `IframeBridgeTransport` for sandboxed testing.

**Performance Questions**

**Q: What's the default state sync rate?**
A: 50ms (20 FPS). You can configure this with `syncRateMs` in `GameRuntimeConfig`.

**Q: How much bandwidth does state sync use?**
A: It depends on state size and change frequency. The diff/patch system minimizes bandwidth. Typical games use 1-10 KB/s per client.

**Q: Can I optimize for mobile?**
A: Yes! Reduce sync rate, minimize state size, use texture atlases, and test on actual devices.

**Comparison Questions**

**Q: How does Martini compare to Colyseus?**
A: Colyseus is server-based only. Martini is transport-agnostic (P2P or server). Martini has tighter Phaser integration.

**Q: How does Martini compare to Photon?**
A: Photon is a hosted service. Martini is open-source and self-hosted. Martini is free.

**Q: How does Martini compare to Netcode for GameObjects (Unity)?**
A: Netcode is Unity-specific. Martini is engine-agnostic. Netcode uses server-authoritative networking; Martini uses host-authoritative (which can be a server).

---

### Phase 12: Migration & Changelog

#### Documents to Create

#### 1. `migration/v1-to-v2.md`

**Content:**
- Breaking changes from v1 to v2
- API differences
- Migration checklist
- Code examples (before/after)
- Common migration issues

---

#### 2. `changelog.md`

**Content:**
- Version history
- Release notes for each version
- Link to GitHub releases
- Notable features and fixes

**Example:**
```markdown
# Changelog

## v2.0.0 (2025-01-15)

### Breaking Changes
- Renamed `GameEngine` to `GameRuntime`
- Transport interface now requires `metrics` property
- Removed deprecated `syncState()` method

### New Features
- Added `StateInspector` for debugging
- Improved diff/patch algorithm (30% faster)
- Added `IframeBridgeTransport`
- New `PhysicsManager` with behavior profiles

### Bug Fixes
- Fixed sprite interpolation stuttering
- Fixed player leave not cleaning up state
- Fixed race condition in peer discovery

### Documentation
- Complete API reference for all packages
- 20+ new code examples
- Migration guide from v1

## v1.5.0 (2024-12-01)
...
```

---

## SDK Architecture Overview

Based on the comprehensive codebase exploration, here's a summary:

### Core Philosophy
- **Host-authoritative** - Host runs game logic, clients mirror state
- **Declarative API** - Define state and actions, framework handles networking
- **Transport-agnostic** - Works with any network layer
- **Engine-agnostic** - Core works with any rendering engine

### Package Responsibilities

#### @martini/core
- State synchronization (diff/patch)
- Action system
- Player lifecycle
- Transport abstraction
- Seeded random
- Logging system

#### @martini/phaser
- Phaser scene integration
- Sprite tracking and auto-sync
- Input management
- Physics helpers
- Collision management
- UI/HUD utilities

#### @martini/transport-*
- LocalTransport: In-memory (0ms latency)
- IframeBridgeTransport: Iframe-based (~1ms latency)
- TrysteroTransport: P2P WebRTC (20-100ms latency)

#### @martini/devtools
- State inspection
- Action history
- Performance metrics

### Key Patterns

#### Action Flow
1. Any client calls `runtime.submitAction('move', input, targetId)`
2. Message sent to host via transport
3. Host applies action to authoritative state
4. Host generates state diff (patches)
5. Host broadcasts patches to all clients
6. Clients apply patches to mirror state
7. Clients re-render

#### State Sync
- Host generates minimal diffs using `generateDiff(oldState, newState)`
- Patches have format: `{ op: 'replace', path: ['players', 'p1', 'x'], value: 150 }`
- Clients apply patches with `applyPatch(state, patch)`
- Default sync rate: 50ms (configurable)

#### Sprite Tracking (Phaser)
- Host creates sprites, calls `adapter.trackSprite(sprite, id)`
- Adapter stores sprite data in state (e.g., `state._sprites[id] = { x, y, rotation }`)
- State sync broadcasts sprite data
- Client adapter creates/updates sprites from state
- Optional interpolation for smooth movement

---

## Implementation Strategy

For each documentation file, I will:

1. **Read actual source code** - Use Read tool extensively
2. **Extract working examples** - From Fire & Ice, Paddle Battle, Arena Blaster, etc.
3. **Create tested code snippets** - All examples must be valid TypeScript
4. **Add type signatures** - Full API documentation with types
5. **Include diagrams** - Architecture, flow, and sequence diagrams using Mermaid
6. **Cross-reference** - Link between related documentation pages
7. **Add search keywords** - For better discoverability
8. **Version appropriately** - Tag docs with version numbers

### Documentation Creation Process

For each document:
1. Outline the structure
2. Read relevant source code files
3. Extract code examples
4. Write explanatory text
5. Add diagrams where helpful
6. Review for accuracy and completeness
7. Cross-link with related docs
8. Test code examples (if applicable)

---

## Documentation Tooling

Already integrated in the project:

- ✅ **MDsveX** - Markdown + Svelte components
- ✅ **Shiki** - Syntax highlighting with themes
- ✅ **Rehype plugins** - Code copy buttons, headings, links
- ✅ **Fuse.js** - Full-text search
- ✅ **Version routing** - Multiple doc versions (`/docs/latest`, `/docs/v0.1`)
- ✅ **Table of contents** - Auto-generated from headings
- ✅ **Breadcrumbs** - Navigation context
- ✅ **Code copy buttons** - One-click code copying

### Potential Additions

- **Mermaid diagrams** - For architecture and flow diagrams
- **Interactive code playgrounds** - Using the Martini IDE
- **Video tutorials** - Screencasts for complex topics
- **API playground** - Try APIs in the browser

---

## Key Principles

1. **Accuracy** - All code examples from real source, tested and working
2. **Completeness** - Cover entire API surface, no gaps
3. **Clarity** - Simple language, clear examples, no jargon without explanation
4. **Discoverability** - Good navigation, search, cross-links, SEO-friendly
5. **Maintainability** - Easy to update as code evolves, automated where possible
6. **Community-Friendly** - Help contributors onboard easily, welcoming tone
7. **Progressive Disclosure** - Start simple, add complexity gradually
8. **Show, Don't Just Tell** - Code examples for every concept
9. **Real-World Focus** - Examples from actual games, not toy examples
10. **Performance-Aware** - Document performance characteristics and best practices

---

## Next Steps

**Recommended Order:**

1. **Phase 1** - Set up navigation and landing page (foundation)
2. **Phase 2** - Getting Started guides (onboarding)
3. **Phase 10** - Contributing section (enable contributors early)
4. **Phase 3** - Core Concepts (fundamentals)
5. **Phase 4-7** - API Reference (comprehensive coverage)
6. **Phase 8** - Advanced Guides (deep dives)
7. **Phase 9** - Examples & Recipes (practical patterns)
8. **Phase 11** - Troubleshooting & FAQ (support)
9. **Phase 12** - Migration & Changelog (versioning)

**Alternative: Breadth-First Approach**
- Create skeleton docs for all phases first
- Fill in details incrementally
- Publish early, iterate often

**Alternative: Critical Path Approach**
- Focus on most commonly needed docs first:
  1. Getting Started
  2. Core Concepts (Actions, State)
  3. Phaser Integration Guide
  4. Common Recipes
- Fill in API reference as needed

---

## Questions to Address Before Starting

1. **Which phase should I start with?**
   - Recommended: Phase 1 → 2 → 10
   - Or different order?

2. **Depth vs Breadth?**
   - Complete one entire phase before moving on?
   - Or create skeleton across all phases first?

3. **Code Examples Format?**
   - Inline in markdown?
   - Separate `.ts` files linked from docs?
   - Interactive playgrounds using IDE?

4. **Diagrams?**
   - Use Mermaid for all diagrams?
   - Create SVG illustrations?
   - Screenshots vs diagrams?

5. **Contributing Section Priority?**
   - High priority (Phase 10 early) to onboard contributors?
   - Or standard order?

6. **Interactive Elements?**
   - Create interactive code playgrounds?
   - Or static code blocks only?

7. **Version Strategy?**
   - Write all docs for latest version only?
   - Or maintain multiple version docs from the start?

---

## Estimated Effort

Based on the scope, estimated time per phase:

- **Phase 1**: 4-6 hours (navigation, landing page)
- **Phase 2**: 8-12 hours (3 detailed guides with examples)
- **Phase 3**: 10-15 hours (6 concept docs with diagrams)
- **Phase 4**: 12-18 hours (7 API docs with full signatures)
- **Phase 5**: 15-20 hours (8 API docs with Phaser examples)
- **Phase 6**: 8-12 hours (5 transport docs)
- **Phase 7**: 4-6 hours (1 comprehensive doc)
- **Phase 8**: 12-18 hours (6 advanced guides)
- **Phase 9**: 10-15 hours (5-6 recipe docs)
- **Phase 10**: 8-12 hours (6 contributing docs)
- **Phase 11**: 6-10 hours (troubleshooting + FAQ)
- **Phase 12**: 3-5 hours (migration + changelog)

**Total estimated effort**: 100-150 hours

**Note:** This is a significant undertaking! We can:
- Work incrementally (a few phases at a time)
- Parallelize (multiple contributors)
- Prioritize critical sections
- Start with minimal viable docs, iterate

---

## Success Metrics

How to measure documentation quality:

1. **Completeness**: All public APIs documented
2. **Accuracy**: All code examples work
3. **Usability**: New users can build first game in <15 min
4. **Discoverability**: Users can find answers quickly via search
5. **Maintainability**: Easy to update when code changes
6. **Community**: Contributors can onboard without hand-holding
7. **SEO**: Docs rank well for relevant searches
8. **Analytics**: Track page views, time on page, bounce rate

---

## Conclusion

This plan provides a comprehensive roadmap to document the entire Martini SDK based on actual source code. The documentation will:

- **Help new users** get started quickly
- **Serve as reference** for experienced users
- **Enable contributors** to understand and improve the codebase
- **Showcase capabilities** through examples and recipes
- **Support troubleshooting** with common issues and solutions

Ready to start implementation! 🚀
