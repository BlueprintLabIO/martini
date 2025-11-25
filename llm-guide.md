# LLM Implementation Guide

Purpose: For LLM/humans to quickly get up to speed on martini-sdk usage.

## Quick Reference: What Already Exists

### Core Helpers (`@martini-kit/core`)

```typescript
import {
  createPlayerManager,  // Full player lifecycle (setup/join/leave)
  createInputAction,    // Store inputs in state
  createTickAction,     // Host-only game loop
  forEachPlayerInput,   // Iterate over players with input
  createPlayers         // Simple player initialization (prefer createPlayerManager)
} from '@martini-kit/core';
```

**Key Points:**
- `createPlayerManager` handles EVERYTHING (roles, spawns, join/leave) - use this, not `createPlayers`
- `createTickAction` ensures host-only execution - wrap ALL game logic (physics, timers, etc) in this
- `createInputAction` auto-stores inputs - don't manually write input storage
- `forEachPlayerInput` eliminates manual player iteration loops

### Phaser Helpers (`@martini-kit/phaser`)

All helpers created via `adapter.create*()`:

```typescript
// Entity Management
adapter.createSpriteManager()          // Host-authoritative sprite sync
adapter.createStateDrivenSpawner()     // Auto-create sprites from state arrays

// Player Systems
adapter.createPlayerUIManager()        // Auto UI for all players (scores, names, etc)
adapter.createHealthBarManager()       // Health bars above sprites

// Input & Physics
adapter.createInputManager()           // Keyboard input with profiles (topDown, sideScroller)
adapter.createPhysicsManager()         // Physics body management
adapter.createCollisionManager()       // Collision detection

// Grid-Based Games
adapter.createClickableGrid()          // MOUSE-BASED grid interaction (Connect Four, Chess)
adapter.createGridMovementManager()    // KEYBOARD-BASED grid movement (Bomberman, Pacman, Snake)

// UI & Camera
adapter.createCameraFollower()         // Camera tracking
```

**Common Mistake:** `createClickableGrid()` is for MOUSE CLICKS (turn-based games), not keyboard movement.

## Decision Tree: What Helper to Use?

### Player Spawning & Management
```
Need players? → Use createPlayerManager()
  ├─ Has roles? → Pass roles: ['fire', 'ice']
  ├─ Has fixed spawns? → Pass spawnPoints: [{x, y}, ...]
  └─ Needs bounds? → Pass worldBounds: {width, height}
```

### Input Handling
```
Need input? → Use createInputAction() for action
             → Use createInputManager() for Phaser profiles
  ├─ Top-down? → inputManager.useProfile('topDown')
  └─ Platformer? → inputManager.useProfile('sideScroller')
```

### Sprite Management
```
Need sprites?
  ├─ Tracking existing sprite? → adapter.trackSprite()
  ├─ Managing multiple sprites? → adapter.createSpriteManager()
  └─ Auto-spawn from state? → adapter.createStateDrivenSpawner()
```

### Game Loop
```
Need game logic? → ALWAYS wrap in createTickAction()
  ├─ Movement? → Process in tick
  ├─ Timers? → Update in tick
  └─ Collisions? → Check in tick
```

## Common Patterns

### Pattern: Grid-Based Movement (Bomberman, Pacman)
**Status:** ✅ Use `createGridMovementManager()` + `forEachPlayerInput()`
```typescript
const gridMovement = adapter.createGridMovementManager({
  tileSize: 52,
  gridWidth: 13,
  gridHeight: 13,
  collisionCheck: (x, y) => state.blocks.some(b => b.x === x && b.y === y)
});

tick: createTickAction((state, delta) => {
  forEachPlayerInput(state, (player, input) => {
    gridMovement.moveEntity(player, input, delta);
  });
})
```

### Pattern: Timer Management (Bombs, Cooldowns)
**Status:** ❌ No helper - track in state
```typescript
tick: createTickAction((state, delta) => {
  state.bombs.forEach(bomb => {
    bomb.timer -= delta;
    if (bomb.timer <= 0) {
      // Explode
    }
  });
})
```

### Pattern: Explosion Raycasting
**Status:** ❌ No helper - implement custom
```typescript
// Manual raycasting in 4 directions
const directions = [
  {dx: 0, dy: -1}, {dx: 0, dy: 1},
  {dx: -1, dy: 0}, {dx: 1, dy: 0}
];
```

## Anti-Patterns (Don't Do This)

❌ **Manual player initialization**
```typescript
// BAD
players: Object.fromEntries(playerIds.map((id, i) => [id, {x: i * 100, y: 0}]))
// GOOD
players: playerManager.initialize(playerIds)
```

❌ **Client-side game logic**
```typescript
// BAD - runs on all clients
update() {
  player.x += velocity;
}
// GOOD - only host
tick: createTickAction((state, delta) => {
  player.x += velocity;
})
```

❌ **Using GridClickHelper for keyboard movement**
```typescript
// BAD - GridClickHelper is for MOUSE CLICKS only
adapter.createClickableGrid() // For turn-based games
// GOOD - Use GridMovementManager for keyboard
adapter.createGridMovementManager()
```

❌ **Manual player iteration in tick**
```typescript
// BAD - verbose loop
for (const [playerId, player] of Object.entries(state.players)) {
  const input = state.inputs[playerId];
  if (!input) continue;
  // process
}
// GOOD - use helper
forEachPlayerInput(state, (player, input) => {
  // process
});
```

## Checklist Before Implementing

- [ ] Checked if `createPlayerManager()` handles my player needs
- [ ] Checked if `createInputManager()` has a profile for my controls
- [ ] Checked if `createStateDrivenSpawner()` can auto-create my entities
- [ ] Wrapped all game logic in `createTickAction()`
- [ ] Used `forEachPlayerInput()` instead of manual loops
- [ ] Used `createGridMovementManager()` for grid-based keyboard movement
- [ ] Used `adapter.create*()` for all Phaser helpers
- [ ] NOT using `GridClickHelper` for keyboard movement
- [ ] Enabled `autoTick` in PhaserAdapter config to eliminate manual tick calls

## Automatic Tick Helper

**NEW:** PhaserAdapter now supports `autoTick` option:
```typescript
const adapter = new PhaserAdapter(runtime, scene, {
  autoTick: true,        // Automatically call tick action in update()
  tickAction: 'tick'     // Optional, defaults to 'tick'
});

// In your scene:
update(time: number, delta: number) {
  adapter.update(time, delta); // Handles tick + interpolation automatically
}
```

This eliminates manual `runtime.submitAction('tick', {delta})` boilerplate!

## Critical Bugs & Pitfalls (MUST READ!)

### 🚨 Bug: Grid Movement Without GridMovementManager
**Problem:** blast-arena uses custom inline movement logic that causes non-grid-locked behavior.

```typescript
// ❌ BAD - Custom inline movement (causes drift)
if (!gridMovement) {
  gridMovement = {
    moveEntity: (player: any, input: any, delta: number) => {
      // Custom logic with Math.floor() for collision
      // BUT allows smooth pixel movement - NOT grid-locked!
      const gridX = Math.floor(nextX / TILE_SIZE);
      const gridY = Math.floor(nextY / TILE_SIZE);
      // This allows players to drift between cells!
    }
  };
}

// ✅ GOOD - Use actual GridMovementManager
const gridMovement = adapter.createGridMovementManager({
  tileSize: 52,
  gridWidth: 13,
  gridHeight: 13,
  collisionCheck: (x, y) => {
    // Check ALL collision types (blocks, bombs, etc)
    const hasBlock = state.blocks.some(b => b.x === x && b.y === y && b.type === 'hard');
    const hasBomb = state.bombs.some(b => b.x === x && b.y === y);
    return hasBlock || hasBomb;
  }
});
```

**Why This Happens:**
- Custom movement uses `Math.floor()` for collision but allows smooth pixel positions
- `Math.floor()` only checks the cell you're entering, not preventing drift
- GridMovementManager uses proper grid-aligned collision with the entire next position

### 🚨 Bug: Incomplete Collision Checks
**Problem:** Only checking blocks, forgetting bombs/other entities.

```typescript
// ❌ BAD - Only checks blocks
collisionCheck: (x, y) => state.blocks.some(b => b.x === x && b.y === y)

// ✅ GOOD - Check ALL obstacles
collisionCheck: (x, y) => {
  const hasBlock = state.blocks.some(b => b.x === x && b.y === y && b.type === 'hard');
  const hasBomb = state.bombs.some(b => b.x === x && b.y === y && !b.isKicked);
  return hasBlock || hasBomb;
}
```

### 🚨 Bug: Lazy Init Inside tick Action
**Problem:** Creating helpers inside `createTickAction()` causes issues.

```typescript
// ❌ BAD - Lazy init inside tick
tick: createTickAction((state, delta) => {
  if (!gridMovement) {
    gridMovement = adapter.createGridMovementManager({...});
  }
})

// ✅ GOOD - Create helper BEFORE defineGame
const gridMovement = adapter.createGridMovementManager({...});

export const game = defineGame({
  // ...
  actions: {
    tick: createTickAction((state, delta) => {
      // Just use gridMovement here
    })
  }
});
```

**Why:** Helpers should be created once and reused, not recreated every tick.

## 10x Pit of Success SDK Fixes

### 1. Make GridMovementManager Require Adapter
**Current:** Can be created without adapter, leading to misuse.
**Fix:** Make it impossible to create without proper initialization.

```typescript
// ENFORCE proper usage in type system
export class GridMovementManager {
  private constructor(adapter: PhaserAdapter, config: GridMovementConfig) {
    // Private constructor forces use of factory
  }
}

// Only way to create is through adapter
adapter.createGridMovementManager({...})
```

### 2. Add Validation for Common Mistakes
```typescript
// In GridMovementManager constructor
if (!config.collisionCheck) {
  throw new Error('GridMovementManager requires collisionCheck function');
}

// Warn about incomplete collision checks
console.warn(
  'GridMovementManager: Make sure collisionCheck handles ALL obstacles ' +
  '(blocks, bombs, entities, etc) not just one type!'
);
```

### 3. Add Helper Method for Multi-Type Collision
```typescript
// In @martini-kit/core helpers
export function createMultiCollisionCheck(
  ...checks: Array<(x: number, y: number) => boolean>
): (x: number, y: number) => boolean {
  return (x, y) => checks.some(check => check(x, y));
}

// Usage
const gridMovement = adapter.createGridMovementManager({
  collisionCheck: createMultiCollisionCheck(
    (x, y) => state.blocks.some(b => b.x === x && b.y === y && b.type === 'hard'),
    (x, y) => state.bombs.some(b => b.x === x && b.y === y && !b.isKicked)
  )
});
```

### 4. Add Debug Mode to GridMovementManager
```typescript
// Show visual grid overlay + collision areas
const gridMovement = adapter.createGridMovementManager({
  // ...
  debug: true // Shows grid, collision cells, entity positions
});
```

### 5. Make autoTick Default to true
```typescript
// In PhaserAdapter constructor
this.config = {
  autoTick: true,  // Default to auto-tick (pit of success)
  tickAction: 'tick',
  ...config
};
```

### 6. Add Lint Rule / Type Check for Common Anti-patterns
```typescript
// Type-level enforcement
type TickActionFactory = <TState>(
  fn: (state: TState, delta: number) => void
) => Action<TState>;

// Prevent lazy init by making config required at call site
export function createGridMovementManager(config: GridMovementConfig) {
  if (typeof config !== 'object') {
    throw new Error('GridMovementManager config must be provided at creation time, not lazily');
  }
  // ...
}
```

### 7. Document Common Pitfalls in JSDoc
```typescript
/**
 * GridMovementManager - Grid-based keyboard movement helper
 *
 * ⚠️ COMMON MISTAKES TO AVOID:
 * - ❌ Creating inside tick action (create BEFORE defineGame instead)
 * - ❌ Only checking one collision type (check ALL: blocks, bombs, entities)
 * - ❌ Using custom inline movement instead of this helper
 * - ❌ Not using autoTick in PhaserAdapter config
 *
 * ✅ CORRECT USAGE:
 * ```ts
 * // 1. Create helper BEFORE defineGame
 * const gridMovement = adapter.createGridMovementManager({...});
 *
 * // 2. Use in tick action
 * tick: createTickAction((state, delta) => {
 *   forEachPlayerInput(state, (player, input) => {
 *     gridMovement.moveEntity(player, input, delta);
 *   });
 * })
 * ```
 */
```

## When to Add New Helpers

Add a new helper if you find yourself writing the same 30+ line pattern in multiple games. Examples:
- ~~Grid-based keyboard movement~~ ✅ DONE - use `createGridMovementManager()`
- Timer countdown system (appears in any game with bombs, cooldowns, powerups)
- Cross-pattern explosion raycasting (appears in Bomberman, grid shooters)

## Further Reading

- Core API: `@martini-kit/core/src/index.ts`
- Phaser API: `@martini-kit/phaser/src/PhaserAdapter.ts`
- All Helpers: `@martini-kit/phaser/src/helpers/`
