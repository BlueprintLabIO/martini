# Quick Start (Martini v2)

This guide gets you from zero to a working host-authoritative Phaser game in less than 10 minutes.

---

## 1. Install Dependencies

```bash
pnpm add @martini/core @martini/phaser @martini/transport-p2p phaser
```

> Use `npm` or `yarn` if you prefer; the package list is the same.

---

## 2. Define Game Logic

Create `logic.ts`:

```ts
import { defineGame } from '@martini/core';

export const gameLogic = defineGame({
  state: {
    players: {
      type: 'map',
      schema: {
        x: { type: 'number', min: 0, max: 960 },
        y: { type: 'number', min: 0, max: 540 },
        role: 'string'
      }
    }
  },
  actions: {
    syncPosition: {
      input: { x: 'number', y: 'number' },
      apply(state, playerId, input) {
        const previous = state.players[playerId] ?? { role: 'player' };
        state.players[playerId] = { ...previous, ...input };
      }
    },
    broadcastEvent: {
      input: { eventName: 'string', payload: 'any' },
      apply(state, _playerId, input) {
        state.lastEvent = input;
      }
    }
  }
});
```

This is the only place you describe state and mutations. No networking code appears here.

---

## 3. Build a Phaser Scene

```ts
// GameScene.ts
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  create() {
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);
  }

  update() {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    } else {
      this.player.setVelocityX(0);
    }
  }
}
```

Notice that this is standard Phaser code. The adapter takes care of syncing.

---

## 4. Wire Everything Together

```ts
import { PhaserAdapter } from '@martini/phaser';
import { P2PTransport } from '@martini/transport-p2p';
import { gameLogic } from './logic';
import { GameScene } from './GameScene';

PhaserAdapter.start({
  game: gameLogic,
  transport: new P2PTransport('room-123'), // or any other transport
  scenes: [GameScene],
  assets: (scene) => {
    scene.load.image('player', 'player.png');
  }
});
```

This single call:

1. Initializes the transport.
2. Spins up Phaser with your scenes.
3. Injects `adapter` helpers into each scene instance.
4. Keeps sprites synced by dispatching actions under the hood.

---

## 5. Run Two Browsers

1. Start your dev server (`vite`, `webpack`, etc.).
2. Open two browser windows with the same URL.
3. In one tab, click “Host Game” (your UI can be as simple as a button).
4. Share the room code with the second tab (P2P transport handles the rest).

You should see both characters move around in sync. The host feels instantaneous; the client follows with minimal latency.

---

## Optional: Switch Transports

Local testing is easier with P2P, but production games usually prefer a relay:

```ts
import { WebSocketTransport } from '@martini/transport-ws';

const transport = new WebSocketTransport('wss://game.example.com');
PhaserAdapter.start({ game: logic, transport, scenes: [GameScene] });
```

No other code changes required.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Sprites don’t appear on clients | `trackSprite` missing or wrong key | Call `trackSprite(sprite, uniqueKey)` after creating each sprite. |
| Clients don’t connect | Transport not emitting peer join events | Confirm signalling server / room ID, or use the WebSocket transport instead of P2P. |
| State shows `undefined` players | Actions ran before player entry existed | Initialize `state.players[playerId]` in the action (see sample above). |
| Weird bouncing between positions | Host running different scene than clients | Only the host should control physics; clients must treat sprites as read-only mirrors. |

Need more help? Join the Discord and share a minimal repro.

---

## Next Steps

- Dive into [phaser-adapter.md](./phaser-adapter.md) for advanced tracking and events.
- Learn about other networking options in [transports.md](./transports.md).
- Coming from the old sandbox `gameAPI.multiplayer`? Read [migration-from-gameapi.md](./migration-from-gameapi.md).

Happy building! 

---
