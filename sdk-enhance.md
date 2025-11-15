# Martini SDK Enhancement Plan: Pit of Success Helpers

## Executive Summary

This plan introduces three critical SDK helpers that eliminate entire categories of multiplayer bugs by moving bookkeeping from game code into the framework. These helpers turn common error-prone patterns into declarative, impossible-to-forget APIs.

**Motivation:** The paddle-battle bug revealed that developers must manually handle late-joining players in 3+ places (create, update, onChange), leading to missed colliders and UI. These helpers make such bugs structurally impossible.

---

## Priority 1: CollisionManager

### Problem
Developers must manually call `physics.add.collider()` for every sprite pair, and remember to re-add colliders when sprites are created late (e.g., second player joins). Missing a single call = ball passes through paddle.

### Solution
Declarative collision rules that auto-apply to all sprites, regardless of join timing.

```typescript
// In scene.create()
this.collisionManager = this.adapter.createCollisionManager();

// Declare collision rules ONCE
this.collisionManager.addCollision('ball', 'paddles');
// ☝️ Automatically adds colliders for:
//   - All existing paddles
//   - Paddles created later (late-joining players)
//   - Works with both sprites and sprite groups

// Multiple collision rules
this.collisionManager.addCollision('bullets', 'enemies', {
  onCollide: (bullet, enemy) => {
    // Custom collision handler
    enemy.takeDamage(bullet.damage);
    bullet.destroy();
  }
});
```

### API Design

```typescript
interface CollisionManagerConfig {
  /**
   * Optional: Global collision handler
   * Called for all collisions if no specific handler provided
   */
  onCollide?: (obj1: any, obj2: any) => void;
}

class CollisionManager {
  constructor(adapter: PhaserAdapter, scene: Phaser.Scene, config?: CollisionManagerConfig);

  /**
   * Add collision between sprite(s) and group(s)
   * @param a - sprite key, SpriteManager, or Phaser group
   * @param b - sprite key, SpriteManager, or Phaser group
   */
  addCollision(
    a: string | SpriteManager | Phaser.Physics.Arcade.Group,
    b: string | SpriteManager | Phaser.Physics.Arcade.Group,
    options?: {
      onCollide?: (obj1: any, obj2: any) => void;
    }
  ): void;

  /**
   * Remove collision rule
   */
  removeCollision(a: string | SpriteManager, b: string | SpriteManager): void;

  /**
   * Cleanup all colliders
   */
  destroy(): void;
}
```

### Implementation Strategy

1. **Track collision rules** - Store pairs and handlers in a registry
2. **Subscribe to SpriteManager events** - Listen for sprite additions via new `onAdd` hook
3. **Auto-create colliders** - When sprite is added to a tracked manager, check all rules and create colliders
4. **Support mixed types** - Handle sprite keys, SpriteManagers, and raw Phaser groups
5. **Cleanup** - Remove colliders when sprites are destroyed

### Files to Create/Modify
- `packages/@martini/phaser/src/helpers/CollisionManager.ts` (NEW)
- `packages/@martini/phaser/src/PhaserAdapter.ts` (add `createCollisionManager()`)
- `packages/@martini/phaser/src/index.ts` (export CollisionManager)

---

## Priority 2: PlayerUIManager

### Problem
Every game needs UI for players (score, health, name), but developers must:
1. Create UI elements in `create()` for initial players
2. Check for new players in `onChange()` and create their UI
3. Update UI values every frame or on state change
4. Clean up UI when players leave

Missing any step = broken UI for late-joining players (as seen in paddle-battle).

### Solution
Declarative player UI that auto-syncs with `state.players`.

```typescript
// In scene.create()
this.playerUI = this.adapter.createPlayerUIManager({
  // Define UI elements per player
  score: {
    position: (player) => ({
      x: player.side === 'left' ? 200 : 600,
      y: 80
    }),
    style: { fontSize: '48px', color: '#fff' },
    getText: (player) => String(player.score || 0),
    origin: 0.5
  },

  healthBar: {
    position: (player) => ({ x: player.x, y: player.y - 30 }),
    width: 50,
    height: 5,
    backgroundColor: 0x333333,
    foregroundColor: 0x00ff00,
    getValue: (player) => player.health / player.maxHealth
  },

  nameLabel: {
    position: (player) => ({ x: player.x, y: player.y - 40 }),
    style: { fontSize: '12px', color: '#fff' },
    getText: (player) => player.name || 'Player',
    origin: 0.5
  }
});
```

### API Design

```typescript
interface TextUIConfig {
  position: (player: any, playerId: string) => { x: number; y: number };
  getText: (player: any, playerId: string) => string;
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  origin?: number | { x: number; y: number };
}

interface BarUIConfig {
  position: (player: any, playerId: string) => { x: number; y: number };
  getValue: (player: any, playerId: string) => number; // 0-1
  width: number;
  height: number;
  backgroundColor: number;
  foregroundColor: number;
  origin?: number | { x: number; y: number };
}

interface PlayerUIManagerConfig {
  [key: string]: TextUIConfig | BarUIConfig | CustomUIConfig;
}

class PlayerUIManager {
  constructor(adapter: PhaserAdapter, scene: Phaser.Scene, config: PlayerUIManagerConfig);

  /**
   * Get UI element for a specific player
   */
  get(playerId: string, elementKey: string): Phaser.GameObjects.GameObject | null;

  /**
   * Manually update all UI (called automatically on state changes)
   */
  update(): void;

  /**
   * Cleanup
   */
  destroy(): void;
}
```

### Implementation Strategy

1. **Subscribe to state changes** - Listen for `state.players` changes
2. **Create UI on demand** - When new player appears, create all configured UI elements
3. **Auto-update** - On every state change, call `getText`/`getValue` and update visuals
4. **Auto-cleanup** - When player leaves, destroy their UI elements
5. **Support custom renderers** - Allow developers to provide custom UI factories

### Files to Create/Modify
- `packages/@martini/phaser/src/helpers/PlayerUIManager.ts` (NEW)
- `packages/@martini/phaser/src/PhaserAdapter.ts` (add `createPlayerUIManager()`)
- `packages/@martini/phaser/src/index.ts` (export PlayerUIManager)

---

## Priority 3: SpriteManager.onAdd Hook

### Problem
Even with CollisionManager and PlayerUIManager, there are edge cases where developers need to run custom logic when sprites are added (early or late). Currently, no lifecycle hook exists for this.

### Solution
Add `onAdd` callback to SpriteManager that fires whenever a sprite is added, with access to context.

```typescript
this.spriteManager = this.adapter.createSpriteManager({
  onCreate: (key, data) => {
    const sprite = this.add.rectangle(data.x, data.y, 32, 32, 0xff0000);
    return sprite;
  },

  onCreatePhysics: (sprite) => {
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);
  },

  // NEW: Called after sprite is fully created (onCreate + onCreatePhysics done)
  onAdd: (sprite, key, data, context) => {
    // context = { manager: SpriteManager, allSprites: Map<string, any> }

    // Example: Add collision with a tracked ball
    if (this.ball) {
      this.physics.add.collider(sprite, this.ball);
    }

    // Example: Subscribe to player-specific input
    this.inputManager.on(`player-${key}-shoot`, () => {
      this.fireBullet(sprite);
    });
  },

  staticProperties: ['side', 'color']
});
```

### API Design

```typescript
interface SpriteManagerConfig<TData extends SpriteData = SpriteData> {
  // ... existing config ...

  /**
   * NEW: Called after sprite is fully created and ready
   * Fires for BOTH initial sprites and late-joining sprites
   * Use this for inter-sprite setup (collisions, custom logic, etc.)
   *
   * @param sprite - The created sprite
   * @param key - Sprite key
   * @param data - Sprite data
   * @param context - Access to manager and all sprites
   */
  onAdd?: (
    sprite: any,
    key: string,
    data: TData,
    context: {
      manager: SpriteManager<TData>;
      allSprites: Map<string, any>;
    }
  ) => void;
}
```

### Implementation Strategy

1. **Call after sprite creation** - In `add()` method, call `onAdd` after `onCreate` and `onCreatePhysics`
2. **Call on client sync** - In `syncFromState()`, call `onAdd` after creating remote sprite
3. **Provide context** - Pass manager instance and current sprite map for inter-sprite logic
4. **Ensure timing** - Only call after sprite is fully initialized (physics, tracking, etc.)

### Files to Modify
- `packages/@martini/phaser/src/helpers/SpriteManager.ts` (add `onAdd` callback)

---

## Implementation Plan

### Phase 1: SpriteManager.onAdd Hook (Prerequisite)
- Modify `SpriteManager.ts` to add `onAdd` callback
- Update TypeScript types
- Test with paddle-battle

### Phase 2: CollisionManager
- Create `CollisionManager.ts`
- Integrate with SpriteManager via `onAdd` hook
- Add `adapter.createCollisionManager()`
- Write tests
- Update paddle-battle demo

### Phase 3: PlayerUIManager
- Create `PlayerUIManager.ts`
- Implement text and bar UI types
- Add `adapter.createPlayerUIManager()`
- Write tests
- Update paddle-battle demo

### Phase 4: Documentation & Examples
- Update API docs
- Create migration guide from manual approach
- Update all demo games to use new helpers
- Add best practices guide

---

## Success Metrics

**Before (Manual Approach):**
- ❌ 3+ places to handle late-joining players
- ❌ Easy to forget collision setup
- ❌ Easy to forget UI creation
- ❌ ~50-100 lines of bookkeeping per game

**After (Pit of Success):**
- ✅ 1 place to declare intent
- ✅ Impossible to forget late-joining players
- ✅ SDK handles all timing/lifecycle
- ✅ ~10-20 lines of declarative config

**Impact:**
- Eliminates 90% of multiplayer timing bugs
- Reduces game code by 50-70%
- Improves developer confidence and velocity

---

## Open Questions

1. **CollisionManager scope** - Should it handle overlap detection too, or just collisions?
2. **PlayerUIManager extensibility** - Should we support custom UI renderers beyond text/bar?
3. **Performance** - Should managers batch updates or is per-frame fine?
4. **TypeScript** - How strict should typing be for config objects?

---

## Future Enhancements (Post-Launch)

1. **AnimationManager** - Declarative sprite animations synced to state
2. **SoundManager** - Auto-play sounds based on state events
3. **CameraManager** - Smart camera following/splitting for multiplayer
4. **DebugManager** - Overlay debug info for all players/sprites

---

## Conclusion

These three helpers represent a fundamental shift from imperative to declarative multiplayer game development. By making the SDK responsible for lifecycle management, we eliminate entire categories of bugs and dramatically improve DX.

The paddle-battle bug was a wake-up call: if we can ship a broken demo, users will ship broken games. These helpers make such bugs structurally impossible.

**Let's build the pit of success.**
