# Health and Damage Recipes

Common health and damage patterns for multiplayer games. Copy and adapt these recipes for your game.

## Table of Contents

- [Basic Health System](#basic-health-system)
- [Damage with Invincibility Frames](#damage-with-invincibility-frames)
- [Death and Respawn](#death-and-respawn)
- [Health Regeneration](#health-regeneration)
- [Shields and Armor](#shields-and-armor)
- [Team Damage / Friendly Fire](#team-damage--friendly-fire)
- [Damage Numbers](#damage-numbers)
- [One-Hit Kill](#one-hit-kill)

---

## Basic Health System

**Use Case:** Any game with player health

Simple health tracking with damage application.

### Game Definition

```typescript
import { defineGame } from '@martini/core';

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
  },
});
```

### Phaser Scene (Health Bar)

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthText!: Phaser.GameObjects.Text;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create health bar background
    this.add.rectangle(10, 10, 202, 22, 0x000000);

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
      const myPlayer = state.players[this.adapter.playerId];
      if (myPlayer) {
        const healthPercent = myPlayer.health / myPlayer.maxHealth;

        // Update bar width
        this.healthBar.setScale(healthPercent, 1);

        // Update color based on health
        if (healthPercent > 0.5) {
          this.healthBar.setFillStyle(0x00ff00); // Green
        } else if (healthPercent > 0.25) {
          this.healthBar.setFillStyle(0xffaa00); // Yellow
        } else {
          this.healthBar.setFillStyle(0xff0000); // Red
        }

        // Update text
        this.healthText.setText(`${myPlayer.health}/${myPlayer.maxHealth}`);
      }
    });
  }
}
```

**Features:**
- ✅ Health tracking
- ✅ Damage application
- ✅ Visual health bar
- ✅ Color-coded by health level

---

## Damage with Invincibility Frames

**Use Case:** Prevent instant death from multiple hits

Temporary invincibility after taking damage.

### Game Definition

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

  actions: {
    takeDamage: {
      apply: (state, context, input: { amount: number; attackerId?: string }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Check invincibility
        if (player.isInvulnerable) {
          console.log('Player is invulnerable!');
          return;
        }

        // Apply damage
        player.health -= input.amount;

        // Grant invincibility
        player.isInvulnerable = true;
        player.invulnerabilityTimer = INVINCIBILITY_DURATION;

        console.log(`Damage dealt by ${input.attackerId || 'unknown'}: ${input.amount}`);
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        // Update invincibility timers
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
  },
});
```

### Phaser Scene (Invincibility Visual)

```typescript
create() {
  // ... create player sprites ...

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

**Features:**
- ✅ Invincibility frames
- ✅ Prevents spam damage
- ✅ Visual feedback (flashing)
- ✅ Timed duration

---

## Death and Respawn

**Use Case:** Player elimination and revival

Handle player death and respawn logic.

### Game Definition

```typescript
const RESPAWN_DELAY = 3000; // ms

export const game = defineGame({
  setup: ({ playerIds }) => {
    const spawnPoints = [
      { x: 100, y: 100 },
      { x: 700, y: 500 },
    ];

    return {
      players: Object.fromEntries(
        playerIds.map((id, index) => [
          id,
          {
            x: spawnPoints[index].x,
            y: spawnPoints[index].y,
            health: 100,
            isAlive: true,
            respawnTimer: 0,
            score: 0,
            deaths: 0,
          },
        ])
      ),
      spawnPoints,
    };
  },

  actions: {
    takeDamage: {
      apply: (state, context, input: { amount: number; attackerId?: string }) => {
        const player = state.players[context.targetId];
        if (!player || !player.isAlive) return;

        player.health -= input.amount;

        // Check for death
        if (player.health <= 0) {
          player.health = 0;
          player.isAlive = false;
          player.deaths++;
          player.respawnTimer = RESPAWN_DELAY;

          // Award point to attacker
          if (input.attackerId && state.players[input.attackerId]) {
            state.players[input.attackerId].score++;
          }

          console.log(`Player ${context.targetId} eliminated by ${input.attackerId}`);
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const playerIds = Object.keys(state.players);

        for (let i = 0; i < playerIds.length; i++) {
          const playerId = playerIds[i];
          const player = state.players[playerId];

          if (!player.isAlive) {
            player.respawnTimer -= input.delta;

            if (player.respawnTimer <= 0) {
              // Respawn player
              const spawnPoint = state.spawnPoints[i % state.spawnPoints.length];
              player.x = spawnPoint.x;
              player.y = spawnPoint.y;
              player.health = 100;
              player.isAlive = true;
              player.respawnTimer = 0;

              console.log(`Player ${playerId} respawned at ${spawnPoint.x}, ${spawnPoint.y}`);
            }
          }
        }
      },
    },
  },
});
```

### Phaser Scene (Death Screen)

```typescript
create() {
  // Death overlay
  this.deathOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
  this.deathOverlay.setVisible(false);
  this.deathOverlay.setDepth(1000);

  this.respawnText = this.add.text(400, 300, '', {
    fontSize: '24px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(1001);

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.playerId];
    if (myPlayer) {
      if (!myPlayer.isAlive) {
        this.deathOverlay.setVisible(true);
        const seconds = Math.ceil(myPlayer.respawnTimer / 1000);
        this.respawnText.setText(`You were eliminated!\nRespawning in ${seconds}...`);
        this.respawnText.setVisible(true);
      } else {
        this.deathOverlay.setVisible(false);
        this.respawnText.setVisible(false);
      }
    }
  });
}
```

**Features:**
- ✅ Death detection
- ✅ Respawn timer
- ✅ Score tracking
- ✅ Death screen
- ✅ Kill attribution

---

## Health Regeneration

**Use Case:** Passive healing over time

Gradual health recovery.

### Game Definition

```typescript
const REGEN_RATE = 5; // HP per second
const REGEN_DELAY = 5000; // ms without damage before regen starts

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
          lastDamageTime: 0,
        },
      ])
    ),
  }),

  actions: {
    takeDamage: {
      apply: (state, context, input: { amount: number; timestamp: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.health -= input.amount;
        player.lastDamageTime = input.timestamp;

        if (player.health < 0) player.health = 0;
      },
    },

    tick: {
      apply: (state, context, input: { delta: number; timestamp: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          // Regenerate if haven't taken damage recently
          const timeSinceDamage = input.timestamp - player.lastDamageTime;
          if (timeSinceDamage >= REGEN_DELAY && player.health < player.maxHealth) {
            player.health += REGEN_RATE * deltaSeconds;

            if (player.health > player.maxHealth) {
              player.health = player.maxHealth;
            }
          }
        }
      },
    },
  },
});
```

**Features:**
- ✅ Passive regeneration
- ✅ Delay after damage
- ✅ Gradual recovery

---

## Shields and Armor

**Use Case:** Additional protection layer

Two-layer health system with shields.

### Game Definition

```typescript
const SHIELD_REGEN_RATE = 10; // per second
const SHIELD_REGEN_DELAY = 3000; // ms

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
          shield: 50,
          maxShield: 50,
          lastShieldDamageTime: 0,
        },
      ])
    ),
  }),

  actions: {
    takeDamage: {
      apply: (state, context, input: { amount: number; timestamp: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        let damageRemaining = input.amount;

        // Shield absorbs damage first
        if (player.shield > 0) {
          if (player.shield >= damageRemaining) {
            player.shield -= damageRemaining;
            damageRemaining = 0;
          } else {
            damageRemaining -= player.shield;
            player.shield = 0;
          }

          player.lastShieldDamageTime = input.timestamp;
        }

        // Remaining damage goes to health
        if (damageRemaining > 0) {
          player.health -= damageRemaining;
          if (player.health < 0) player.health = 0;
        }

        console.log(`Shield: ${player.shield}, Health: ${player.health}`);
      },
    },

    tick: {
      apply: (state, context, input: { delta: number; timestamp: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          // Regenerate shield
          const timeSinceShieldDamage = input.timestamp - player.lastShieldDamageTime;
          if (timeSinceShieldDamage >= SHIELD_REGEN_DELAY && player.shield < player.maxShield) {
            player.shield += SHIELD_REGEN_RATE * deltaSeconds;

            if (player.shield > player.maxShield) {
              player.shield = player.maxShield;
            }
          }
        }
      },
    },
  },
});
```

### Phaser Scene (Shield Bar)

```typescript
create() {
  // Health bar (red)
  this.healthBar = this.add.rectangle(11, 11, 200, 10, 0xff0000);
  this.healthBar.setOrigin(0);

  // Shield bar (blue, above health)
  this.shieldBar = this.add.rectangle(11, 25, 200, 10, 0x00aaff);
  this.shieldBar.setOrigin(0);

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.playerId];
    if (myPlayer) {
      this.healthBar.setScale(myPlayer.health / myPlayer.maxHealth, 1);
      this.shieldBar.setScale(myPlayer.shield / myPlayer.maxShield, 1);
    }
  });
}
```

**Features:**
- ✅ Shield layer
- ✅ Damage priority
- ✅ Shield regeneration
- ✅ Dual bar UI

---

## Team Damage / Friendly Fire

**Use Case:** Team-based games

Control friendly fire behavior.

### Game Definition

```typescript
type Team = 'red' | 'blue';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 400,
          y: 300,
          health: 100,
          team: (index === 0 ? 'red' : 'blue') as Team,
        },
      ])
    ),
    friendlyFire: false, // Toggle this setting
  }),

  actions: {
    takeDamage: {
      apply: (state, context, input: { amount: number; attackerId: string }) => {
        const player = state.players[context.targetId];
        const attacker = state.players[input.attackerId];
        if (!player || !attacker) return;

        // Check friendly fire
        if (!state.friendlyFire && player.team === attacker.team) {
          console.log('Friendly fire disabled - no damage');
          return;
        }

        // Apply damage
        player.health -= input.amount;
        if (player.health < 0) player.health = 0;

        if (player.team === attacker.team) {
          console.log('Friendly fire!', input.amount);
        }
      },
    },

    toggleFriendlyFire: {
      apply: (state, context) => {
        state.friendlyFire = !state.friendlyFire;
        console.log('Friendly fire:', state.friendlyFire);
      },
    },
  },
});
```

**Features:**
- ✅ Team assignment
- ✅ Friendly fire toggle
- ✅ Team-based damage

---

## Damage Numbers

**Use Case:** Visual feedback

Floating damage numbers above players.

### Phaser Scene

```typescript
create() {
  // Listen for damage events
  this.runtime.onEvent('damage', (senderId, payload) => {
    const { targetId, amount, x, y } = payload;

    // Create floating text
    const damageText = this.add.text(x, y, `-${amount}`, {
      fontSize: '20px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Animate upward and fade
    this.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      },
    });
  });
}
```

### Game Definition (Emit Event)

```typescript
takeDamage: {
  apply: (state, context, input: { amount: number }) => {
    const player = state.players[context.targetId];
    if (!player) return;

    player.health -= input.amount;

    // Emit damage event for visual feedback
    context.emit('damage', {
      targetId: context.targetId,
      amount: input.amount,
      x: player.x,
      y: player.y,
    });
  },
},
```

**Features:**
- ✅ Floating damage numbers
- ✅ Animated feedback
- ✅ Event-driven

---

## One-Hit Kill

**Use Case:** Instant elimination mechanics

Special attacks or hazards that kill instantly.

### Game Definition

```typescript
export const game = defineGame({
  actions: {
    instantKill: {
      apply: (state, context, input: { killerId: string }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Instant death
        player.health = 0;
        player.isAlive = false;

        // Award kill
        if (state.players[input.killerId]) {
          state.players[input.killerId].score++;
        }

        console.log(`${context.targetId} was instantly eliminated by ${input.killerId}`);
      },
    },
  },
});
```

**Features:**
- ✅ Instant elimination
- ✅ Kill attribution
- ✅ Hazard zones

---

## Best Practices

### DO ✅

- **Use context.targetId** for damage recipient (not playerId!)
- **Emit events** for visual feedback
- **Track attacker** for kill attribution
- **Use invincibility frames** to prevent spam damage
- **Clamp health** to min/max values
- **Color-code health bars** for quick visual feedback

### DON'T ❌

- **Don't use context.playerId** for damage target
- **Don't forget to check isAlive** before applying damage
- **Don't allow negative health** - clamp to 0
- **Don't skip invincibility** - instant death feels unfair
- **Don't forget to emit events** for client feedback

---

## See Also

- [Shooting Mechanics](/docs/recipes/shooting-mechanics) - Dealing damage
- [Player Movement](/docs/recipes/player-movement) - Movement systems
- [Arena Blaster Example](/docs/examples/overview#arena-blaster) - Complete health/damage example
- [Game Modes](/docs/recipes/game-modes) - Victory conditions
