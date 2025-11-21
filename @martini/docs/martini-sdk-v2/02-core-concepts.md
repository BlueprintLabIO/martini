# Core Concepts

martini-kit SDK keeps multiplayer approachable by centering everything around plain JavaScript state, declarative actions, and a lightweight host-authoritative sync loop. This document walks through the mental model you should keep while building with `@martini-kit/core` and the Phaser adapter.

---

## State is the Source of Truth

Your entire game is represented by a single JSON-safe object. If every participant has the same state, the experience is synchronized.

```ts
const initialState = {
  players: {
    'player-1': { x: 120, y: 200, role: 'fireboy' },
    'player-2': { x: 420, y: 200, role: 'watergirl' }
  },
  coins: [
    { id: 1, x: 150, y: 140, collected: false }
  ],
  world: { level: 1 }
};
```

martini-kit never mutates Phaser sprites directly. Instead, the adapter reads from the authoritative state and keeps sprites in sync.

---

## Actions are the Only Write Path

All mutations pass through actions. Every action validates its input, updates state, and is broadcast to peers.

```ts
const logic = defineGame({
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
      apply(state, context, input) {
        state.players[context.targetId].x = input.x;
        state.players[context.targetId].y = input.y;
      }
    }
  }
});
```

**Benefits**

- 🔍 All changes are traceable
- ✅ Validation happens automatically
- ♻️ Easy to replay for QA or tooling
- 🔒 No race conditions—actions run in order

### Understanding Action Context

Every action receives a `context` object as its second parameter, providing information about who submitted the action and who it affects:

```ts
interface ActionContext {
  playerId: string;   // Who called submitAction
  targetId: string;   // Who is affected (defaults to playerId)
  isHost: boolean;    // Whether this is the host applying the action
}
```

**For player-initiated actions** (move, jump), `targetId` defaults to `playerId`:

```ts
// Player presses arrow key
runtime.submitAction('move', { x: 100, y: 200 });

// Action receives:
// context.playerId = 'player-123' (who pressed the key)
// context.targetId = 'player-123' (same player moves)
```

**For host-controlled actions** (scoring, spawning), specify `targetId` explicitly:

```ts
// Ball goes past left edge, right player scores
const rightPlayerId = findRightPlayer();
runtime.submitAction('score', undefined, rightPlayerId);

// Action receives:
// context.playerId = 'host-id' (who detected the score)
// context.targetId = 'player-456' (who gets the point)

actions: {
  score: {
    apply(state, context) {
      // Increment score for the target player
      state.players[context.targetId].score += 1;
    }
  }
}
```

**Key principle:** Use `context.targetId` for the player being affected, and `context.playerId` for audit trails or permissions.

---

## Host-Authoritative Flow

martini-kit v2 focuses on a single, predictable model: **the host runs the simulation (usually Phaser physics) and everyone else mirrors the resulting state.**

```
┌────────────┐      actions      ┌────────────┐
│    Host    │ ────────────────▶ │   Clients   │
│ (Phaser)   │ ◀───────────────┐ │ (Phaser)    │
└────────────┘   state patches  └────────────┘
```

1. Host runs Phaser exactly as usual ( Arcade physics, collisions, tweens, etc.).
2. The adapter samples sprite transforms and dispatches `actions.move`, `actions.animate`, etc.
3. `@martini-kit/core` diffs the resulting state and streams patches to every client through the chosen transport.
4. Clients render whatever state they receive; they **never** run their own physics.

**Why this matters**

- Works with any existing Phaser tutorial or AI-generated code.
- No deterministic math or rollback complexity.
- Kids’ games and prototypes “just work,” because the host is the single source of truth.

---

## Separating State from Simulation

- **State:** What exists (positions, timers, inventory, dialogue).
- **Simulation:** How state changes (Phaser physics, timers, AI).
- **SDK:** Moves state between peers; it doesn’t care how you derived the numbers.

Example:

```ts
class GameScene extends Phaser.Scene {
  create() {
    this.player = this.physics.add.sprite(100, 100, 'hero');
    this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);
  }

  update() {
    if (this.input.keyboard.createCursorKeys().left.isDown) {
      this.player.setVelocityX(-160);
    }
    // adapter automatically captures x/y and emits an action
  }
}
```

The adapter bridges Phaser’s imperative world (velocity, collisions) with martini-kit’s declarative state.

---

## Transport Abstraction

`@martini-kit/core` speaks to an `ITransport` interface. Whether the messages travel over WebRTC, WebSocket, or a custom relay is up to you.

```ts
interface ITransport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
}
```

Swap transports without touching game logic:

```ts
const p2p = new P2PTransport('room-123');          // WebRTC via Trystero
const ws = new WebSocketTransport('wss://game');   // Hosted server
const udp = new UDPTransport({ host, port });      // Custom relay
```

---

## Diff/Patch Sync

Instead of broadcasting the entire state tree on every frame, martini-kit computes structural patches.

```
Before: players.p1.x = 120
After : players.p1.x = 132
Patch : { op: 'replace', path: ['players','p1','x'], value: 132 }
```

Typical games see 80–95 % bandwidth savings compared to naïve JSON snapshots, which is especially helpful for browser-based classrooms and peer-to-peer sessions.

---

## Schema Validation

Schemas guard your state tree. Every action payload and state mutation is validated before it becomes visible to other peers.

```ts
state: {
  players: {
    type: 'map',
    schema: {
      x: { type: 'number', min: 0, max: 960 },
      y: { type: 'number', min: 0, max: 540 },
      role: { type: 'string', enum: ['fireboy', 'watergirl'] }
    }
  }
}
```

Invalid input is clamped or rejected with a descriptive error—perfect for AI-generated code or classrooms where validation needs to be automatic.

---

## Authority Helpers

The Phaser adapter exposes the minimal metadata you need:

- `adapter.isHost()` – run host-only logic (spawning enemies, timers).
- `adapter.myId` – stable identifier for the current peer.
- `adapter.trackSprite(sprite, key, options?)` – keeps a sprite synced to state. The host automatically becomes the authority for tracked sprites.
- `adapter.onEvent('coin-collected', handler)` – subscribe to broadcast events (handled through actions under the hood).

Clients never have to guess who owns what: the adapter keeps a simple map of host-owned vs. mirrored entities.

---

## Putting It Together

1. **Define state + actions** in `@martini-kit/core`.
2. **Choose a transport** (P2P for tests, WebSocket for production).
3. **Start PhaserAdapter** on both host and clients, passing the same game logic and transport.
4. **Write Phaser code normally**. Call `trackSprite` for anything that should synchronize.

That’s it—no socket handlers, no custom serialization, no deterministic physics rewrites.

---

## Summary

| Concept | Why it matters |
|--------|----------------|
| Single state tree | Easy to reason about, easy to sync |
| Actions-only mutations | Validation, replayability, predictable flow |
| Host-authoritative | Compatible with Phaser physics and tutorials |
| Transport abstraction | Swap P2P, WebSocket, or custom backends without touching game logic |
| Diff/Patch | Keeps bandwidth tiny |
| Schema validation | Protects classrooms and AI-generated code from invalid state |

Future versions may add optional deterministic tooling, but martini-kit v2 keeps the scope intentionally narrow: make host-authoritative Phaser multiplayer trivial. Once that foundation is rock-solid, higher-level features can be layered on without confusing beginners.

---

## Next Steps

- [API Reference](./02-api-reference.md) - Full API documentation
- [Phaser Adapter Guide](./phaser-adapter.md) - How to use with Phaser
- [Examples](./09-examples.md) - Sample games and recipes
