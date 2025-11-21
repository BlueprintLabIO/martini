# @martini-kit/phaser

**Multiplayer without networking.**

Phaser 3 adapter for martini-kit that automatically syncs sprites, physics, and game state across clients with zero networking code.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/BlueprintLabIO/martini/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@martini-kit/phaser)](https://www.npmjs.com/package/@martini-kit/phaser)

## Features

- **Automatic sprite synchronization** - Just create sprites normally, they sync automatically
- **Physics integration** - Use Phaser's physics engine (Arcade, Matter) - syncs automatically
- **Input helpers** - Pre-built player movement patterns (platformer, top-down, racing)
- **Collision management** - Define collision rules declaratively
- **UI helpers** - Health bars, player labels, HUD elements
- **Camera management** - Smooth camera following with configurable behaviors

## Installation

```bash
npm install @martini-kit/phaser @martini-kit/core phaser
```

## Quick Start

```typescript
import { defineGame } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import Phaser from 'phaser';

// Define your game logic
const game = defineGame({
  initialState: { players: {} },

  actions: {
    move: (state, { playerId, x, y }) => {
      state.players[playerId] = { x, y };
    }
  }
});

// Create Phaser scene with automatic sync
class GameScene extends Phaser.Scene {
  adapter!: PhaserAdapter;

  create() {
    // Initialize adapter - handles all networking
    this.adapter = new PhaserAdapter(this, runtime);

    // Create sprites normally - they sync automatically!
    runtime.onPlayerJoin((playerId) => {
      const sprite = this.physics.add.sprite(100, 100, 'player');
      this.adapter.trackSprite(playerId, sprite);
    });

    // Handle input
    this.input.on('pointermove', (pointer) => {
      runtime.dispatchAction('move', {
        x: pointer.x,
        y: pointer.y
      });
    });
  }

  update() {
    // Sprites automatically update from state - no manual sync needed!
    this.adapter.syncSprites((playerId) => runtime.state.players[playerId]);
  }
}
```

## Key Concepts

### Automatic Sprite Tracking

The adapter automatically tracks sprite properties and syncs them across clients:

```typescript
// Host: Create and move sprite with physics
const sprite = this.physics.add.sprite(100, 100, 'player');
sprite.setVelocityX(200);

// Client: Sprite automatically mirrors the position/rotation - no code needed!
```

### Input Helpers

Pre-built movement patterns for common game types:

```typescript
import { InputManager } from '@martini-kit/phaser';

const inputManager = new InputManager(this, runtime, {
  profile: 'platformer', // or 'top-down', 'racing', 'twin-stick'
  speed: 200,
  jumpForce: 400
});

// Automatically handles WASD/Arrow keys and dispatches actions
```

### Physics Integration

Use Phaser's physics normally - the adapter syncs the results:

```typescript
// Host: Real physics simulation
this.physics.add.collider(player, platforms);
player.setVelocityX(200);

// Client: Sees the result automatically
// No physics simulation needed on client side
```

## Documentation

- [Full Documentation](https://github.com/BlueprintLabIO/martini)
- [API Reference](https://github.com/BlueprintLabIO/martini/tree/main/docs)
- [Examples](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos)

## Advanced Features

### Collision Management

```typescript
import { CollisionManager } from '@martini-kit/phaser';

const collisionManager = new CollisionManager(this, runtime, {
  rules: [
    { group1: 'players', group2: 'enemies', action: 'damage' },
    { group1: 'players', group2: 'platforms', action: 'collide' }
  ]
});
```

### Health Bars

```typescript
import { HealthBarManager } from '@martini-kit/phaser';

const healthBars = new HealthBarManager(this, {
  width: 50,
  height: 6,
  offsetY: -30
});

healthBars.attach(sprite, playerId);
```

### Camera Following

```typescript
import { createCameraFollower } from '@martini-kit/phaser';

const follower = createCameraFollower(this, {
  lerp: 0.1,
  deadzone: { width: 200, height: 200 }
});

follower.follow(playerSprite);
```

## License

Apache-2.0 © Blueprint Lab

## Links

- [GitHub Repository](https://github.com/BlueprintLabIO/martini)
- [Report Issues](https://github.com/BlueprintLabIO/martini/issues)
- [NPM Package](https://www.npmjs.com/package/@martini-kit/phaser)
