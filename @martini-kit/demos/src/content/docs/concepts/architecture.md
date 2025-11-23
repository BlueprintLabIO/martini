---
title: Architecture
description: Understanding martini-kit's host-authoritative multiplayer architecture
section: concepts
order: 1
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Architecture

martini-kit uses a **host-authoritative** architecture where one player (the host) runs the authoritative game logic and all other players (clients) mirror that state. This is simpler than deterministic lockstep and works seamlessly with existing physics engines.

## Core Philosophy

### Host-Authoritative Pattern

In martini-kit, the **host is the source of truth**:

- **Host** - Runs game logic, physics, and action handling
- **Clients** - Send input, receive state patches, mirror state locally

```
┌──────────────────────────┐          ┌──────────────────────────┐
│    Host (Authoritative)   │          │   Client (Mirroring)     │
├──────────────────────────┤          ├──────────────────────────┤
│ • Runs game logic        │          │ • Sends input/actions    │
│ • Applies actions        │◄────────►│ • Receives state patches │
│ • Runs physics           │          │ • Mirrors state          │
│ • Generates state diffs  │          │ • Renders locally        │
│ • Broadcasts patches     │          │                          │
└──────────────────────────┘          └──────────────────────────┘
```

<Callout type="info" title="Why Host-Authoritative?">

**Simplicity**: You write single-player game logic. The SDK handles multiplayer.

**Engine Compatibility**: Works with any physics engine (Phaser, Matter.js, Box2D, etc.) without modification.

**Trade-off**: Slight latency for clients (50-100ms) vs complexity of deterministic lockstep.

</Callout>

### How It's Different

| Architecture | How It Works | Pros | Cons |
|--------------|--------------|------|------|
| **Host-Authoritative (martini-kit)** | Host runs game, clients mirror | Simple, works with any engine, no sync bugs | Slight input latency for clients |
| **Deterministic Lockstep** | All clients run identical simulation | Zero perceived latency | Complex, requires deterministic physics, prone to desyncs |
| **Server-Authoritative** | Dedicated server runs game | Cheat-resistant, scalable | Requires server infrastructure, higher latency |

<Callout type="tip">

The "host" can be **either a player's client OR a dedicated server**. The architecture is the same - one authoritative instance, many mirroring instances.

</Callout>

## Package Responsibilities

martini-kit is composed of several packages, each with a specific role:

### @martini-kit/core

**Role**: Transport-agnostic multiplayer engine

**Responsibilities**:
- Game state synchronization (diff/patch algorithm)
- Action system and validation
- Player lifecycle management (join/leave)
- Transport abstraction layer
- Seeded random number generation
- Event system and logging

**Key Types**:
```typescript
defineGame()        // Define game state and actions
GameRuntime         // Manage state and sync
Transport           // Network abstraction
SeededRandom        // Deterministic RNG
```

---

### @martini-kit/phaser

**Role**: Phaser 3 integration and helpers

**Responsibilities**:
- Connect GameRuntime to Phaser scenes
- Automatic sprite synchronization
- Input management (keyboard, mouse, touch)
- Physics behavior presets
- Collision management
- UI/HUD utilities

**Key Types**:
```typescript
PhaserAdapter       // Bridge between martini-kit and Phaser
SpriteManager       // Auto-sync sprites from state
InputManager        // Simplified input handling
PhysicsManager      // Behavior profiles
```

---

### @martini-kit/transport-*

**Role**: Network transport implementations

**Packages**:
- `@martini-kit/transport-local` - In-memory (for demos/testing, 0ms latency)
- `@martini-kit/transport-iframe-bridge` - Iframe-based (for IDE, ~1ms latency)
- `@martini-kit/transport-trystero` - P2P WebRTC (for production, 20-100ms latency)

**Responsibilities**:
- Send/receive messages
- Peer discovery and lifecycle
- Connection state management
- Optional metrics collection

---

### @martini-kit/devtools

**Role**: Development and debugging tools

**Responsibilities**:
- State snapshot capture
- Action history tracking
- Performance metrics
- Integration with browser DevTools

---

### @martini-kit/ide

**Role**: In-browser code editor

**Responsibilities**:
- Live code editing with ESBuild-WASM + import maps
- Instant preview with iframe transport
- Example game templates
- Learning environment

---

## Message Flow

Understanding how data flows through the system:

### Action Submission Flow

```
1. Player presses key
   ↓
2. InputManager captures event
   ↓
3. runtime.submitAction('move', { x: 100, y: 200 })
   ↓
4. Transport sends action message to host
   ↓
5. Host receives action
   ↓
6. Host validates and applies action to state
   ↓
7. Host generates diff (patches) from old state to new state
   ↓
8. Host broadcasts patches to all clients
   ↓
9. Clients apply patches to their state
   ↓
10. Clients notify onChange listeners
   ↓
11. UI/sprites update
```

### State Synchronization Flow

```
Host (every 50ms by default):

1. Check if state changed since last sync
2. If changed: generateDiff(oldState, newState)
3. Create patch array: [
     { op: 'replace', path: ['players', 'p1', 'x'], value: 150 },
     { op: 'add', path: ['projectiles', '0'], value: { ... } }
   ]
4. Broadcast patches via transport.send()

Clients (on receiving patches):

1. transport.onMessage((message) => { ... })
2. Extract patches from message
3. applyPatch(state, patch) for each patch
4. Notify onChange listeners
5. Re-render UI/sprites
```

<Callout type="warning" title="Sync Rate Tuning">

Default sync rate is **50ms (20 FPS)**. For fast-paced games, decrease to 30ms (33 FPS). For slow-paced games, increase to 100ms (10 FPS) to save bandwidth.

Configure via `config.syncInterval` in `GameRuntime`.

</Callout>

## Architecture Diagram

High-level view of how packages interact:

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Game Code                        │
│                      (defineGame, actions)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      @martini-kit/core                           │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐   │
│  │ GameRuntime│  │ Action      │  │ Sync (diff/patch) │   │
│  │            │  │ System      │  │                   │   │
│  └────────────┘  └─────────────┘  └───────────────────┘   │
│         │                │                   │              │
│         └────────────────┴───────────────────┘              │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────┐
│ @martini-kit/phaser │  │  Transport   │  │  DevTools   │
│                 │  │  Interface   │  │             │
│ • PhaserAdapter │  │              │  │ • Inspector │
│ • SpriteManager │  └──────┬───────┘  │ • Metrics   │
│ • InputManager  │         │          └─────────────┘
└─────────────────┘         │
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ LocalTransport   │ │ IframeBridge │ │ TrysteroTransport│
│ (In-memory)      │ │ (Sandboxed)  │ │ (P2P WebRTC)     │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

## Comparison with Other Architectures

### vs. Deterministic Lockstep (e.g., RTS games)

**Deterministic Lockstep:**
- All clients run identical simulation
- Input is sent, simulation runs on all clients
- Requires deterministic physics and fixed timestep
- Prone to desyncs from floating-point differences

**martini-kit (Host-Authoritative):**
- Only host runs simulation
- State patches sent to clients
- Works with any physics engine
- No desyncs (host is source of truth)

**Trade-off:**
- Lockstep: Zero perceived latency, but complex
- martini-kit: Slight latency, but simple

---

### vs. Server-Authoritative (e.g., Fortnite, PUBG)

**Server-Authoritative:**
- Dedicated server runs game
- Clients are "dumb terminals"
- Server validates all input (cheat-resistant)
- Requires server infrastructure

**martini-kit (Host-Authoritative):**
- Host can be a player's client OR a server
- Clients trust the host
- No server required for P2P games
- Less cheat-resistant (host could cheat)

**When to use which:**
- Small co-op games: martini-kit (P2P)
- Competitive games with many players: Server-authoritative

<Callout type="tip" title="martini-kit Can Be Server-Authoritative!">

martini-kit supports server-authoritative mode by making the "host" a dedicated Node.js server instead of a player's client. The architecture is identical.

</Callout>

## Key Design Principles

### 1. Declarative Over Imperative

Instead of writing networking code:

```typescript
// ❌ Imperative (traditional)
socket.on('player-moved', (data) => {
  players[data.id].x = data.x;
  players[data.id].y = data.y;
});

socket.emit('move-player', { id: playerId, x: newX, y: newY });
```

You declare state and actions:

```typescript
// ✅ Declarative (martini-kit)
export const game = defineGame({
  setup: () => ({ players: {} }),
  actions: {
    move: {
      apply(state, context, input) {
        state.players[context.targetId].x = input.x;
        state.players[context.targetId].y = input.y;
      }
    }
  }
});
```

The SDK handles all networking.

---

### 2. Transport-Agnostic

martini-kit doesn't care how messages are sent:

- **Development**: Use `LocalTransport` (instant, in-memory)
- **IDE**: Use `IframeBridgeTransport` (sandboxed iframes)
- **Production P2P**: Use `TrysteroTransport` (WebRTC)
- **Production Server**: Implement custom WebSocket transport

Switch transports without changing game code.

---

### 3. Engine-Agnostic Core

`@martini-kit/core` has **zero dependencies on game engines**. It works with:

- Phaser (via `@martini-kit/phaser`)
- Unity (future adapter)
- Godot (future adapter)
- Three.js (future adapter)
- Vanilla Canvas/WebGL

---

### 4. Type Safety First

Full TypeScript support with strict typing:

```typescript
interface GameState {
  players: Record<string, Player>;
  projectiles: Projectile[];
}

const game = defineGame<GameState>({ ... });
const runtime = new GameRuntime<GameState>(game, transport, config);

// TypeScript knows the shape of state!
runtime.getState().players['p1'].x; // ✅ Typed
```

---

## Performance Characteristics

### Bandwidth Usage

- **State size**: Depends on your game (typically 1-10 KB)
- **Sync frequency**: 20 FPS (50ms) default
- **Optimization**: Only diffs are sent (not full state)

**Typical bandwidth**: 1-10 KB/s per client

**Example**: A game with 4 players, 10 projectiles, 100 entities:
- Full state: ~5 KB
- Diff per frame: ~200-500 bytes
- Bandwidth: 4-10 KB/s @ 20 FPS

---

### Latency

- **LocalTransport**: 0ms (instant)
- **IframeBridge**: ~1ms (postMessage overhead)
- **P2P (WebRTC)**: 20-100ms (depends on network conditions)
- **Server (WebSocket)**: 10-50ms (depends on server location)

**Perceived latency for clients**: Host's frame time + network latency + client's frame time

**Example**: Host @ 60 FPS (16ms), network 50ms, client @ 60 FPS (16ms) = ~82ms total

---

### CPU Usage

- **Core runtime**: Minimal (diff generation is fast)
- **Phaser adapter**: Depends on sprite count
- **Transport**: Depends on implementation

**Benchmark**: A game with 100 sprites, 20 FPS sync rate uses ~2-5% CPU on modern hardware.

---

## Next Steps

Now that you understand the architecture, dive deeper:

- [State Management](/docs/latest/concepts/state-management) - How state is structured and synced
- [Actions](/docs/latest/concepts/actions) - How to define and use actions
- [Transport Layer](/docs/latest/concepts/transport-layer) - How networking works
- [Player Lifecycle](/docs/latest/concepts/player-lifecycle) - Handling player join/leave
- [Determinism](/docs/latest/concepts/determinism) - Why seeded random is critical
