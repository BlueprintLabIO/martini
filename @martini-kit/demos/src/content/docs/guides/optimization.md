<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Optimization

This guide covers performance optimization techniques for martini-kit multiplayer games, from state management to rendering and network efficiency.

## Performance Goals

Target metrics for smooth gameplay:

- **60 FPS** - Consistent frame rate
- **&lt; 50ms latency** - For action submission to state sync
- **&lt; 100 KB/s** - Network bandwidth per client
- **&lt; 200 entities** - Physics bodies on host
- **&lt; 5 MB** - Total memory per client

## State Optimization

### 1. Minimize State Size

**Problem:** Large state = slow diffs = high bandwidth

```typescript
// BAD - Redundant data (1200 bytes)
interface Player {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  speed: number;              // Can be computed
  angle: number;
  angleInDegrees: number;     // Redundant
  health: number;
  maxHealth: number;
  healthPercentage: number;   // Can be computed
  isAlive: boolean;           // Can be computed
  isDead: boolean;            // Redundant
  position: { x: number; y: number };  // Duplicate
  description: string;        // Large string
  metadata: {                 // Unused nested data
    createdAt: number;
    lastUpdated: number;
  };
}

// GOOD - Essential data only (80 bytes)
interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
}
```

**Savings:** ~93% smaller state, ~15x faster diffs

### 2. Use Efficient Data Structures

```typescript
// BAD - Arrays require full re-send on changes
interface GameState {
  enemies: Array<{ id: string; x: number; y: number }>;
}

// When enemy[5] moves, entire array is diffed

// GOOD - Records allow per-entity diffs
interface GameState {
  enemies: Record<string, { x: number; y: number }>;
}

// When enemy moves, only that enemy is diffed
```

### 3. Quantize Floating Point Values

```typescript
// BAD - Full precision (8 bytes per number)
state.players[id].x = 123.456789;
state.players[id].y = 456.789123;

// GOOD - Round to 2 decimals (sufficient for most games)
state.players[id].x = Math.round(value * 100) / 100;
state.players[id].y = Math.round(value * 100) / 100;

// BETTER - Use integers where possible
state.players[id].x = Math.round(value); // Pixels are integers
state.players[id].y = Math.round(value);
```

**Savings:** ~30% smaller state, faster JSON serialization

### 4. Separate Frequently/Infrequently Changed Data

```typescript
// BAD - Everything in one object
interface Player {
  x: number;        // Changes every frame
  y: number;        // Changes every frame
  health: number;   // Changes occasionally
  name: string;     // Never changes
  team: string;     // Never changes
}

// GOOD - Separate by change frequency
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    health: number;
  }>;
  playerInfo: Record<string, {  // Synced once on join
    name: string;
    team: string;
    avatar: string;
  }>;
}
```

## Action Optimization

### 1. Batch Related Changes

```typescript
// BAD - Multiple action submissions
runtime.submitAction('incrementScore', { amount: 10 });
runtime.submitAction('decrementHealth', { amount: 5 });
runtime.submitAction('addItem', { item: 'sword' });
// 3 network messages, 3 state diffs

// GOOD - Single action
runtime.submitAction('combatResult', {
  scoreChange: 10,
  healthChange: -5,
  itemAdded: 'sword'
});
// 1 network message, 1 state diff
```

### 2. Debounce High-Frequency Actions

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager Helper** - Automatic throttling:

```typescript
import { PhaserAdapter, InputManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // InputManager automatically throttles input submissions
  this.inputManager = new InputManager(this.adapter, this, {
    type: 'wasd-arrows',
    actionName: 'move',
    throttleMs: 50  // Only submit every 50ms (20 updates/second)
  });

  // That's it! Input is automatically throttled
}
```

**Benefits:**
- ✅ Automatic throttling
- ✅ No manual timing logic
- ✅ Optimized for performance

{/snippet}

{#snippet core()}

**Manual Throttling** - Custom timing control:

```typescript
// BAD - Submit every frame (60 times per second!)
update() {
  const keys = this.input.keyboard.createCursorKeys();
  runtime.submitAction('move', {
    left: keys.left.isDown,
    right: keys.right.isDown
  }); // Too many updates!
}

// GOOD - Throttle submissions manually
class GameScene extends Phaser.Scene {
  private lastMoveTime = 0;
  private moveDebounce = 50; // 20 updates per second

  update() {
    const now = this.time.now;
    if (now - this.lastMoveTime < this.moveDebounce) return;

    const keys = this.input.keyboard.createCursorKeys();
    if (keys.left.isDown || keys.right.isDown || keys.up.isDown || keys.down.isDown) {
      runtime.submitAction('move', {
        left: keys.left.isDown,
        right: keys.right.isDown,
        up: keys.up.isDown,
        down: keys.down.isDown
      });
      this.lastMoveTime = now;
    }
  }
}
```

**Benefits:**
- ✅ Precise throttle control
- ✅ Custom timing logic
- ✅ Conditional submission

{/snippet}
</CodeTabs>

### 3. Use Delta Compression for Movement

```typescript
// BAD - Send absolute positions
runtime.submitAction('move', {
  x: 123,
  y: 456
});

// GOOD - Send deltas (smaller values)
const player = runtime.getState().players[playerId];
runtime.submitAction('move', {
  dx: newX - player.x,
  dy: newY - player.y
});

// Action applies delta
actions: {
  move: {
    apply(state, context, input: { dx: number; dy: number }) {
      const player = state.players[context.targetId];
      player.x += input.dx;
      player.y += input.dy;
    }
  }
}
```

## Sync Optimization

### 1. Adjust Sync Rate

```typescript
// Default: 50ms (20 FPS)
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncRateMs: 50 // 20 updates per second
});

// Slower-paced game: 100ms (10 FPS)
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncRateMs: 100 // Lower bandwidth, higher latency
});

// Fast-paced game: 33ms (30 FPS)
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncRateMs: 33 // Higher bandwidth, lower latency
});
```

**Guideline:**
- Turn-based: 200-500ms
- Strategy: 100-200ms
- Action: 33-50ms
- Fighting: 16-33ms

### 2. Sync Only Changed Properties

martini-kit's diff algorithm automatically does this, but you can help:

```typescript
// BAD - Changing references creates larger diffs
actions: {
  tick: {
    apply(state, context) {
      // This creates a new array reference
      state.projectiles = state.projectiles.filter(p => p.alive);
    }
  }
}

// GOOD - Mutate in place
actions: {
  tick: {
    apply(state, context) {
      // Remove dead projectiles in place
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        if (!state.projectiles[i].alive) {
          state.projectiles.splice(i, 1);
        }
      }
    }
  }
}
```

### 3. Use Spatial Culling for Updates

```typescript
// Only sync nearby entities to each player
interface GameState {
  entities: Record<string, Entity>;
  playerViews: Record<string, string[]>; // playerId -> visible entity IDs
}

actions: {
  tick: {
    apply(state, context) {
      // Update player views
      for (const [playerId, player] of Object.entries(state.players)) {
        const viewDistance = 300;
        state.playerViews[playerId] = Object.keys(state.entities).filter(id => {
          const entity = state.entities[id];
          const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
          return distance <= viewDistance;
        });
      }
    }
  }
}

// Clients only render visible entities
this.adapter.onChange((state) => {
  const visibleIds = state.playerViews[this.adapter.getMyPlayerId()];
  for (const id of visibleIds) {
    const entity = state.entities[id];
    this.renderEntity(id, entity);
  }
});
```

## Rendering Optimization

### 1. Use Object Pooling

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager Helper** - Built-in pooling:

```typescript
import { PhaserAdapter, SpriteManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // SpriteManager automatically pools sprites
  this.spriteManager = new SpriteManager(this.adapter, this, {
    spriteKey: 'projectile',
    stateKey: 'projectiles',
    poolSize: 100  // Pre-allocate 100 sprites
  });

  // That's it! Pooling is automatic
  // Sprites are reused as state.projectiles changes
}
```

**Benefits:**
- ✅ Automatic sprite pooling
- ✅ No manual acquire/release
- ✅ Optimized for performance

{/snippet}

{#snippet core()}

**Manual Pooling** - Custom pool implementation:

```typescript
class SpritePool {
  private pool: Phaser.GameObjects.Sprite[] = [];
  private scene: Phaser.Scene;
  private texture: string;

  constructor(scene: Phaser.Scene, texture: string, poolSize: number = 50) {
    this.scene = scene;
    this.texture = texture;

    // Pre-create sprites
    for (let i = 0; i < poolSize; i++) {
      const sprite = scene.add.sprite(0, 0, texture);
      sprite.setVisible(false);
      sprite.setActive(false);
      this.pool.push(sprite);
    }
  }

  acquire(): Phaser.GameObjects.Sprite {
    // Reuse from pool
    const sprite = this.pool.find(s => !s.active);
    if (sprite) {
      sprite.setVisible(true);
      sprite.setActive(true);
      return sprite;
    }

    // Create new if pool exhausted
    const newSprite = this.scene.add.sprite(0, 0, this.texture);
    this.pool.push(newSprite);
    return newSprite;
  }

  release(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setVisible(false);
    sprite.setActive(false);
    sprite.setPosition(0, 0);
  }
}

// Usage
create() {
  this.projectilePool = new SpritePool(this, 'projectile', 100);
}

update() {
  for (const proj of state.projectiles) {
    const sprite = this.projectilePool.acquire();
    sprite.setPosition(proj.x, proj.y);
  }
}
```

**Benefits:**
- ✅ Full control over pooling logic
- ✅ Custom acquisition strategy
- ✅ Flexible pool management

{/snippet}
</CodeTabs>

### 2. Use Texture Atlases

```typescript
// BAD - 50 separate image files
this.load.image('player1', 'player1.png');
this.load.image('player2', 'player2.png');
// ... 48 more

// GOOD - Single atlas
this.load.atlas('game', 'game-atlas.png', 'game-atlas.json');

// Use with frames
const sprite = this.add.sprite(100, 100, 'game', 'player1');
```

**Benefits:**
- Fewer HTTP requests
- Better GPU texture cache
- ~70% smaller total size

### 3. Disable Unused Phaser Systems

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  render: {
    antialias: false,      // Disable if not needed
    pixelArt: true,        // For pixel art games
    roundPixels: true      // Snap to pixels
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,        // Disable in production
      fps: 60,
      gravity: { x: 0, y: 0 }
    }
  },
  audio: {
    noAudio: false         // Set true if no sound
  }
};
```

### 4. Limit Draw Calls

```typescript
// BAD - Individual rectangles (many draw calls)
for (let i = 0; i < 100; i++) {
  this.add.rectangle(i * 10, 100, 8, 8, 0xff0000);
}

// GOOD - Use Graphics object (single draw call)
const graphics = this.add.graphics();
graphics.fillStyle(0xff0000);
for (let i = 0; i < 100; i++) {
  graphics.fillRect(i * 10, 100, 8, 8);
}
```

## Physics Optimization

### 1. Reduce Physics Bodies

```typescript
// BAD - Physics for everything (1000 bodies)
for (const particle of state.particles) {
  const sprite = this.add.sprite(particle.x, particle.y, 'particle');
  this.physics.add.existing(sprite); // Physics body
}

// GOOD - Physics only for gameplay (20 bodies)
// Use visual-only sprites for particles
for (const particle of state.particles) {
  const sprite = this.add.sprite(particle.x, particle.y, 'particle');
  // No physics - just visuals
}
```

**Guideline:** Keep physics bodies under 200 for 60 FPS

### 2. Use Static Bodies

```typescript
// BAD - Dynamic bodies for walls
const walls = this.physics.add.group();
for (const wall of levelData.walls) {
  walls.create(wall.x, wall.y, 'wall');
}

// GOOD - Static bodies (10x faster)
const walls = this.physics.add.staticGroup();
for (const wall of levelData.walls) {
  walls.create(wall.x, wall.y, 'wall');
}
```

### 3. Spatial Partitioning for Collisions

```typescript
// BAD - Check all vs all (O(n²))
for (const p of players) {
  for (const e of enemies) {
    if (checkCollision(p, e)) {
      // Handle collision
    }
  }
}
// 100 players × 100 enemies = 10,000 checks!

// GOOD - Grid-based spatial partitioning (O(n))
const GRID_SIZE = 100;
const grid = new Map<string, Entity[]>();

// Group entities by grid cell
for (const entity of allEntities) {
  const cellKey = `${Math.floor(entity.x / GRID_SIZE)},${Math.floor(entity.y / GRID_SIZE)}`;
  if (!grid.has(cellKey)) grid.set(cellKey, []);
  grid.get(cellKey)!.push(entity);
}

// Only check within same cell
for (const entities of grid.values()) {
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (checkCollision(entities[i], entities[j])) {
        // Handle collision
      }
    }
  }
}
// ~100 checks instead of 10,000!
```

## Memory Optimization

### 1. Clean Up Unused Resources

```typescript
class GameScene extends Phaser.Scene {
  private spriteCache = new Map<string, Phaser.GameObjects.Sprite>();

  update() {
    const currentIds = new Set(Object.keys(state.entities));

    // Remove sprites for despawned entities
    for (const [id, sprite] of this.spriteCache) {
      if (!currentIds.has(id)) {
        sprite.destroy(); // Free memory
        this.spriteCache.delete(id);
      }
    }
  }

  shutdown() {
    // Clean up on scene shutdown
    for (const sprite of this.spriteCache.values()) {
      sprite.destroy();
    }
    this.spriteCache.clear();
  }
}
```

### 2. Destroy Runtime on Cleanup

```typescript
class GameScene extends Phaser.Scene {
  create() {
    this.runtime = new GameRuntime(game, transport, config);

    // Register cleanup
    this.events.once('shutdown', () => {
      this.runtime.destroy(); // Prevents memory leaks
    });
  }
}
```

### 3. Limit Event History

```typescript
// If using event queue pattern
interface GameState {
  events: Array<GameEvent>;
}

actions: {
  tick: {
    apply(state, context) {
      // Keep only recent events
      const MAX_EVENTS = 50;
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
    }
  }
}
```

## Profiling & Monitoring

### 1. Use Chrome DevTools

```typescript
// Mark performance sections
console.time('state_update');
runtime.submitAction('tick', { delta: 16 });
console.timeEnd('state_update');

// Profile with Performance API
const start = performance.now();
// ... expensive operation
const duration = performance.now() - start;
console.log(`Operation took ${duration.toFixed(2)}ms`);
```

### 2. Track Key Metrics

```typescript
class PerformanceMonitor {
  private metrics = {
    fps: 0,
    stateSize: 0,
    entityCount: 0,
    actionRate: 0,
    latency: 0
  };

  update(game: Phaser.Game, runtime: GameRuntime) {
    const state = runtime.getState();

    this.metrics.fps = game.loop.actualFps;
    this.metrics.stateSize = JSON.stringify(state).length;
    this.metrics.entityCount = Object.keys(state.entities || {}).length;
    this.metrics.latency = runtime.getTransport().metrics?.getLatencyMs?.() || 0;

    // Log warnings
    if (this.metrics.fps < 50) {
      console.warn('Low FPS:', this.metrics.fps);
    }

    if (this.metrics.stateSize > 100_000) {
      console.warn('Large state:', this.metrics.stateSize, 'bytes');
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

### 3. Use StateInspector for Debugging

```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector({
  maxSnapshots: 50,
  maxActions: 500,
  snapshotIntervalMs: 1000,
  ignoreActions: ['tick', 'interpolate']
});

inspector.attach(runtime);

// Monitor stats
setInterval(() => {
  const stats = inspector.getStats();
  console.log('Actions per second:', stats.totalActions / 60);
  console.log('State changes per second:', stats.totalStateChanges / 60);
}, 60000);
```

## Network Optimization

### 1. Enable Compression

Server-side GZIP/Brotli:

```typescript
// Express server
import compression from 'compression';
app.use(compression());
```

### 2. Use Binary Protocols (Advanced)

For extremely high-performance games:

```typescript
// Use MessagePack instead of JSON
import { encode, decode } from 'msgpackr';

// In transport
send(message: any) {
  const binary = encode(message);
  this.ws.send(binary);
}

// ~40% smaller than JSON
```

### 3. Batch Messages

```typescript
// Instead of sending each action immediately
const pendingActions: any[] = [];

function queueAction(action: any) {
  pendingActions.push(action);
}

setInterval(() => {
  if (pendingActions.length > 0) {
    transport.send({
      type: 'action_batch',
      actions: pendingActions
    });
    pendingActions.length = 0;
  }
}, 50); // Batch every 50ms
```

## Optimization Checklist

Before releasing:

- [ ] **State size &lt; 10 KB** - Measure with `JSON.stringify(state).length`
- [ ] **Sync rate tuned** - 33-100ms based on game type
- [ ] **Actions debounced** - Max 20-30 per second per player
- [ ] **Physics bodies &lt; 200** - Use visual-only sprites when possible
- [ ] **Texture atlases** - Combine sprites into atlases
- [ ] **Object pooling** - For frequently created/destroyed objects
- [ ] **Static bodies** - Use for walls/obstacles
- [ ] **Spatial partitioning** - For large numbers of entities
- [ ] **Memory cleanup** - Destroy unused sprites and runtimes
- [ ] **Profiling done** - Use Chrome DevTools Performance tab
- [ ] **Metrics tracked** - Monitor FPS, state size, latency

## Performance Targets

### Minimum Specs
- **FPS:** 30 (playable)
- **Latency:** &lt; 100ms
- **Bandwidth:** &lt; 200 KB/s
- **State size:** &lt; 20 KB

### Recommended Specs
- **FPS:** 60 (smooth)
- **Latency:** &lt; 50ms
- **Bandwidth:** &lt; 100 KB/s
- **State size:** &lt; 10 KB

### High-End Targets
- **FPS:** 120+ (competitive)
- **Latency:** &lt; 30ms
- **Bandwidth:** &lt; 50 KB/s
- **State size:** &lt; 5 KB

## See Also

- [Best Practices](./best-practices.md) - Development patterns
- [Physics and Collision](./physics-and-collision.md) - Physics optimization
- [Deployment](./deployment.md) - Production deployment
- [Testing](./testing.md) - Performance testing
