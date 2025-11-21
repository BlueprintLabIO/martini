---
title: PhaserAdapter
description: Bridge between Phaser and martini-kit runtime
---

# PhaserAdapter

`PhaserAdapter` is the bridge between Phaser.js and martini-kit's multiplayer runtime. It automatically synchronizes sprite positions, handles input, manages cameras, and provides reactive state updates - all without manual networking code.

## Quick Start

```typescript
import { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private playerSprite!: Phaser.GameObjects.Sprite;

  create() {
    // Create adapter
    this.adapter = new PhaserAdapter(runtime, this);

    // Create and track sprite - automatically syncs!
    this.playerSprite = this.physics.add.sprite(100, 100, 'player');
    this.adapter.trackSprite(this.playerSprite, `player-${this.adapter.myId}`);

    // That's it! Sprite positions now sync across all clients
  }
}
```

## API Reference

```typescript
class PhaserAdapter<TState = any> {
  constructor(
    runtime: GameRuntime<TState>,
    scene: Phaser.Scene,
    config?: PhaserAdapterConfig
  );

  // Identity
  readonly myId: string;
  getLocalPlayerId(): string;
  isHost(): boolean;

  // Player state
  getMyPlayer<TPlayer>(playersKey?: string): TPlayer | undefined;
  onMyPlayerChange<TPlayer>(callback: (player: TPlayer) => void, playersKey?: string): Unsubscribe;
  watchMyPlayer<TPlayer, TSelected>(
    selector: (player: TPlayer) => TSelected,
    callback: (value: TSelected, prev: TSelected) => void,
    options?: WatchOptions
  ): Unsubscribe;

  // Sprite tracking
  trackSprite(sprite: Phaser.GameObjects.Sprite, key: string, options?: SpriteTrackingOptions): void;
  untrackSprite(key: string, namespace?: string): void;
  setSpriteStaticData(key: string, data: Record<string, any>, namespace?: string): void;

  // Events
  broadcast(eventName: string, payload: any): void;
  on(eventName: string, callback: (senderId: string, payload: any) => void): Unsubscribe;

  // Scene access
  getScene(): Phaser.Scene;

  // Cleanup
  destroy(): void;

  // Helpers (created via methods)
  createSpriteManager<TEntity>(config: SpriteManagerConfig<TEntity>): SpriteManager<TEntity>;
  createInputManager<TInput>(config: InputManagerConfig<TInput>): InputManager<TInput>;
  createPlayerUIManager(config: PlayerUIManagerConfig): PlayerUIManager;
  createCollisionManager(config: CollisionManagerConfig): CollisionManager;
  createPhysicsManager(config: PhysicsManagerConfig): PhysicsManager;
}
```

### Configuration

```typescript
interface PhaserAdapterConfig {
  spriteNamespace?: string;    // Default: '_sprites'
  autoInterpolate?: boolean;    // Default: true
  lerpFactor?: number;          // Default: 0.3 (range: 0.1-0.5)
}

interface SpriteTrackingOptions {
  syncInterval?: number;        // Default: 50ms (20 FPS)
  properties?: string[];        // Default: ['x', 'y', 'rotation', 'alpha']
  interpolate?: boolean;        // Default: true
  namespace?: string;           // Default: adapter's spriteNamespace
}
```

## Constructor

Creates a new Phaser adapter instance.

```typescript
new PhaserAdapter(runtime, scene, config?)
```

**Parameters:**
- `runtime` - [GameRuntime](../core/game-runtime) instance
- `scene` - Phaser Scene instance
- `config` - Optional configuration

**Example:**

```typescript
import { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import { LocalTransport } from '@martini-kit/transport-local';

class GameScene extends Phaser.Scene {
  create() {
    // Setup runtime
    const transport = new LocalTransport({ roomId: 'demo', isHost: true });
    const runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: [transport.getPlayerId()]
    });

    // Create adapter
    this.adapter = new PhaserAdapter(runtime, this, {
      spriteNamespace: '_sprites',  // Where sprite data is stored in state
      autoInterpolate: true,         // Smooth remote sprite movement
      lerpFactor: 0.3               // Interpolation speed
    });
  }
}
```

## Identity & Host Detection

### myId

Get the local player's ID.

```typescript
readonly myId: string
```

**Example:**

```typescript
const playerId = this.adapter.myId;
console.log('My player ID:', playerId);

// Use in sprite keys
this.adapter.trackSprite(sprite, `player-${this.adapter.myId}`);
```

### getLocalPlayerId()

More discoverable alias for `myId`.

```typescript
getLocalPlayerId(): string
```

### isHost()

Check if this client is the authoritative host.

```typescript
isHost(): boolean
```

**Example:**

```typescript
if (this.adapter.isHost()) {
  // Only host runs physics
  this.startPhysicsLoop();
} else {
  // Clients just render
  console.log('Client mode - mirroring state');
}
```

## Player State Access

### getMyPlayer()

Get the local player's state object.

```typescript
getMyPlayer<TPlayer>(playersKey?: string): TPlayer | undefined
```

**Parameters:**
- `playersKey` - State key where players are stored (default: `'players'`)

**Returns:** Player state or `undefined` if not found

**Example:**

```typescript
interface Player {
  x: number;
  y: number;
  health: number;
  score: number;
}

const player = this.adapter.getMyPlayer<Player>();
if (player) {
  console.log(`Position: (${player.x}, ${player.y})`);
  console.log(`Health: ${player.health}`);
}
```

### onMyPlayerChange()

Subscribe to changes in the local player's state.

```typescript
onMyPlayerChange<TPlayer>(
  callback: (player: TPlayer | undefined) => void,
  playersKey?: string
): Unsubscribe
```

**Parameters:**
- `callback` - Called whenever local player state changes
- `playersKey` - State key for players (default: `'players'`)

**Returns:** Unsubscribe function

**Example:**

```typescript
// Update HUD when player changes
const unsubscribe = this.adapter.onMyPlayerChange<Player>((player) => {
  if (player) {
    this.healthText.setText(`HP: ${player.health}`);
    this.scoreText.setText(`Score: ${player.score}`);
  }
});

// Later: cleanup
this.events.once('shutdown', () => {
  unsubscribe();
});
```

### watchMyPlayer()

Watch a specific derived value from player state with automatic change detection.

```typescript
watchMyPlayer<TPlayer, TSelected>(
  selector: (player: TPlayer | undefined) => TSelected,
  callback: (value: TSelected, prev: TSelected | undefined) => void,
  options?: {
    playersKey?: string;
    equals?: (a: TSelected, b: TSelected) => boolean;
  }
): Unsubscribe
```

**Parameters:**
- `selector` - Function to extract a value from player state
- `callback` - Called when selected value changes
- `options.playersKey` - State key for players (default: `'players'`)
- `options.equals` - Custom equality check (default: `Object.is`)

**Returns:** Unsubscribe function

**Example:**

```typescript
// Watch single property
this.adapter.watchMyPlayer(
  (player) => player?.health,
  (health) => {
    this.healthBar.setPercent(health / 100);
    if (health <= 20) {
      this.showLowHealthWarning();
    }
  }
);

// Watch multiple properties
this.adapter.watchMyPlayer(
  (player) => ({ x: player?.x, y: player?.y }),
  (pos) => {
    console.log(`Position changed: (${pos.x}, ${pos.y})`);
  },
  {
    equals: (a, b) => a.x === b.x && a.y === b.y
  }
);

// Watch complex derived state
this.adapter.watchMyPlayer(
  (player) => {
    if (!player) return 'offline';
    if (player.health <= 0) return 'dead';
    if (player.health <= 20) return 'critical';
    return 'alive';
  },
  (status, prevStatus) => {
    console.log(`Status: ${prevStatus} -> ${status}`);
    if (status === 'dead') {
      this.showDeathScreen();
    }
  }
);
```

**Why use watchMyPlayer instead of onMyPlayerChange?**

```typescript
// ❌ BAD: Callback fires on every state change, even if health didn't change
this.adapter.onMyPlayerChange((player) => {
  this.healthText.setText(`HP: ${player.health}`);
  // This updates every tick, even if health is the same!
});

// ✅ GOOD: Callback only fires when health actually changes
this.adapter.watchMyPlayer(
  (player) => player?.health,
  (health) => {
    this.healthText.setText(`HP: ${health}`);
    // Only updates when health changes!
  }
);
```

## Sprite Tracking

### trackSprite()

Automatically sync a sprite's properties across the network.

```typescript
trackSprite(
  sprite: Phaser.GameObjects.Sprite,
  key: string,
  options?: SpriteTrackingOptions
): void
```

**Parameters:**
- `sprite` - Phaser sprite to track
- `key` - Unique identifier (e.g., `player-${playerId}`)
- `options` - Optional tracking configuration

**What it does:**
- **Host:** Reads sprite properties → writes to state → broadcasts to clients
- **Clients:** Read state → update sprite properties → interpolate for smoothness

**Example:**

```typescript
// Basic tracking
const playerSprite = this.physics.add.sprite(100, 100, 'player');
this.adapter.trackSprite(playerSprite, `player-${this.adapter.myId}`);

// Custom sync interval (60 FPS)
this.adapter.trackSprite(playerSprite, 'player-1', {
  syncInterval: 16  // 60 FPS
});

// Custom properties
this.adapter.trackSprite(enemySprite, 'enemy-1', {
  properties: ['x', 'y', 'scaleX', 'scaleY', 'tint']
});

// Custom namespace
this.adapter.trackSprite(sprite, 'projectile-1', {
  namespace: 'projectiles'
});

// Disable interpolation (for instant teleports)
this.adapter.trackSprite(sprite, 'teleporter', {
  interpolate: false
});
```

**Automatic interpolation:**

By default, remote sprites smoothly lerp to their target positions:

```typescript
// On client, sprite smoothly moves to server position
// Instead of: sprite.x = stateX (jerky)
// Does: sprite.x += (stateX - sprite.x) * lerpFactor (smooth)
```

### untrackSprite()

Stop tracking a sprite and remove it from state.

```typescript
untrackSprite(key: string, namespace?: string): void
```

**Example:**

```typescript
// Remove sprite tracking
this.adapter.untrackSprite('player-123');

// Also destroy the sprite
const sprite = this.playerSprites.get('player-123');
if (sprite) {
  sprite.destroy();
  this.playerSprites.delete('player-123');
}
```

### setSpriteStaticData()

Set static metadata for a sprite (host only).

```typescript
setSpriteStaticData(
  key: string,
  data: Record<string, any>,
  namespace?: string
): void
```

**Use case:** Store sprite metadata that doesn't change often (texture, color, etc.).

**Example:**

```typescript
// Set static sprite data
this.adapter.setSpriteStaticData('player-123', {
  texture: 'player-red',
  color: 0xff0000,
  name: 'Alice'
});

// Then track sprite - data is already in state
this.adapter.trackSprite(sprite, 'player-123');

// Clients can read static data
const state = runtime.getState();
const playerData = state._sprites['player-123'];
console.log(`Player name: ${playerData.name}`);
```

## Events

### broadcast()

Broadcast a custom event to all players.

```typescript
broadcast(eventName: string, payload: any): void
```

**Example:**

```typescript
// Player shoots
this.adapter.broadcast('playerShoot', {
  x: this.playerSprite.x,
  y: this.playerSprite.y,
  angle: this.aimAngle
});

// Player sends chat message
this.adapter.broadcast('chat', {
  message: 'Hello!',
  senderId: this.adapter.myId
});
```

### on()

Listen for custom events.

```typescript
on(
  eventName: string,
  callback: (senderId: string, payload: any) => void
): Unsubscribe
```

**Parameters:**
- `eventName` - Event name to listen for
- `callback` - `(senderId, payload) => void`

**Returns:** Unsubscribe function

**Example:**

```typescript
// Listen for shoot events
this.adapter.on('playerShoot', (senderId, payload) => {
  // Play sound
  this.sound.play('shoot');

  // Create projectile visual
  const proj = this.add.sprite(payload.x, payload.y, 'bullet');
  proj.rotation = payload.angle;
});

// Listen for chat
this.adapter.on('chat', (senderId, payload) => {
  this.chatLog.addMessage(senderId, payload.message);
});
```

## Complete Example

```typescript
import Phaser from 'phaser';
import { GameRuntime, defineGame } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import { LocalTransport } from '@martini-kit/transport-local';

// Define game state
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    health: number;
    score: number;
  }>;
}

// Define game logic
const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 400, y: 300, health: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    }
  }
});

// Phaser scene
class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter<GameState>;
  private runtime!: GameRuntime<GameState>;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private healthText!: Phaser.GameObjects.Text;

  create() {
    // Create runtime
    const transport = new LocalTransport({
      roomId: 'demo',
      isHost: true
    });

    this.runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: [transport.getPlayerId()]
    });

    // Create adapter
    this.adapter = new PhaserAdapter(this.runtime, this);

    // Create player sprite
    this.playerSprite = this.physics.add.sprite(400, 300, 'player');

    // Track sprite - auto-syncs!
    this.adapter.trackSprite(
      this.playerSprite,
      `player-${this.adapter.myId}`
    );

    // Create HUD
    this.healthText = this.add.text(10, 10, '', { color: '#fff' });

    // Watch player health
    this.adapter.watchMyPlayer(
      (player) => player?.health,
      (health) => {
        this.healthText.setText(`HP: ${health}`);
      }
    );

    // Listen for shoot events
    this.adapter.on('shoot', (senderId, payload) => {
      this.sound.play('gunshot');
      this.createBullet(payload.x, payload.y, payload.angle);
    });

    // Handle input
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.adapter.broadcast('shoot', {
        x: this.playerSprite.x,
        y: this.playerSprite.y,
        angle: 0
      });
    });

    // Cleanup on scene shutdown
    this.events.once('shutdown', () => {
      this.adapter.destroy();
      this.runtime.destroy();
    });
  }

  update() {
    // Submit movement to runtime
    if (this.adapter.isHost()) {
      const speed = 200 * (this.game.loop.delta / 1000);

      if (this.cursors.left.isDown) this.playerSprite.x -= speed;
      if (this.cursors.right.isDown) this.playerSprite.x += speed;
      if (this.cursors.up.isDown) this.playerSprite.y -= speed;
      if (this.cursors.down.isDown) this.playerSprite.y += speed;

      // Sprite position automatically syncs via trackSprite!
    }
  }

  private createBullet(x: number, y: number, angle: number) {
    // Visual only - not synced
    const bullet = this.add.sprite(x, y, 'bullet');
    bullet.rotation = angle;
  }
}
```

## Best Practices

### ✅ Do

- **Use `trackSprite()` for player sprites** - Automatic sync
- **Use `watchMyPlayer()` for reactive UI** - Only updates when values change
- **Use events for transient effects** - Sounds, particles, etc.
- **Clean up on shutdown** - Call `adapter.destroy()`
- **Use `isHost()` for physics** - Only host runs authoritative logic

### ❌ Don't

- **Don't manually sync sprites** - Let adapter handle it
- **Don't forget to track sprites** - Otherwise they won't sync
- **Don't use `onMyPlayerChange` for specific properties** - Use `watchMyPlayer` instead
- **Don't run physics on clients** - Host-only

## See Also

- [SpriteManager](./sprite-manager) - Advanced sprite management
- [InputManager](./input-manager) - Keyboard/mouse input
- [GameRuntime](../core/game-runtime) - Core runtime
