# Phaser Adapter Guide

`@martini/phaser` bridges your declarative game logic with Phaser scenes. The `PhaserAdapter` class helps you:

- Track sprites and automatically sync them across the network
- Broadcast lightweight events
- Detect host vs. client roles
- Register remote sprites for smooth interpolation

---

## Bootstrapping

```ts
import { initializeGame } from '@martini/phaser';
import { defineGame } from '@martini/core';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 960,
    height: 540,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 800 }
      }
    },
    backgroundColor: '#1a1a2e'
  }
});
```

`initializeGame()` handles:
- Reading platform configuration (`__MARTINI_CONFIG__`)
- Creating the appropriate transport
- Setting up the GameRuntime
- Creating the Phaser game instance

---

## Creating the Adapter

Inside your scene's `create()` method, instantiate the `PhaserAdapter`:

```ts
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;

    create() {
      // Create adapter first
      this.adapter = new PhaserAdapter(runtime, this);

      // Now use adapter methods...
    }
  };
}
```

---

## Adapter API

The `PhaserAdapter` instance exposes:

| Method / Property | Description |
|-------------------|-------------|
| `adapter.isHost()` | Returns `true` only on the host (runs physics simulation) |
| `adapter.myId` | Stable identifier (string) for this peer |
| `adapter.trackSprite(sprite, key, options?)` | Syncs a sprite's position/rotation automatically. Host only. |
| `adapter.untrackSprite(key)` | Stops tracking a sprite manually |
| `adapter.registerRemoteSprite(key, sprite)` | Registers a sprite created from network state (clients only) |
| `adapter.unregisterRemoteSprite(key)` | Unregisters and destroys a remote sprite |
| `adapter.updateInterpolation()` | Call in `update()` on clients for smooth movement |
| `adapter.broadcast(eventName, payload)` | Broadcasts a custom event to all peers |
| `adapter.on(eventName, handler)` | Subscribes to custom events. Returns unsubscribe function |
| `adapter.onChange(callback)` | Listens for state changes. Returns unsubscribe function |
| `adapter.getState()` | Returns the current game state (typed) |

### Example

```ts
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // Host creates physics sprites
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);
  } else {
    // Clients create visual sprites from state
    this.adapter.onChange((state: any) => {
      if (!state._sprites) return;

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const sprite = this.add.sprite(data.x, data.y, 'player');
          this.remoteSprites.set(key, sprite);
          this.adapter.registerRemoteSprite(key, sprite);
        }
      }
    });
  }

  // Listen for custom events
  this.adapter.on('coin-picked', (senderId, data) => {
    console.log(`${senderId} picked coin ${data.id}`);
  });
}
```

---

## Tracking Sprites (Host Only)

`trackSprite()` automatically syncs sprite properties to the network:

**Tracked Properties:**
- `x`, `y`
- `rotation`
- `alpha`
- Additional properties specified in `options.properties`

**Usage:**

```ts
trackSprite(sprite: Phaser.GameObjects.GameObject, key: string, options?: {
  syncInterval?: number;       // Sync frequency in ms (default: 50ms / 20 FPS)
  properties?: string[];        // Additional properties to sync
  interpolate?: boolean;        // Enable interpolation (client-side)
});
```

**Example:**

```ts
// Basic tracking
this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);

// Custom properties and sync rate
this.adapter.trackSprite(this.enemy, `enemy-1`, {
  syncInterval: 30,  // 33 FPS
  properties: ['x', 'y', 'rotation', 'alpha', 'scaleX', 'scaleY']
});
```

**Tips:**
- Use stable keys: `player-${adapter.myId}`, `enemy-${id}`, etc.
- Only the **host** should call `trackSprite()`
- Destroying a sprite automatically stops tracking
- Host controls physics; clients just mirror positions

---

## Remote Sprites (Clients Only)

Clients need to create visual representations of sprites tracked by the host:

```ts
create() {
  if (!this.adapter.isHost()) {
    this.adapter.onChange((state: any) => {
      const sprites = state._sprites || {}; // Default namespace

      for (const [key, data] of Object.entries(sprites)) {
        if (!this.remoteSprites.has(key)) {
          // Create sprite from network data
          const sprite = this.add.sprite(data.x, data.y, 'player');

          // Register for interpolation
          this.adapter.registerRemoteSprite(key, sprite);

          this.remoteSprites.set(key, sprite);
        }
      }
    });
  }
}

update() {
  // Smooth interpolation on clients
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation();
  }
}
```

**Interpolation:**
- Call `adapter.updateInterpolation()` in your `update()` loop (clients only)
- This smoothly lerps sprites toward their target positions
- Configure lerp factor in `PhaserAdapter` constructor options

---

## Custom Events

Events are lightweight and perfect for one-time occurrences (sounds, particles, etc.):

**Broadcasting:**

```ts
// Anyone can broadcast
this.adapter.broadcast('door-opened', { doorId: 3 });
this.adapter.broadcast('player-scored', { points: 100 });
```

**Listening:**

```ts
const unsubscribe = this.adapter.on('door-opened', (senderId, payload) => {
  console.log(`Player ${senderId} opened door ${payload.doorId}`);
  this.sound.play('door-open');
});

// Cleanup later
unsubscribe();
```

**Note:** Events go through the transport layer and are implemented via actions under the hood.

---

## Host-Only Logic

Use `adapter.isHost()` to guard code that should only run on the authoritative peer:

```ts
create() {
  if (this.adapter.isHost()) {
    // Only host spawns entities
    this.spawnCoins();
    this.spawnEnemies();

    // Only host sets up timers
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this.spawnPowerUp(),
      callbackScope: this
    });
  }
}

update() {
  if (this.adapter.isHost()) {
    // Only host runs physics
    this.updateEnemyAI();
    this.checkCollisions();
  } else {
    // Clients just interpolate
    this.adapter.updateInterpolation();
  }
}
```

**Why separate host/client logic?**
- Host is authoritative - runs real game simulation
- Clients are presentational - just display what host sends
- This prevents desyncs and cheating

---

## Configuration

You can configure the adapter behavior:

```ts
this.adapter = new PhaserAdapter(runtime, this, {
  spriteNamespace: 'gameSprites',  // Custom state property (default: '_sprites')
  autoInterpolate: true,            // Auto-lerp on clients (default: true)
  lerpFactor: 0.3                   // Smoothness: 0.1 = smooth, 0.5 = snappy
});
```

---

## State Access

Access the game state directly:

```ts
const state = this.adapter.getState();
console.log(state.players);

// Or listen for changes
this.adapter.onChange((newState) => {
  this.updateUI(newState);
});
```

**Note:** State updates are read-only on clients. Only the host mutates state via actions.

---

## Cleanup

The adapter automatically cleans up tracked sprites, but you can manually cleanup if needed:

```ts
// Stop tracking a sprite
this.adapter.untrackSprite(`player-${playerId}`);

// Remove remote sprite
this.adapter.unregisterRemoteSprite(`player-${playerId}`);

// Destroy adapter
this.adapter.destroy();
```

---

## FAQ

**Q: Do clients need to call `trackSprite`?**
A: No. Only the host tracks sprites. Clients create visual sprites via `registerRemoteSprite()`.

**Q: Can I sync custom properties like health or ammo?**
A: Not directly via `trackSprite`. Store those in your game state and sync via actions instead.

**Q: How do I handle sprite destruction?**
A: Destroying a sprite on the host automatically stops tracking. Clients should listen for state changes and remove sprites that no longer exist.

**Q: What's the sprite namespace for?**
A: By default, tracked sprites are stored in `state._sprites`. You can customize this with the `spriteNamespace` option.

---

## What's Next?

- Learn about the transport layer in [transports.md](./04-transports.md)
- Read best practices in [best-practices.md](./05-best-practices.md)
- Check the API reference in [07-api-reference-core.md](./07-api-reference-core.md)

If you run into adapter bugs, open an issue with a minimal scene and we'll take a look.

---
