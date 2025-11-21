# martini-kit

<div align="center">

**Multiplayer without networking.**

Build real-time multiplayer games without writing a single line of networking code.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@martini-kit/core)](https://www.npmjs.com/package/@martini-kit/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Build](https://github.com/BlueprintLabIO/martini/actions/workflows/build.yml/badge.svg)](https://github.com/BlueprintLabIO/martini/actions/workflows/build.yml)
[![Test](https://github.com/BlueprintLabIO/martini/actions/workflows/test.yml/badge.svg)](https://github.com/BlueprintLabIO/martini/actions/workflows/test.yml)

[Website](https://martini.blueprintlab.io/) • [Documentation](https://martini.blueprintlab.io/docs) • [Live Demos](https://martini.blueprintlab.io/preview) • [GitHub](https://github.com/BlueprintLabIO/martini)

</div>

---

## The Problem

Building multiplayer games is **hard**. Really hard.

You want to build a fun multiplayer game, but instead you spend weeks:
- Wrestling with WebSocket message formats
- Writing serialization/deserialization code
- Debugging race conditions and state desyncs
- Implementing connection retry logic
- Handling peer discovery and room management
- Writing different code for development vs production
- Debugging networking issues you can't reproduce locally

**What if you could just... not do any of that?**

---

## The Solution

martini-kit is a paradigm shift in multiplayer game development.

Instead of writing networking code, you write **pure game logic**:

```typescript
// This is ALL you write - martini-kit handles the rest
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, health: 100 }])
    )
  }),

  actions: {
    move: (state, { playerId, dx, dy }) => {
      state.players[playerId].x += dx;
      state.players[playerId].y += dy;
    },

    shoot: (state, { playerId, targetId }) => {
      state.players[targetId].health -= 10;
    }
  }
});

// That's it. Now it "just works" for 2, 4, 8, or 100 players.
// Zero networking code. Zero serialization. Zero message handlers.
```

martini-kit **automatically**:
- ✅ Syncs state across all players in real-time
- ✅ Handles connection/disconnection gracefully
- ✅ Resolves conflicts with host-authoritative logic
- ✅ Optimizes bandwidth with intelligent diffing
- ✅ Provides deterministic gameplay (seeded RNG)
- ✅ Works with your existing game engine (Phaser, Unity, Godot...)
- ✅ Lets you swap networking backends without changing game code

## Where martini-kit Fits in Your Stack

martini-kit lives **inside your game client**, sitting between your engine and whatever networking/back-end stack you already use.

- **Game engine:** Keep rendering/physics in Phaser/Unity/Godot/etc. Adapters bind engine objects to martini state.
- **martini-kit runtime:** Declarative state + actions + host-authoritative sync/diff.
- **Transport layer:** Plug in Local (tests), WebRTC (Trystero), WebSocket, or build your own via the transport interface.
- **Backend platform:** Keep using Colyseus/Nakama/custom infra for auth, matchmaking, storage, metrics—martini-kit just needs a way to shuttle its wire messages.

**Interops cleanly with what you already run:**
- **Colyseus:** Use `@martini-kit/transport-colyseus` to reuse your rooms/matchmaking while martini-kit handles game state. The room relays martini messages; your game logic stays in `defineGame`.
- **Nakama:** Keep Nakama for auth, leaderboards, and matches. Relay martini messages over Nakama's realtime/match sockets (community transport planned) or a tiny WebSocket bridge; no change to your martini game code.
- **Custom servers:** Use `@martini-kit/transport-ws` with any WebSocket relay, or implement a minimal transport against your protocol (HTTP upgrade, TCP, UDP) as long as it can broadcast martini payloads between peers.
- **Existing engines:** Today: Phaser adapter. Coming/DIY: Unity, Godot, Three.js, custom engines—martini-kit stays engine-agnostic, adapters map runtime state to engine objects.

---

## Why martini-kit is Different

### 1. **Declarative, Not Imperative**

**Traditional approach** (the hard way):
```typescript
// 😫 You write this...
socket.on('player-move', (data) => {
  const parsed = JSON.parse(data);
  if (validated(parsed)) {
    players[parsed.id].x = parsed.x;
    players[parsed.id].y = parsed.y;
    broadcastToOthers('player-moved', { id: parsed.id, x: parsed.x, y: parsed.y });
  }
});

socket.on('disconnect', () => {
  // Handle disconnect
  // Notify other players
  // Clean up state
  // Retry connection?
});
```

**martini-kit approach** (the easy way):
```typescript
// 😎 You write this...
actions: {
  move: (state, { playerId, x, y }) => {
    state.players[playerId].x = x;
    state.players[playerId].y = y;
  }
}
// martini-kit handles EVERYTHING else automatically
```

### 2. **Transport-Agnostic Architecture**

Change your networking backend with **one line of code**:

```typescript
// Development: Test multiplayer locally (zero servers!)
const transport = new LocalTransport({ roomId: 'dev' });

// Prototyping: P2P with WebRTC (zero server costs!)
const transport = new TrysteroTransport({ roomId: 'demo-123' });

// Production: Reliable WebSocket server
const transport = new WebSocketTransport({ url: 'wss://game.com' });

// Production: Colyseus integration
const transport = new ColyseusTransport({ room: colyseusRoom });
```

**Your game logic stays exactly the same.** No refactoring. No bugs.

### 3. **Engine-Agnostic with Powerful Adapters**

Works with **any** game engine:

**Phaser 3** (batteries included):
```typescript
// Phaser sprites sync automatically - just create them normally!
class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(this, runtime);

    // Create sprite with Phaser API
    const player = this.physics.add.sprite(100, 100, 'player');

    // Tell adapter to track it
    adapter.trackSprite(playerId, player);

    // That's it! Position, rotation, velocity all sync automatically
    // Use Phaser's physics engine normally - results sync automatically
  }
}
```

**Unity, Godot, Three.js, Custom Engines**: Same core API, different adapters.

### 4. **Host-Authoritative = No Cheating**

Host runs the **real** simulation. Clients just mirror the results.

```typescript
// On HOST: Real physics simulation
player.setVelocityX(200);
this.physics.add.collider(player, wall);  // Actually simulates

// On CLIENTS: Just displays the result
// No physics computation
// Can't modify state
// Can't cheat!
```

Clients send **inputs**. Host computes **results**. Everyone sees same game.

### 5. **State-First Diffing (Not Message-Passing)**

**Traditional**: You manually create messages for every event
```typescript
socket.emit('player-moved', { id, x, y });
socket.emit('player-health-changed', { id, health });
socket.emit('player-animation-changed', { id, animation });
// Hundreds of custom message types...
```

**martini-kit**: Just mutate state. Diffs computed automatically.
```typescript
state.players[id].x = 150;          // ─┐
state.players[id].health = 90;      //  ├─ One efficient patch message
state.players[id].animation = 'run';// ─┘
// martini-kit diffs state and sends only what changed
```

---

## Real-World Example

Here's a complete multiplayer platformer in **~100 lines** (versus ~1000+ lines traditional):

```typescript
import { defineGame, GameRuntime } from '@martini-kit/core';
import { PhaserAdapter, InputManager } from '@martini-kit/phaser';
import { TrysteroTransport } from '@martini-kit/transport-trystero';

// 1. Define game logic (pure state mutations)
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, {
        x: 100,
        y: 100,
        velocityX: 0,
        velocityY: 0,
        health: 100,
        score: 0
      }])
    ),
    coins: [
      { id: 'coin1', x: 200, y: 150, collected: false },
      { id: 'coin2', x: 400, y: 150, collected: false }
    ]
  }),

  actions: {
    move: (state, { playerId, velocityX, velocityY }) => {
      const player = state.players[playerId];
      player.velocityX = velocityX;
      player.velocityY = velocityY;
    },

    collectCoin: (state, { playerId, coinId }) => {
      const coin = state.coins.find(c => c.id === coinId);
      if (coin && !coin.collected) {
        coin.collected = true;
        state.players[playerId].score += 10;
      }
    },

    damage: (state, { playerId, amount }) => {
      state.players[playerId].health -= amount;
    }
  }
});

// 2. Create Phaser scene
class GameScene extends Phaser.Scene {
  create() {
    // Initialize martini-kit
    const transport = new TrysteroTransport({ roomId: 'my-game' });
    const runtime = new GameRuntime(game, transport, { isHost: true });
    const adapter = new PhaserAdapter(this, runtime);

    // Set up input (handles WASD, arrows, gamepad automatically)
    const inputManager = new InputManager(this, runtime, {
      profile: 'platformer',
      speed: 200,
      jumpForce: 400
    });

    // Create sprites for each player
    runtime.onPlayerJoin((playerId) => {
      const sprite = this.physics.add.sprite(100, 100, 'player');
      adapter.trackSprite(playerId, sprite);
    });

    // Create coins
    runtime.state.coins.forEach(coin => {
      const sprite = this.add.sprite(coin.x, coin.y, 'coin');
      adapter.trackSprite(coin.id, sprite);
    });

    // Handle collisions (host only - clients see results)
    if (runtime.isHost) {
      this.physics.add.overlap(
        playerSprites,
        coinSprites,
        (player, coin) => {
          runtime.dispatchAction('collectCoin', {
            playerId: player.name,
            coinId: coin.name
          });
        }
      );
    }
  }

  update() {
    // Sync sprites from state (automatic interpolation!)
    adapter.syncSprites((playerId) => runtime.state.players[playerId]);
  }
}

// 3. Start the game
const game = new Phaser.Game({
  scene: [GameScene],
  physics: { default: 'arcade' }
});
```

**That's it.** A fully functional multiplayer platformer with:
- Real-time sync across unlimited players
- Collision detection
- Input handling
- Score tracking
- Optimized bandwidth
- Graceful connect/disconnect handling
- Works in P2P or client-server mode

---

## Features That Will Blow Your Mind

### 🎮 Works with Your Engine (Not Against It)

Use your engine's **native APIs** - martini-kit adapts to them:

```typescript
// Phaser users: Use Phaser normally!
this.physics.add.sprite(x, y, 'player');
this.tweens.add({ targets: sprite, x: 200 });
this.physics.add.collider(player, walls);

// Three.js users: Use Three.js normally!
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Unity users: Use Unity normally!
// (C# adapter coming soon)
```

The adapter handles synchronization **automatically**.

### 🔌 Swap Transports Without Code Changes

Test locally → Demo with P2P → Deploy with WebSocket:

```typescript
// Same game code, different transport = zero refactoring
const transports = {
  local: () => new LocalTransport({ roomId: 'dev' }),
  p2p: () => new TrysteroTransport({ roomId: 'demo' }),
  prod: () => new WebSocketTransport({ url: 'wss://api.game.com' })
};

const transport = transports[process.env.MODE]();
const runtime = new GameRuntime(game, transport);
```

### 🧪 Test Multiplayer Locally (Zero Servers)

Run **both** host and client in the same browser tab:

```typescript
const hostTransport = new LocalTransport({ roomId: 'test', isHost: true });
const clientTransport = new LocalTransport({ roomId: 'test', isHost: false });

const hostRuntime = new GameRuntime(game, hostTransport);
const clientRuntime = new GameRuntime(game, clientTransport);

// They communicate via shared memory - instant "networking"!
hostRuntime.dispatchAction('move', { x: 100 });
console.log(clientRuntime.state.player.x); // 100 ✨
```

Perfect for:
- **Unit tests** - Test multiplayer logic like any other code
- **CI/CD** - No servers needed for test runs
- **Debugging** - Step through both host and client simultaneously
- **Demos** - Ship interactive examples that work offline

### 🎯 Deterministic Gameplay

Built-in seeded random number generator prevents desyncs:

```typescript
actions: {
  spawnEnemy: (state, { playerId }, { random }) => {
    // Same random values on all clients!
    const x = random() * 800;
    const y = random() * 600;
    state.enemies.push({ x, y, health: 100 });
  }
}
```

Host and clients get **identical** random values. Zero drift. Ever.

### 🐛 Debug Multiplayer Like Single-Player

Built-in devtools show you **exactly** what's happening:

```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector(runtime);
inspector.enable();

// Now in browser devtools:
// - See every action dispatched
// - View state diffs in real-time
// - Replay action history
// - Monitor network messages
// - Track peer connections
```

No more "works on my machine" multiplayer bugs.

### ⚡ Optimized Bandwidth

martini-kit only sends **what changed**:

```typescript
// Frame 1: Player moves
state.player.x = 150;  // Sends: { player: { x: 150 } }

// Frame 2: Player health changes
state.player.health = 90;  // Sends: { player: { health: 90 } }

// Frame 3: Nothing changes
// Sends: nothing! 🎉
```

**Intelligent diffing** means you're not wasting bandwidth on unchanged data.

### 🎨 Browser-Based IDE (Yes, Really)

Full multiplayer game IDE that runs **in your browser**:

```typescript
import { MartiniIDE } from '@martini-kit/ide';

// Embeddable IDE component (SvelteKit)
<MartiniIDE
  gameCode={sourceCode}
  transport="local"
  onRun={(runtime) => console.log('Game started!', runtime)}
/>
```

Features:
- **Dual-pane view**: Host on left, client on right
- **Live code editing**: See changes instantly
- **State inspector**: Watch state mutations in real-time
- **Action timeline**: Replay game events
- **Network monitor**: Visualize message flow

Perfect for documentation, tutorials, and live demos.

---

## Architecture

### How It Works (The Magic Explained)

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR GAME CODE                           │
│  defineGame({ actions: { move, shoot, jump } })                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   GameRuntime (Core)       │
        │                            │
        │  • Executes actions        │
        │  • Computes state diffs    │
        │  • Manages player lifecycle│
        │  • Handles determinism     │
        └──┬──────────────────────┬──┘
           │                      │
           ▼                      ▼
    ┌──────────────┐      ┌─────────────────┐
    │   Adapter    │      │    Transport    │
    │              │      │                 │
    │ • Phaser     │      │ • Local (dev)   │
    │ • Unity      │      │ • P2P (WebRTC)  │
    │ • Godot      │      │ • WebSocket     │
    │ • Three.js   │      │ • Colyseus      │
    └──────────────┘      └─────────────────┘
           │                      │
           ▼                      ▼
    ┌──────────────┐      ┌─────────────────┐
    │ Game Engine  │      │   Network       │
    │ (rendering)  │      │ (connectivity)  │
    └──────────────┘      └─────────────────┘
```

**Host-Authoritative Flow:**
1. Client sends action (`move`, `shoot`, etc.)
2. Host receives action → validates → applies to state
3. Host computes state diff (only changed fields)
4. Host broadcasts diff to all clients
5. Clients receive diff → patch local state → render

Result: **Deterministic, cheat-proof, bandwidth-efficient** multiplayer.

---

## Package Ecosystem

| Package | Description | Use Case |
|---------|-------------|----------|
| **[@martini-kit/core](https://www.npmjs.com/package/@martini-kit/core)** | Core runtime & sync engine | Required for all projects |
| **[@martini-kit/phaser](https://www.npmjs.com/package/@martini-kit/phaser)** | Phaser 3 adapter with sprite sync | Phaser games |
| **[@martini-kit/devtools](https://www.npmjs.com/package/@martini-kit/devtools)** | State inspector & debugger | Development |
| **[@martini-kit/ide](https://www.npmjs.com/package/@martini-kit/ide)** | Browser-based IDE | Docs & demos |
| **[@martini-kit/transport-local](https://www.npmjs.com/package/@martini-kit/transport-local)** | In-memory transport (no network) | Testing & development |
| **[@martini-kit/transport-trystero](https://www.npmjs.com/package/@martini-kit/transport-trystero)** | P2P WebRTC (serverless!) | Demos & prototypes |
| **[@martini-kit/transport-ws](https://www.npmjs.com/package/@martini-kit/transport-ws)** | WebSocket client | Production games |
| **[@martini-kit/transport-colyseus](https://www.npmjs.com/package/@martini-kit/transport-colyseus)** | Colyseus integration | Colyseus users |
| **[@martini-kit/transport-iframe-bridge](https://www.npmjs.com/package/@martini-kit/transport-iframe-bridge)** | Iframe sandboxing | Browser IDE |

---

## Quick Start

### Installation

```bash
# Core package (required)
npm install @martini-kit/core

# Engine adapter (pick one)
npm install @martini-kit/phaser phaser  # For Phaser 3
# Unity/Godot/custom adapters: use core directly

# Transport (pick one or more)
npm install @martini-kit/transport-local       # For testing
npm install @martini-kit/transport-trystero    # For P2P (zero server)
npm install @martini-kit/transport-ws          # For production (WebSocket)
npm install @martini-kit/transport-colyseus    # For Colyseus
```

### 5-Minute Tutorial

**Step 1: Define your game**
```typescript
import { defineGame } from '@martini-kit/core';

const game = defineGame({
  // Initial state
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 0, y: 0, score: 0 }])
    )
  }),

  // Actions (state mutations)
  actions: {
    move: (state, { playerId, dx, dy }) => {
      state.players[playerId].x += dx;
      state.players[playerId].y += dy;
    }
  }
});
```

**Step 2: Create runtime**
```typescript
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

const transport = new LocalTransport({ roomId: 'my-game' });
const runtime = new GameRuntime(game, transport, { isHost: true });

await runtime.start();
```

**Step 3: Dispatch actions**
```typescript
// Move player
runtime.dispatchAction('move', { dx: 10, dy: 5 });

// State updates automatically!
console.log(runtime.state.players[myId]); // { x: 10, y: 5, score: 0 }
```

**Step 4: Hook into your engine**
```typescript
// Phaser example
class GameScene extends Phaser.Scene {
  update() {
    // Get state from runtime
    const playerState = runtime.state.players[myId];

    // Update sprite
    this.playerSprite.x = playerState.x;
    this.playerSprite.y = playerState.y;
  }
}

// Or use the adapter for automatic sync!
const adapter = new PhaserAdapter(this, runtime);
adapter.trackSprite(myId, this.playerSprite);
// Now sprite syncs automatically - no update() code needed!
```

---

## Development Workflow

```bash
# Clone repo
git clone https://github.com/BlueprintLabIO/martini.git
cd martini

# Install dependencies (requires pnpm)
pnpm install

# Run demos & documentation site
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run specific package
pnpm --filter @martini-kit/core test
pnpm --filter @martini-kit/phaser build
```

---

## Publishing Workflow

```bash
# Check what will be published (dry run)
pnpm run publish:dry-run

# Bump version (patch: 0.1.0 → 0.1.1)
pnpm run version:patch

# Bump version (minor: 0.1.0 → 0.2.0)
pnpm run version:minor

# Bump version (major: 0.1.0 → 1.0.0)
pnpm run version:major

# Publish all packages to npm
pnpm run publish:all
```

---

## Performance & Scale

### Bandwidth Optimization

martini-kit is **smart** about what it sends:

- **Diff-based sync**: Only changed fields sent
- **Batch updates**: Multiple changes in one message
- **Selective tracking**: Track only what matters
- **Compression-friendly**: JSON patches compress well

**Example**: 60 FPS game with 4 players
- Naive approach: ~480 KB/s (60 * 4 * 2 KB full state)
- martini-kit: ~20 KB/s (only position diffs)

**24x bandwidth reduction** with zero effort!

### Player Scale

- **P2P (Trystero)**: 2-8 players (WebRTC mesh)
- **WebSocket**: 10-100+ players (centralized server)
- **Colyseus**: 100-1000+ players (room-based scaling)

### Latency Handling

- **Client-side prediction**: Optional (coming soon)
- **Interpolation**: Built into Phaser adapter
- **Lag compensation**: Host-authoritative prevents cheating

---

## Comparison with Alternatives

| Feature | martini-kit | Colyseus | Mirror | Photon |
|---------|-------------|----------|---------|--------|
| **Zero networking code** | ✅ | ❌ | ❌ | ❌ |
| **Engine-agnostic** | ✅ | ✅ | ❌ (Unity only) | ✅ |
| **Transport-agnostic** | ✅ | ❌ | ❌ | ❌ |
| **P2P support** | ✅ | ❌ | ❌ | ❌ |
| **Local testing (no server)** | ✅ | ❌ | ❌ | ❌ |
| **Open source** | ✅ | ✅ | ✅ | ❌ |
| **TypeScript-first** | ✅ | ✅ | ❌ | ❌ |
| **Built-in IDE** | ✅ | ❌ | ❌ | ❌ |
| **Learning curve** | Low | Medium | High | Medium |
| **Server costs** | $0 (P2P) or low | Medium | Low | High (SaaS) |

---

## Use Cases

### ✅ Perfect For

- **Indie games** - Ship multiplayer without hiring backend engineers
- **Game jams** - Add multiplayer in hours, not days
- **Prototypes** - Test multiplayer ideas instantly (P2P, no servers)
- **Educational games** - Simple API for students/beginners
- **Browser games** - Pure JavaScript, no compilation
- **Turn-based games** - Perfect latency characteristics
- **Co-op experiences** - 2-8 players, tight synchronization

### ⚠️ Consider Alternatives If

- **FPS with 100+ players** - Use specialized FPS netcode (Photon, Mirror)
- **MMO** - Use dedicated MMO infrastructure (SpatialOS, Agones)
- **Real-time physics** - May need deterministic physics engine
- **Existing large codebase** - Refactoring costs vs benefits

---

## Roadmap

### ✅ Current (v0.1.0)

- Core sync engine
- Phaser 3 adapter
- 5 transport options
- Browser IDE
- Devtools
- TypeScript support

### 🚧 In Progress

- [ ] Client-side prediction API
- [ ] Unity adapter (C#)
- [ ] Godot adapter (GDScript)
- [ ] Three.js adapter
- [ ] Rollback netcode (fighting games)
- [ ] Replay system
- [ ] Advanced lag compensation


---

## Community & Support

- **GitHub Issues**: [Report bugs](https://github.com/BlueprintLabIO/martini/issues)
- **Discussions**: [Ask questions](https://github.com/BlueprintLabIO/martini/discussions)
- **Documentation**: [Full docs](https://martini.blueprintlab.io/docs)
- **Examples**: [Live demos](https://martini.blueprintlab.io/preview)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing guidelines
- Pull request process

Quick start for contributors:
```bash
pnpm install
pnpm build
pnpm test
pnpm dev  # Runs demo site
```

---

## License

Apache-2.0 © Blueprint Lab

See [LICENSE](LICENSE) for details.

---

## Credits

Created by [Blueprint Lab](https://blueprintlab.io)

Inspired by:
- **Colyseus** - Room-based multiplayer
- **Mirror** - Unity networking
- **Croquet** - Deterministic simulation
- **Yjs** - CRDT synchronization

Built with:
- TypeScript
- Phaser 3
- SvelteKit
- Vitest
- Turbo

---

<div align="center">

**Stop writing networking code. Start building games.**

[Get Started](https://martini.blueprintlab.io/docs/getting-started) • [View Demos](https://martini.blueprintlab.io/preview) • [Read Docs](https://martini.blueprintlab.io/docs)

</div>
