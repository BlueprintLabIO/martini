---
title: Movement Systems
description: Implementing player movement in multiplayer games
section: guides
subsection: movement
order: 1
scope: agnostic
---

# Movement Systems

Movement is a core mechanic in most games. This guide explains how to implement movement in martini-kit, covering both framework-agnostic logic and framework-specific rendering.

## Framework Organization

Movement guides are split into two categories:

### Core Logic (`/guides/movement/core/`)

Framework-agnostic movement logic that works with any engine:
- State structure
- Input handling patterns
- Velocity calculations
- Collision logic

### Phaser Implementation (`/guides/movement/phaser/`)

Phaser-specific rendering and physics:
- Sprite creation
- Physics bodies
- Input managers
- Camera following

## Movement Types

### Top-Down Movement

8-directional or analog movement from a bird's-eye view.

- **[Core Logic →](./core/top-down)** - Velocity, input state
- **[Phaser Implementation →](./phaser/top-down)** - Sprites, physics

**Best for:** RPGs, twin-stick shooters, strategy games

---

### Platformer Movement

Side-scrolling movement with jumping and gravity.

- **[Core Logic →](./core/platformer)** - Jump mechanics, gravity
- **[Phaser Implementation →](./phaser/platformer)** - Arcade physics

**Best for:** Platformers, side-scrollers, Metroidvanias

---

### Grid-Based Movement

Discrete movement on a grid (tile-by-tile).

- **[Core Logic →](./core/grid-based)** - Grid positions, pathfinding
- **[Phaser Implementation →](./phaser/grid-based)** - Tile rendering

**Best for:** Puzzle games, roguelikes, tactics games

---

## Key Concepts

### Input Storage Pattern

Store player input in state, process in tick action:

```typescript
interface GameState {
  players: Record<string, Player>;
  inputs: Record<string, PlayerInput>; // Separate input state
}

actions: {
  // Store input
  move: createInputAction('inputs'),
  
  // Process input every frame (host only)
  tick: createTickAction((state, delta) => {
    Object.entries(state.inputs).forEach(([playerId, input]) => {
      const player = state.players[playerId];
      // Apply movement based on input
    });
  })
}
```

### Host-Authoritative Movement

- **Host**: Processes input, updates positions, runs physics
- **Clients**: Send input, receive position updates, interpolate

This prevents cheating and ensures consistency.

### Interpolation

Clients should interpolate between received positions for smooth movement:

```typescript
// Phaser example
update() {
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation(); // Smooth movement
  }
}
```

## Choosing a Movement System

| Type | Complexity | Best For |
|------|------------|----------|
| **Top-Down** | Low | Action games, shooters |
| **Platformer** | Medium | Jump-based games |
| **Grid-Based** | Medium | Turn-based, puzzle games |

## Next Steps

Choose your movement type and follow both the core logic and framework-specific guides:

1. Read the **Core Logic** guide for your movement type
2. Read the **Phaser Implementation** guide (or implement in your engine)
3. Combine both for a complete movement system

## See Also

- **[Input Manager API →](/docs/latest/api/phaser/input-manager)** - Phaser input helpers
- **[Physics Sync →](/docs/latest/api/phaser/physics-sync)** - Syncing physics bodies
- **[Actions Guide →](/docs/latest/concepts/actions)** - Understanding actions
