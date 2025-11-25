---
title: Grid Collision Manager
description: Smooth movement with grid-aligned collision checks.
section: api
subsection: phaser
order: 11
---

# Grid Collision Manager

Smooth, pixel-based movement that still respects a grid for collisions. Ideal for Zelda/modern Bomberman-style movement where players are not locked to cell centers.

## When to Use
- Movement is freeform/smooth, but obstacles live on a grid.
- You need diagonal movement normalization.
- You want simple collision checks per grid cell.

## Quick Start

```ts
import { createGridCollisionManager } from '@martini-kit/phaser';

// scene.create()
this.gridCollision = this.adapter.createGridCollisionManager({
  tileSize: 52,
  gridWidth: 13,
  gridHeight: 13,
  collisionCheck: (gridX, gridY) =>
    state.blocks.some((b) => b.x === gridX && b.y === gridY),
  baseSpeed: 150,
  normalizeDiagonal: true,
  debug: false
});

// in tick action
forEachPlayerInput(state, (player, input) => {
  this.gridCollision.moveEntity(player, input, delta);
});
```

## Key Options
- `tileSize`, `gridWidth`, `gridHeight`: grid dimensions.
- `collisionCheck(gridX, gridY)`: return `true` if blocked (include bombs/enemies too).
- `baseSpeed`: pixels/sec (default `150`).
- `normalizeDiagonal`: keep diagonal speed consistent (default `true`).
- `debug`: renders grid + collision cells; `debugColor` to tweak color.

## Helpers
- `worldToGrid(x, y)` / `gridToWorld(gridX, gridY)`
- `snapToGrid(entity)`
- `isWalkable(gridX, gridY)`
- `getEntityGridPosition(entity)`
- `destroy()` to clean up debug graphics

## Choose the Right Manager
- **Use this** for smooth movement with grid collisions (Zelda).
- **Use [Grid Locked Movement Manager](./grid-locked-movement-manager)** for cell-to-cell committed movement (Bomberman classic, Pacman, Sokoban). 
