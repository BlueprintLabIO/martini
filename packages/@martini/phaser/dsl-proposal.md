# Declarative Game Objects DSL Proposal

## Motivation

Currently, creating game objects with Martini requires imperative code:

```typescript
// Current approach - lots of boilerplate
const sprites = adapter.createSpriteRegistry({
  players: {
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
  }
});
```

**Problems:**
1. Too much imperative code for simple objects
2. Physics setup is verbose and repetitive
3. Color logic mixed with shape creation
4. No declarative way to specify colliders
5. Hard to validate/type-check configurations

## Proposed DSL

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
      type: 'dynamic',  // or 'static'
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
  },

  enemies: {
    shape: 'sprite',
    texture: (data) => data.type,  // 'goblin', 'orc', etc.
    physics: {
      type: 'dynamic',
      collideWorldBounds: true
    },
    colliders: [
      { with: 'platforms' },
      { with: 'players', callback: 'onPlayerHit' }
    ]
  }
});

// Usage - same as registry pattern
game.players.spawn('p1', { x: 100, y: 100, role: 'fire' });
game.platforms.spawn('main', { x: 400, y: 550, width: 600 });
game.enemies.spawn('e1', { x: 300, y: 300, type: 'goblin' });
```

## Features

### 1. Shape Types

Supported shapes with declarative properties:

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
create: (key, data) => any  // Same as onCreate today
```

### 2. Physics Configuration

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

### 3. Colliders (Declarative Collision Detection)

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

### 4. Animation Support

```typescript
animations: {
  idle: { frames: 'player-idle', frameRate: 10, repeat: -1 },
  walk: { frames: 'player-walk', frameRate: 12, repeat: -1 },
  jump: { frames: 'player-jump', frameRate: 15 }
},
defaultAnimation: 'idle'
```

### 5. Lifecycle Hooks

```typescript
lifecycle: {
  onCreate: (sprite, key, data) => {
    // Custom setup after sprite is created
  },
  onUpdate: (sprite, data, delta) => {
    // Per-frame update (useful for custom logic)
  },
  onDestroy: (sprite, key) => {
    // Cleanup
  }
}
```

## Implementation Strategy

### Phase 1: Core DSL Parser
- Schema validation (Zod or similar)
- Shape factory (circle, rectangle, sprite)
- Physics config applier
- Label manager

### Phase 2: Collider System
- Declarative collider registration
- Callback wiring
- Group management

### Phase 3: Animations & Lifecycle
- Animation config parser
- Lifecycle hook system

### Phase 4: Advanced Features
- Particle effects config
- Tween/animation config
- Input binding config

## Type Safety

The DSL is fully typed using TypeScript:

```typescript
type ShapeConfig<TData> =
  | CircleConfig<TData>
  | RectangleConfig<TData>
  | SpriteConfig<TData>
  | CustomConfig<TData>;

interface CircleConfig<TData> {
  shape: 'circle';
  radius: number | ((data: TData) => number);
  color: number | ((data: TData) => number);
}

// ... etc for each shape type

interface GameObjectConfig<TData extends SpriteData> extends ShapeConfig<TData> {
  physics?: PhysicsConfig;
  colliders?: ColliderConfig[];
  animations?: AnimationConfig;
  lifecycle?: LifecycleConfig<TData>;
  staticProps?: (keyof TData)[];
  syncProps?: string[];
  label?: LabelConfig<TData>;
}
```

## Migration Path

### Level 1: Low-level (current - keep as-is)
```typescript
adapter.trackSprite(sprite, 'ball');
```

### Level 2: Imperative managers (current - keep as-is)
```typescript
const mgr = adapter.createSpriteManager({ onCreate: ... });
```

### Level 3: Registry pattern (implemented today!)
```typescript
const sprites = adapter.createSpriteRegistry({ players: { ... } });
```

### Level 4: Declarative DSL (future - this proposal)
```typescript
const game = adapter.createGameObjects({ players: { shape: 'circle', ... } });
```

Users can mix and match levels based on their needs.

## Benefits

1. **Less boilerplate** - 60% reduction in sprite creation code
2. **Pit of success** - Physics/colliders configured correctly by default
3. **Type safety** - Config schema catches errors at compile time
4. **Testability** - Declarative configs are easier to unit test
5. **Documentation** - Config serves as living documentation
6. **Migration friendly** - Layered approach, no breaking changes

## Open Questions

1. Should collider callbacks be strings (method names) or functions?
2. How to handle complex dynamic behaviors (e.g., enemy AI)?
3. Should we support Matter.js physics too, or just Arcade?
4. How to handle z-index/depth configuration?
5. Should we support declarative input binding here or keep separate?

## Example: Full Game Configuration

```typescript
const game = adapter.createGameObjects({
  players: {
    shape: 'circle',
    radius: 20,
    color: (d) => d.role === 'fire' ? 0xff3300 : 0x0033ff,
    physics: {
      type: 'dynamic',
      collideWorldBounds: true,
      bounce: 0.2,
      gravity: { y: 300 }
    },
    colliders: [
      { with: 'platforms' },
      { with: 'enemies', callback: 'onEnemyHit' },
      { with: 'pickups', callback: 'onPickupCollect' }
    ],
    staticProps: ['role', 'name'],
    label: {
      text: (d) => `${d.name} (${d.role})`,
      offset: { y: -30 }
    }
  },

  enemies: {
    shape: 'sprite',
    texture: (d) => `enemy-${d.type}`,
    physics: { type: 'dynamic', gravity: { y: 300 } },
    colliders: [{ with: 'platforms' }],
    animations: {
      idle: { frames: 'enemy-idle', frameRate: 8, repeat: -1 },
      attack: { frames: 'enemy-attack', frameRate: 12 }
    },
    lifecycle: {
      onUpdate: (sprite, data, delta) => {
        // Simple enemy AI
        if (sprite.body.touching.down) {
          sprite.body.setVelocityX(data.direction * 50);
        }
      }
    }
  },

  platforms: {
    shape: 'rectangle',
    width: (d) => d.width,
    height: 20,
    color: 0x8b4513,
    physics: { type: 'static' }
  },

  pickups: {
    shape: 'circle',
    radius: 10,
    color: 0xffaa00,
    physics: { type: 'static' },
    colliders: [
      {
        with: 'players',
        onCollide: (pickup, player) => {
          pickup.destroy();
          // Add to player inventory
        }
      }
    ]
  }
});
```

## Next Steps

1. ✅ Implement namespace support (done)
2. ✅ Implement registry pattern (done)
3. 🔄 Validate proposal with more use cases
4. 📝 Create RFC for community feedback
5. 🚧 Build prototype DSL parser
6. 🧪 Test with existing demos
7. 📚 Update documentation
8. 🚀 Release as experimental feature

## Alternatives Considered

### A. Unity-style prefab system
- **Pro**: Familiar to Unity devs
- **Con**: Requires asset serialization, more complex

### B. React-style JSX components
- **Pro**: Declarative, composable
- **Con**: Requires JSX transform, mixing rendering paradigms

### C. JSON configuration files
- **Pro**: Language-agnostic, easy to edit
- **Con**: Loses TypeScript types, harder to debug

**Decision**: Stick with TypeScript config objects for type safety and developer experience.
