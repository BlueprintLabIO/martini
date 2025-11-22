<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Health and Damage - Systems

Advanced patterns including team damage, visual feedback, and production best practices.

## What You'll Learn

- Team-based damage control
- Floating damage numbers
- One-hit kill mechanics
- Production best practices

---

## Team Damage / Friendly Fire

**Use Case:** Team-based games

Control whether teammates can damage each other.

### Step 1: Add Team Assignment

Assign players to teams during setup:

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
          team: (index % 2 === 0 ? 'red' : 'blue') as Team,
        },
      ])
    ),
    friendlyFire: false, // Toggle this setting
  }),
});
```

**Team Assignment Strategies:**
- Alternating: `index % 2 === 0`
- First half vs second half: `index < playerIds.length / 2`
- Random: `Math.random() < 0.5`

---

### Step 2: Check Team Before Damage

Validate attacker and victim teams:

```typescript
takeDamage: {
  apply: (state, context, input: { amount: number; attackerId: string }) => {
    const player = state.players[context.targetId];
    const attacker = state.players[input.attackerId];

    if (!player || !attacker) return;

    // Check friendly fire
    if (!state.friendlyFire && player.team === attacker.team) {
      console.log('Friendly fire disabled - no damage');
      return; // Block damage
    }

    // Apply damage
    player.health -= input.amount;
    if (player.health < 0) player.health = 0;

    if (player.team === attacker.team) {
      console.log('Friendly fire!', input.amount);
    }
  },
},
```

**Important:** Always validate both player and attacker exist!

---

### Step 3: Toggle Friendly Fire

Allow runtime configuration:

```typescript
toggleFriendlyFire: {
  apply: (state, context) => {
    state.friendlyFire = !state.friendlyFire;
    console.log('Friendly fire:', state.friendlyFire);
  },
},
```

Call from UI:

```typescript
// Host only
if (runtime.isHost()) {
  runtime.dispatchAction('toggleFriendlyFire', {}, { broadcast: true });
}
```

---

### Visual: Team Colors

Show team affiliation with sprite colors:

```typescript
// In SpriteManager createSprite
createSprite: (player) => {
  const color = player.team === 'red' ? 0xef4444 : 0x3b82f6;
  return this.add.circle(player.x, player.y, 20, color);
},
```

**What You've Built:**
- ✅ Team assignment system
- ✅ Friendly fire toggle
- ✅ Team-based damage validation
- ✅ Visual team identification

---

## Damage Numbers

**Use Case:** Visual feedback for damage dealt

Floating numbers show damage amounts above hit players.

### Step 1: Emit Damage Event

Update damage action to emit event:

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

**Why emit?**
- Separates game logic from visual effects
- All clients see the same feedback
- Enables replay systems

---

### Step 2: Listen for Damage Events

Create floating text in Phaser:

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

---

### Enhancement: Critical Hits

Show different colors for critical damage:

```typescript
takeDamage: {
  apply: (state, context, input: { amount: number; isCritical?: boolean }) => {
    const player = state.players[context.targetId];
    if (!player) return;

    player.health -= input.amount;

    context.emit('damage', {
      targetId: context.targetId,
      amount: input.amount,
      isCritical: input.isCritical || false,
      x: player.x,
      y: player.y,
    });
  },
},
```

Render with color:

```typescript
this.runtime.onEvent('damage', (senderId, payload) => {
  const { amount, isCritical, x, y } = payload;

  const damageText = this.add.text(x, y, `-${amount}`, {
    fontSize: isCritical ? '28px' : '20px',
    color: isCritical ? '#ffaa00' : '#ff0000',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);

  // Same animation...
});
```

**What You've Built:**
- ✅ Floating damage numbers
- ✅ Event-driven visual feedback
- ✅ Animated text with tweens
- ✅ Critical hit variations

---

## One-Hit Kill

**Use Case:** Instant elimination mechanics

Special attacks or environmental hazards that kill instantly.

### Implementation

Create dedicated action for instant death:

```typescript
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

    // Emit event for dramatic effect
    context.emit('instantKill', {
      victimId: context.targetId,
      killerId: input.killerId,
      x: player.x,
      y: player.y,
    });

    console.log(`${context.targetId} was instantly eliminated by ${input.killerId}`);
  },
},
```

### Visual Effect

Show dramatic elimination:

```typescript
this.runtime.onEvent('instantKill', (senderId, payload) => {
  const { victimId, x, y } = payload;

  // Explosion or dramatic effect
  const explosion = this.add.circle(x, y, 10, 0xff0000);

  this.tweens.add({
    targets: explosion,
    scale: 5,
    alpha: 0,
    duration: 500,
    onComplete: () => explosion.destroy(),
  });

  // Play sound effect
  // this.sound.play('elimination');
});
```

**Use Cases:**
- ✅ Headshot mechanics
- ✅ Environmental hazards (lava, spikes)
- ✅ Power-up instant kills
- ✅ Out-of-bounds penalties

---

## Best Practices

### DO ✅

**1. Use `context.targetId` for Damage Recipient**

```typescript
// ✅ CORRECT
const player = state.players[context.targetId];

// ❌ WRONG - This is the attacker!
const player = state.players[context.playerId];
```

**2. Always Check `isAlive` Before Damage**

```typescript
// ✅ CORRECT
if (!player || !player.isAlive) return;
player.health -= damage;

// ❌ WRONG - Dead players can still take damage
player.health -= damage;
```

**3. Clamp Health to Valid Range**

```typescript
// ✅ CORRECT
player.health -= damage;
if (player.health < 0) player.health = 0;
if (player.health > player.maxHealth) player.health = player.maxHealth;

// ❌ WRONG - Negative health or overflow
player.health -= damage;
```

**4. Emit Events for Visual Feedback**

```typescript
// ✅ CORRECT - Separates logic from visuals
context.emit('damage', { amount, x, y });

// ❌ WRONG - Visual code in game logic
this.scene.showDamageText(amount, x, y);
```

**5. Use Invincibility Frames**

```typescript
// ✅ CORRECT - Prevents unfair rapid damage
if (player.isInvulnerable) return;

// ❌ WRONG - Player can be one-shot by rapid hits
player.health -= damage;
```

**6. Track Damage Source**

```typescript
// ✅ CORRECT - Enables kill attribution
takeDamage: (state, context, input: { amount: number; attackerId: string })

// ❌ WRONG - Can't award kills or track stats
takeDamage: (state, context, input: { amount: number })
```

---

### DON'T ❌

**1. Don't Use `context.playerId` for Damage Target**

```typescript
// ❌ WRONG
const player = state.players[context.playerId];
```

**2. Don't Forget to Validate Players Exist**

```typescript
// ❌ WRONG - Can crash if player doesn't exist
state.players[targetId].health -= damage;

// ✅ CORRECT
const player = state.players[targetId];
if (!player) return;
player.health -= damage;
```

**3. Don't Allow Negative Health**

```typescript
// ❌ WRONG
player.health -= damage;
if (player.health <= 0) player.isAlive = false;

// ✅ CORRECT - Clamp first
player.health -= damage;
if (player.health < 0) player.health = 0;
if (player.health === 0) player.isAlive = false;
```

**4. Don't Skip Invincibility Frames**

```typescript
// ❌ WRONG - Feels unfair to players
player.health -= damage;

// ✅ CORRECT - Give brief immunity
if (!player.isInvulnerable) {
  player.health -= damage;
  player.isInvulnerable = true;
  player.invulnerabilityTimer = 1000;
}
```

**5. Don't Mix Visual Code with Game Logic**

```typescript
// ❌ WRONG - Game logic shouldn't know about Phaser
player.health -= damage;
this.scene.cameras.main.shake(100);

// ✅ CORRECT - Use events
player.health -= damage;
context.emit('cameraShake', { intensity: 100 });
```

---

## Production Checklist

Before shipping your health/damage system:

- [ ] **Validation:** All actions check player existence
- [ ] **Clamping:** Health never goes negative or above max
- [ ] **Invincibility:** I-frames prevent rapid damage
- [ ] **Attribution:** Track damage source for kill credits
- [ ] **Events:** Visual feedback via events, not direct calls
- [ ] **Testing:** Test with 2, 4, and 8 players
- [ ] **Edge Cases:** Dead players can't take damage
- [ ] **Balance:** Damage values feel fair and fun
- [ ] **Feedback:** Clear visual/audio damage indicators
- [ ] **Networking:** Test with 100+ ms latency

---

## Complete Production Example

Here's a full, production-ready health system:

```typescript
import { defineGame } from '@martini-kit/core';

const INVINCIBILITY_DURATION = 1000;
const RESPAWN_DELAY = 3000;
const REGEN_RATE = 5;
const REGEN_DELAY = 5000;

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 100 + index * 200,
          y: 300,
          health: 100,
          maxHealth: 100,
          shield: 50,
          maxShield: 50,
          isAlive: true,
          isInvulnerable: false,
          invulnerabilityTimer: 0,
          respawnTimer: 0,
          lastDamageTime: 0,
          lastShieldDamageTime: 0,
          score: 0,
          deaths: 0,
          team: index % 2 === 0 ? 'red' : 'blue',
        },
      ])
    ),
    friendlyFire: false,
  }),

  actions: {
    takeDamage: {
      apply: (state, context, input: {
        amount: number;
        attackerId: string;
        timestamp: number;
        isCritical?: boolean;
      }) => {
        const player = state.players[context.targetId];
        const attacker = state.players[input.attackerId];

        // Validation
        if (!player || !attacker || !player.isAlive || player.isInvulnerable) {
          return;
        }

        // Team check
        if (!state.friendlyFire && player.team === attacker.team) {
          return;
        }

        let damageRemaining = input.amount;

        // Shield first
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

        // Then health
        if (damageRemaining > 0) {
          player.health -= damageRemaining;
          player.lastDamageTime = input.timestamp;

          if (player.health < 0) player.health = 0;

          // Grant invincibility
          player.isInvulnerable = true;
          player.invulnerabilityTimer = INVINCIBILITY_DURATION;
        }

        // Check death
        if (player.health === 0) {
          player.isAlive = false;
          player.deaths++;
          player.respawnTimer = RESPAWN_DELAY;
          attacker.score++;

          context.emit('playerDeath', {
            victimId: context.targetId,
            killerId: input.attackerId,
          });
        }

        // Visual feedback
        context.emit('damage', {
          targetId: context.targetId,
          amount: input.amount,
          isCritical: input.isCritical || false,
          x: player.x,
          y: player.y,
        });
      },
    },

    tick: {
      apply: (state, context, input: { delta: number; timestamp: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          // Invincibility countdown
          if (player.isInvulnerable) {
            player.invulnerabilityTimer -= input.delta;
            if (player.invulnerabilityTimer <= 0) {
              player.isInvulnerable = false;
              player.invulnerabilityTimer = 0;
            }
          }

          // Respawn countdown
          if (!player.isAlive) {
            player.respawnTimer -= input.delta;
            if (player.respawnTimer <= 0) {
              player.health = 100;
              player.shield = 50;
              player.isAlive = true;
              player.respawnTimer = 0;
            }
          }

          // Shield regeneration
          if (player.isAlive) {
            const timeSinceShieldDamage = input.timestamp - player.lastShieldDamageTime;
            if (timeSinceShieldDamage >= 3000 && player.shield < player.maxShield) {
              player.shield += 10 * deltaSeconds;
              if (player.shield > player.maxShield) player.shield = player.maxShield;
            }

            // Health regeneration
            const timeSinceDamage = input.timestamp - player.lastDamageTime;
            if (timeSinceDamage >= REGEN_DELAY && player.health < player.maxHealth) {
              player.health += REGEN_RATE * deltaSeconds;
              if (player.health > player.maxHealth) player.health = player.maxHealth;
            }
          }
        }
      },
    },
  },
});
```

---

## See Also

- [Basics](/docs/latest/recipes/health-and-damage/01-basics) - Health tracking fundamentals
- [Advanced](/docs/latest/recipes/health-and-damage/02-advanced) - Death, respawn, regeneration
- [Shooting Mechanics](/docs/latest/recipes/shooting-mechanics/01-basics) - Dealing damage with projectiles
- [Game Modes](/docs/latest/recipes/game-modes) - Victory conditions
- [Arena Blaster Example](/docs/latest/examples/overview#arena-blaster) - Full health/damage implementation
