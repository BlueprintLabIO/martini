---
title: Animation Synchronization
description: Syncing sprite animations across network
---

# Animation Synchronization

Sprite animations can be synchronized across the network by treating animation state as part of your game state.

## Approach 1: State-Driven Animations

Store animation name in state, update sprite in `onUpdate`:

```typescript
interface PlayerData extends SpriteData {
  x: number;
  y: number;
  animation: string;  // Current animation name
}

const manager = adapter.createSpriteManager<PlayerData>({
  onCreate: (key, data) => {
    const sprite = this.add.sprite(data.x, data.y, 'player');

    // Create animations
    sprite.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    sprite.anims.create({
      key: 'idle',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 1
    });

    return sprite;
  },

  onUpdate: (sprite, data) => {
    // Sync animation
    if (sprite.anims.currentAnim?.key !== data.animation) {
      sprite.anims.play(data.animation, true);
    }
  }
});

// In your game logic (host only):
runtime.submitAction('setAnimation', { animation: 'walk' }, playerId);
```

## Approach 2: Event-Based Animations

Use events for animation triggers:

```typescript
// Host: Broadcast animation change
adapter.broadcast('playAnimation', {
  playerId: 'player-1',
  animation: 'attack'
});

// Both host and clients: Listen and play
adapter.on('playAnimation', (senderId, payload) => {
  const sprite = manager.get(payload.playerId);
  if (sprite) {
    sprite.anims.play(payload.animation);
  }
});
```

## Best Practices

### ✅ Do

- **Use state for persistent animations** - Walk, idle, etc.
- **Use events for one-shot animations** - Attack, jump, etc.
- **Check current animation** - Avoid replaying same animation
- **Use `onUpdate` for syncing** - Automatic on state changes

### ❌ Don't

- **Don't sync animation frame** - Too much bandwidth
- **Don't forget `true` parameter** - `play(key, true)` ignores if already playing
- **Don't sync cosmetic animations** - Client-side only

## See Also

- [SpriteManager](./sprite-manager) - Sprite management
- [PhaserAdapter](./adapter) - Event system
