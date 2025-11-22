# Physics and Collision

This guide covers how to build physics-based multiplayer games with martini-kit, including physics synchronization, collision detection, and client-side prediction patterns.

## Architecture Overview

In martini-kit's host-authoritative model, physics follows a clear pattern:

```
┌─────────────────┐         ┌─────────────────┐
│   HOST          │         │   CLIENT        │
├─────────────────┤         ├─────────────────┤
│ ✓ Physics sim   │  sync   │ ✗ No physics    │
│ ✓ Collisions    │  ────>  │ ✓ Render only   │
│ ✓ Apply forces  │  state  │ ✓ Interpolate   │
│ ✓ Detect hits   │         │ ✓ Visual FX     │
└─────────────────┘         └─────────────────┘
```

**Key principle**: Physics runs ONLY on the host. Clients mirror the resulting positions.

## Basic Physics Setup

### Host-Only Physics

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    if (this.adapter.isHost()) {
      // ONLY host creates physics sprites
      const player = this.physics.add.sprite(100, 100, 'player');
      player.setBounce(0.2);
      player.setCollideWorldBounds(true);

      // Track sprite for automatic syncing
      this.adapter.trackSprite(player, `player-${playerId}`);
    } else {
      // Clients create VISUAL-ONLY sprites
      const player = this.add.sprite(100, 100, 'player');
      this.adapter.trackSprite(player, `player-${playerId}`);
    }

    // Subscribe to state changes (both host and clients)
    this.adapter.onChange((state) => {
      this.updateSprites(state);
    });
  }
}
```

### Syncing Physics Properties

When using `trackSprite()`, these properties are automatically synced:

- **Position**: `x`, `y`
- **Rotation**: `rotation` or `angle`
- **Velocity**: `velocityX`, `velocityY` (if you enable velocity syncing)
- **Scale**: `scaleX`, `scaleY`
- **Visibility**: `visible`

```typescript
// Host: Physics moves sprite automatically
if (this.adapter.isHost()) {
  const sprite = this.physics.add.sprite(100, 100, 'player');
  this.adapter.trackSprite(sprite, 'player-1', {
    syncVelocity: true  // Also sync velocity for smoother client interpolation
  });

  // Apply physics forces
  sprite.setVelocityX(200);
  // Position updates automatically, synced by martini-kit
}
```

## Collision Detection

### Basic Collision Setup

Collisions should ONLY be detected on the host:

```typescript
create() {
  if (this.adapter.isHost()) {
    const player = this.physics.add.sprite(100, 100, 'player');
    const walls = this.physics.add.staticGroup();

    // Add collision
    this.physics.add.collider(player, walls);
  }
}
```

### Collision with State Updates

When collisions affect game state, use actions:

```typescript
create() {
  if (this.adapter.isHost()) {
    const players = this.physics.add.group();
    const enemies = this.physics.add.group();

    // Detect overlap
    this.physics.add.overlap(
      players,
      enemies,
      (playerSprite, enemySprite) => {
        // Get IDs from sprite data
        const playerId = playerSprite.getData('id');
        const enemyId = enemySprite.getData('id');

        // Submit action to update state
        runtime.submitAction('playerHitEnemy', {
          playerId,
          enemyId,
          damage: 10
        });
      }
    );
  }
}
```

### Collision Actions Pattern

```typescript
// In game definition
actions: {
  playerHitEnemy: {
    apply(state, context, input: { playerId: string; enemyId: string; damage: number }) {
      const player = state.players[input.playerId];
      const enemy = state.enemies[input.enemyId];

      if (!player || !enemy) return;

      // Update health
      player.health -= input.damage;

      // Check for death
      if (player.health <= 0) {
        delete state.players[input.playerId];
      }

      // Emit event for client-side effects
      context.emit('playerHit', {
        playerId: input.playerId,
        damage: input.damage
      });
    }
  }
}
```

### Client-Side Visual Effects

Clients listen for collision events to show effects:

```typescript
create() {
  // Listen for collision events
  runtime.onEvent('playerHit', (playerId, payload) => {
    if (playerId === this.adapter.getMyPlayerId()) {
      // Show damage effect
      this.cameras.main.shake(100, 0.01);
      this.showDamageNumber(payload.damage);
    }
  });
}

private showDamageNumber(damage: number) {
  const player = this.playerSprites.get(this.adapter.getMyPlayerId());
  if (!player) return;

  const text = this.add.text(player.x, player.y - 40, `-${damage}`, {
    fontSize: '24px',
    color: '#ff0000',
    fontStyle: 'bold'
  });

  this.tweens.add({
    targets: text,
    y: text.y - 50,
    alpha: 0,
    duration: 1000,
    onComplete: () => text.destroy()
  });
}
```

## Physics Patterns

### Pattern 1: Projectile Physics

```typescript
// Game definition
interface GameState {
  players: Record<string, { x: number; y: number; health: number }>;
  projectiles: Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ownerId: string;
  }>;
}

actions: {
  shoot: {
    apply(state, context, input: { angle: number }) {
      const player = state.players[context.playerId];
      if (!player) return;

      const speed = 400;
      const projectile = {
        id: `proj-${context.tick}`,
        x: player.x,
        y: player.y,
        vx: Math.cos(input.angle) * speed,
        vy: Math.sin(input.angle) * speed,
        ownerId: context.playerId
      };

      state.projectiles.push(projectile);
    }
  },

  tick: {
    apply(state, context, input: { delta: number }) {
      const dt = input.delta / 1000; // Convert to seconds

      // Update projectiles (host only, via action)
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];

        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Remove if out of bounds
        if (proj.x < 0 || proj.x > 800 || proj.y < 0 || proj.y > 600) {
          state.projectiles.splice(i, 1);
        }
      }
    }
  }
}
```

```typescript
// Scene rendering
create() {
  this.projectileSprites = new Map();

  this.adapter.onChange((state) => {
    this.renderProjectiles(state.projectiles);
  });

  // Only host runs physics tick
  if (this.adapter.isHost()) {
    this.time.addEvent({
      delay: 16, // 60 FPS
      callback: () => {
        runtime.submitAction('tick', { delta: 16 });
      },
      loop: true
    });
  }
}

private renderProjectiles(projectiles: any[]) {
  const currentIds = new Set(projectiles.map(p => p.id));

  // Remove old sprites
  for (const [id, sprite] of this.projectileSprites) {
    if (!currentIds.has(id)) {
      sprite.destroy();
      this.projectileSprites.delete(id);
    }
  }

  // Update or create sprites
  for (const proj of projectiles) {
    let sprite = this.projectileSprites.get(proj.id);

    if (!sprite) {
      sprite = this.add.sprite(proj.x, proj.y, 'projectile');
      this.projectileSprites.set(proj.id, sprite);
    }

    sprite.x = proj.x;
    sprite.y = proj.y;
  }
}
```

### Pattern 2: Player Movement with Physics

```typescript
actions: {
  move: {
    apply(state, context, input: { direction: 'left' | 'right' | 'up' | 'down' }) {
      const player = state.players[context.playerId];
      if (!player) return;

      const speed = 5;

      switch (input.direction) {
        case 'left':
          player.vx = -speed;
          break;
        case 'right':
          player.vx = speed;
          break;
        case 'up':
          player.vy = -speed;
          break;
        case 'down':
          player.vy = speed;
          break;
      }
    }
  },

  tick: {
    apply(state, context, input: { delta: number }) {
      const dt = input.delta / 1000;

      // Update positions based on velocity
      for (const player of Object.values(state.players)) {
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        // Apply friction
        player.vx *= 0.9;
        player.vy *= 0.9;

        // Clamp to world bounds
        player.x = Math.max(0, Math.min(800, player.x));
        player.y = Math.max(0, Math.min(600, player.y));
      }
    }
  }
}
```

### Pattern 3: Platform Physics

For platformer games with gravity:

```typescript
interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

actions: {
  jump: {
    apply(state, context) {
      const player = state.players[context.playerId];
      if (!player || !player.onGround) return;

      player.vy = -500; // Jump velocity
      player.onGround = false;
    }
  },

  tick: {
    apply(state, context, input: { delta: number }) {
      const dt = input.delta / 1000;
      const gravity = 800;

      for (const player of Object.values(state.players)) {
        // Apply gravity
        player.vy += gravity * dt;

        // Update position
        player.y += player.vy * dt;
        player.x += player.vx * dt;

        // Check ground collision (simplified)
        const groundY = 500;
        if (player.y >= groundY) {
          player.y = groundY;
          player.vy = 0;
          player.onGround = true;
        } else {
          player.onGround = false;
        }

        // Apply friction
        player.vx *= 0.8;
      }
    }
  }
}
```

## Advanced Collision Patterns

### Spatial Partitioning

For games with many entities, use spatial partitioning to reduce collision checks:

```typescript
interface GameState {
  entities: Record<string, {
    x: number;
    y: number;
    type: 'player' | 'enemy' | 'projectile';
    gridX: number;  // Grid cell coordinates
    gridY: number;
  }>;
}

const GRID_SIZE = 100;

function getGridCell(x: number, y: number) {
  return {
    gridX: Math.floor(x / GRID_SIZE),
    gridY: Math.floor(y / GRID_SIZE)
  };
}

actions: {
  tick: {
    apply(state, context) {
      // Update grid positions
      for (const entity of Object.values(state.entities)) {
        const cell = getGridCell(entity.x, entity.y);
        entity.gridX = cell.gridX;
        entity.gridY = cell.gridY;
      }

      // Check collisions only within same/adjacent cells
      const entities = Object.entries(state.entities);

      for (const [id1, e1] of entities) {
        for (const [id2, e2] of entities) {
          if (id1 >= id2) continue; // Avoid duplicate checks

          // Skip if in distant cells
          const dx = Math.abs(e1.gridX - e2.gridX);
          const dy = Math.abs(e1.gridY - e2.gridY);
          if (dx > 1 || dy > 1) continue;

          // Check actual collision
          const distance = Math.hypot(e1.x - e2.x, e1.y - e2.y);
          if (distance < 50) {
            // Handle collision
            handleCollision(state, id1, id2, e1, e2);
          }
        }
      }
    }
  }
}
```

### Circle-Circle Collision

```typescript
function checkCircleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (r1 + r2);
}

actions: {
  tick: {
    apply(state, context) {
      const players = Object.entries(state.players);
      const enemies = Object.entries(state.enemies);

      for (const [playerId, player] of players) {
        for (const [enemyId, enemy] of enemies) {
          if (checkCircleCollision(
            player.x, player.y, 20,
            enemy.x, enemy.y, 15
          )) {
            // Collision detected
            player.health -= 10;
            context.emit('playerHitEnemy', { playerId, enemyId });
          }
        }
      }
    }
  }
}
```

### AABB (Axis-Aligned Bounding Box) Collision

```typescript
function checkAABBCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return (
    x1 < x2 + w2 &&
    x1 + w1 > x2 &&
    y1 < y2 + h2 &&
    y1 + h1 > y2
  );
}
```

## Client-Side Prediction (Optional)

For ultra-responsive controls, you can implement client-side prediction:

```typescript
class GameScene extends Phaser.Scene {
  private predictedPosition = { x: 0, y: 0 };

  update() {
    const myPlayer = this.adapter.getMyPlayer();
    if (!myPlayer) return;

    // Get input
    const moveX = this.keys.right.isDown ? 1 : this.keys.left.isDown ? -1 : 0;
    const moveY = this.keys.down.isDown ? 1 : this.keys.up.isDown ? -1 : 0;

    if (moveX !== 0 || moveY !== 0) {
      // Submit to server
      runtime.submitAction('move', { x: moveX, y: moveY });

      // Predict locally
      const speed = 5;
      this.predictedPosition.x = myPlayer.x + moveX * speed;
      this.predictedPosition.y = myPlayer.y + moveY * speed;
    }

    // Render sprite at predicted position
    const mySprite = this.playerSprites.get(this.adapter.getMyPlayerId());
    if (mySprite) {
      // Lerp between predicted and authoritative position
      mySprite.x += (this.predictedPosition.x - mySprite.x) * 0.3;
      mySprite.y += (this.predictedPosition.y - mySprite.y) * 0.3;
    }

    // Reconcile with server state
    this.adapter.onChange((state) => {
      const serverPlayer = state.players[this.adapter.getMyPlayerId()];
      if (serverPlayer) {
        // Snap to server position if difference is large
        const dx = serverPlayer.x - this.predictedPosition.x;
        const dy = serverPlayer.y - this.predictedPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
          // Large desync - snap to server
          this.predictedPosition.x = serverPlayer.x;
          this.predictedPosition.y = serverPlayer.y;
        }
      }
    });
  }
}
```

## Performance Optimization

### 1. Reduce Physics Complexity

```typescript
// BAD - Complex collision shapes
if (this.adapter.isHost()) {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(50, 80, true);
  body.setOffset(10, 20);
}

// GOOD - Simple circles/rectangles
if (this.adapter.isHost()) {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setCircle(25); // Simpler, faster
}
```

### 2. Limit Collision Checks

```typescript
// Check collisions only every N frames
actions: {
  tick: {
    apply(state, context) {
      // Only check collisions every 3rd tick
      if (context.tick % 3 === 0) {
        checkAllCollisions(state);
      }
    }
  }
}
```

### 3. Use Physics Groups Wisely

```typescript
create() {
  if (this.adapter.isHost()) {
    // Separate static and dynamic groups
    const staticWalls = this.physics.add.staticGroup();
    const dynamicEnemies = this.physics.add.group();

    // Static vs dynamic is faster than dynamic vs dynamic
    this.physics.add.collider(players, staticWalls);
  }
}
```

## Common Pitfalls

### Pitfall 1: Running Physics on Clients

```typescript
// WRONG ❌
update() {
  const player = this.playerSprites.get(this.adapter.getMyPlayerId());
  if (player) {
    player.setVelocityX(200); // Physics on client!
  }
}

// CORRECT ✅
update() {
  if (this.adapter.isHost()) {
    const player = this.playerSprites.get(this.adapter.getMyPlayerId());
    if (player) {
      player.setVelocityX(200); // Physics only on host
    }
  }
}
```

### Pitfall 2: Not Syncing Collision Results

```typescript
// WRONG ❌ - Collision detected but state not updated
this.physics.add.overlap(players, coins, (player, coin) => {
  coin.destroy(); // Only destroys on host's screen!
});

// CORRECT ✅ - Update state via action
this.physics.add.overlap(players, coins, (player, coin) => {
  const playerId = player.getData('id');
  const coinId = coin.getData('id');

  runtime.submitAction('collectCoin', { playerId, coinId });
  // Action removes coin from state, synced to all clients
});
```

### Pitfall 3: Forgetting to Check `isHost()`

```typescript
// WRONG ❌
create() {
  this.physics.add.sprite(100, 100, 'player');
  // Creates physics on both host and clients!
}

// CORRECT ✅
create() {
  if (this.adapter.isHost()) {
    this.physics.add.sprite(100, 100, 'player');
  } else {
    this.add.sprite(100, 100, 'player'); // Visual only
  }
}
```

## Testing Physics

```typescript
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
import { game } from './game';

describe('Physics', () => {
  it('should apply gravity', () => {
    const transport = new LocalTransport({ roomId: 'test', isHost: true });
    const runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: ['p1']
    });

    const initialY = runtime.getState().players.p1.y;

    // Run tick to apply gravity
    runtime.submitAction('tick', { delta: 16 });

    const newY = runtime.getState().players.p1.y;

    // Player should have fallen
    expect(newY).toBeGreaterThan(initialY);
  });

  it('should detect collision', () => {
    const transport = new LocalTransport({ roomId: 'test', isHost: true });
    const runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: ['p1']
    });

    // Position player and enemy close together
    const state = runtime.getState();
    state.players.p1.x = 100;
    state.players.p1.y = 100;
    state.enemies.e1 = { x: 105, y: 105 };

    // Run collision check
    runtime.submitAction('tick', { delta: 16 });

    // Player health should decrease
    expect(state.players.p1.health).toBeLessThan(100);
  });
});
```

## See Also

- [Best Practices](/docs/latest/guides/best-practices) - Performance optimization
- [Phaser Adapter API](/docs/latest/api/phaser/adapter) - PhaserAdapter reference
- [State Management](/docs/latest/concepts/state-management) - Understanding state sync
- [Actions](/docs/latest/concepts/actions) - Writing action handlers
