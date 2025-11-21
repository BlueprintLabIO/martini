# Quick Start (martini-kit v2)

This guide gets you from zero to a working host-authoritative Phaser game in less than 10 minutes.

---

## 1. Install Dependencies

```bash
pnpm add @martini-kit/core @martini-kit/phaser phaser
```

> Use `npm` or `yarn` if you prefer; the package list is the same.

---

## 2. Define Game Logic

Create `game.ts`:

```ts
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      apply(state, context, input) {
        if (state.players[context.targetId]) {
          state.players[context.targetId].x = input.x;
          state.players[context.targetId].y = input.y;
        }
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

This is the only place you describe state and mutations. No networking code appears here.

---

## 3. Build a Phaser Scene

Create `scene.ts`:

```ts
import Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

export function createScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    player!: Phaser.GameObjects.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      this.player = this.physics.add.sprite(100, 100, 'player');
      this.cursors = this.input.keyboard!.createCursorKeys();

      // Track sprite for automatic syncing across network
      this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);
    }

    update() {
      // Standard Phaser input handling
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);
      } else {
        this.player.setVelocityX(0);
      }
    }
  };
}
```

Notice that this is standard Phaser code. The adapter takes care of syncing.

---

## 4. Wire Everything Together

Create `main.ts`:

```ts
import { initializeGame } from '@martini-kit/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }
      }
    },
    backgroundColor: '#1a1a2e'
  }
});
```

This call:

1. Reads platform configuration (transport type, room ID, etc.)
2. Creates the appropriate transport automatically
3. Sets up the GameRuntime
4. Creates the Phaser game instance
5. Keeps sprites synced automatically

**Note:** The platform (IDE, production runtime) injects `__martini-kit_CONFIG__` which specifies the transport type and connection details. This is set by:
- `@martini-kit/ide` for the browser IDE
- Your own runtime wrapper for production games

---

## 5. Platform Configuration

For standalone games (outside the IDE), you need to inject the platform config:

```html
<script>
  window.__martini-kit_CONFIG__ = {
    transport: {
      type: 'iframe-bridge', // or 'trystero' for P2P
      roomId: 'my-game-room',
      isHost: true // or false for clients
    }
  };
</script>
<script type="module" src="/src/main.ts"></script>
```

For production, you might use Trystero for P2P:

```html
<script>
  window.__martini-kit_CONFIG__ = {
    transport: {
      type: 'trystero',
      roomId: 'game-123',
      isHost: location.hash === '#host',
      appId: 'my-game' // Trystero app ID
    }
  };
</script>
```

---

## 6. Run Two Browsers

1. Start your dev server (`vite`, `webpack`, etc.)
2. Open two browser windows
3. In one tab, set `isHost: true` in the config
4. In the other tab, set `isHost: false`
5. Both should connect and sync!

You should see both characters move around in sync. The host feels instantaneous; the client follows with minimal latency.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `__martini-kit_CONFIG__` is missing | Platform config not injected | Add the `window.__martini-kit_CONFIG__` script before your main script |
| Sprites don't appear on clients | `trackSprite` missing or wrong key | Call `trackSprite(sprite, uniqueKey)` after creating each sprite |
| State shows `undefined` players | Actions ran before player entry existed | Initialize `state.players[playerId]` in `onPlayerJoin` |
| Weird bouncing between positions | Host running different scene than clients | Only the host should control physics; clients mirror state |

Need more help? Join the Discord and share a minimal repro.

---

## Next Steps

- Dive into [phaser-adapter.md](./03-phaser-adapter.md) for advanced tracking and events
- Learn about the transport system in [transports.md](./04-transports.md)
- Read about best practices in [best-practices.md](./05-best-practices.md)

Happy building!

---
