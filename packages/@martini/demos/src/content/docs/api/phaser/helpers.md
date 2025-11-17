---
title: Phaser Helpers
description: Utility functions for Phaser integration
---

# Phaser Helpers

Additional helper managers and utilities for Phaser integration.

## Available Helpers

Martini provides several helper managers created via `adapter.create*()`:

### SpriteManager

Automatic sprite synchronization and lifecycle management.

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),
  onCreatePhysics: (sprite) => this.physics.add.existing(sprite)
});
```

[Full docs →](./sprite-manager)

### InputManager

Simplified keyboard and pointer input handling.

```typescript
const inputManager = adapter.createInputManager();
inputManager.loadProfile('platformer');
```

[Full docs →](./input-manager)

### PlayerUIManager

Automatic health bars and player labels (coming soon).

### CollisionManager

Simplified collision detection setup (coming soon).

### PhysicsManager

Advanced physics configuration (coming soon).

### StateDrivenSpawner

Spawns sprites based on state arrays (for bullets, enemies, etc.).

```typescript
const spawner = adapter.createStateDrivenSpawner({
  stateKey: 'projectiles',
  onCreate: (data) => this.add.sprite(data.x, data.y, 'bullet'),
  onUpdate: (sprite, data) => {
    sprite.x = data.x;
    sprite.y = data.y;
  }
});
```

### HealthBarManager

Automatic health bars above sprites.

```typescript
const healthBars = adapter.createHealthBarManager({
  getHealth: (data) => data.health,
  getMaxHealth: (data) => 100,
  offset: { y: -40 }
});
```

## Creating Custom Helpers

You can create your own helpers that integrate with the adapter:

```typescript
export class CustomHelper {
  constructor(
    private adapter: PhaserAdapter,
    private scene: Phaser.Scene
  ) {
    // Setup
  }

  // Your methods
  update() {
    // Called in scene.update()
  }

  destroy() {
    // Cleanup
  }
}

// Usage
const helper = new CustomHelper(adapter, this);
```

## Best Practices

### ✅ Do

- **Use built-in helpers** - Less boilerplate
- **Create helpers in `scene.create()`** - Proper lifecycle
- **Call `destroy()` on shutdown** - Cleanup
- **Use helper methods** - `adapter.create*()`

### ❌ Don't

- **Don't create helpers globally** - Scene-specific
- **Don't forget cleanup** - Memory leaks
- **Don't reinvent the wheel** - Use helpers when available

## See Also

- [PhaserAdapter](./adapter) - Main adapter API
- [SpriteManager](./sprite-manager) - Sprite sync
- [InputManager](./input-manager) - Input handling
