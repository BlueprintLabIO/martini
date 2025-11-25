---
title: Collectible Manager
description: Host-only collision detection and feedback for pickups.
section: api
subsection: phaser
order: 15
---

# Collectible Manager

Automatic collision detection and feedback for pickups. Runs **host-only** by default to avoid desyncs.

## When to Use
- Grid or continuous collectibles (powerups, coins, health packs).
- Want collision handled centrally on host without manual loops.
- Need quick feedback (popups/particles/sound) when collected.

## Quick Start (Grid Powerups)

```ts
import { createCollectibleManager } from '@martini-kit/phaser';

// scene.create()
this.collectibles = createCollectibleManager(this.adapter, this, {
  powerup: {
    stateKey: 'powerups',
    collectAction: 'collectPowerup',
    getPosition: (p) => ({ x: p.x * TILE_SIZE, y: p.y * TILE_SIZE }),
    getPlayerPosition: (player) => ({
      x: player.x - TILE_SIZE / 2,
      y: player.y - TILE_SIZE / 2
    }),
    radius: TILE_SIZE,          // size of a grid cell
    collisionType: 'grid',      // or 'continuous'
    idField: 'id',
    onCollect: (item) => ({     // optional client-side feedback
      popup: `+${item.type.toUpperCase()}!`,
      particle: 'sparkle'
    })
  }
});

// In update() on host
this.collectibles.update();
```

## Key Options
- `stateKey`: state array containing collectibles.
- `collectAction`: action to submit when collected.
- `getPosition(item)`: return `{ x, y }` world position.
- `radius`: collision radius (in world units).
- `collisionType`: `'grid'` (cell match) or `'continuous'` (distance check).
- `getPlayerPosition(player)?`: override player position (default uses `player.x/y`).
- `idField`: defaults to `id`.
- `onCollect(item, scene)?`: returns `{ popup?, sound?, particle? }` for local feedback.

## Behavior
- **Host-only collision**: early return on clients to prevent double-processing.
- Clients can still optimistically submit `collectAction`—host validates.
- Optional feedback runs locally (no network dependency).

## Tips
- Use `createMultiCollisionCheck` in your game logic if collectibles should respect walls/obstacles.
- For continuous worlds, set `collisionType: 'continuous'` and use a tighter `radius`.
- Call `destroy()` during scene cleanup if you create multiple scenes. 
