<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Health and Damage - Basics

Learn the fundamentals of health tracking and damage systems in multiplayer games.

## What You'll Learn

- Basic health tracking
- Damage application
- Health bars with visual feedback
- Invincibility frames

---

## Basic Health System

**Use Case:** Any game with player health

Simple health tracking with damage application.

### Step 1: Define State

Start with basic health properties in your game state:

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
          health: 100,
          maxHealth: 100,
        },
      ])
    ),
  }),
});
```

**Key Points:**
- `health`: Current health value
- `maxHealth`: Maximum health for calculating percentages

---

### Step 2: Add Damage Action

Create an action to apply damage:

```typescript
actions: {
  takeDamage: {
    apply: (state, context, input: { amount: number }) => {
      const player = state.players[context.targetId]; // IMPORTANT: Use targetId!
      if (!player) return;

      // Apply damage
      player.health -= input.amount;

      // Clamp to 0
      if (player.health < 0) {
        player.health = 0;
      }

      console.log(`Player ${context.targetId} took ${input.amount} damage. Health: ${player.health}`);
    },
  },
}
```

**Why `targetId`?**
- `context.targetId`: The player receiving damage (correct)
- `context.playerId`: The player who initiated the action (wrong for damage recipient)

---

### Step 3: Add Healing Action

Balance damage with healing:

```typescript
heal: {
  apply: (state, context, input: { amount: number }) => {
    const player = state.players[context.targetId];
    if (!player) return;

    // Apply healing
    player.health += input.amount;

    // Clamp to max
    if (player.health > player.maxHealth) {
      player.health = player.maxHealth;
    }
  },
},
```

---

### Step 4: Render Health Bar

Create a visual health bar that updates automatically.

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HealthBarManager** - Automatic health bars above sprites:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter, SpriteManager, HealthBarManager } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private spriteManager!: SpriteManager;
  private healthBars!: HealthBarManager;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create sprite manager for players
    this.spriteManager = new SpriteManager(this.adapter, this, {
      collection: 'players',
      createSprite: (player) => {
        return this.add.circle(player.x, player.y, 20, 0x00aaff);
      },
      updateSprite: (sprite, player) => {
        sprite.x = player.x;
        sprite.y = player.y;
      },
    });

    // Auto-attach health bars to all player sprites
    this.healthBars = new HealthBarManager(this.adapter, {
      spriteManager: this.spriteManager,
      healthKey: 'health',
      maxHealth: 100,
      offset: { x: 0, y: -30 },
      width: 50,
      height: 5,
      colorThresholds: {
        high: { value: 50, color: 0x48bb78 },   // Green > 50%
        medium: { value: 25, color: 0xeab308 }, // Yellow > 25%
        low: { value: 0, color: 0xef4444 },     // Red <= 25%
      },
    });
  }

  update() {
    // Auto-updates all health bars
    this.healthBars.update();
  }
}
```

**Benefits:**
- ✅ Auto-creates health bars for all sprites
- ✅ Auto-positions above sprites
- ✅ Auto-scales based on health
- ✅ Auto-colors based on thresholds
- ✅ Just 2 lines of code!

{/snippet}

{#snippet core()}

**Manual Health Bar** - Full control over rendering:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthText!: Phaser.GameObjects.Text;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create health bar background
    this.healthBarBg = this.add.rectangle(10, 10, 202, 22, 0x000000);
    this.healthBarBg.setOrigin(0);

    // Create health bar fill
    this.healthBar = this.add.rectangle(11, 11, 200, 20, 0x00ff00);
    this.healthBar.setOrigin(0);

    // Create health text
    this.healthText = this.add.text(15, 15, '100/100', {
      fontSize: '14px',
      color: '#ffffff',
    });

    // Update on state change
    this.adapter.onChange((state) => {
      const myPlayer = state.players[this.adapter.getMyPlayerId()];
      if (myPlayer) {
        const healthPercent = myPlayer.health / myPlayer.maxHealth;

        // Update bar width
        this.healthBar.setScale(healthPercent, 1);

        // Update color based on health
        if (healthPercent > 0.5) {
          this.healthBar.setFillStyle(0x48bb78); // Green
        } else if (healthPercent > 0.25) {
          this.healthBar.setFillStyle(0xeab308); // Yellow
        } else {
          this.healthBar.setFillStyle(0xef4444); // Red
        }

        // Update text
        this.healthText.setText(`${myPlayer.health}/${myPlayer.maxHealth}`);
      }
    });
  }
}
```

**Use when:**
- Custom health bar shapes needed
- Special animations or effects
- Non-standard positioning

{/snippet}
</CodeTabs>

**What You've Built:**
- ✅ Health tracking system
- ✅ Damage and healing actions
- ✅ Visual health bar with color coding
- ✅ Automatic updates on state changes

---

## Damage with Invincibility Frames

**Use Case:** Prevent instant death from multiple hits

Temporary invincibility after taking damage prevents unfair rapid elimination.

### Step 1: Add Invincibility State

Extend player state with invincibility tracking:

```typescript
const INVINCIBILITY_DURATION = 1000; // ms

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          health: 100,
          isInvulnerable: false,
          invulnerabilityTimer: 0, // ms remaining
        },
      ])
    ),
  }),
});
```

---

### Step 2: Check Invincibility Before Damage

Update damage action to respect invincibility:

```typescript
actions: {
  takeDamage: {
    apply: (state, context, input: { amount: number; attackerId?: string }) => {
      const player = state.players[context.targetId];
      if (!player) return;

      // Check invincibility
      if (player.isInvulnerable) {
        console.log('Player is invulnerable!');
        return; // No damage applied
      }

      // Apply damage
      player.health -= input.amount;

      // Grant invincibility
      player.isInvulnerable = true;
      player.invulnerabilityTimer = INVINCIBILITY_DURATION;

      console.log(`Damage dealt by ${input.attackerId || 'unknown'}: ${input.amount}`);
    },
  },
}
```

---

### Step 3: Countdown Invincibility Timer

Use a tick action to decrement the timer:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    // Update invincibility timers for all players
    for (const player of Object.values(state.players)) {
      if (player.isInvulnerable) {
        player.invulnerabilityTimer -= input.delta;

        if (player.invulnerabilityTimer <= 0) {
          player.isInvulnerable = false;
          player.invulnerabilityTimer = 0;
        }
      }
    }
  },
},
```

**Important:** Call this action from your Phaser `update()` loop:

```typescript
update(time: number, delta: number) {
  this.runtime.dispatchAction('tick', { delta }, { broadcast: true });
}
```

---

### Step 4: Visual Feedback

Show invincibility with sprite flashing.

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager** - Automatic sprite flashing with updateSprite callback:

```typescript
import { PhaserAdapter, SpriteManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Auto-manages player sprites with invincibility effects
  this.spriteManager = new SpriteManager(this.adapter, this, {
    collection: 'players',
    createSprite: (player) => {
      return this.add.circle(player.x, player.y, 20, 0x00aaff);
    },
    updateSprite: (sprite, player) => {
      sprite.x = player.x;
      sprite.y = player.y;

      // Flash sprite when invulnerable
      if (player.isInvulnerable) {
        const flashPhase = Math.floor(Date.now() / 100) % 2;
        sprite.setAlpha(flashPhase === 0 ? 0.3 : 1.0);
      } else {
        sprite.setAlpha(1.0);
      }
    },
  });
}
```

**Benefits:**
- ✅ Automatic sprite lifecycle management
- ✅ Built-in update callback for effects
- ✅ Minimal boilerplate

{/snippet}

{#snippet core()}

**Manual Sprite Management** - Full control:

```typescript
create() {
  // Store player sprites
  this.playerSprites = new Map();

  // Create sprites for existing players
  // ... sprite creation code ...

  this.adapter.onChange((state) => {
    for (const [playerId, playerData] of Object.entries(state.players)) {
      const sprite = this.playerSprites.get(playerId);
      if (!sprite) continue;

      // Flash sprite when invulnerable
      if (playerData.isInvulnerable) {
        // Flash every 100ms
        const flashPhase = Math.floor(Date.now() / 100) % 2;
        sprite.setAlpha(flashPhase === 0 ? 0.3 : 1.0);
      } else {
        sprite.setAlpha(1.0);
      }
    }
  });
}
```

{/snippet}
</CodeTabs>

**What You've Built:**
- ✅ Invincibility frames after damage
- ✅ Prevents spam damage
- ✅ Visual flashing feedback
- ✅ Timed duration with automatic removal

---

## See Also

- [Advanced Health Systems](/docs/latest/recipes/health-and-damage/02-advanced) - Death, respawn, regeneration
- [Complex Systems](/docs/latest/recipes/health-and-damage/03-systems) - Team damage, damage numbers
- [Shooting Mechanics](/docs/latest/recipes/shooting-mechanics/01-basics) - Dealing damage with projectiles
