# Martini Multiplayer SDK

**Version:** 1.0
**Status:** Final Specification
**Created:** 2025-01-11

Browser-based multiplayer game SDK for kids. AI generates Phaser 3 games with zero networking code. Server-authoritative architecture with client-side prediction and rollback.

---

## Philosophy

1. **Server Authority** - Host runs canonical simulation, clients predict optimistically
2. **Zero Networking** - Users never write send/receive/sync code
3. **Plain JavaScript** - No custom DSL, familiar patterns
4. **Optional Safety** - Schema validation available but not required
5. **Transport Agnostic** - Works with Colyseus, Nakama, or P2P

---

## Quick Start

### Installation

```bash
npm install @martini/multiplayer
npm install @martini/colyseus-adapter  # or nakama-adapter, trystero-adapter
```

### Minimal Example

```javascript
// game.js - Runs on both server and clients
import { createGame } from '@martini/multiplayer';

export default createGame({
  // Initial state factory
  // ⚠️ Must return JSON-serializable state (no functions/circular refs)
  // ⚠️ Errors here crash the runtime - use try/catch for initialization logic
  setup: ({ playerIds, time }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    ),
    startTime: time  // Track when game started
  }),

  // Player actions (deterministic mutations)
  actions: {
    move: {
      input: { dx: 'number', dy: 'number' },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left

        player.x += input.dx;
        player.y += input.dy;
      },
      predict: true  // Run instantly on client (0ms lag)
    }
  }
});
```

### Client Integration (Phaser)

```javascript
// client.js
import { createRuntime } from '@martini/multiplayer';
import { ColyseusTransport } from '@martini/colyseus-adapter';
import game from './game.js';

const transport = new ColyseusTransport({
  url: 'ws://localhost:2567',
  roomName: 'my-game'
});

await transport.connect();
const runtime = await createRuntime(game, transport);
const api = runtime.getAPI();

// In your Phaser scene:
class GameScene extends Phaser.Scene {
  create() {
    // Subscribe to state changes
    api.onChange((state) => {
      for (const [id, player] of Object.entries(state.players)) {
        this.updateSprite(id, player.x, player.y);
      }
    });
  }

  update() {
    const cursors = this.input.keyboard.createCursorKeys();

    if (cursors.left.isDown) {
      api.actions.move({ dx: -5, dy: 0 });
    }
    if (cursors.right.isDown) {
      api.actions.move({ dx: 5, dy: 0 });
    }
  }
}
```

### Server Setup (Colyseus)

```typescript
// server.ts
import { Room } from 'colyseus';
import { createRuntime, createTransport } from '@martini/multiplayer';
import game from './game.js';

export class GameRoom extends Room {
  runtime!: ReturnType<typeof createRuntime>;
  private notifyPeerJoin?: (peerId: string) => void;
  private notifyPeerLeave?: (peerId: string) => void;

  async onCreate() {
    const peerJoinSubscribers = new Set<(peerId: string) => void>();
    const peerLeaveSubscribers = new Set<(peerId: string) => void>();

    const transport = createTransport({
      send: (msg, targetId) => {
        if (targetId) {
          this.clients.find(c => c.sessionId === targetId)?.send('wire', msg);
        } else {
          this.broadcast('wire', msg);
        }
      },
      onMessage: (handler) => {
        this.onMessage('wire', (client, msg) => handler(msg, client.sessionId));
        return () => {};
      },
      // Note: deliver() not needed for Colyseus (event-based framework)
      // Only required for Nakama (callback-based match handlers)
      onPeerJoin: (callback) => {
        peerJoinSubscribers.add(callback);
        return () => peerJoinSubscribers.delete(callback);
      },
      onPeerLeave: (callback) => {
        peerLeaveSubscribers.add(callback);
        return () => peerLeaveSubscribers.delete(callback);
      },
      getPlayerId: () => this.roomId,
      getPeerIds: () => this.clients.map(c => c.sessionId),
      isHost: () => true
    });

    // Dedicated server: Omit playerIds, defer setup() until first player joins
    this.runtime = await createRuntime(game, transport, { isHost: true });

    this.notifyPeerJoin = (peerId) => {
      peerJoinSubscribers.forEach(cb => cb(peerId));
    };
    this.notifyPeerLeave = (peerId) => {
      peerLeaveSubscribers.forEach(cb => cb(peerId));
    };
  }

  onJoin(client: any) {
    console.log(`${client.sessionId} joined`);

    // IMPORTANT: Dedicated server pattern - setup() on first player
    if (!this.runtime.state) {
      // First player joins - initialize game state via setup()
      const initialState = game.setup({
        playerIds: [client.sessionId],
        time: this.runtime.getTick() * this.runtime.tickDuration
      });
      this.runtime.state = initialState;
      console.log('Game initialized by first player');
    }

    // Subsequent players trigger onPlayerJoin hook (if defined)
    this.notifyPeerJoin?.(client.sessionId);
  }

  onLeave(client: any) {
    console.log(`${client.sessionId} left`);
    this.notifyPeerLeave?.(client.sessionId);
  }
}
```

**Result**: Zero networking code! Same game logic works with Colyseus, Nakama, or P2P.

---

## Documentation Structure

| File | Description |
|------|-------------|
| [01-core-concepts.md](./01-core-concepts.md) | Architecture, data flow, host selection |
| [02-api-reference.md](./02-api-reference.md) | Complete API surface (actions, systems, config) |
| [03-data-structures.md](./03-data-structures.md) | Wire protocol types (WireMessage, Patch, etc.) |
| [04-transport-interface.md](./04-transport-interface.md) | Transport contract + adapter examples |
| [05-correctness-guarantees.md](./05-correctness-guarantees.md) | How we prevent cheating, desyncs, invalid state |
| [06-implementation-guide.md](./06-implementation-guide.md) | Internal algorithms (proxy, rollback, diff) |
| [07-networking-protocol.md](./07-networking-protocol.md) | Tick sync, player lifecycle, error recovery |
| [08-developer-tools.md](./08-developer-tools.md) | Dev mode, testing utilities, debugging |
| [09-examples.md](./09-examples.md) | Fire Boy & Water Girl (complete game) |
| [IMPLEMENTATION_RECOMMENDATIONS.md](./IMPLEMENTATION_RECOMMENDATIONS.md) | Guide for implementers |

### Advanced Topics

| File | Description |
|------|-------------|
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | How to test multiplayer systems (simulators, chaos engineering, property tests) |
| [LANGUAGE_BINDINGS.md](./LANGUAGE_BINDINGS.md) | Multi-language support considerations (v2+) |
| [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) | Summary of v1 spec changes (all 20 audit issues fixed) |

---

## Key Features

### ✅ Client-Side Prediction
Actions marked `predict: true` execute instantly (0ms input lag), then reconcile with server.

### ✅ Server Authority
All actions validate on host first. Clients can't cheat.

### ✅ Schema Validation
Optional runtime validation with auto-clamping:
```javascript
schema: {
  'players.*.health': { type: 'number', min: 0, max: 100 }
}
// Attempts to set -10 → auto-clamped to 0
```

### ✅ Deterministic Simulation
Seeded random, tick-based time. Perfect replication across peers.

### ✅ Automatic Rollback
Mispredictions invisible to players (usually <3 frame corrections).

### ✅ Transport Agnostic
Works with:
- **Colyseus** (hosted WebSocket server)
- **Nakama** (hosted game server)
- **Trystero** (P2P WebRTC via MQTT/Supabase)
- **Custom** (implement simple interface)

### ✅ Built-in Helpers
```javascript
requires: {
  cooldown: 500,              // 500ms between calls
  proximity: {                // Must be within 50px of coin
    get: ({ game, input }) => game.coins.find(c => c.id === input.coinId),
    distance: 50
  },
  rateLimit: {                // Max 10 shots per second
    max: 10,
    window: 1000
  }
}
```

---

## Success Criteria

1. ✅ Input lag <100ms (client prediction)
2. ✅ AI can generate valid games from natural language
3. ✅ Zero networking code in user logic
4. ✅ Same logic file works across all transports
5. ✅ Desync rate <0.1% (stress tested)
6. ✅ Rollbacks invisible to users

---

## Stack

- **Runtime:** TypeScript (tree-shakeable exports)
- **Wire Format:** JSON (custom transports can use MessagePack/binary)
- **State Sync:** Incremental diffs (bandwidth-efficient)
- **Testing:** Deterministic simulator (no network required)

---

## What's Next?

- **New to SDK?** → Start with [01-core-concepts.md](./01-core-concepts.md)
- **Building a game?** → Jump to [02-api-reference.md](./02-api-reference.md)
- **Implementing SDK?** → Read [IMPLEMENTATION_RECOMMENDATIONS.md](./IMPLEMENTATION_RECOMMENDATIONS.md)
- **Need examples?** → See [09-examples.md](./09-examples.md)

---

## License

MIT
