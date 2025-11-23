# martini-kit

**Multiplayer without networking.**

Open-source, engine-agnostic multiplayer SDK with declarative API and host-authoritative state synchronization.

Build multiplayer games that work with Phaser, Unity, Godot—without writing networking code.

---

## Quick Start

### Installation

```bash
pnpm add @martini-kit/core @martini-kit/phaser @martini-kit/transport-trystero
```

### Basic Example

```typescript
import { defineGame, GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import { TrysteroTransport } from '@martini-kit/transport-trystero';

// 1. Define your game logic (declarative)
const gameLogic = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      apply(state, playerId, input) {
        state.players[playerId].x = input.x;
        state.players[playerId].y = input.y;
      }
    }
  },

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100, score: 0 };
  }
});

// 2. Create transport and runtime
const transport = new TrysteroTransport({ roomId: 'game-123', isHost: true });
const runtime = new GameRuntime(gameLogic, transport, { isHost: true });

// 3. Use with Phaser
class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(runtime, this);

    // Use Phaser physics normally!
    this.player = this.physics.add.sprite(100, 100, 'player');

    // Track sprite for auto-sync
    adapter.trackSprite(this.player, `player-${adapter.myId}`);
  }

  update() {
    // Standard Phaser input handling
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    }
    // Adapter automatically syncs position!
  }
}
```

**That's it!** No manual networking code, no sync logic.

---

## Why martini-kit?

### Declarative Game Logic

Define state and actions once, not networking code.

```typescript
// ❌ Imperative networking
socket.on('player-moved', (data) => {
  players[data.id].x = data.x;
});
socket.emit('player-moved', { x, y });

// ✅ Declarative actions
actions: {
  move: {
    apply(state, playerId, input) {
      state.players[playerId].x = input.x;
    }
  }
}
```

### Works with Phaser Physics

Use Phaser's physics engine normally—the adapter handles sync.

```typescript
// Host runs real physics
this.player.setVelocityX(200);
this.physics.add.collider(this.player, this.platforms);

// Clients automatically mirror the result
```

### Transport-Agnostic

Swap backends without changing game code:

```typescript
// Development: P2P (zero server costs)
const transport = new TrysteroTransport({ roomId: 'dev-123' });

// Production: WebSocket (more reliable)
const transport = new WebSocketTransport({ url: 'wss://game.com' });
```

---

## Architecture

```
┌─────────────────────────────────────┐
│          @martini-kit/core              │
│  • defineGame()                     │
│  • GameRuntime                      │
│  • Diff/patch state sync            │
│  • Transport interface              │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌──────────────────┐ ┌──────────────────┐
│  Engine Adapters │ │    Transports    │
├──────────────────┤ ├──────────────────┤
│ @martini-kit/phaser  │ │ transport-       │
│ (auto sprite     │ │  trystero (P2P)  │
│  sync, host/     │ │ transport-ws     │
│  client modes)   │ │  (WebSocket)     │
└──────────────────┘ └──────────────────┘
```

### Packages

| Package | Purpose | Status |
|---------|---------|--------|
| [@martini-kit/core](../core) | Core state sync engine | ✅ Stable (96%+ test coverage) |
| [@martini-kit/phaser](../phaser) | Phaser 3 adapter with auto sprite sync | ✅ Stable |
| [@martini-kit/transport-trystero](../transport-trystero) | P2P WebRTC transport | ✅ Stable |
| @martini-kit/transport-ws | WebSocket transport | 🚧 Coming Soon |
| @martini-kit/unity | Unity C# bindings | 📋 Planned |
| @martini-kit/godot | Godot GDScript bindings | 📋 Planned |

---

## How It Works

### Host-Authoritative Architecture

```
┌─────────────────────────────────────┐
│           HOST                      │
│  • Runs game logic                  │
│  • Applies actions                  │
│  • Syncs state to clients (20 FPS)  │
└─────────────────┬───────────────────┘
                  │
         state patches (diff)
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌─────────────────┐ ┌─────────────────┐
│    CLIENT 1     │ │    CLIENT 2     │
│  • Sends actions│ │  • Sends actions│
│  • Mirrors state│ │  • Mirrors state│
└─────────────────┘ └─────────────────┘
```

**Key Points:**
- Host is authoritative (runs real physics/logic)
- Clients send inputs, receive state updates
- Efficient diff/patch minimizes bandwidth
- Default 20 FPS state sync (configurable)

**Why host-authoritative?**
- ✅ Works with existing Phaser/Unity code
- ✅ AI can generate code easily
- ✅ Simple to understand and debug
- ✅ No need to reimplement physics
- ⚠️ Minor input latency for clients (~50-100ms)

---

## Documentation

### Getting Started
- **[Quick Start Guide](./martini-kit-sdk-v2/quick-start.md)** - 5-minute tutorial
- **[Core Concepts](./martini-kit-sdk-v2/01-core-concepts.md)** - Mental model
- **[Fire Boy & Water Girl Demo](../demo-vite)** - Complete working example

### API Reference
- **[@martini-kit/core API](./martini-kit-sdk-v2/api-reference-core.md)** - defineGame, GameRuntime, state sync
- **[Phaser Adapter](./martini-kit-sdk-v2/phaser-adapter.md)** - Auto sprite syncing
- **[Transports](./martini-kit-sdk-v2/transports.md)** - P2P, WebSocket, custom

### Guides
- **[Platform Comparison](./martini-kit-sdk-v2/platform-comparison.md)** - vs Rune, Photon, Colyseus
- **[Migration from gameAPI](./martini-kit-sdk-v2/migration-from-gameapi.md)** - Upgrade guide

---

## Examples

### Fire Boy & Water Girl

Complete 2-player cooperative game:

```bash
cd @martini-kit/demo-vite
pnpm dev
```

**Features:**
- URL-based host selection (Jackbox-style)
- Phaser physics (gravity, collisions)
- P2P networking via Trystero
- Automatic sprite syncing
- Input actions for movement

[View Source](../demo-vite/main.js)

---

## Design Philosophy

### 1. Separation of Concerns

**State ≠ Simulation**

- **State** = What exists (positions, scores)
- **Simulation** = How it changes (physics, AI)
- **SDK** = Syncs state, doesn't dictate simulation

This lets you use any physics engine.

### 2. Progressive Enhancement

Start simple, add complexity only when needed:

1. **Level 1:** Basic host-authoritative sync
2. **Level 2:** Add custom events for special effects
3. **Level 3:** Optimize state structure for performance
4. **Future:** Client prediction (optional advanced mode)

### 3. Transport Agnostic

Backend choice shouldn't affect game code:

```typescript
// Same game code works with any transport
const game = defineGame({ /* ... */ });

// Choose transport at runtime
const transport = isProd
  ? new WebSocketTransport('wss://game.com')
  : new TrysteroTransport('dev-room');
```

### 4. Zero Networking Code

Developers shouldn't write networking logic:

```typescript
// SDK handles all of this internally:
// - Message serialization
// - State diff/patch
// - Connection management
// - Peer discovery
// - Error handling

// You just write game logic
```

---

## Comparison with Other Solutions

| Feature | Rune | Photon | Colyseus | **martini-kit** |
|---------|------|--------|----------|-------------|
| **Layer** | Full platform | Full platform | Backend framework | State-sync runtime |
| **Declarative API** | ✅ | ❌ | ❌ | ✅ |
| **Works with Phaser physics** | ❌ | ✅ | ✅ | ✅ |
| **Transport-agnostic** | ❌ | ❌ | ❌ | ✅ |
| **Self-hostable** | ❌ | ❌ | ✅ | ✅ |
| **Open source** | ❌ | ❌ | ✅ | ✅ |
| **Zero networking code** | ✅ | ❌ | ❌ | ✅ |
| **P2P support** | ❌ | ❌ | ❌ | ✅ |
| **Matchmaking** | ✅ | ✅ | ✅ | ❌ (use with platforms) |

**martini-kit is NOT a backend platform**—it's a state-sync runtime that runs in your game client. Use it WITH platforms like Colyseus/Nakama, or standalone with P2P.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

**Areas needing help:**
- WebSocket transport implementation
- Unity/Godot adapters
- Example games
- Documentation improvements
- Bug reports & feature requests

---

## Community & Support

- **Documentation:** You're reading it!
- **Demo:** [@martini-kit/demo-vite](../demo-vite)
- **Issues:** [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues)
- **Tests:** Run `pnpm test` in any package

---

## License

MIT License - see [LICENSE](../../LICENSE)

---

## Acknowledgments

Built with inspiration from:
- [Rune](https://www.rune.ai/) - Declarative multiplayer API
- [Colyseus](https://colyseus.io/) - State sync patterns
- [Trystero](https://github.com/dmotz/trystero) - P2P WebRTC
- [Phaser](https://phaser.io/) - Amazing game engine

---

**Ready to build multiplayer games?** Start with the [Quick Start Guide](./martini-kit-sdk-v2/quick-start.md)!
