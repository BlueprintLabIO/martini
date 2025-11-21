# @martini-kit/core

**Engine-agnostic multiplayer SDK** with host-authoritative state synchronization.

Simple, clean, works with any game engine.

---

## Features

- ✅ **Declarative API** - Define state and actions, not networking code
- ✅ **Host-authoritative** - Host runs the game, clients mirror state
- ✅ **Automatic sync** - Efficient diff/patch algorithm for bandwidth optimization
- ✅ **Engine-agnostic** - Works with Phaser, Unity, Godot, Three.js, etc.
- ✅ **Transport-agnostic** - P2P, WebSocket, UDP - your choice
- ✅ **TypeScript** - Full type safety

---

## Installation

```bash
pnpm add @martini-kit/core
```

---

## Quick Start

### 1. Define Your Game

```typescript
import { defineGame } from '@martini-kit/core';

const game = defineGame({
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
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});
```

### 2. Create Runtime

```typescript
import { GameRuntime } from '@martini-kit/core';
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  roomId: 'game-room-123',
  isHost: true
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1']
});
```

### 3. Use in Your Game

```typescript
// Submit actions
runtime.submitAction('move', { x: 150, y: 200 });

// Listen for state changes
runtime.onChange((state) => {
  console.log('Players:', state.players);
});

// Broadcast custom events
runtime.broadcastEvent('explosion', { x: 100, y: 200 });

// Listen for events
runtime.onEvent('explosion', (senderId, eventName, payload) => {
  console.log(`Explosion at ${payload.x}, ${payload.y}`);
});
```

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
- Efficient diff/patch algorithm minimizes bandwidth
- Default 20 FPS state sync (configurable)

---

## Core Concepts

### State

Plain JavaScript objects describing your game:

```typescript
{
  players: {
    p1: { x: 100, y: 100, health: 100 },
    p2: { x: 200, y: 200, health: 100 }
  },
  bullets: [],
  gameState: 'playing'
}
```

**Rules:**
- Must be JSON-serializable
- No functions or class instances
- Mutated directly (no immutability required)

### Actions

The only way to modify state:

```typescript
actions: {
  shoot: {
    apply(state, playerId, input) {
      state.bullets.push({
        x: input.x,
        y: input.y,
        ownerId: playerId
      });
    }
  }
}
```

**Flow:**
1. Player calls `runtime.submitAction('shoot', { x: 100, y: 200 })`
2. Host applies action immediately
3. Host broadcasts state patch to clients
4. Clients receive and apply patch

### Lifecycle Hooks

Handle player join/leave:

```typescript
onPlayerJoin(state, playerId) {
  state.players[playerId] = { x: 100, y: 100 };
},

onPlayerLeave(state, playerId) {
  delete state.players[playerId];
}
```

---

## Integration with Game Engines

### Phaser

Use [@martini-kit/phaser](../phaser) for automatic sprite syncing:

```typescript
import { PhaserAdapter } from '@martini-kit/phaser';

class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(runtime, this);

    const player = this.physics.add.sprite(100, 100, 'player');
    adapter.trackSprite(player, `player-${adapter.myId}`);

    // That's it! Sprite automatically syncs across network
  }
}
```

See [Phaser Adapter docs](../../docs/martini-kit-sdk-v2/phaser-adapter.md) for details.

### Other Engines

For Unity, Godot, Three.js, etc.:

```typescript
runtime.onChange((state) => {
  // Update your game objects based on state
  for (const [id, player] of Object.entries(state.players)) {
    updateGameObject(id, player.x, player.y);
  }
});
```

---

## Transports

@martini-kit/core is transport-agnostic. Choose your backend:

### P2P (Serverless)

```typescript
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const transport = new TrysteroTransport({
  roomId: 'game-123',
  isHost: true // URL-based host selection
});
```

**Pros:** Zero server costs, simple setup
**Cons:** NAT traversal issues (5-10% of users)

### WebSocket (Coming Soon)

```typescript
import { WebSocketTransport } from '@martini-kit/transport-ws';

const transport = new WebSocketTransport({
  url: 'wss://your-server.com'
});
```

**Pros:** Reliable, works for everyone
**Cons:** Requires server hosting

### Custom Transport

Implement the `Transport` interface:

```typescript
interface Transport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (msg: WireMessage, senderId: string) => void): () => void;
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;
}
```

---

## API Reference

- **[defineGame](../../docs/martini-kit-sdk-v2/api-reference-core.md#definegame)** - Define game logic
- **[GameRuntime](../../docs/martini-kit-sdk-v2/api-reference-core.md#gameruntime)** - Runtime instance
- **[Diff/Patch Utilities](../../docs/martini-kit-sdk-v2/api-reference-core.md#diffpatch-utilities)** - State sync internals

Full documentation: [API Reference](../../docs/martini-kit-sdk-v2/api-reference-core.md)

---

## Examples

### Fire Boy & Water Girl Demo

See [@martini-kit/demo-vite](../demo-vite) for a complete working example:

- URL-based host selection (Jackbox-style)
- Phaser physics integration
- P2P networking via Trystero
- Automatic sprite syncing

Run it:

```bash
cd @martini-kit/demo-vite
pnpm dev
```

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

**Current coverage: 96%+ on core algorithms** ✅

---

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

---

## Architecture

```
@martini-kit/core (this package)
  ↓
  ├─ defineGame()    - Declarative game definition
  ├─ GameRuntime     - State management, action execution
  ├─ sync.ts         - Diff/patch algorithm
  └─ transport.ts    - Transport interface

Used by:
  ├─ @martini-kit/phaser          - Phaser 3 adapter
  ├─ @martini-kit/transport-*     - Transport implementations
  └─ Your game                - Direct usage
```

---

## Design Philosophy

### Host-Authoritative

Host runs the real game, clients mirror state. Simple, works with any physics engine.

**Why not deterministic?**
- Most games don't need it
- Works with existing Phaser/Unity code
- AI can generate code easily
- Faster development

### Declarative

Define state and actions once, not networking code.

```typescript
// ❌ Imperative networking
socket.on('player-moved', (data) => {
  players[data.id].x = data.x;
});

// ✅ Declarative actions
actions: {
  move: {
    apply(state, playerId, input) {
      state.players[playerId].x = input.x;
    }
  }
}
```

### Transport-Agnostic

Swap networking backends without changing game code:

```typescript
// Development: P2P
const transport = new TrysteroTransport({ roomId: 'dev-123' });

// Production: WebSocket
const transport = new WebSocketTransport({ url: 'wss://game.com' });
```

---

## Roadmap

- [x] Host-authoritative mode
- [x] P2P transport (Trystero)
- [x] Phaser adapter
- [x] Comprehensive tests (96%+ coverage)
- [ ] WebSocket transport
- [ ] Unity C# bindings
- [ ] Godot GDScript bindings
- [ ] Client prediction (optional advanced mode)

---

## License

MIT - See [LICENSE](../../LICENSE)

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

**Areas needing help:**
- WebSocket transport implementation
- Unity/Godot adapters
- Example games
- Documentation improvements

---

## Support

- **Documentation:** [martini-kit-sdk-v2](../../docs/martini-kit-sdk-v2/)
- **Issues:** [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues)
- **Demo:** [@martini-kit/demo-vite](../demo-vite)
