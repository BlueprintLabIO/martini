<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Shooting Mechanics: Advanced Aiming

Sophisticated aiming and firing patterns - mouse targeting, automatic weapons, and bullet patterns.

> **Learning Path:** [Basics](./01-basics) → You are here → [Weapon Systems](./03-systems)

## Table of Contents

- [Aim Toward Cursor](#aim-toward-cursor)
- [Automatic Firing](#automatic-firing)
- [Bullet Patterns](#bullet-patterns)

---

## Aim Toward Cursor

**Use Case:** Mouse-based shooters

Shoot toward mouse cursor position.

### Step 1: Track Aim Position

Add aim coordinates to player state:

```typescript
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          aimX: 400, // Cursor position
          aimY: 300,
        },
      ])
    ),
    bullets: [],
    nextBulletId: 0,
  }),
  // ... actions next
});
```

### Step 2: Update Aim Position

Create action to update where player is aiming:

```typescript
actions: {
  aim: {
    apply: (state, context, input: { x: number; y: number }) => {
      const player = state.players[context.targetId];
      if (!player) return;

      // Update aim position from mouse/touch
      player.aimX = input.x;
      player.aimY = input.y;
    },
  },
  // ... shoot action next
}
```

### Step 3: Shoot Toward Aim Point

Calculate direction from player to cursor:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    // Calculate direction to cursor
    const dx = player.aimX - player.x;
    const dy = player.aimY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const BULLET_SPEED = 400;

      // Normalize direction vector for consistent speed
      state.bullets.push({
        id: state.nextBulletId++,
        x: player.x,
        y: player.y,
        velocityX: (dx / distance) * BULLET_SPEED,
        velocityY: (dy / distance) * BULLET_SPEED,
        ownerId: context.targetId,
        lifetime: 2000,
      });
    }
  },
},
```

### Step 4: Handle Mouse Input

Submit aim position from Phaser:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager** - Automatic pointer tracking:

```typescript
import { PhaserAdapter, InputManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Automatically tracks pointer and submits aim action
  this.inputManager = new InputManager(this.adapter, this, {
    type: 'pointer',
    actionName: 'aim',
    submitOnMove: true,
  });

  // Shoot on click
  this.input.on('pointerdown', () => {
    this.runtime.submitAction('shoot');
  });
}
```

**Benefits:**
- ✅ Auto-submits pointer position
- ✅ Handles both mouse and touch
- ✅ Just 3 lines for input handling

{/snippet}

{#snippet core()}

**Manual Pointer Handling** - Full control:

```typescript
update(time: number, delta: number) {
  const pointer = this.input.activePointer;

  // Update aim position every frame
  this.runtime.submitAction('aim', {
    x: pointer.x,
    y: pointer.y,
  });

  // Shoot on click
  if (pointer.isDown) {
    this.runtime.submitAction('shoot');
  }

  // ... rest of update ...
}
```

{/snippet}
</CodeTabs>

**What You've Built:**
- ✅ Mouse aiming
- ✅ Shoot toward cursor
- ✅ Touch-friendly
- ✅ Normalized bullet velocity

---

## Automatic Firing

**Use Case:** Auto-fire weapons, hold-to-shoot

Continuous firing while button held.

### Client-Side Auto-Fire

Implement firing rate limit on client:

```typescript
export class GameScene extends Phaser.Scene {
  private shootKey!: Phaser.Input.Keyboard.Key;
  private lastShotTime = 0;
  private readonly SHOT_INTERVAL = 200; // ms between shots

  create() {
    this.shootKey = this.input.keyboard!.addKey('SPACE');
  }

  update(time: number, delta: number) {
    // Auto-fire while holding space
    if (this.shootKey.isDown) {
      // Check if enough time has passed since last shot
      if (time - this.lastShotTime >= this.SHOT_INTERVAL) {
        this.runtime.submitAction('shoot');
        this.lastShotTime = time;
      }
    }

    // ... rest of update ...
  }
}
```

### With Mouse Auto-Fire

Combine with cursor aiming:

```typescript
update(time: number, delta: number) {
  const pointer = this.input.activePointer;

  // Update aim
  this.runtime.submitAction('aim', {
    x: pointer.x,
    y: pointer.y,
  });

  // Auto-fire while mouse held
  if (pointer.isDown) {
    if (time - this.lastShotTime >= this.SHOT_INTERVAL) {
      this.runtime.submitAction('shoot');
      this.lastShotTime = time;
    }
  }
}
```

**What You've Built:**
- ✅ Hold to fire
- ✅ Client-side rate limiting
- ✅ Smooth auto-fire
- ✅ Works with mouse or keyboard

**Why Client-Side?**
- Reduces network traffic (only sends shots, not "holding" state)
- More responsive feel
- Server still validates with cooldowns

---

## Bullet Patterns

**Use Case:** Boss attacks, special abilities

Create interesting bullet patterns.

### Spread Shot

Fire multiple bullets in a cone:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    const BULLET_SPEED = 400;
    const SPREAD_ANGLE = Math.PI / 6; // 30 degrees total spread
    const NUM_BULLETS = 3;

    // Create bullets in a spread pattern
    for (let i = 0; i < NUM_BULLETS; i++) {
      // Calculate angle offset for this bullet
      const angleOffset =
        ((i - (NUM_BULLETS - 1) / 2) * SPREAD_ANGLE) / (NUM_BULLETS - 1);
      const angle = player.rotation + angleOffset;

      state.bullets.push({
        id: state.nextBulletId++,
        x: player.x,
        y: player.y,
        velocityX: Math.cos(angle) * BULLET_SPEED,
        velocityY: Math.sin(angle) * BULLET_SPEED,
        ownerId: context.targetId,
        lifetime: 2000,
      });
    }
  },
},
```

**Parameters to Adjust:**
- `NUM_BULLETS`: How many bullets (3, 5, 7, etc.)
- `SPREAD_ANGLE`: How wide the cone (larger = wider spread)
- `BULLET_SPEED`: Same for all or vary per bullet

### Circular Pattern

Fire bullets in all directions:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    const BULLET_SPEED = 300;
    const NUM_BULLETS = 8; // Evenly spaced around circle

    for (let i = 0; i < NUM_BULLETS; i++) {
      // Divide circle into equal segments
      const angle = (Math.PI * 2 * i) / NUM_BULLETS;

      state.bullets.push({
        id: state.nextBulletId++,
        x: player.x,
        y: player.y,
        velocityX: Math.cos(angle) * BULLET_SPEED,
        velocityY: Math.sin(angle) * BULLET_SPEED,
        ownerId: context.targetId,
        lifetime: 2000,
      });
    }
  },
},
```

**Use Cases:**
- Boss "bullet hell" attacks
- Area denial abilities
- Explosive projectiles

### Wave Pattern

Bullets that move in a sine wave:

#### Step 1: Add Wave Properties to Bullets

Extend bullet type with wave data:

```typescript
type Bullet = {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  ownerId: string;
  lifetime: number;
  // Wave-specific properties
  waveAmplitude?: number;
  waveFrequency?: number;
  wavePhase?: number;
};
```

#### Step 2: Create Wave Bullet

Add wave properties when spawning:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    const BULLET_SPEED = 400;

    state.bullets.push({
      id: state.nextBulletId++,
      x: player.x,
      y: player.y,
      velocityX: Math.cos(player.rotation) * BULLET_SPEED,
      velocityY: Math.sin(player.rotation) * BULLET_SPEED,
      ownerId: context.targetId,
      lifetime: 2000,
      // Add wave properties
      waveAmplitude: 50,  // How much it waves
      waveFrequency: 5,   // How fast it waves
      wavePhase: 0,       // Starting position
    });
  },
},
```

#### Step 3: Update Wave Motion

Apply wave movement in tick:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    const deltaSeconds = input.delta / 1000;

    for (const bullet of state.bullets) {
      // Check if this is a wave bullet
      if (bullet.wavePhase !== undefined) {
        // Update wave phase
        bullet.wavePhase += bullet.waveFrequency * deltaSeconds;

        // Calculate perpendicular offset (sine wave)
        const waveOffset = Math.sin(bullet.wavePhase) * bullet.waveAmplitude;

        // Get angle perpendicular to bullet direction
        const perpAngle =
          Math.atan2(bullet.velocityY, bullet.velocityX) + Math.PI / 2;

        // Move bullet forward + wave offset
        bullet.x +=
          bullet.velocityX * deltaSeconds +
          Math.cos(perpAngle) * waveOffset * deltaSeconds;
        bullet.y +=
          bullet.velocityY * deltaSeconds +
          Math.sin(perpAngle) * waveOffset * deltaSeconds;
      } else {
        // Normal bullet movement
        bullet.x += bullet.velocityX * deltaSeconds;
        bullet.y += bullet.velocityY * deltaSeconds;
      }

      bullet.lifetime -= input.delta;
    }

    // ... cleanup expired bullets ...
  },
},
```

**Wave Pattern Uses:**
- Homing missiles (combine with targeting)
- Magical projectiles
- Unique weapon effects

**What You've Learned:**
- ✅ Spread shot
- ✅ Circular burst
- ✅ Wave patterns
- ✅ Boss attacks

---

## Combining Patterns

Mix patterns for interesting effects:

```typescript
// Spread shot + Wave motion
for (let i = 0; i < 5; i++) {
  const angleOffset = ((i - 2) * Math.PI / 12);
  const angle = player.rotation + angleOffset;

  state.bullets.push({
    // ... standard properties ...
    velocityX: Math.cos(angle) * 400,
    velocityY: Math.sin(angle) * 400,
    // Add wave to each bullet
    waveAmplitude: 30,
    waveFrequency: 3,
    wavePhase: 0,
  });
}
```

## Next Steps

You now have advanced shooting mechanics. Continue to:

- **[Weapon Systems](./03-systems)** - Multiple weapons, ammo management, and best practices

Or explore related topics:

- **[Basics](./01-basics)** - Review core mechanics
- **[Health and Damage](/docs/latest/recipes/health-and-damage)** - Make bullets deal damage

## See Also

- [Player Movement](/docs/latest/recipes/player-movement) - Movement and rotation
- [Arena Blaster Example](/docs/latest/examples/overview#arena-blaster) - Complete shooting example
- [Phaser InputManager](/docs/latest/api/phaser/input-manager) - Input handling
