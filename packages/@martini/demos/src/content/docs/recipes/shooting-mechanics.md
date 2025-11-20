<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Shooting Mechanics Recipes

Common shooting and projectile patterns for multiplayer games. Copy and adapt these recipes for your game.

## Table of Contents

- [Basic Projectile System](#basic-projectile-system)
- [Shooting with Cooldowns](#shooting-with-cooldowns)
- [Directional Shooting (Player Facing)](#directional-shooting-player-facing)
- [Aim Toward Cursor](#aim-toward-cursor)
- [Automatic Firing](#automatic-firing)
- [Bullet Patterns](#bullet-patterns)
- [Weapon Switching](#weapon-switching)
- [Ammo Management](#ammo-management)

---

## Basic Projectile System

**Use Case:** Any game with projectiles

Simple bullet spawning and movement.

### Game Definition

```typescript
import { defineGame } from '@martini/core';

const BULLET_SPEED = 400;
const BULLET_LIFETIME = 2000; // ms

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
    bullets: [] as Array<{
      id: number;
      x: number;
      y: number;
      velocityX: number;
      velocityY: number;
      ownerId: string;
      lifetime: number; // ms remaining
    }>,
    nextBulletId: 0,
  }),

  actions: {
    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Create bullet
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

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        // Update bullets
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
  },
});
```

### Phaser Scene (Rendering Bullets)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager Helper** - Automatically syncs bullet sprites with state:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter, SpriteManager } from '@martini/phaser';

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
import { PhaserAdapter } from '@martini/phaser';

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

      // Create new bullets
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

**Features:**
- ✅ Bullet spawning
- ✅ Lifetime management
- ✅ Automatic cleanup
- ✅ Boundary removal

---

## Shooting with Cooldowns

**Use Case:** Prevent spam shooting

Rate-limit weapon firing with cooldowns.

### Game Definition

```typescript
const SHOOT_COOLDOWN = 500; // ms between shots

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, rotation: 0 }])
    ),
    bullets: [],
    shootCooldowns: {} as Record<string, number>, // ms until next shot
    nextBulletId: 0,
  }),

  actions: {
    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Check cooldown
        const cooldown = state.shootCooldowns[context.targetId] || 0;
        if (cooldown > 0) {
          console.log('On cooldown:', cooldown);
          return;
        }

        // Create bullet
        state.bullets.push({
          id: state.nextBulletId++,
          x: player.x,
          y: player.y,
          velocityX: Math.cos(player.rotation) * 400,
          velocityY: Math.sin(player.rotation) * 400,
          ownerId: context.targetId,
          lifetime: 2000,
        });

        // Set cooldown
        state.shootCooldowns[context.targetId] = SHOOT_COOLDOWN;
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        // Update cooldowns
        for (const playerId of Object.keys(state.shootCooldowns)) {
          state.shootCooldowns[playerId] = Math.max(
            0,
            state.shootCooldowns[playerId] - input.delta
          );
        }

        // Update bullets...
        // (same as basic projectile system)
      },
    },
  },
});
```

### Phaser Scene (Cooldown UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive cooldown display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Cooldown bar
  this.cooldownBar = this.add.rectangle(400, 580, 100, 10, 0x00ff00);
  this.cooldownBar.setOrigin(0.5);

  // Auto-updating cooldown text
  this.hud = createPlayerHUD(this.adapter, this, {
    controlHints: (myPlayer, state) => {
      const cooldown = state.shootCooldowns[this.adapter.playerId] || 0;
      return cooldown > 0 ? `Cooldown: ${Math.ceil(cooldown / 100) / 10}s` : 'Ready to fire!';
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

**Features:**
- ✅ Rate limiting
- ✅ Visual cooldown feedback
- ✅ Per-player cooldowns
- ✅ Prevents spam

---

## Directional Shooting (Player Facing)

**Use Case:** Top-down shooters

Shoot in the direction the player is facing.

### Game Definition

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

        // ... update velocity ...
      },
    },

    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Shoot in facing direction
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
  },
});
```

**Features:**
- ✅ Shoots in facing direction
- ✅ Rotation from movement
- ✅ Consistent with player orientation

---

## Aim Toward Cursor

**Use Case:** Mouse-based shooters

Shoot toward mouse cursor position.

### Game Definition

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          aimX: 400,
          aimY: 300,
        },
      ])
    ),
    bullets: [],
    nextBulletId: 0,
  }),

  actions: {
    aim: {
      apply: (state, context, input: { x: number; y: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.aimX = input.x;
        player.aimY = input.y;
      },
    },

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
  },
});
```

### Phaser Scene (Mouse Input)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager** - Automatic pointer tracking:

```typescript
import { PhaserAdapter, InputManager } from '@martini/phaser';

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

  // Update aim position
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

**Features:**
- ✅ Mouse aiming
- ✅ Shoot toward cursor
- ✅ Touch-friendly

---

## Automatic Firing

**Use Case:** Auto-fire weapons, hold-to-shoot

Continuous firing while button held.

### Phaser Scene (Client-Side)

```typescript
export class GameScene extends Phaser.Scene {
  private shootKey!: Phaser.Input.Keyboard.Key;
  private lastShotTime = 0;
  private readonly SHOT_INTERVAL = 200; // ms

  create() {
    this.shootKey = this.input.keyboard!.addKey('SPACE');
  }

  update(time: number, delta: number) {
    // Auto-fire while holding space
    if (this.shootKey.isDown) {
      if (time - this.lastShotTime >= this.SHOT_INTERVAL) {
        this.runtime.submitAction('shoot');
        this.lastShotTime = time;
      }
    }

    // ... rest of update ...
  }
}
```

**Features:**
- ✅ Hold to fire
- ✅ Client-side rate limiting
- ✅ Smooth auto-fire

---

## Bullet Patterns

**Use Case:** Boss attacks, special abilities

Create interesting bullet patterns.

### Spread Shot

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    const BULLET_SPEED = 400;
    const SPREAD_ANGLE = Math.PI / 6; // 30 degrees
    const NUM_BULLETS = 3;

    for (let i = 0; i < NUM_BULLETS; i++) {
      const angleOffset = ((i - (NUM_BULLETS - 1) / 2) * SPREAD_ANGLE) / (NUM_BULLETS - 1);
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

### Circular Pattern

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    const BULLET_SPEED = 300;
    const NUM_BULLETS = 8;

    for (let i = 0; i < NUM_BULLETS; i++) {
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

### Wave Pattern

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
      waveAmplitude: 50,      // Add wave properties
      waveFrequency: 5,
      wavePhase: 0,
    });
  },
},

tick: {
  apply: (state, context, input: { delta: number }) => {
    const deltaSeconds = input.delta / 1000;

    for (const bullet of state.bullets) {
      // Update wave phase
      if (bullet.wavePhase !== undefined) {
        bullet.wavePhase += bullet.waveFrequency * deltaSeconds;

        // Calculate perpendicular offset
        const waveOffset = Math.sin(bullet.wavePhase) * bullet.waveAmplitude;
        const perpAngle = Math.atan2(bullet.velocityY, bullet.velocityX) + Math.PI / 2;

        bullet.x += bullet.velocityX * deltaSeconds + Math.cos(perpAngle) * waveOffset * deltaSeconds;
        bullet.y += bullet.velocityY * deltaSeconds + Math.sin(perpAngle) * waveOffset * deltaSeconds;
      } else {
        // Normal bullet movement
        bullet.x += bullet.velocityX * deltaSeconds;
        bullet.y += bullet.velocityY * deltaSeconds;
      }

      bullet.lifetime -= input.delta;
    }
  },
},
```

**Features:**
- ✅ Spread shot
- ✅ Circular burst
- ✅ Wave patterns
- ✅ Boss attacks

---

## Weapon Switching

**Use Case:** Multiple weapon types

Switch between different weapons.

### Game Definition

```typescript
type WeaponType = 'pistol' | 'shotgun' | 'laser';

const WEAPON_CONFIG = {
  pistol: { damage: 10, cooldown: 300, bulletSpeed: 500, count: 1 },
  shotgun: { damage: 5, cooldown: 800, bulletSpeed: 400, count: 5, spread: Math.PI / 4 },
  laser: { damage: 20, cooldown: 1500, bulletSpeed: 800, count: 1 },
};

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          rotation: 0,
          currentWeapon: 'pistol' as WeaponType,
        },
      ])
    ),
    bullets: [],
    shootCooldowns: {},
    nextBulletId: 0,
  }),

  actions: {
    switchWeapon: {
      apply: (state, context, input: { weapon: WeaponType }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.currentWeapon = input.weapon;
      },
    },

    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const config = WEAPON_CONFIG[player.currentWeapon];

        // Check cooldown
        const cooldown = state.shootCooldowns[context.targetId] || 0;
        if (cooldown > 0) return;

        // Create bullets based on weapon
        for (let i = 0; i < config.count; i++) {
          let angle = player.rotation;

          // Add spread for shotgun
          if (config.count > 1) {
            const angleOffset = ((i - (config.count - 1) / 2) * config.spread) / (config.count - 1);
            angle += angleOffset;
          }

          state.bullets.push({
            id: state.nextBulletId++,
            x: player.x,
            y: player.y,
            velocityX: Math.cos(angle) * config.bulletSpeed,
            velocityY: Math.sin(angle) * config.bulletSpeed,
            ownerId: context.targetId,
            lifetime: 2000,
            damage: config.damage,
          });
        }

        // Set weapon-specific cooldown
        state.shootCooldowns[context.targetId] = config.cooldown;
      },
    },
  },
});
```

### Phaser Scene (Weapon UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive weapon display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Auto-updating weapon HUD
  this.hud = createPlayerHUD(this.adapter, this, {
    roleText: (myPlayer) => {
      if (!myPlayer) return '';
      return `Weapon: ${myPlayer.currentWeapon.toUpperCase()}`;
    },
    roleStyle: { fontSize: '16px', color: '#fff' },
    layout: { role: { x: 10, y: 10 } }
  });

  // Weapon switch keys
  this.input.keyboard!.on('keydown-ONE', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'pistol' });
  });

  this.input.keyboard!.on('keydown-TWO', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'shotgun' });
  });

  this.input.keyboard!.on('keydown-THREE', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'laser' });
  });
}
```

{/snippet}

{#snippet core()}

**Manual Weapon UI** - Full control:

```typescript
create() {
  // Weapon switch keys
  this.input.keyboard!.on('keydown-ONE', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'pistol' });
  });

  this.input.keyboard!.on('keydown-TWO', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'shotgun' });
  });

  this.input.keyboard!.on('keydown-THREE', () => {
    this.runtime.submitAction('switchWeapon', { weapon: 'laser' });
  });

  // Weapon display
  this.weaponText = this.add.text(10, 10, '', { fontSize: '16px', color: '#ffffff' });

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      this.weaponText.setText(`Weapon: ${myPlayer.currentWeapon.toUpperCase()}`);
    }
  });
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ Multiple weapons
- ✅ Weapon-specific properties
- ✅ Quick switching
- ✅ Different firing patterns

---

## Ammo Management

**Use Case:** Limited ammunition

Track and manage ammunition.

### Game Definition

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
          ammo: 30,
          maxAmmo: 30,
          isReloading: false,
          reloadTimer: 0,
        },
      ])
    ),
    bullets: [],
    nextBulletId: 0,
  }),

  actions: {
    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Check ammo
        if (player.ammo <= 0 || player.isReloading) {
          console.log('No ammo or reloading');
          return;
        }

        // Create bullet
        state.bullets.push({
          id: state.nextBulletId++,
          x: player.x,
          y: player.y,
          velocityX: Math.cos(player.rotation) * 400,
          velocityY: Math.sin(player.rotation) * 400,
          ownerId: context.targetId,
          lifetime: 2000,
        });

        // Consume ammo
        player.ammo--;
      },
    },

    reload: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Start reload if not full
        if (player.ammo < player.maxAmmo && !player.isReloading) {
          player.isReloading = true;
          player.reloadTimer = 1500; // 1.5 second reload
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        // Update reload timers
        for (const player of Object.values(state.players)) {
          if (player.isReloading) {
            player.reloadTimer -= input.delta;

            if (player.reloadTimer <= 0) {
              player.ammo = player.maxAmmo;
              player.isReloading = false;
              player.reloadTimer = 0;
            }
          }
        }

        // ... update bullets ...
      },
    },
  },
});
```

### Phaser Scene (Ammo UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive ammo display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Auto-updating ammo HUD
  this.hud = createPlayerHUD(this.adapter, this, {
    roleText: (myPlayer) => {
      if (!myPlayer) return '';
      if (myPlayer.isReloading) {
        const reloadPercent = (1 - myPlayer.reloadTimer / 1500) * 100;
        return `RELOADING... ${Math.floor(reloadPercent)}%`;
      }
      return `Ammo: ${myPlayer.ammo}/${myPlayer.maxAmmo}`;
    },
    roleStyle: { fontSize: '18px', color: '#fff' },
    layout: { role: { x: 10, y: 30 } }
  });

  // Reload key
  this.input.keyboard!.on('keydown-R', () => {
    this.runtime.submitAction('reload');
  });
}
```

**Benefits:**
- ✅ Reactive ammo counter
- ✅ Auto-updates on state change
- ✅ Cleaner code

{/snippet}

{#snippet core()}

**Manual Ammo UI** - Full control over styling:

```typescript
create() {
  // Ammo counter
  this.ammoText = this.add.text(10, 30, '', { fontSize: '18px', color: '#ffffff' });

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      if (myPlayer.isReloading) {
        const reloadPercent = (1 - myPlayer.reloadTimer / 1500) * 100;
        this.ammoText.setText(`RELOADING... ${Math.floor(reloadPercent)}%`);
        this.ammoText.setColor('#ffaa00');
      } else {
        this.ammoText.setText(`Ammo: ${myPlayer.ammo}/${myPlayer.maxAmmo}`);
        this.ammoText.setColor(myPlayer.ammo === 0 ? '#ff0000' : '#ffffff');
      }
    }
  });
}

update() {
  // Reload on R key
  if (this.input.keyboard!.addKey('R').isDown) {
    this.runtime.submitAction('reload');
  }
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ Ammo tracking
- ✅ Reload mechanic
- ✅ Reload timer
- ✅ Visual feedback

---

## Best Practices

### DO ✅

- **Use cooldowns** to prevent spam
- **Track bullet owners** for damage attribution
- **Set lifetimes** to auto-cleanup bullets
- **Use unique IDs** for bullet tracking
- **Normalize aim vectors** for consistent speed
- **Clean up** expired bullets in tick action
- **Use SpriteManager** for automatic bullet sprite lifecycle

### DON'T ❌

- **Don't create infinite bullets** - always set lifetimes
- **Don't use Math.random()** for bullet spread - use `context.random`
- **Don't forget cooldowns** - players will spam
- **Don't sync bullets individually** - batch in state
- **Don't create bullets on client** - host authority only

---

## See Also

- [Player Movement](/docs/latest/recipes/player-movement) - Movement and rotation
- [Health and Damage](/docs/latest/recipes/health-and-damage) - Bullet collision
- [Arena Blaster Example](/docs/latest/examples/overview#arena-blaster) - Complete shooting example
- [Phaser Sprite Manager](/docs/latest/api/phaser/sprite-manager) - Sprite lifecycle
