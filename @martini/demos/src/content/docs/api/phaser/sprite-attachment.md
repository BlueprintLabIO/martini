---
title: Sprite Attachment System
description: Generic system for attaching auto-updating components to sprites
---

# Sprite Attachment System

The `SpriteAttachment` system provides a unified, type-safe foundation for all sprite attachments in martini-kit - including directional arrows, health bars, name tags, and custom indicators.

## Why Use SpriteAttachment?

**Pit of Success Design:**
- ✅ **Auto-update by default** - No manual update() calls needed
- ✅ **Auto-cleanup** - Destroys when sprite/scene is destroyed
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Reusable** - One pattern for all attachment types
- ✅ **Efficient** - Uses Phaser's event system

## Core Interface

Every sprite attachment implements this simple interface:

```typescript
interface SpriteAttachment {
  update: () => void;   // Called every frame (if autoUpdate: true)
  destroy: () => void;  // Called when sprite/scene is destroyed
  getGameObject?: () => Phaser.GameObjects.GameObject | null;
}
```

## Basic Usage

### Creating a Custom Attachment

```typescript
import { createSpriteAttachment } from '@martini-kit/phaser';

function createGlowEffect(
  scene: Phaser.Scene,
  sprite: any,
  color: number = 0xffff00
) {
  // Create visual element
  const glow = scene.add.circle(sprite.x, sprite.y, 40, color, 0.3);

  // Wrap in attachment system - auto-updates and auto-destroys!
  return createSpriteAttachment(scene, sprite, {
    update: () => {
      // Follow sprite position
      glow.setPosition(sprite.x, sprite.y);

      // Pulse effect
      const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
      glow.setScale(scale);
    },
    destroy: () => {
      glow.destroy();
    },
    getGameObject: () => glow
  });
}

// Usage in SpriteManager:
onCreate: (key, data) => {
  const sprite = this.add.sprite(data.x, data.y, 'player');

  // Attach glow - auto-updates every frame!
  createGlowEffect(this, sprite);

  return sprite;
}
```

**That's it!** The glow will:
- Update every frame automatically
- Destroy when sprite is destroyed
- Destroy when scene shuts down
- Never cause memory leaks

### Manual Update Mode

For advanced use cases where you need fine control:

```typescript
const attachment = createSpriteAttachment(scene, sprite, {
  update: () => { ... },
  destroy: () => { ... }
}, {
  autoUpdate: false  // Disable automatic updates
});

// Then in your scene's update loop:
update() {
  attachment.update();
}
```

## Built-in Attachments

martini-kit provides several pre-built attachments that use this system:

### DirectionalIndicator

Shows which direction a sprite is facing.

```typescript
import { attachDirectionalIndicator } from '@martini-kit/phaser';

onCreate: (key, data) => {
  const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  attachDirectionalIndicator(this, car, {
    shape: 'triangle',
    offset: 20,
    color: 0xffffff
  });

  return car;
}
```

[Full docs →](./helpers#directionalindicator)

### HealthBar (Coming Soon)

Auto-updating health bar above sprites.

```typescript
import { createHealthBar } from '@martini-kit/phaser';

createHealthBar(scene, sprite, {
  maxHealth: 100,
  currentHealth: 75,
  offset: { y: -40 }
});
```

### NameTag (Coming Soon)

Text label that follows sprites.

```typescript
import { createNameTag } from '@martini-kit/phaser';

createNameTag(scene, sprite, {
  text: 'Player 1',
  offset: { y: -50 },
  style: { fontSize: '16px', color: '#fff' }
});
```

## Advanced Patterns

### Multiple Attachments

Attach several components to the same sprite:

```typescript
import { createSpriteAttachments } from '@martini-kit/phaser';

onCreate: (key, data) => {
  const sprite = this.add.sprite(data.x, data.y, 'player');

  // Attach multiple components at once
  createSpriteAttachments(this, sprite, [
    createDirectionalArrow(this, sprite),
    createHealthBar(this, sprite, { maxHealth: 100 }),
    createNameTag(this, sprite, { text: data.name })
  ]);

  return sprite;
}
```

### Composite Attachments

Combine multiple visual elements into one attachment:

```typescript
import { createCompositeAttachment } from '@martini-kit/phaser';

function createPlayerIndicator(scene: Phaser.Scene, sprite: any) {
  // Create multiple visual elements
  const arrow = scene.add.triangle(...);
  const glow = scene.add.circle(...);
  const label = scene.add.text(...);

  // Combine into composite - all update/destroy together
  return createCompositeAttachment(scene, sprite, [
    {
      update: () => {
        arrow.setPosition(sprite.x, sprite.y - 30);
        arrow.setRotation(sprite.rotation);
      },
      destroy: () => arrow.destroy()
    },
    {
      update: () => {
        glow.setPosition(sprite.x, sprite.y);
        glow.setScale(1 + Math.sin(Date.now() / 200) * 0.1);
      },
      destroy: () => glow.destroy()
    },
    {
      update: () => {
        label.setPosition(sprite.x, sprite.y + 40);
      },
      destroy: () => label.destroy()
    }
  ]);
}
```

### Conditional Updates

Only update when certain conditions are met:

```typescript
function createConditionalAttachment(
  scene: Phaser.Scene,
  sprite: any,
  shouldUpdate: () => boolean
) {
  const circle = scene.add.circle(sprite.x, sprite.y, 10, 0xff0000);

  return createSpriteAttachment(scene, sprite, {
    update: () => {
      // Only update if condition is true
      if (shouldUpdate()) {
        circle.setPosition(sprite.x + 20, sprite.y);
        circle.setVisible(true);
      } else {
        circle.setVisible(false);
      }
    },
    destroy: () => circle.destroy()
  });
}

// Usage:
createConditionalAttachment(
  this,
  sprite,
  () => this.adapter.getMyPlayerId() === playerId  // Only show for local player
);
```

### State-Driven Attachments

React to game state changes:

```typescript
function createStateIndicator(
  scene: Phaser.Scene,
  sprite: any,
  runtime: GameRuntime,
  playerId: string
) {
  const indicator = scene.add.circle(sprite.x, sprite.y, 15, 0x00ff00);

  return createSpriteAttachment(scene, sprite, {
    update: () => {
      const state = runtime.getState();
      const player = state.players[playerId];

      // Update position
      indicator.setPosition(sprite.x, sprite.y - 30);

      // Change color based on state
      if (player?.isPoweredUp) {
        indicator.setFillStyle(0xffff00);  // Yellow when powered up
      } else if (player?.isInvulnerable) {
        indicator.setFillStyle(0x00ffff);  // Cyan when invulnerable
      } else {
        indicator.setFillStyle(0x00ff00);  // Green normally
      }
    },
    destroy: () => indicator.destroy()
  });
}
```

### Performance-Optimized Updates

Throttle updates for expensive operations:

```typescript
function createThrottledAttachment(
  scene: Phaser.Scene,
  sprite: any,
  updateIntervalMs: number = 100
) {
  const visual = scene.add.graphics();
  let lastUpdate = 0;

  return createSpriteAttachment(scene, sprite, {
    update: () => {
      const now = Date.now();

      // Only update every N milliseconds
      if (now - lastUpdate < updateIntervalMs) {
        return;
      }
      lastUpdate = now;

      // Expensive operation (e.g., complex graphics rendering)
      visual.clear();
      visual.lineStyle(2, 0xff0000);
      visual.strokeCircle(sprite.x, sprite.y, 50);
      // ... more expensive operations
    },
    destroy: () => visual.destroy()
  });
}
```

## Creating Reusable Attachment Helpers

Package your attachments as reusable functions:

```typescript
// my-game/attachments/createPowerUpGlow.ts
import { createSpriteAttachment, type SpriteAttachment } from '@martini-kit/phaser';

export interface PowerUpGlowConfig {
  color?: number;
  radius?: number;
  pulseSpeed?: number;
}

export function createPowerUpGlow(
  scene: Phaser.Scene,
  sprite: any,
  config: PowerUpGlowConfig = {}
): SpriteAttachment {
  const color = config.color ?? 0xffff00;
  const radius = config.radius ?? 40;
  const pulseSpeed = config.pulseSpeed ?? 200;

  const glow = scene.add.circle(sprite.x, sprite.y, radius, color, 0.4);
  glow.setBlendMode(Phaser.BlendModes.ADD);

  return createSpriteAttachment(scene, sprite, {
    update: () => {
      glow.setPosition(sprite.x, sprite.y);
      const scale = 1 + Math.sin(Date.now() / pulseSpeed) * 0.2;
      glow.setScale(scale);
    },
    destroy: () => glow.destroy(),
    getGameObject: () => glow
  });
}

// Usage across your game:
import { createPowerUpGlow } from './attachments/createPowerUpGlow';

onCreate: (key, data) => {
  const sprite = this.add.sprite(data.x, data.y, 'player');

  if (data.hasPowerUp) {
    createPowerUpGlow(this, sprite, {
      color: 0xff00ff,
      pulseSpeed: 150
    });
  }

  return sprite;
}
```

## API Reference

### createSpriteAttachment

Creates a sprite attachment with automatic lifecycle management.

```typescript
function createSpriteAttachment(
  scene: Phaser.Scene,
  sprite: any,
  attachment: SpriteAttachment,
  config?: SpriteAttachmentConfig
): SpriteAttachment
```

**Parameters:**
- `scene` - Phaser scene instance
- `sprite` - Sprite to attach to
- `attachment` - Attachment implementation (update + destroy functions)
- `config` - Optional configuration
  - `autoUpdate?: boolean` - Enable automatic updates (default: `true`)

**Returns:** Enhanced attachment with lifecycle management

### createSpriteAttachments

Creates multiple attachments at once.

```typescript
function createSpriteAttachments(
  scene: Phaser.Scene,
  sprite: any,
  attachments: SpriteAttachment[],
  config?: SpriteAttachmentConfig
): SpriteAttachment[]
```

### createCompositeAttachment

Combines multiple child attachments into one.

```typescript
function createCompositeAttachment(
  scene: Phaser.Scene,
  sprite: any,
  children: SpriteAttachment[],
  config?: SpriteAttachmentConfig
): SpriteAttachment
```

## Best Practices

### ✅ Do

- **Use autoUpdate (default)** - It's the pit of success
- **Attach in onCreate/onAdd** - Ensures proper lifecycle
- **Package as reusable helpers** - DRY principle
- **Keep update() fast** - Called every frame
- **Use composite for complex attachments** - Better organization
- **Leverage TypeScript** - Type-safe configs

### ❌ Don't

- **Don't disable autoUpdate** unless you have a specific reason
- **Don't create attachments in update()** - Too expensive
- **Don't forget destroy cleanup** - Always destroy visual elements
- **Don't call update() manually with autoUpdate: true** - Redundant
- **Don't use setInterval/setTimeout** - Use scene events instead

## Performance Considerations

### Memory Usage

Each attachment with `autoUpdate: true` adds:
- 1 event listener on `scene.events`
- 1 event listener on `sprite` (for destroy)
- Minimal overhead (~100 bytes per attachment)

**Rule of thumb:** &lt; 100 attachments = negligible performance impact

### Update Performance

The `update()` function is called **every frame** (60 fps).

**Keep it fast:**
```typescript
// ✅ Good - simple position update
update: () => {
  circle.setPosition(sprite.x + 10, sprite.y - 20);
}

// ❌ Bad - expensive every frame
update: () => {
  // Complex physics calculations
  // Network requests
  // Heavy graphics rendering
}
```

**For expensive operations**, use throttling or conditional updates (see examples above).

### Cleanup Performance

Cleanup is automatic and efficient:
- Event listeners removed immediately
- Visual elements destroyed via Phaser's pooling
- No manual tracking required

## Troubleshooting

### Attachment Not Updating

**Problem:** Visual element doesn't follow sprite.

**Solutions:**
1. Ensure `autoUpdate: true` (default)
2. Check that `update()` is implemented
3. Verify sprite has valid x/y properties

```typescript
// Debug: Log to verify updates
update: () => {
  console.log('Updating attachment', sprite.x, sprite.y);
  visual.setPosition(sprite.x, sprite.y);
}
```

### Memory Leak

**Problem:** Attachments persist after scene change.

**Solutions:**
1. Use `autoUpdate: true` for automatic cleanup
2. If using manual mode, call `destroy()` explicitly
3. Don't prevent sprite destroy events

```typescript
// ✅ Good - auto-cleanup
createSpriteAttachment(scene, sprite, { ... });

// ❌ Bad - manual cleanup required
const attachment = createSpriteAttachment(scene, sprite, { ... }, { autoUpdate: false });
// Must call attachment.destroy() manually!
```

### Double Destroy Error

**Problem:** "Cannot read property of null" on scene change.

**Solution:** The system prevents double-destroy automatically. If you see this:
1. Don't call `destroy()` manually with autoUpdate: true
2. Don't override sprite's destroy event

## See Also

- [Directional Indicator](./helpers#directionalindicator) - Built-in arrow attachment
- [Sprite Manager](./sprite-manager) - Sprite lifecycle management
- [Phaser Helpers](./helpers) - All available helpers
