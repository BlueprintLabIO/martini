<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Shooting Mechanics: Basics

Core shooting patterns every multiplayer game needs - projectile spawning, cooldowns, and directional firing.

> **Learning Path:** Start here → [Advanced Aiming](./02-advanced-aiming) → [Weapon Systems](./03-systems)

## Table of Contents

- [Basic Projectile System](#basic-projectile-system)
- [Shooting with Cooldowns](#shooting-with-cooldowns)
- [Directional Shooting (Player Facing)](#directional-shooting-player-facing)

---

## Basic Projectile System

**Use Case:** Any game with projectiles

Simple bullet spawning and movement.

### Step 1: Define Projectile State

First, define what a bullet looks like in your game state:

```typescript
import { defineGame } from '@martini-kit/core';

const BULLET_SPEED = 400;
const BULLET_LIFETIME = 2000; // ms

// Bullet type definition
type Bullet = {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  ownerId: string;
  lifetime: number; // ms remaining
};
```

### Step 2: Setup Game State

Initialize the game with players and empty bullet array:

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          rotation: 0,
        },
      ])
    ),
    bullets: [] as Bullet[],
    nextBulletId: 0,
  }),
  // ... actions next
});
```

### Step 3: Add Shooting Action

Create bullets when players shoot:

```typescript
actions: {
  shoot: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player) return;

      // Create bullet at player position
      state.bullets.push({
        id: state.nextBulletId++,
        x: player.x,
        y: player.y,
        velocityX: Math.cos(player.rotation) * BULLET_SPEED,
        velocityY: Math.sin(player.rotation) * BULLET_SPEED,
        ownerId: context.targetId,
        lifetime: BULLET_LIFETIME,
      });
    },
  },
  // ... tick action next
}
```

### Step 4: Update Bullets Each Frame

Move bullets and remove expired ones:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    const deltaSeconds = input.delta / 1000;

    // Update bullets (iterate backwards for safe removal)
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];

      // Move bullet
      bullet.x += bullet.velocityX * deltaSeconds;
      bullet.y += bullet.velocityY * deltaSeconds;

      // Decrease lifetime
      bullet.lifetime -= input.delta;

      // Remove if expired or out of bounds
      if (
        bullet.lifetime <= 0 ||
        bullet.x < 0 ||
        bullet.x > 800 ||
        bullet.y < 0 ||
        bullet.y > 600
      ) {
        state.bullets.splice(i, 1);
      }
    }
  },
},
```

### Step 5: Render Bullets in Phaser

Now visualize the bullets in your Phaser scene:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager Helper** - Automatically syncs bullet sprites with state:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter, SpriteManager } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private bulletManager!: SpriteManager;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Automatically sync bullet collection
    this.bulletManager = new SpriteManager(this.adapter, this, {
      collection: 'bullets',
      createSprite: (bullet) => {
        return this.add.circle(bullet.x, bullet.y, 4, 0xffff00);
      },
      updateSprite: (sprite, bullet) => {
        sprite.x = bullet.x;
        sprite.y = bullet.y;
      },
    });
  }

  update(time: number, delta: number) {
    // Shoot on spacebar
    if (this.input.keyboard!.addKey('SPACE').isDown) {
      this.runtime.submitAction('shoot');
    }

    if (this.adapter.isHost()) {
      this.runtime.submitAction('tick', { delta });
    }

    this.adapter.update(time, delta);
  }
}
```

**Benefits:**
- ✅ Auto-creates sprites when bullets spawn
- ✅ Auto-destroys sprites when bullets expire
- ✅ Handles all sprite lifecycle management
- ✅ Just 10 lines instead of 40+

{/snippet}

{#snippet core()}

**Manual Sprite Management** - Full control over sprite lifecycle:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private bulletSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Listen for state changes
    this.adapter.onChange((state) => {
      // Sync bullet sprites
      const currentBulletIds = new Set(state.bullets.map((b) => b.id));

      // Remove destroyed bullets
      for (const [id, sprite] of this.bulletSprites.entries()) {
        if (!currentBulletIds.has(id)) {
          sprite.destroy();
          this.bulletSprites.delete(id);
        }
      }

      // Create new bullets or update existing
      for (const bullet of state.bullets) {
        if (!this.bulletSprites.has(bullet.id)) {
          const sprite = this.add.circle(bullet.x, bullet.y, 4, 0xffff00);
          this.bulletSprites.set(bullet.id, sprite);
        } else {
          // Update position
          const sprite = this.bulletSprites.get(bullet.id)!;
          sprite.x = bullet.x;
          sprite.y = bullet.y;
        }
      }
    });
  }

  update(time: number, delta: number) {
    // Shoot on spacebar
    if (this.input.keyboard!.addKey('SPACE').isDown) {
      this.runtime.submitAction('shoot');
    }

    if (this.adapter.isHost()) {
      this.runtime.submitAction('tick', { delta });
    }

    this.adapter.update(time, delta);
  }
}
```

**Use when:**
- Custom sprite pooling needed
- Complex sprite state beyond position
- Special destruction effects

{/snippet}
</CodeTabs>

**What You've Built:**
- ✅ Bullet spawning
- ✅ Lifetime management
- ✅ Automatic cleanup
- ✅ Boundary removal

---

## Shooting with Cooldowns

**Use Case:** Prevent spam shooting

Rate-limit weapon firing with cooldowns.

### Step 1: Add Cooldown State

Track cooldown timers per player:

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, rotation: 0 }])
    ),
    bullets: [],
    shootCooldowns: {} as Record<string, number>, // ms until next shot
    nextBulletId: 0,
  }),
  // ... actions next
});
```

### Step 2: Check Cooldown Before Shooting

Prevent shooting if on cooldown:

```typescript
const SHOOT_COOLDOWN = 500; // ms between shots

actions: {
  shoot: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player) return;

      // Check cooldown - IMPORTANT: do this first!
      const cooldown = state.shootCooldowns[context.targetId] || 0;
      if (cooldown > 0) {
        console.log('On cooldown:', cooldown);
        return;
      }

      // Create bullet (same as before)
      state.bullets.push({
        id: state.nextBulletId++,
        x: player.x,
        y: player.y,
        velocityX: Math.cos(player.rotation) * 400,
        velocityY: Math.sin(player.rotation) * 400,
        ownerId: context.targetId,
        lifetime: 2000,
      });

      // Set cooldown after shooting
      state.shootCooldowns[context.targetId] = SHOOT_COOLDOWN;
    },
  },
  // ... tick next
}
```

### Step 3: Decrease Cooldowns Each Frame

Update cooldowns in the tick action:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    const deltaSeconds = input.delta / 1000;

    // Update cooldowns - decrease each frame
    for (const playerId of Object.keys(state.shootCooldowns)) {
      state.shootCooldowns[playerId] = Math.max(
        0,
        state.shootCooldowns[playerId] - input.delta
      );
    }

    // Update bullets (same as before)
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      bullet.x += bullet.velocityX * deltaSeconds;
      bullet.y += bullet.velocityY * deltaSeconds;
      bullet.lifetime -= input.delta;

      if (
        bullet.lifetime <= 0 ||
        bullet.x < 0 ||
        bullet.x > 800 ||
        bullet.y < 0 ||
        bullet.y > 600
      ) {
        state.bullets.splice(i, 1);
      }
    }
  },
},
```

### Step 4: Show Cooldown UI

Visualize cooldown to player:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive cooldown display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Cooldown bar
  this.cooldownBar = this.add.rectangle(400, 580, 100, 10, 0x00ff00);
  this.cooldownBar.setOrigin(0.5);

  // Auto-updating cooldown text
  this.hud = createPlayerHUD(this.adapter, this, {
    controlHints: (myPlayer, state) => {
      const cooldown = state.shootCooldowns[this.adapter.playerId] || 0;
      return cooldown > 0
        ? `Cooldown: ${Math.ceil(cooldown / 100) / 10}s`
        : 'Ready to fire!';
    },
    controlsStyle: { fontSize: '14px', color: '#fff' },
    layout: { controls: { x: 400, y: 560 } }
  });

  this.adapter.onChange((state) => {
    const cooldown = state.shootCooldowns[this.adapter.playerId] || 0;
    const cooldownPercent = cooldown / SHOOT_COOLDOWN;
    this.cooldownBar.setScale(cooldownPercent, 1);
    this.cooldownBar.setFillStyle(cooldown === 0 ? 0x00ff00 : 0xff0000);
  });
}
```

{/snippet}

{#snippet core()}

**Manual Cooldown UI** - Full control over visualization:

```typescript
create() {
  // Cooldown bar
  this.cooldownBar = this.add.rectangle(400, 580, 100, 10, 0x00ff00);
  this.cooldownBar.setOrigin(0.5);

  this.adapter.onChange((state) => {
    const cooldown = state.shootCooldowns[this.adapter.getMyPlayerId()] || 0;
    const cooldownPercent = cooldown / SHOOT_COOLDOWN;
    this.cooldownBar.setScale(cooldownPercent, 1);

    // Change color based on ready state
    if (cooldown === 0) {
      this.cooldownBar.setFillStyle(0x00ff00); // Green = ready
    } else {
      this.cooldownBar.setFillStyle(0xff0000); // Red = cooling down
    }
  });
}
```

{/snippet}
</CodeTabs>

**What You've Added:**
- ✅ Rate limiting
- ✅ Visual cooldown feedback
- ✅ Per-player cooldowns
- ✅ Prevents spam

---

## Directional Shooting (Player Facing)

**Use Case:** Top-down shooters

Shoot in the direction the player is facing.

### Step 1: Update Rotation During Movement

Track player facing direction:

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          rotation: 0, // Radians, updated by movement
        },
      ])
    ),
    bullets: [],
    nextBulletId: 0,
  }),

  actions: {
    move: {
      apply: (state, context, input: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        // Update rotation based on movement direction
        if (dx !== 0 || dy !== 0) {
          player.rotation = Math.atan2(dy, dx);
        }

        // ... update velocity/position ...
      },
    },
    // ... shoot action next
  },
});
```

### Step 2: Shoot in Facing Direction

Use player rotation for bullet velocity:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    // Shoot in facing direction - use player.rotation!
    const BULLET_SPEED = 400;
    state.bullets.push({
      id: state.nextBulletId++,
      x: player.x,
      y: player.y,
      velocityX: Math.cos(player.rotation) * BULLET_SPEED,
      velocityY: Math.sin(player.rotation) * BULLET_SPEED,
      ownerId: context.targetId,
      lifetime: 2000,
    });
  },
},
```

**What You've Built:**
- ✅ Shoots in facing direction
- ✅ Rotation from movement
- ✅ Consistent with player orientation

---

## Next Steps

You now have the core shooting mechanics. Continue to:

- **[Advanced Aiming](./02-advanced-aiming)** - Mouse aiming, automatic firing, and bullet patterns
- **[Weapon Systems](./03-systems)** - Multiple weapons, ammo management, and best practices

## See Also

- [Player Movement](/docs/latest/recipes/player-movement) - Movement and rotation
- [Health and Damage](/docs/latest/recipes/health-and-damage) - Bullet collision
- [Arena Blaster Example](/docs/latest/examples/overview#arena-blaster) - Complete shooting example
