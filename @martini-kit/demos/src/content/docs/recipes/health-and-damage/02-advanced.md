<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Health and Damage - Advanced

Build upon the basics with death, respawning, regeneration, and shields.

## What You'll Learn

- Death detection and respawn systems
- Health regeneration mechanics
- Shield and armor layers
- Spawn point management

---

## Death and Respawn

**Use Case:** Player elimination and revival

Handle player death gracefully with respawn timers and spawn points.

### Step 1: Add Death State

Extend player state to track alive status and respawn timing:

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
});
```

**Key Points:**
- `isAlive`: Current alive status
- `respawnTimer`: Milliseconds until respawn
- `spawnPoints`: Predefined respawn locations

---

### Step 2: Detect Death in Damage Action

Update damage action to handle death:

```typescript
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
```

**Important:** Always check `isAlive` before applying damage!

---

### Step 3: Handle Respawn Timer

Use tick action to countdown and respawn:

```typescript
tick: {
  apply: (state, context, input: { delta: number }) => {
    const playerIds = Object.keys(state.players);

    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const player = state.players[playerId];

      if (!player.isAlive) {
        player.respawnTimer -= input.delta;

        if (player.respawnTimer <= 0) {
          // Respawn player at spawn point
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
```

---

### Step 4: Death Screen UI

Show respawn countdown to dead players.

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using createPlayerHUD** - Reactive death screen with auto-updating timer:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Death overlay
  this.deathOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
  this.deathOverlay.setVisible(false);
  this.deathOverlay.setDepth(1000);

  // Auto-updating respawn message
  this.hud = createPlayerHUD(this.adapter, this, {
    roleText: (myPlayer) => {
      if (!myPlayer) return '';
      if (!myPlayer.isAlive) {
        const seconds = Math.ceil(myPlayer.respawnTimer / 1000);
        return `You were eliminated!\nRespawning in ${seconds}...`;
      }
      return '';
    },
    roleStyle: { fontSize: '24px', color: '#fff' },
    layout: { role: { x: 400, y: 300 } }
  });

  // Show/hide overlay based on alive status
  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      this.deathOverlay.setVisible(!myPlayer.isAlive);
    }
  });
}
```

**Benefits:**
- ✅ Automatic text updates every frame
- ✅ Reactive to state changes
- ✅ Clean, declarative code

{/snippet}

{#snippet core()}

**Manual Death Screen** - Full control:

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
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
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

{/snippet}
</CodeTabs>

**What You've Built:**
- ✅ Death detection
- ✅ Respawn timer system
- ✅ Score tracking
- ✅ Death screen with countdown
- ✅ Kill attribution

---

## Health Regeneration

**Use Case:** Passive healing over time

Gradual health recovery when out of combat.

### Step 1: Add Regeneration State

Track when player last took damage:

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
});
```

---

### Step 2: Track Damage Time

Update damage action to record timestamp:

```typescript
takeDamage: {
  apply: (state, context, input: { amount: number; timestamp: number }) => {
    const player = state.players[context.targetId];
    if (!player) return;

    player.health -= input.amount;
    player.lastDamageTime = input.timestamp; // Record damage time

    if (player.health < 0) player.health = 0;
  },
},
```

**Important:** Client must pass `timestamp: Date.now()` when calling action.

---

### Step 3: Apply Regeneration in Tick

Heal players who haven't taken damage recently:

```typescript
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
```

**Formula:**
- `deltaSeconds = input.delta / 1000` converts ms to seconds
- `health += REGEN_RATE * deltaSeconds` scales healing by frame time

---

### Visual: Regeneration Effect

Add a visual indicator when regenerating:

```typescript
// In Phaser update() or SpriteManager updateSprite callback
if (player.health < player.maxHealth) {
  const timeSinceDamage = Date.now() - player.lastDamageTime;

  if (timeSinceDamage >= REGEN_DELAY) {
    // Show green glow or particles
    sprite.setTint(0x00ff00);
  } else {
    sprite.clearTint();
  }
}
```

**What You've Built:**
- ✅ Passive regeneration system
- ✅ Delay after damage
- ✅ Gradual recovery
- ✅ Smooth, frame-independent healing

---

## Shields and Armor

**Use Case:** Additional protection layer

Two-layer defense with shields that regenerate faster than health.

### Step 1: Add Shield State

Introduce shield as a secondary health pool:

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
});
```

---

### Step 2: Damage Shield First

Update damage action to prioritize shield:

```typescript
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
```

**Damage Priority:**
1. Shield takes damage first
2. Overflow damage goes to health
3. Shield tracks last damage time separately

---

### Step 3: Regenerate Shields

Shields regenerate faster than health:

```typescript
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
```

---

### Step 4: Dual Health Bar UI

Show both health and shield bars:

```typescript
create() {
  // Health bar background
  this.add.rectangle(10, 10, 202, 12, 0x000000);

  // Health bar (red)
  this.healthBar = this.add.rectangle(11, 11, 200, 10, 0xef4444);
  this.healthBar.setOrigin(0);

  // Shield bar background
  this.add.rectangle(10, 25, 202, 12, 0x000000);

  // Shield bar (blue, above health)
  this.shieldBar = this.add.rectangle(11, 26, 200, 10, 0x3b82f6);
  this.shieldBar.setOrigin(0);

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (myPlayer) {
      this.healthBar.setScale(myPlayer.health / myPlayer.maxHealth, 1);
      this.shieldBar.setScale(myPlayer.shield / myPlayer.maxShield, 1);
    }
  });
}
```

**What You've Built:**
- ✅ Shield layer for extra protection
- ✅ Damage priority system
- ✅ Faster shield regeneration
- ✅ Dual bar UI visualization

---

## See Also

- [Basics](/docs/latest/recipes/health-and-damage/01-basics) - Health tracking and invincibility
- [Complex Systems](/docs/latest/recipes/health-and-damage/03-systems) - Team damage, damage numbers
- [Game Modes](/docs/latest/recipes/game-modes) - Victory conditions and scoring
