<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Shooting Mechanics: Weapon Systems

Complete weapon systems with switching, ammo management, and best practices.

> **Learning Path:** [Basics](./01-basics) → [Advanced Aiming](./02-advanced-aiming) → You are here

## Table of Contents

- [Weapon Switching](#weapon-switching)
- [Ammo Management](#ammo-management)
- [Best Practices](#best-practices)

---

## Weapon Switching

**Use Case:** Multiple weapon types

Switch between different weapons with unique properties.

### Step 1: Define Weapon Types

Create weapon configurations:

```typescript
type WeaponType = 'pistol' | 'shotgun' | 'laser';

const WEAPON_CONFIG = {
  pistol: {
    damage: 10,
    cooldown: 300,
    bulletSpeed: 500,
    count: 1,
  },
  shotgun: {
    damage: 5,
    cooldown: 800,
    bulletSpeed: 400,
    count: 5,
    spread: Math.PI / 4, // 45 degree spread
  },
  laser: {
    damage: 20,
    cooldown: 1500,
    bulletSpeed: 800,
    count: 1,
  },
};
```

### Step 2: Add Weapon to Player State

Track current weapon per player:

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
          rotation: 0,
          currentWeapon: 'pistol' as WeaponType,
        },
      ])
    ),
    bullets: [],
    shootCooldowns: {},
    nextBulletId: 0,
  }),
  // ... actions next
});
```

### Step 3: Add Weapon Switch Action

Let players change weapons:

```typescript
actions: {
  switchWeapon: {
    apply: (state, context, input: { weapon: WeaponType }) => {
      const player = state.players[context.targetId];
      if (!player) return;

      player.currentWeapon = input.weapon;
    },
  },
  // ... shoot action next
}
```

### Step 4: Shoot Based on Weapon Config

Use weapon properties when shooting:

```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    // Get current weapon config
    const config = WEAPON_CONFIG[player.currentWeapon];

    // Check cooldown
    const cooldown = state.shootCooldowns[context.targetId] || 0;
    if (cooldown > 0) return;

    // Create bullets based on weapon
    for (let i = 0; i < config.count; i++) {
      let angle = player.rotation;

      // Add spread for multi-bullet weapons (shotgun)
      if (config.count > 1) {
        const angleOffset =
          ((i - (config.count - 1) / 2) * config.spread) / (config.count - 1);
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
        damage: config.damage, // Store damage on bullet
      });
    }

    // Set weapon-specific cooldown
    state.shootCooldowns[context.targetId] = config.cooldown;
  },
},
```

### Step 5: Display Current Weapon

Show weapon in HUD:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive weapon display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

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
  // Weapon display
  this.weaponText = this.add.text(10, 10, '', {
    fontSize: '16px',
    color: '#ffffff'
  });

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      this.weaponText.setText(
        `Weapon: ${myPlayer.currentWeapon.toUpperCase()}`
      );
    }
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
</CodeTabs>

**What You've Built:**
- ✅ Multiple weapons
- ✅ Weapon-specific properties
- ✅ Quick switching
- ✅ Different firing patterns

**Enhancement Ideas:**
- Add weapon pickup system
- Require reload when switching
- Show weapon stats in UI
- Add weapon animations

---

## Ammo Management

**Use Case:** Limited ammunition

Track and manage ammunition with reloading.

### Step 1: Add Ammo to Player State

Track ammo per player:

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
  // ... actions next
});
```

### Step 2: Check Ammo Before Shooting

Prevent shooting without ammo:

```typescript
actions: {
  shoot: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player) return;

      // Check ammo and reload status
      if (player.ammo <= 0 || player.isReloading) {
        console.log('No ammo or reloading');
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

      // Consume ammo
      player.ammo--;
    },
  },
  // ... reload action next
}
```

### Step 3: Add Reload Action

Start reload process:

```typescript
reload: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    // Start reload if not full and not already reloading
    if (player.ammo < player.maxAmmo && !player.isReloading) {
      player.isReloading = true;
      player.reloadTimer = 1500; // 1.5 second reload
    }
  },
},
```

### Step 4: Update Reload Timer

Complete reload in tick:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    // Update reload timers
    for (const player of Object.values(state.players)) {
      if (player.isReloading) {
        player.reloadTimer -= input.delta;

        // Complete reload when timer reaches 0
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
```

### Step 5: Display Ammo UI

Show ammo count and reload progress:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive ammo display:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

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
  this.ammoText = this.add.text(10, 30, '', {
    fontSize: '18px',
    color: '#ffffff'
  });

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      if (myPlayer.isReloading) {
        const reloadPercent = (1 - myPlayer.reloadTimer / 1500) * 100;
        this.ammoText.setText(`RELOADING... ${Math.floor(reloadPercent)}%`);
        this.ammoText.setColor('#ffaa00'); // Orange during reload
      } else {
        this.ammoText.setText(`Ammo: ${myPlayer.ammo}/${myPlayer.maxAmmo}`);
        this.ammoText.setColor(
          myPlayer.ammo === 0 ? '#ff0000' : '#ffffff'
        );
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

**What You've Built:**
- ✅ Ammo tracking
- ✅ Reload mechanic
- ✅ Reload timer
- ✅ Visual feedback

**Enhancement Ideas:**
- Auto-reload when empty
- Different reload times per weapon
- Ammo pickups
- Reserve ammo pool

---

## Best Practices

### DO ✅

**1. Use Cooldowns to Prevent Spam**
```typescript
// Always check cooldown before shooting
const cooldown = state.shootCooldowns[context.targetId] || 0;
if (cooldown > 0) return;
```

**2. Track Bullet Owners for Damage Attribution**
```typescript
// Store who shot the bullet
state.bullets.push({
  ownerId: context.targetId,
  // ... other properties
});
```

**3. Set Lifetimes for Auto-Cleanup**
```typescript
// Bullets automatically expire
lifetime: 2000, // ms

// Clean up in tick
if (bullet.lifetime <= 0) {
  state.bullets.splice(i, 1);
}
```

**4. Use Unique IDs for Bullet Tracking**
```typescript
// Increment counter for unique IDs
id: state.nextBulletId++,
```

**5. Normalize Aim Vectors for Consistent Speed**
```typescript
// Normalize direction vector
const dx = player.aimX - player.x;
const dy = player.aimY - player.y;
const distance = Math.sqrt(dx * dx + dy * dy);

if (distance > 0) {
  velocityX: (dx / distance) * BULLET_SPEED,
  velocityY: (dy / distance) * BULLET_SPEED,
}
```

**6. Clean Up Expired Bullets in Tick**
```typescript
// Iterate backwards for safe removal
for (let i = state.bullets.length - 1; i >= 0; i--) {
  if (shouldRemove(state.bullets[i])) {
    state.bullets.splice(i, 1);
  }
}
```

**7. Use SpriteManager for Bullet Lifecycle**
```typescript
// Automatically handles creation/destruction
new SpriteManager(this.adapter, this, {
  collection: 'bullets',
  createSprite: (bullet) => { /* ... */ },
  updateSprite: (sprite, bullet) => { /* ... */ },
});
```

### DON'T ❌

**1. Don't Create Infinite Bullets**
```typescript
// ❌ BAD: Bullets never expire
state.bullets.push({
  // ... no lifetime property
});

// ✅ GOOD: Always set lifetimes
state.bullets.push({
  lifetime: 2000,
  // ...
});
```

**2. Don't Use Math.random() for Bullet Spread**
```typescript
// ❌ BAD: Non-deterministic, causes desyncs
const angle = player.rotation + Math.random() * 0.5;

// ✅ GOOD: Use context.random for deterministic randomness
const angle = player.rotation + context.random.next() * 0.5;
```

**3. Don't Forget Cooldowns**
```typescript
// ❌ BAD: Players can spam thousands of bullets
shoot: {
  apply: (state, context) => {
    state.bullets.push(/* ... */);
  }
}

// ✅ GOOD: Always enforce cooldowns
shoot: {
  apply: (state, context) => {
    if ((state.shootCooldowns[context.targetId] || 0) > 0) return;
    state.bullets.push(/* ... */);
    state.shootCooldowns[context.targetId] = COOLDOWN;
  }
}
```

**4. Don't Sync Bullets Individually**
```typescript
// ❌ BAD: Separate action per bullet
actions: {
  addBullet: {
    apply: (state, context, input: Bullet) => {
      state.bullets.push(input);
    }
  }
}

// ✅ GOOD: Batch bullets in state
actions: {
  shoot: {
    apply: (state, context) => {
      // Create bullets directly in state
      state.bullets.push(/* ... */);
    }
  }
}
```

**5. Don't Create Bullets on Client**
```typescript
// ❌ BAD: Client creates bullets directly
this.bullets.push(/* ... */); // Client-side only!

// ✅ GOOD: Submit action, host creates bullet
this.runtime.submitAction('shoot'); // Synced to all clients
```

### Performance Tips

**1. Object Pooling for Bullets**

Instead of creating/destroying sprites constantly:

```typescript
// Reuse sprite pool
this.bulletManager = new SpriteManager(this.adapter, this, {
  collection: 'bullets',
  createSprite: (bullet) => {
    // SpriteManager handles pooling internally
    return this.add.circle(0, 0, 4, 0xffff00);
  },
});
```

**2. Limit Max Bullets**

Prevent performance issues:

```typescript
const MAX_BULLETS = 100;

shoot: {
  apply: (state, context) => {
    // Limit total bullets
    if (state.bullets.length >= MAX_BULLETS) {
      console.log('Max bullets reached');
      return;
    }
    // ... create bullet
  }
}
```

**3. Spatial Partitioning for Collision**

See [Health and Damage](/docs/latest/recipes/health-and-damage) for efficient collision detection.

---

## Complete Example

Combining weapon switching and ammo:

```typescript
type WeaponType = 'pistol' | 'shotgun';

const WEAPON_CONFIG = {
  pistol: { damage: 10, cooldown: 300, ammo: 12, reloadTime: 1000 },
  shotgun: { damage: 5, cooldown: 800, ammo: 6, reloadTime: 2000, count: 5 },
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
          weaponAmmo: {
            pistol: 12,
            shotgun: 6,
          },
          isReloading: false,
          reloadTimer: 0,
        },
      ])
    ),
    bullets: [],
    shootCooldowns: {},
    nextBulletId: 0,
  }),

  actions: {
    shoot: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const config = WEAPON_CONFIG[player.currentWeapon];

        // Check conditions
        if (
          player.isReloading ||
          player.weaponAmmo[player.currentWeapon] <= 0 ||
          (state.shootCooldowns[context.targetId] || 0) > 0
        ) {
          return;
        }

        // Create bullets based on weapon
        const count = config.count || 1;
        for (let i = 0; i < count; i++) {
          // ... create bullet
        }

        // Consume ammo and set cooldown
        player.weaponAmmo[player.currentWeapon]--;
        state.shootCooldowns[context.targetId] = config.cooldown;
      },
    },

    reload: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const config = WEAPON_CONFIG[player.currentWeapon];
        const currentAmmo = player.weaponAmmo[player.currentWeapon];

        if (currentAmmo < config.ammo && !player.isReloading) {
          player.isReloading = true;
          player.reloadTimer = config.reloadTime;
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        // Update cooldowns
        for (const playerId of Object.keys(state.shootCooldowns)) {
          state.shootCooldowns[playerId] = Math.max(
            0,
            state.shootCooldowns[playerId] - input.delta
          );
        }

        // Update reloads
        for (const player of Object.values(state.players)) {
          if (player.isReloading) {
            player.reloadTimer -= input.delta;

            if (player.reloadTimer <= 0) {
              const config = WEAPON_CONFIG[player.currentWeapon];
              player.weaponAmmo[player.currentWeapon] = config.ammo;
              player.isReloading = false;
              player.reloadTimer = 0;
            }
          }
        }

        // ... update bullets
      },
    },
  },
});
```

---

## See Also

- **[Basics](./01-basics)** - Core shooting mechanics
- **[Advanced Aiming](./02-advanced-aiming)** - Mouse aiming and patterns
- **[Player Movement](/docs/latest/recipes/player-movement)** - Movement and rotation
- **[Health and Damage](/docs/latest/recipes/health-and-damage)** - Bullet collision and damage
- **[Arena Blaster Example](/docs/latest/examples/overview#arena-blaster)** - Complete shooting game
- **[Phaser SpriteManager](/docs/latest/api/phaser/sprite-manager)** - Sprite lifecycle
