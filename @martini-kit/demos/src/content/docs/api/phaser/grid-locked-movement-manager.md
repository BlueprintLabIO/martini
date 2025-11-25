---
title: Grid Locked Movement Manager
description: Cell-to-cell committed movement for Bomberman/Pacman style games.
section: api
subsection: phaser
order: 12
---

# Grid Locked Movement Manager

True grid-locked movement: entities commit to moving one cell at a time, align to centers, and only change direction when aligned. Perfect for Bomberman, Pacman, Sokoban.

## When to Use
- Movement should be cell-based, not freeform.
- You need deterministic pathing on a grid.
- You want built-in interpolation between cells and easy alignment checks.

## Quick Start

```ts
import { createGridLockedMovementManager } from '@martini-kit/phaser';

// scene.create()
this.gridLocked = this.adapter.createGridLockedMovementManager({
  tileSize: 52,
  gridWidth: 13,
  gridHeight: 13,
  collisionCheck: (gx, gy) => hasBlockOrBomb(gx, gy),
  baseSpeed: 3.0,  // cells per second
  debug: false
});

// tick action
forEachPlayerInput(state, (player, input) => {
  this.gridLocked.moveEntity(player, input, delta);
});
```

## Key Options
- `tileSize`, `gridWidth`, `gridHeight`: grid dimensions.
- `collisionCheck(gridX, gridY)`: return `true` if blocked.
- `baseSpeed`: **cells/sec** (default `3.0`).
- `debug` / `debugColor`: visualize current/target cells and arrows.

## Helper Methods
- `snapToGrid(entity)`: snap to nearest center and reset movement state.
- `isAligned(entity)`: `true` if centered in a cell (can accept new direction).
- `getGridPosition(entity)`: current grid coordinates.
- `worldToGrid()` / `gridToWorld()`: conversions.
- `destroy()`: cleanup debug graphics.

## Behavior
- Initializes `currentCell`, `targetCell`, `moveProgress` on first move.
- Continues moving to `targetCell` before accepting new input.
- Blocks movement if the next cell is not walkable.

## Choose the Right Manager
- **Use this** for cell-to-cell movement.
- **Use [Grid Collision Manager](./grid-collision-manager)** for smooth movement with grid-aware collisions. 
