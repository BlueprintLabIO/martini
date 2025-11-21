---
title: Phaser Helpers
description: Utility functions for Phaser integration
---

# Phaser Helpers

Additional helper managers and utilities for Phaser integration.

## Available Helpers

martini-kit provides several helper managers created via `adapter.create*()`:

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

### PlayerHUD

Automatic HUD (Heads-Up Display) with reactive updates for title, role, and controls.

```typescript
import { createPlayerHUD } from '@martini-kit/phaser';

const hud = createPlayerHUD(adapter, this, {
  title: 'My Game',
  roleText: (myPlayer, state) => {
    if (!myPlayer) return 'Spectator';
    // For turn-based games: access full state
    if (state?.gameOver) return 'Game Over!';
    return `Score: ${myPlayer.score}`;
  },
  controlHints: () => 'WASD to move'
});
```

**Features:**
- Automatic reactive updates on state changes
- Turn-based game support with optional `state` parameter
- Backward compatible - works with both action and turn-based games
- No manual `onChange` subscriptions needed

[Full guide →](../../guides/ui-and-hud#using-createplayerhud-helper)

### PlayerUIManager

Automatic per-player health bars and labels for all players.

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

### GridClickHelper

Robust grid/board click handling for turn-based and board games. Solves the common problem where interactive rectangles don't scale properly with the canvas.

```typescript
const gridHelper = adapter.createClickableGrid({
  columns: 7,
  rows: 6,
  cellWidth: 80,
  cellHeight: 80,
  offsetX: 100,
  offsetY: 100,
  onCellClick: (col, row) => {
    runtime.submitAction('dropToken', { col });
  },
  highlightColor: 0xffffff,
  highlightAlpha: 0.15,
  origin: 'bottom-left' // For Connect Four
});
```

**Perfect for:** Connect Four, Chess, Tic-Tac-Toe, Minesweeper, Battleship, Checkers, Go, etc.

[Full docs →](./grid-click-helper)

### CameraFollower

Automatic camera following with smooth tracking modes.

```typescript
const cameraFollower = adapter.createCameraFollower({
  target: 'myPlayer',
  mode: 'lerp',
  lerpFactor: 0.1,
  bounds: { width: 1600, height: 1200 }
});
```

[Full docs →](./camera-manager)

### DirectionalIndicator

Attach arrows/indicators that automatically show sprite direction. **Auto-updates by default** - no manual update() calls needed!

```typescript
import { attachDirectionalIndicator } from '@martini-kit/phaser';

// In SpriteManager onCreate:
onCreate: (key, data) => {
  const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // That's it! Arrow auto-updates every frame
  attachDirectionalIndicator(this, car, {
    shape: 'triangle',  // or 'arrow', 'chevron'
    offset: 20,         // distance from sprite
    color: 0xffffff     // white
    // autoUpdate: true (default)
  });

  return car;
}
```

**Shapes:**
- `triangle` - Classic arrow (default)
- `arrow` - Longer arrow with tail
- `chevron` - V-shaped chevron

**Pit of Success:** Automatically handles Phaser rotation offsets and cleans up when sprite/scene is destroyed.

[Full guide →](../../guides/sprite-attachments)

## Sprite Attachment System

The [SpriteAttachment system](./sprite-attachment) provides a generic foundation for creating auto-updating sprite attachments (arrows, health bars, name tags, etc.).

```typescript
import { createSpriteAttachment } from '@martini-kit/phaser';

function createGlowEffect(scene: Phaser.Scene, sprite: any) {
  const glow = scene.add.circle(sprite.x, sprite.y, 40, 0xffff00, 0.3);

  return createSpriteAttachment(scene, sprite, {
    update: () => {
      glow.setPosition(sprite.x, sprite.y);
      const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
      glow.setScale(scale);
    },
    destroy: () => glow.destroy()
  });
  // Auto-updates and auto-destroys!
}
```

**Built on this system:**
- `attachDirectionalIndicator` - Direction arrows
- `createHealthBar` (coming soon) - Health bars
- `createNameTag` (coming soon) - Name labels

[Full API docs →](./sprite-attachment)

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
