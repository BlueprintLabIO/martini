---
title: Physics Synchronization
description: Syncing Phaser physics across network
---

# Physics Synchronization

Phaser physics synchronization in martini-kit is **automatic** when you use `SpriteManager` with `onCreatePhysics`.

## How It Works

1. **Host:** Runs physics simulation, sprite positions update
2. **SpriteManager:** Automatically syncs sprite properties (`x`, `y`, `rotation`, etc.) to state
3. **Clients:** Receive state updates, interpolate sprite movement

## Example

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => {
    return this.add.sprite(data.x, data.y, 'player');
  },

  // Physics runs on HOST ONLY
  onCreatePhysics: (sprite) => {
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setBounce(0.2);
  },

  // Automatic sync (default)
  sync: {
    properties: ['x', 'y', 'rotation', 'velocityX', 'velocityY'],
    interval: 50  // 20 FPS
  }
});
```

## Best Practices

### ✅ Do

- **Run physics on host only** - Use `onCreatePhysics`
- **Let SpriteManager handle sync** - Automatic
- **Enable interpolation** - Smooth client movement (default: on)
- **Sync minimal properties** - Only what's needed

### ❌ Don't

- **Don't run physics on clients** - Host authoritative
- **Don't manually sync physics** - Use SpriteManager
- **Don't sync every property** - Bandwidth waste

## See Also

- [SpriteManager](./sprite-manager) - Automatic sprite sync
- [PhaserAdapter](./adapter) - Main adapter API
