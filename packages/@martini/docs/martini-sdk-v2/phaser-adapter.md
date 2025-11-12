# Phaser Adapter Guide

`@martini/phaser` bridges your declarative game logic with Phaser scenes. It injects an `adapter` object into every scene so you can:

- Track sprites and automatically sync them to Martini state.
- Broadcast lightweight events.
- Detect host vs. client roles.
- Inspect connection info for UI.

---

## Bootstrapping

```ts
import { PhaserAdapter } from '@martini/phaser';
import { defineGame } from '@martini/core';
import { WebSocketTransport } from '@martini/transport-ws';
import { GameScene } from './GameScene';

const logic = defineGame({ /* ... */ });

PhaserAdapter.start({
  game: logic,
  transport: new WebSocketTransport('wss://game.example.com'),
  scenes: [GameScene],
  assets: (scene) => {
    scene.load.image('player', 'player.png');
  },
  phaser: {
    width: 960,
    height: 540
  }
});
```

`start()` handles Phaser lifecycle, transport setup, and runtime wiring.

---

## Adapter API

Inside `GameScene` (and any other scene you list), `this.adapter` exposes:

| Method / Property | Description |
|-------------------|-------------|
| `adapter.isHost()` | `true` only on the peer that owns simulation (runs full physics). |
| `adapter.myId` | Stable identifier (string) for this peer. |
| `adapter.trackSprite(sprite, key, options?)` | Syncs a sprite’s position/velocity with state. Use unique keys per entity. |
| `adapter.stopTracking(key)` | Removes a tracked sprite manually. Usually not required—destroying the sprite will auto-untrack. |
| `adapter.broadcast(eventName, payload)` | Sends a lightweight event to every peer (implemented via actions). |
| `adapter.on(eventName, handler)` | Subscribes to events from other peers. Returns an unsubscribe function. |
| `adapter.clients` | Array of connected peer IDs (including host). |
| `adapter.transport` | Access to the underlying transport instance in case you need low-level info. |

### Example

```ts
create() {
  this.player = this.physics.add.sprite(100, 100, 'player');
  this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`, {
    metadata: { role: 'fireboy' }
  });

  this.adapter.on('coin-picked', (peerId, data) => {
    this.log(`${peerId} picked coin ${data.id}`);
  });
}
```

---

## Tracking Sprites

`trackSprite` watches the following properties:

- `x`, `y`
- `velocityX`, `velocityY` (if `sprite.body` exists)
- `active`, `visible`
- Any custom metadata you include in `options.metadata`

The host calls the corresponding action (`syncPosition` by default). Clients simply update their local sprites to match the state changes.

```ts
trackSprite(sprite: Phaser.GameObjects.Sprite, key: string, options?: {
  metadata?: Record<string, any>;
});
```

**Tips**

- Use stable keys: `player-${adapter.myId}`, `enemy-${id}`, etc.
- Destroying a sprite automatically stops tracking.
- Sprites created on clients but not on host are ignored; host decides which entities exist.

---

## Events

Events are lightweight compared to full state changes—perfect for moments that don’t need persisted state (e.g., “door opened” sound effects).

```ts
// Host
this.adapter.broadcast('door-opened', { doorId: 3 });

// Everyone
const unsubscribe = this.adapter.on('door-opened', (_peerId, data) => {
  this.sounds.playDoor(data.doorId);
});
```

Under the hood, broadcast events are converted into Martini actions with simple payloads. They go through the same transport and benefit from schema validation.

---

## Host-Only Logic

Use `adapter.isHost()` to guard code that should only run on the authority. Common examples:

```ts
if (this.adapter.isHost()) {
  this.spawnCoins();
  this.time.addEvent({
    delay: 5000,
    loop: true,
    callback: this.spawnEnemy,
    callbackScope: this
  });
}
```

Clients never run this code—they simply mirror whatever the host’s actions produce.

---

## UI Helpers

`adapter.clients` includes host and every connected peer. It’s useful for UI overlays:

```ts
drawPlayerList() {
  const players = this.adapter.clients.map((id) => ({
    id,
    isHost: id === this.adapter.hostId
  }));
  // render your UI here
}
```

`adapter.hostId` returns the id of the authoritative peer (helpful for debugging or migrating host status in the future).

---

## Cleanup

`PhaserAdapter.start()` returns a handle if you want to stop the runtime manually:

```ts
const instance = PhaserAdapter.start({ /* ... */ });

// Later (e.g., when leaving a page)
instance.stop();
```

Stopping tears down Phaser, unsubscribes from transport events, and clears tracked sprites.

---

## FAQ

**Q: Do clients need to call `trackSprite`?**  
A: Only the host needs to track authoritative sprites. Clients automatically create mirror sprites based on state patches. However, if clients spawn UI-only sprites (particles, HUD), they can skip tracking entirely.

**Q: Can I override which action is dispatched when tracking?**  
A: Yes—`trackSprite` accepts an `options.actionName` if you want to send something other than `syncPosition`.

**Q: How do I sync custom data (health, animations)?**  
A: Either bake it into the main `state.players` schema or broadcast small events (`adapter.broadcast('took-damage', {...})`). Remember: anything you want persisted must live in state/actions.

---

## What’s Next?

- Learn about the transport layer in [transports.md](./transports.md).
- Need to migrate old sandbox projects? Check [migration-from-gameapi.md](./migration-from-gameapi.md).

If you run into adapter bugs, open an issue with a minimal Phaser scene and we’ll take a look. 

---
