---
title: Sprite Attachments
description: How to attach indicators, arrows, and other UI elements to sprites
---

# Sprite Attachments

Sprite attachments are UI elements that follow and stick to sprites - like directional arrows, health bars, name tags, or custom indicators.

## The Pit of Success Pattern

martini-kit's attachment helpers follow a **"pit of success"** design:

✅ **Auto-update by default** - No manual update() calls needed
✅ **Auto-cleanup** - Destroys when sprite/scene is destroyed
✅ **Zero boilerplate** - Just attach and forget

## Directional Indicators

Show which direction a sprite is facing with an arrow or indicator.

### Basic Usage (Auto-Update)

```typescript
import { attachDirectionalIndicator } from '@martini-kit/phaser';

// In SpriteManager onCreate:
onCreate: (key, data) => {
  const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // That's it! Arrow auto-updates every frame
  attachDirectionalIndicator(this, car, {
    shape: 'triangle',
    offset: 20,
    color: 0xffffff
  });

  return car;
}
```

**How it works:**
1. The indicator subscribes to the scene's `update` event
2. Every frame, it recalculates position/rotation based on the sprite
3. When the sprite or scene is destroyed, it auto-cleans up

### Available Shapes

#### Triangle (Default)
Classic arrow pointer - best for compact indicators.

```typescript
attachDirectionalIndicator(this, sprite, {
  shape: 'triangle',
  offset: 20,
  color: 0xffffff
});
```

#### Arrow
Longer arrow with distinct head and tail - best for visibility.

```typescript
attachDirectionalIndicator(this, sprite, {
  shape: 'arrow',
  offset: 30,
  color: 0xff00ff,
  size: 1.5  // Make it larger
});
```

#### Chevron
V-shaped indicator - best for minimalist design.

```typescript
attachDirectionalIndicator(this, sprite, {
  shape: 'chevron',
  offset: 25,
  color: 0x00ff00
});
```

### Configuration Options

```typescript
interface DirectionalIndicatorConfig {
  // Shape type
  shape?: 'triangle' | 'arrow' | 'chevron';  // default: 'triangle'

  // Distance from sprite center
  offset?: number;  // default: 20

  // Indicator color (hex)
  color?: number;   // default: 0xffffff (white)

  // Scale/size multiplier
  size?: number;    // default: 1.0

  // Z-depth for layering
  depth?: number;

  // Auto-update every frame (recommended)
  autoUpdate?: boolean;  // default: true
}
```

### Manual Update Mode

For advanced use cases where you need fine control over when updates happen:

```typescript
onCreate: (key, data) => {
  const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // Store indicator reference with autoUpdate disabled
  car.directionArrow = attachDirectionalIndicator(this, car, {
    shape: 'triangle',
    offset: 20,
    color: 0xffffff,
    autoUpdate: false  // Disable automatic updates
  });

  return car;
}

// Then in your scene's update loop:
update() {
  for (const [, sprite] of this.spriteManager.getAll()) {
    if (sprite.directionArrow) {
      sprite.directionArrow.update();
    }
  }
}
```

**Note:** SpriteManager also provides a fallback for manual mode if you store the update function as `_updateArrow`:

```typescript
onAdd: (sprite) => {
  sprite._updateArrow = () => sprite.directionArrow?.update();
}
```

## Phaser Rotation Convention

Understanding Phaser's rotation system helps when working with directional indicators.

### Rotation Values

Phaser uses radians where:
- `0` = pointing **RIGHT** (positive X axis)
- `Math.PI/2` = pointing **DOWN** (positive Y axis)
- `Math.PI` = pointing **LEFT** (negative X axis)
- `-Math.PI/2` or `3*Math.PI/2` = pointing **UP** (negative Y axis)

### Automatic Offset Handling

The `attachDirectionalIndicator` helper automatically adds a `π/2` (90°) rotation offset because:

1. Triangle shapes naturally point **UP** (negative Y) at rotation 0
2. Phaser's 0 rotation points **RIGHT** (positive X)
3. We add +90° to align them

**You don't need to think about this!** The helper handles it automatically.

## Advanced Patterns

### Per-Player Colors

```typescript
onCreate: (key, data) => {
  const sprite = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // Use player color for the arrow
  attachDirectionalIndicator(this, sprite, {
    shape: 'arrow',
    offset: 25,
    color: data.color,  // Match player color
    depth: 100  // Render on top
  });

  return sprite;
}
```

### Conditional Indicators

Only show arrows for certain players:

```typescript
onCreate: (key, data) => {
  const sprite = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // Only show arrow for the local player
  if (key === `player-${this.adapter.getMyPlayerId()}`) {
    attachDirectionalIndicator(this, sprite, {
      shape: 'triangle',
      offset: 20,
      color: 0xffff00  // Yellow for "you"
    });
  }

  return sprite;
}
```

### Multiple Indicators

Attach multiple indicators to the same sprite:

```typescript
onCreate: (key, data) => {
  const sprite = this.add.rectangle(data.x, data.y, 30, 20, data.color);

  // Front arrow
  attachDirectionalIndicator(this, sprite, {
    shape: 'triangle',
    offset: 25,
    color: 0xffffff
  });

  // Rear indicator (opposite direction)
  const rearIndicator = this.add.triangle(
    sprite.x, sprite.y,
    0, 5, -4, -5, 4, -5,
    0xff0000
  );
  rearIndicator.setOrigin(0.5);

  // Manual update for rear indicator
  sprite._updateRear = () => {
    const rearX = sprite.x - Math.cos(sprite.rotation) * 25;
    const rearY = sprite.y - Math.sin(sprite.rotation) * 25;
    rearIndicator.setPosition(rearX, rearY);
    rearIndicator.setRotation(sprite.rotation + Math.PI / 2);
  };

  return sprite;
}
```

## Best Practices

### ✅ Do

- **Use auto-update (default)** - It's the pit of success!
- **Attach in onCreate** - Ensures proper lifecycle
- **Trust auto-cleanup** - The helper handles sprite/scene destruction
- **Use appropriate shapes** - Triangle for compact, arrow for visibility
- **Set proper depth** - Ensure indicators render on top

### ❌ Don't

- **Don't disable autoUpdate** unless you have a specific reason
- **Don't manually manage cleanup** - The helper does it for you
- **Don't forget rotation offsets** - The helper handles this automatically
- **Don't create indicators in update()** - Too expensive, create once in onCreate

## Performance Considerations

### Auto-Update Performance

The auto-update feature uses Phaser's scene event system, which is highly optimized. Each indicator adds one event listener.

**Cost per indicator:**
- ~0.1ms per 100 indicators on modern hardware
- Negligible for typical games (&lt; 50 sprites)

### When to Use Manual Mode

Consider manual mode (`autoUpdate: false`) only if:

1. You have **hundreds** of sprites with indicators
2. You want to **batch** updates for optimization
3. You need **conditional** updates (e.g., only when sprite moves)

For most games, **auto-update is the right choice**.

## Troubleshooting

### Arrow Not Moving

**Problem:** Arrow stays at spawn position.

**Solution:** Ensure you're using the default `autoUpdate: true` or calling `update()` manually:

```typescript
// ✅ Good (auto-update)
attachDirectionalIndicator(this, sprite, { ... });

// ✅ Good (manual update)
sprite.arrow = attachDirectionalIndicator(this, sprite, {
  ...,
  autoUpdate: false
});

// In update():
sprite.arrow.update();

// ❌ Bad (no update calls)
attachDirectionalIndicator(this, sprite, {
  ...,
  autoUpdate: false
});
// Arrow created but never updated!
```

### Wrong Rotation Offset

**Problem:** Arrow points in the wrong direction (e.g., 90° off).

**Solution:** The helper automatically handles rotation offsets. If you're seeing issues:

1. Check that your sprite's rotation is in **radians** (not degrees)
2. Ensure you're not manually adding rotation offsets
3. Verify sprite.rotation reflects the correct direction

```typescript
// ✅ Good
sprite.rotation = Math.atan2(dy, dx);  // radians

// ❌ Bad
sprite.rotation = angle * (Math.PI / 180);  // manual conversion
sprite.rotation += Math.PI / 2;  // manual offset (don't do this!)
```

### Memory Leaks

**Problem:** Indicators persist after scene change.

**Solution:** The helper auto-cleans up on sprite/scene destroy. If you see leaks:

1. Ensure you're using `autoUpdate: true`
2. Don't call `scene.events.off()` on shutdown - the helper does this
3. If using manual mode, call `indicator.destroy()` explicitly

## Creating Custom Attachments (Advanced)

For building your own attachment types, see the [SpriteAttachment API reference](/docs/latest/api/phaser/sprite-attachment) which provides:

- Generic `createSpriteAttachment()` function
- `createSpriteAttachments()` for multiple attachments
- `createCompositeAttachment()` for complex multi-element attachments
- Full TypeScript types and interfaces
- Performance optimization patterns

## See Also

- [SpriteAttachment API](/docs/latest/api/phaser/sprite-attachment) - Generic attachment system
- [Phaser Helpers](/docs/latest/api/phaser/helpers) - All available helpers
- [SpriteManager](/docs/latest/api/phaser/sprite-manager) - Sprite lifecycle management
- [UI and HUD Guide](./ui-and-hud) - General UI patterns
