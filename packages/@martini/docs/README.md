# Martini Multiplayer SDK

**Open-source, transport-agnostic multiplayer SDK with Rune-like developer experience.**

Martini lets you build multiplayer games with a declarative API that works seamlessly with game engines like Phaser, Unity, and Godot. Choose between simple host-authoritative mode (easy) or deterministic mode (advanced) based on your needs.

## Quick Start

### Installation

```bash
npm install @martini/core @martini/phaser @martini/transport-p2p
```

### Basic Example (Host-Authoritative Mode)

```javascript
import { defineGame } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import { P2PTransport } from '@martini/transport-p2p';

// 1. Define your game logic (declarative)
const gameLogic = defineGame({
  state: {
    players: {
      type: 'map',
      schema: {
        x: 'number',
        y: 'number',
        role: 'string'
      }
    }
  },

  actions: {
    move: {
      input: { x: 'number', y: 'number' },
      apply(state, playerId, input) {
        state.players[playerId].x = input.x;
        state.players[playerId].y = input.y;
      }
    }
  }
});

// 2. Create Phaser scene (standard Phaser code)
class GameScene extends Phaser.Scene {
  create() {
    // ✅ Use Phaser physics normally!
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.platforms = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.platforms);

    // Tell adapter to track this sprite
    this.adapter.trackSprite(this.player, 'player-' + this.adapter.myId);
  }

  update() {
    // ✅ Standard Phaser input handling!
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    }
    // Adapter automatically syncs position to other players
  }
}

// 3. Start the game
PhaserAdapter.start({
  game: gameLogic,
  mode: 'host-authoritative',  // Host runs physics, clients mirror
  transport: new P2PTransport('room-123'),
  scenes: [GameScene]
});
```

**That's it!** No manual networking code, no sync logic, no bugs.

---

## Two Modes: Choose Your Tradeoff

### Host-Authoritative Mode (Recommended)

**Best for:** Learning platforms, casual games, prototypes

**How it works:**
- Host runs Phaser physics normally
- Clients receive and render state updates
- Super simple, works with any Phaser code

**Tradeoffs:**
- ✅ Easy to use (standard Phaser tutorials work)
- ✅ Works with Phaser physics out-of-the-box
- ✅ AI can generate code easily
- ⚠️ Minor input latency for clients
- ⚠️ No client-side prediction or rollback

```javascript
PhaserAdapter.start({
  mode: 'host-authoritative',
  // ... rest of config
});
```

### Deterministic Mode (Advanced)

**Best for:** Competitive games, esports, games needing replays

**How it works:**
- All clients run identical simulation
- Physics implemented in SDK systems (not Phaser physics)
- Enables rollback, prediction, replays

**Tradeoffs:**
- ✅ Perfect synchronization
- ✅ Rollback netcode possible
- ✅ Replay system built-in
- ⚠️ Cannot use Phaser physics (must reimplement)
- ⚠️ More complex to develop

```javascript
const gameLogic = defineGame({
  state: { /* ... */ },
  actions: { /* ... */ },

  // Define deterministic physics system
  systems: {
    physics: {
      deterministic: true,
      tick: ({ state, dt }) => {
        // Implement physics here (identical on all clients)
        for (const [id, player] of Object.entries(state.players)) {
          player.vy += 0.8 * dt;  // gravity
          player.x += player.vx * dt;
          player.y += player.vy * dt;
          // collision detection, etc.
        }
      }
    }
  }
});

PhaserAdapter.start({
  mode: 'deterministic',
  // ... rest of config
});
```

---

## Why Martini?

### Compared to Existing Solutions

| Feature | Rune | Photon | Colyseus | Nakama | **Martini** |
|---------|------|--------|----------|--------|-------------|
| **Layer** | Full platform | Full platform | Backend framework | Backend platform | State-sync runtime |
| **Declarative game logic** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Works with Phaser physics** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Transport-agnostic** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Self-hostable** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Open source** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Zero networking code** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Multi-engine support** | ❌ | ✅ | ✅ | ✅ | ✅ (planned) |
| **Matchmaking/Rooms** | ✅ | ✅ | ✅ | ✅ | ❌ (use with platforms) |
| **Auth/Persistence** | ✅ | ✅ | ❌ | ✅ | ❌ (use with platforms) |

### Where Martini Fits

**Martini is NOT a backend platform**—it's a **state-sync runtime** that runs in your game client.

Think of it this way:

```
┌─────────────────────────────────────────────────────┐
│  Backend Platform (Optional)                        │
│  Colyseus / Nakama / Photon / Custom Server         │
│  • Matchmaking                                      │
│  • Room management                                  │
│  • Authentication                                   │
│  • Persistence                                      │
└─────────────────────────────────────────────────────┘
                      ↓ (transport)
┌─────────────────────────────────────────────────────┐
│  Martini Core (State-Sync Runtime)                  │
│  • Declarative game logic                           │
│  • Deterministic state sync                         │
│  • Diff/patch optimization                          │
│  • Schema validation                                │
└─────────────────────────────────────────────────────┘
                      ↓ (renders)
┌─────────────────────────────────────────────────────┐
│  Game Engine                                        │
│  Phaser / Unity / Godot                             │
└─────────────────────────────────────────────────────┘
```

### Use Martini WITH Existing Platforms

You can absolutely use Martini **on top of** Colyseus, Nakama, or Photon:

```javascript
// Use Colyseus for rooms/matchmaking, Martini for game logic
import { ColyseusTransport } from '@martini/transport-colyseus';

const gameLogic = defineGame({ /* your declarative logic */ });

PhaserAdapter.start({
  game: gameLogic,
  transport: new ColyseusTransport({
    endpoint: 'wss://your-colyseus-server.com',
    roomName: 'my_game'
  })
});

// Now you get:
// ✅ Colyseus matchmaking/rooms
// ✅ Martini's declarative game logic (no socket handlers!)
```

### Or Skip Platforms Entirely

For simple games, use P2P and skip servers altogether:

```javascript
// No backend needed
const transport = new P2PTransport('room-123');
```

**Unique value:** Declarative game-state layer that works with ANY backend (or no backend)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  @martini/core                          │
│  • State definition & validation                        │
│  • Action execution & sequencing                        │
│  • Diff/patch system (bandwidth optimization)           │
│  • Transport abstraction (ITransport interface)         │
│  • Optional deterministic systems                       │
└─────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
┌──────────────────┐              ┌──────────────────────┐
│  Transport Layer │              │   Engine Adapters    │
├──────────────────┤              ├──────────────────────┤
│ @martini/        │              │ @martini/phaser      │
│   transport-p2p  │              │ @martini/unity       │
│ @martini/        │              │ @martini/godot       │
│   transport-ws   │              │                      │
│ @martini/        │              │ Features:            │
│   transport-udp  │              │ • Auto sprite sync   │
└──────────────────┘              │ • Authority modes    │
                                  │ • Interpolation      │
                                  │ • Input buffering    │
                                  └──────────────────────┘
```

### Packages

- **[@martini/core](./martini-sdk-v2/01-core-concepts.md)** - Core state sync engine (engine-agnostic)
- **[@martini/phaser](./martini-sdk-v2/phaser-adapter.md)** - Phaser 3 integration with host-authoritative & deterministic modes
- **[@martini/transport-p2p](./martini-sdk-v2/04-transport-interface.md)** - WebRTC peer-to-peer (via Trystero)
- **[@martini/transport-ws](./martini-sdk-v2/04-transport-interface.md)** - WebSocket transport
- **[@martini/transport-udp](./martini-sdk-v2/04-transport-interface.md)** - UDP transport (self-hosted servers)

---

## Documentation

### Getting Started
- [Quick Start Guide](./martini-sdk-v2/quick-start.md)
- [Core Concepts](./martini-sdk-v2/01-core-concepts.md)
- [Choosing a Mode: Host-Authoritative vs Deterministic](./martini-sdk-v2/modes-comparison.md)

### Phaser Integration
- [Phaser Adapter Guide](./martini-sdk-v2/phaser-adapter.md)
- [Host-Authoritative Mode](./martini-sdk-v2/host-authoritative-mode.md)
- [Deterministic Mode](./martini-sdk-v2/deterministic-mode.md)
- [Examples & Recipes](./martini-sdk-v2/09-examples.md)

### API Reference
- [Core API](./martini-sdk-v2/02-api-reference.md)
- [State & Actions](./martini-sdk-v2/03-data-structures.md)
- [Transport Interface](./martini-sdk-v2/04-transport-interface.md)
- [Phaser Adapter API](./martini-sdk-v2/phaser-api-reference.md)

### Advanced
- [Deterministic Systems](./martini-sdk-v2/deterministic-systems.md)
- [Client Prediction & Rollback](./martini-sdk-v2/rollback.md)
- [Custom Transports](./martini-sdk-v2/custom-transports.md)
- [Unity & Godot Support](./martini-sdk-v2/other-engines.md)

### Migration
- [Migrating from gameAPI.multiplayer](./martini-sdk-v2/migration-from-gameapi.md)
- [Migrating from Rune](./martini-sdk-v2/migration-from-rune.md)
- [Migrating from Colyseus](./martini-sdk-v2/migration-from-colyseus.md)

---

## Design Principles

### 1. Separation of Concerns

**State ≠ Simulation**

- **State** = What exists (positions, scores, etc.)
- **Simulation** = How it changes (physics, AI, etc.)
- **SDK** = Syncs state, doesn't dictate simulation

This allows the SDK to work with any engine's physics, not fight against it.

### 2. Progressive Enhancement

Start simple, add complexity only when needed:

1. **Level 1:** Host-authoritative mode with standard Phaser physics
2. **Level 2:** Add input buffering for smoother gameplay
3. **Level 3:** Switch to deterministic mode for competitive features
4. **Level 4:** Add client prediction and rollback

### 3. Transport Agnostic

Swap networking backends without changing game code:

```javascript
// Development: P2P (no server needed)
const transport = new P2PTransport('room-123');

// Production: WebSocket (more reliable)
const transport = new WebSocketTransport('wss://game.example.com');

// Self-hosted: UDP (lowest latency)
const transport = new UDPTransport('udp://game.example.com:9000');
```

### 4. Zero Networking Code

Game developers shouldn't write networking code:

```javascript
// ❌ BAD: Manual networking
socket.emit('player-moved', { x, y });
socket.on('player-moved', (data) => { /* sync logic */ });

// ✅ GOOD: Declarative actions
actions: {
  move: {
    input: { x: 'number', y: 'number' },
    apply(state, playerId, input) {
      state.players[playerId].x = input.x;
      state.players[playerId].y = input.y;
    }
  }
}
```

---

## Community & Support

- **GitHub:** [github.com/your-org/martini](https://github.com/your-org/martini)
- **Discord:** [discord.gg/martini](https://discord.gg/martini)
- **Documentation:** [docs.martini.dev](https://docs.martini.dev)
- **Examples:** [examples.martini.dev](https://examples.martini.dev)

---

## Roadmap

### v1.0 (Current Focus)
- ✅ Core state sync engine
- ✅ Phaser adapter (host-authoritative mode)
- ✅ P2P transport (WebRTC via Trystero)
- 🚧 WebSocket transport
- 🚧 Deterministic mode for Phaser

### v1.1
- Client prediction & rollback
- Replay system
- Improved developer tools (time-travel debugger)

### v2.0
- Unity C# bindings
- Godot GDScript bindings
- Three.js adapter
- Babylon.js adapter

### Future
- Matchmaking service (optional)
- Relay servers for P2P fallback
- Anti-cheat helpers
- Analytics integration

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas we need help with:**
- Unity/Godot adapters
- Transport implementations
- Example games
- Documentation improvements
- Bug reports & feature requests
