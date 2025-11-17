---
title: "@martini/phaser"
description: Phaser 3 integration with automatic sprite sync and helpers
section: api
order: 2
---

<script>
  import PackageBadge from '$lib/components/docs/PackageBadge.svelte';
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# @martini/phaser

<PackageBadge package="@martini/phaser" />

Phaser 3 adapter for Martini. Bridges declarative game logic with Phaser's imperative API, providing automatic sprite synchronization, input management, and multiplayer-aware helpers.

## Installation

```bash
pnpm add @martini/phaser phaser
```

## Overview

`@martini/phaser` provides:

- **`PhaserAdapter`** - Core bridge between GameRuntime and Phaser scenes
- **`SpriteManager`** - Automatic sprite creation/destruction across host and clients
- **`InputManager`** - Declarative input binding system
- **`PhysicsManager`** - Automated physics behaviors
- **`CollisionManager`** - Declarative collision rules
- **`PlayerUIManager`** - HUD management synced to player state
- **`InputProfiles`** - Standard control schemes (WASD, Arrows, Mobile, Xbox)
- **`initializeGame()`** - High-level entry point

<Callout type="info" title="Engine-Agnostic Core">

`@martini/phaser` is optional. You can use `@martini/core` with any engine (Unity, Godot, Three.js). This package just makes Phaser integration seamless.

</Callout>

---

## Quick Start

```typescript
import { initializeGame } from '@martini/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: { default: 'arcade' }
  }
});
```

---

## Core Exports

### PhaserAdapter

The main bridge between Martini's GameRuntime and Phaser scenes.

```typescript
import { PhaserAdapter } from '@martini/phaser';

class GameScene extends Phaser.Scene {
  adapter!: PhaserAdapter;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);
  }
}
```

#### Constructor

```typescript
new PhaserAdapter(runtime: GameRuntime, scene: Phaser.Scene)
```

#### Methods

| Method | Description |
|--------|-------------|
| `isHost(): boolean` | Check if this peer is the host |
| `getMyPlayerId(): string` | Get current player's ID |
| `getState(): TState` | Get current game state |
| `trackSprite(sprite, key): void` | (Host only) Sync sprite to network |
| `registerRemoteSprite(key, sprite): void` | (Client only) Register sprite for updates |
| `updateInterpolation(): void` | (Client only) Smooth sprite movement |
| `onChange(callback): () => void` | Subscribe to state changes |
| `createSpriteManager(config): SpriteManager` | Create sprite manager |
| `createInputManager(): InputManager` | Create input manager |
| `createPhysicsManager(config): PhysicsManager` | Create physics manager |
| `createCollisionManager(config): CollisionManager` | Create collision manager |
| `createPlayerUIManager(config): PlayerUIManager` | Create UI manager |

#### Example

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // Host creates physics sprites
    const sprite = this.physics.add.sprite(100, 100, 'player');
    this.adapter.trackSprite(sprite, `player-${this.adapter.getMyPlayerId()}`);
  } else {
    // Clients create visual sprites from state
    this.adapter.onChange((state) => {
      if (!state._sprites) return;

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const sprite = this.add.sprite(data.x, data.y, 'player');
          this.adapter.registerRemoteSprite(key, sprite);
          this.remoteSprites.set(key, sprite);
        }
      }
    });
  }
}

update() {
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation();
  }
}
```

---

### SpriteManager

Handles sprite creation/destruction automatically on host and clients.

```typescript
const spriteManager = adapter.createSpriteManager({
  stateKey: 'enemies',

  // Host: Create physics sprite
  onCreatePhysics: (scene, id, data) => {
    const sprite = scene.physics.add.sprite(data.x, data.y, 'enemy');
    sprite.setCollideWorldBounds(true);
    return sprite;
  },

  // Client: Create visual sprite
  onCreate: (scene, id, data) => {
    return scene.add.sprite(data.x, data.y, 'enemy');
  },

  // Update sprites every frame
  onUpdate: (sprite, data) => {
    sprite.setPosition(data.x, data.y);
  },

  // Cleanup on destruction
  onDestroy: (sprite) => {
    sprite.destroy();
  }
});
```

#### Configuration

```typescript
interface SpriteManagerConfig {
  stateKey: string;                    // Which state property holds sprites
  onCreate?: (scene, id, data) => Sprite;         // Client sprite creation
  onCreatePhysics?: (scene, id, data) => Sprite;  // Host physics sprite
  onUpdate?: (sprite, data) => void;   // Per-frame updates
  onDestroy?: (sprite) => void;        // Cleanup logic
}
```

#### Use Cases

- Enemy spawning/despawning
- Collectible items
- Projectiles
- Any entities that appear/disappear dynamically

---

### InputManager

Declarative input binding system.

```typescript
const inputManager = adapter.createInputManager();

// Bind keyboard keys
inputManager.bindKeys({
  'W': { action: 'move', input: { y: -1 }, mode: 'continuous' },
  'S': { action: 'move', input: { y: 1 }, mode: 'continuous' },
  'A': { action: 'move', input: { x: -1 }, mode: 'continuous' },
  'D': { action: 'move', input: { x: 1 }, mode: 'continuous' },
  'SPACE': { action: 'jump', input: {}, mode: 'pressed' }
});

// Bind cursor keys
const cursors = this.input.keyboard.createCursorKeys();
inputManager.bindCursors(cursors, {
  horizontal: { action: 'move', speed: 200 },
  vertical: { action: 'move', speed: 200 },
  space: { action: 'jump' }
});

// Use input profiles
import { BUILT_IN_PROFILES } from '@martini/phaser';
inputManager.loadProfile(BUILT_IN_PROFILES.WASD);
```

#### Input Modes

- **`continuous`** - Fires while key is held (movement)
- **`pressed`** - Fires once when key is pressed (jump, shoot)

#### Built-in Profiles

- `WASD` - Standard PC controls
- `ARROWS` - Arrow key controls
- `MOBILE` - Touch controls
- `XBOX` - Gamepad mapping

---

### PhysicsManager

Automates common physics behaviors.

```typescript
const physicsManager = adapter.createPhysicsManager({
  stateKey: 'inputs',

  behaviors: [
    {
      type: 'platformer',
      speed: 200,
      jumpVelocity: -350,
      applyTo: (playerId) => this.players[playerId]
    }
  ]
});
```

#### Built-in Behaviors

**Platformer:**
```typescript
{
  type: 'platformer',
  speed: number,           // Horizontal speed
  jumpVelocity: number,    // Jump strength (negative)
  applyTo: (playerId) => Sprite
}
```

**Top-down:**
```typescript
{
  type: 'top-down',
  speed: number,           // Movement speed
  applyTo: (playerId) => Sprite
}
```

**Custom:**
```typescript
{
  type: 'custom',
  update: (sprite, input, playerId) => {
    // Your physics logic
  }
}
```

---

### CollisionManager

Declarative collision rule system.

```typescript
const collisionManager = adapter.createCollisionManager({
  rules: [
    {
      between: ['player', 'enemy'],
      onCollide: (player, enemy) => {
        runtime.submitAction('damage', { amount: 10 });
      }
    },
    {
      between: [playerSpriteManager, coinSpriteManager],
      onCollide: (player, coin, playerKey, coinKey) => {
        runtime.submitAction('collect', { coinId: coinKey });
      }
    }
  ]
});
```

#### Rule Types

**String-based:**
```typescript
{
  between: ['player', 'platform'],
  onCollide: (a, b) => { }
}
```

**SpriteManager-based:**
```typescript
{
  between: [playerManager, enemyManager],
  onCollide: (playerSprite, enemySprite, playerKey, enemyKey) => { }
}
```

**Group-based:**
```typescript
{
  between: [playerGroup, platformGroup],
  onCollide: (player, platform) => { }
}
```

---

### PlayerUIManager

Manage HUD elements synced to player state.

```typescript
const uiManager = adapter.createPlayerUIManager({
  stateKey: 'players',

  elements: [
    {
      type: 'text',
      property: 'score',
      format: (score) => `Score: ${score}`,
      offset: { x: 0, y: -50 },
      style: { fontSize: '16px', color: '#fff' }
    },
    {
      type: 'bar',
      property: 'health',
      max: 100,
      offset: { x: 0, y: -40 },
      width: 40,
      height: 4,
      fillColor: 0x00ff00,
      bgColor: 0x333333
    }
  ]
});
```

#### Element Types

**Text:**
```typescript
{
  type: 'text',
  property: string,
  format: (value) => string,
  offset: { x: number, y: number },
  style: Phaser.Types.GameObjects.Text.TextStyle
}
```

**Bar (health, mana, etc.):**
```typescript
{
  type: 'bar',
  property: string,
  max: number,
  offset: { x: number, y: number },
  width: number,
  height: number,
  fillColor: number,
  bgColor: number
}
```

---

### InputProfiles

Reusable control schemes.

```typescript
import {
  registerProfile,
  getProfile,
  listProfiles,
  BUILT_IN_PROFILES
} from '@martini/phaser';

// Use built-in profile
const wasd = BUILT_IN_PROFILES.WASD;

// Register custom profile
registerProfile('custom', {
  move: {
    keys: ['W', 'A', 'S', 'D'],
    mode: 'continuous'
  },
  jump: {
    keys: ['SPACE'],
    mode: 'pressed'
  }
});

// Apply profile
inputManager.loadProfile(getProfile('custom'));
```

---

### initializeGame()

High-level entry point that handles platform configuration.

```typescript
import { initializeGame } from '@martini/phaser';

const { runtime, phaser } = initializeGame({
  game: gameDefinition,
  scene: (runtime) => GameScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 800 } }
    }
  }
});
```

#### Configuration

```typescript
interface MartiniConfig {
  game: GameDefinition;
  scene: (runtime: GameRuntime) => typeof Phaser.Scene;
  phaserConfig?: Phaser.Types.Core.GameConfig;
}
```

#### What it does

1. Reads `__MARTINI_CONFIG__` from window (set by platform)
2. Creates appropriate transport (Local, IframeBridge, Trystero)
3. Initializes GameRuntime
4. Creates Phaser game instance
5. Returns both runtime and phaser for advanced use cases

---

## Host vs Client Pattern

The most critical pattern in Martini:

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // HOST: Physics sprites with bodies
    const sprite = this.physics.add.sprite(100, 100, 'player');
    sprite.setCollideWorldBounds(true);
    this.adapter.trackSprite(sprite, `player-${playerId}`);

  } else {
    // CLIENT: Visual-only sprites
    this.adapter.onChange((state) => {
      if (!state._sprites) return;

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.sprites.has(key)) {
          const sprite = this.add.sprite(data.x, data.y, 'player');
          this.adapter.registerRemoteSprite(key, sprite);
          this.sprites.set(key, sprite);
        }
      }
    });
  }
}

update() {
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation();
  }
}
```

<Callout type="warning" title="Critical Rules">

1. **Host** uses `physics.add.*` + `trackSprite()`
2. **Client** uses `add.*` + `registerRemoteSprite()`
3. **Client must** call `updateInterpolation()` in `update()`
4. **Always check** `if (!state._sprites) return` on clients

</Callout>

---

## Shape-Based Games

For games without image assets (common in web IDEs):

```typescript
// HOST: Rectangle with physics
const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
this.physics.add.existing(rect);
const body = rect.body as Phaser.Physics.Arcade.Body;
body.setCollideWorldBounds(true);
this.adapter.trackSprite(rect, `player-${playerId}`);

// CLIENT: Rectangle without physics
const rect = this.add.rectangle(data.x, data.y, 32, 32, 0xff0000);
this.adapter.registerRemoteSprite(key, rect);
```

Shapes work with all helpers (SpriteManager, PhysicsManager, etc.).

---

## Next Steps

- **[Quick Start](/docs/getting-started/quick-start)** - Build your first game
- **[@martini/core API](/docs/api/core)** - Core concepts and runtime
- **[Transports](/docs/api/transports)** - Choose your networking backend

## Examples

See working examples in the demos:
- [Fire & Ice](/preview/fire-and-ice) - Cooperative platformer
- [Blob Battle](/preview/blob-battle) - Competitive agar.io clone
- [Paddle Battle](/preview/paddle-battle) - Pong-style game
