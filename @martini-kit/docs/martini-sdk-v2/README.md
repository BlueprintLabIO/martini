# martini-kit SDK v2

**Open-source, transport-agnostic multiplayer SDK with a Rune-like developer experience—now focused on super-simple, host-authoritative Phaser games.**

martini-kit lets you declare your game state once, choose any networking transport, and keep Phaser sprites in sync without writing socket code. The host runs the real physics, clients mirror whatever the host reports. That’s it.

---

## Why v2?

| v1 Pain | v2 Fix |
|---------|--------|
| Action executors forced everyone into deterministic “systems.” | v2 embraces host-authoritative sync so Phaser physics work out of the box. |
| Networking APIs exposed directly. | v2 wraps state sync behind `defineGame`, `PhaserAdapter`, and transport adapters. |
| Kids/AI had to write imperative networking glue. | v2 makes `trackSprite` the only call needed to mirror a sprite across peers. |
| Deterministic mode confused beginners. | v2 removes it from scope for now; future revisions can add optional advanced modes. |

---

## Quick Start

```bash
pnpm add @martini-kit/core @martini-kit/phaser @martini-kit/transport-p2p
```

```ts
import { defineGame, GameRuntime } from '@martini-kit/core';
import { PhaserAdapter, initializeGame } from '@martini-kit/phaser';
import { TrysteroTransport } from '@martini-kit/transport-trystero';

const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100 }])
    )
  }),
  actions: {
    move: {
      apply(state, context, input) {
        state.players[context.targetId].x = input.x;
        state.players[context.targetId].y = input.y;
      }
    }
  }
});

function createScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    player!: Phaser.GameObjects.Sprite;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      this.player = this.physics.add.sprite(100, 100, 'player');
      this.adapter.trackSprite(this.player, \`player-\${this.adapter.myId}\`);
    }

    update() {
      const cursors = this.input.keyboard!.createCursorKeys();
      if (cursors.left.isDown) {
        this.player.setVelocityX(-160);
      } else if (cursors.right.isDown) {
        this.player.setVelocityX(160);
      } else {
        this.player.setVelocityX(0);
      }
    }
  };
}

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e'
  }
});
```

✅ Host uses Phaser physics normally  
✅ Clients receive state updates and render them  
✅ No networking boilerplate

See [quick-start.md](./quick-start.md) for a full walkthrough.

---

## Packages

| Package | Purpose |
|---------|---------|
| `@martini-kit/core` | Defines state, actions, validation, diff/patch logic. |
| `@martini-kit/phaser` | Tracks sprites, manages host/client roles, vents events to Phaser. |
| `@martini-kit/transport-p2p` | WebRTC transport (Trystero) for local/peer games. |
| `@martini-kit/transport-ws` | WebSocket transport (coming soon). |
| `@martini-kit/transport-udp` | UDP relay transport (coming soon). |

Additional adapters (Unity, Godot, Three.js) are on the roadmap once the Phaser experience is rock-solid.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 @martini-kit/core                   │
│  defineGame()    actions()    diff/patch        │
└──────────────────────────────┬──────────────────┘
                               │
                      transport interface
                               │
         ┌─────────────────────┴────────────────────┐
         │                                          │
┌───────────────────────┐             ┌───────────────────────┐
│ @martini-kit/transport-*  │             │  Custom transports     │
└───────────────────────┘             └───────────────────────┘
                               │
                               │
                     engine adapter layer
                               │
                     ┌────────────────────┐
                     │ @martini-kit/phaser    │
                     │ - trackSprite()    │
                     │ - host utilities   │
                     │ - event helpers    │
                     └────────────────────┘
```

---

## Documentation Map

| Topic | File |
|-------|------|
| Five-minute tutorial | [01-quick-start.md](./01-quick-start.md) |
| Core mental model | [02-core-concepts.md](./02-core-concepts.md) |
| Phaser adapter details | [03-phaser-adapter.md](./03-phaser-adapter.md) |
| Transport options | [04-transports.md](./04-transports.md) |
| Best practices | [05-best-practices.md](./05-best-practices.md) |
| Troubleshooting | [06-troubleshooting.md](./06-troubleshooting.md) |
| API reference | [07-api-reference-core.md](./07-api-reference-core.md) |
| Platform comparison | [08-platform-comparison.md](./08-platform-comparison.md) |
| **Practical patterns** ⭐ | [**09-practical-patterns.md**](./09-practical-patterns.md) |

---

## Roadmap

1. **v2.0-alpha (current work)**
   - Host-authoritative Phaser adapter
   - P2P transport + WebSocket relay
   - Updated documentation + migration guide
2. **v2.1**
   - Better devtools (state inspector, replay log)
   - Classroom-ready sample projects
3. **Future**
   - Optional deterministic toolkit (prediction/rollback)
   - Unity/Godot adapters
   - Matchmaking helpers, edge-friendly relays

Deterministic systems are intentionally *out of scope* for this phase so we can ship a polished host-authoritative experience first.

---

## Contributing

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) (shared for all martini-kit packages).
2. Hop into the Discord if you want pointers.
3. Open issues for:
   - Transport adapters (WebSocket/UDP help wanted)
   - Phaser adapter polish (events, animation sync)
   - Documentation gaps

Thanks for helping make multiplayer feel approachable again.

---
