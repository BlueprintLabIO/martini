# Martini Phaser SDK - Feature Proposals

This document tracks future enhancements to make the Martini Phaser SDK more powerful and easier to use.

---

## 1. Automatic Physics Integration for State Objects

**Status**: Proposed
**Priority**: High
**Complexity**: Low

### Problem

Currently, when you have state-driven entities (like bullets), you must:
1. Manually update state position: `bullet.x += bullet.velocityX * deltaSeconds`
2. Use `syncProperties` to sync state → sprites

This works but requires understanding two concepts. For velocity-based movement, we can automate this entirely.

### Solution

Add optional physics integration to `StateDrivenSpawner`:

```typescript
const bulletSpawner = adapter.createStateDrivenSpawner({
  stateKey: 'bullets',
  spriteManager: bulletManager,
  keyField: 'id',

  // NEW: Auto-physics from state!
  physics: {
    velocityFromState: { x: 'velocityX', y: 'velocityY' }
  }
});

// In update loop:
bulletSpawner.update(delta); // Automatically:
// 1. Reads bullet.velocityX/velocityY from state
// 2. Updates bullet.x/y in state
// 3. Syncs to sprite
```

### Benefits

- **80% less code** for simple projectiles
- **Pit of success** - velocity-based movement "just works"
- **No manual position updates** - framework handles it
- **Consistent with PhysicsManager** - same mental model

### Implementation

Add to `StateDrivenSpawnerConfig`:

```typescript
interface StateDrivenSpawnerConfig {
  // ... existing config ...

  /**
   * Optional: Auto-apply velocity-based physics
   * Reads velocity from state, updates position automatically
   */
  physics?: {
    velocityFromState?: {
      x: string;  // Field name for X velocity
      y: string;  // Field name for Y velocity
    };

    // Future: Support acceleration, friction, etc.
    acceleration?: { x: string; y: string };
    friction?: number;
  };
}
```

In `StateDrivenSpawner.update()`:

```typescript
private updatePhysics(data: any, deltaSeconds: number): void {
  if (!this.config.physics?.velocityFromState) return;

  const { x, y } = this.config.physics.velocityFromState;
  if (x in data && y in data) {
    data.x = (data.x || 0) + data[x] * deltaSeconds;
    data.y = (data.y || 0) + data[y] * deltaSeconds;
  }
}
```

### Migration

Non-breaking - opt-in via new `physics` config option.

### Related Issues

- Solves the "bullets not moving" footgun
- Complements `syncProperties` for simple use cases
- Reduces boilerplate in 90% of projectile implementations

---

## 2. Declarative Game Objects DSL

**Status**: Proposed (detailed design exists)
**Priority**: Medium
**Complexity**: High

### Problem

Creating game objects with Martini requires imperative code:

```typescript
// Current - lots of boilerplate
const sprites = adapter.createSpriteManager({
  onCreate: (key, data) => {
    const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
    const circle = this.add.circle(data.x, data.y, 20, color);
    return circle;
  },
  onCreatePhysics: (sprite) => {
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setBounce(0.2);
  },
  staticProperties: ['role'],
  label: {
    getText: (d) => d.role.toUpperCase(),
    offset: { y: -30 }
  }
});
```

**Problems:**
1. Too much imperative code for simple objects
2. Physics setup is verbose and repetitive
3. Color logic mixed with shape creation
4. No declarative way to specify colliders
5. Hard to validate/type-check configurations

### Proposed DSL

A declarative configuration that auto-wires common patterns:

```typescript
const game = adapter.createGameObjects({
  players: {
    // Visual properties
    shape: 'circle',
    radius: 20,
    color: (data) => data.role === 'fire' ? 0xff3300 : 0x0033ff,

    // Physics (auto-enabled on host, auto-disabled on client)
    physics: {
      type: 'dynamic',
      collideWorldBounds: true,
      bounce: 0.2,
      gravity: { y: 300 }
    },

    // Collisions (declarative!)
    colliders: [
      { with: 'platforms', callback: 'onPlatformHit' },
      { with: 'enemies', callback: 'onEnemyHit' }
    ],

    // Metadata
    staticProps: ['role'],
    syncProps: ['x', 'y', 'rotation'],

    // HUD
    label: {
      text: (d) => d.role.toUpperCase(),
      offset: { y: -30 },
      style: { fontSize: '12px', color: '#ffffff' }
    }
  },

  platforms: {
    shape: 'rectangle',
    width: (data) => data.width,
    height: 20,
    color: 0x8b4513,
    physics: { type: 'static' }
  }
});

// Usage - same API
game.players.spawn('p1', { x: 100, y: 100, role: 'fire' });
game.platforms.spawn('main', { x: 400, y: 550, width: 600 });
```

### Features

#### 1. Shape Types

```typescript
// Circle
shape: 'circle',
radius: number | ((data) => number),
color: number | ((data) => number),

// Rectangle
shape: 'rectangle',
width: number | ((data) => number),
height: number | ((data) => number),
color: number | ((data) => number),

// Sprite
shape: 'sprite',
texture: string | ((data) => string),
frame: number | string | ((data) => number | string),

// Custom (fallback to imperative)
shape: 'custom',
create: (key, data) => any
```

#### 2. Physics Configuration

```typescript
physics: {
  type: 'static' | 'dynamic',

  // Arcade Physics properties
  collideWorldBounds?: boolean,
  bounce?: number | { x: number, y: number },
  gravity?: { x: number, y: number },
  velocity?: { x: number, y: number },
  immovable?: boolean,
  mass?: number,
  drag?: number | { x: number, y: number },

  // Body size/offset
  bodySize?: { width: number, height: number },
  bodyOffset?: { x: number, y: number }
}
```

#### 3. Declarative Colliders

```typescript
colliders: [
  // Simple collision (just bounce off)
  { with: 'platforms' },

  // With callback
  {
    with: 'enemies',
    callback: 'onEnemyHit'  // Method name on scene
  },

  // With inline handler
  {
    with: 'pickups',
    onCollide: (sprite1, sprite2, key1, key2) => {
      // Handle collision
    }
  },

  // With process callback (return true to collide)
  {
    with: 'players',
    process: (sprite1, sprite2) => {
      return sprite1.alpha > 0.5;  // Only collide if visible
    }
  }
]
```

#### 4. Animation Support

```typescript
animations: {
  idle: { frames: 'player-idle', frameRate: 10, repeat: -1 },
  walk: { frames: 'player-walk', frameRate: 12, repeat: -1 },
  jump: { frames: 'player-jump', frameRate: 15 }
},
defaultAnimation: 'idle'
```

#### 5. Lifecycle Hooks

```typescript
lifecycle: {
  onCreate: (sprite, key, data) => {
    // Custom setup after sprite is created
  },
  onUpdate: (sprite, data, delta) => {
    // Per-frame update
  },
  onDestroy: (sprite, key) => {
    // Cleanup
  }
}
```

### Benefits

1. **Less boilerplate** - 60% reduction in sprite creation code
2. **Pit of success** - Physics/colliders configured correctly by default
3. **Type safety** - Config schema catches errors at compile time
4. **Testability** - Declarative configs are easier to unit test
5. **Documentation** - Config serves as living documentation
6. **Migration friendly** - Layered approach, no breaking changes

### Migration Path

**Level 1**: Low-level (current - keep as-is)
```typescript
adapter.trackSprite(sprite, 'ball');
```

**Level 2**: Imperative managers (current - keep as-is)
```typescript
const mgr = adapter.createSpriteManager({ onCreate: ... });
```

**Level 3**: Registry pattern (implemented!)
```typescript
const sprites = adapter.createSpriteRegistry({ players: { ... } });
```

**Level 4**: Declarative DSL (future - this proposal)
```typescript
const game = adapter.createGameObjects({ players: { shape: 'circle', ... } });
```

### Implementation Strategy

**Phase 1**: Core DSL Parser
- Schema validation (Zod or similar)
- Shape factory (circle, rectangle, sprite)
- Physics config applier
- Label manager

**Phase 2**: Collider System
- Declarative collider registration
- Callback wiring
- Group management

**Phase 3**: Animations & Lifecycle
- Animation config parser
- Lifecycle hook system

**Phase 4**: Advanced Features
- Particle effects config
- Tween/animation config
- Input binding config

### Open Questions

1. Should collider callbacks be strings (method names) or functions?
2. How to handle complex dynamic behaviors (e.g., enemy AI)?
3. Should we support Matter.js physics too, or just Arcade?
4. How to handle z-index/depth configuration?
5. Should we support declarative input binding here or keep separate?

### Next Steps

1. ✅ Implement namespace support (done)
2. ✅ Implement registry pattern (done)
3. 🔄 Validate proposal with more use cases
4. 📝 Create RFC for community feedback
5. 🚧 Build prototype DSL parser
6. 🧪 Test with existing demos
7. 📚 Update documentation
8. 🚀 Release as experimental feature

### Alternatives Considered

**A. Unity-style prefab system**
- **Pro**: Familiar to Unity devs
- **Con**: Requires asset serialization, more complex

**B. React-style JSX components**
- **Pro**: Declarative, composable
- **Con**: Requires JSX transform, mixing rendering paradigms

**C. JSON configuration files**
- **Pro**: Language-agnostic, easy to edit
- **Con**: Loses TypeScript types, harder to debug

**Decision**: Stick with TypeScript config objects for type safety and developer experience.

---

## Future Proposals

Add more proposals here as they are identified.

### Template

```markdown
## N. Proposal Title

**Status**: Proposed | In Progress | Implemented | Rejected
**Priority**: High | Medium | Low
**Complexity**: Low | Medium | High

### Problem
[Describe the problem this solves]

### Solution
[Describe the proposed solution]

### Benefits
[List key benefits]

### Implementation
[High-level implementation approach]

### Migration
[How users migrate to this feature]
```
