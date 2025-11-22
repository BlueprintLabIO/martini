<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Power-Ups and Collectibles Recipes

Common collectible and power-up patterns for multiplayer games. Copy and adapt these recipes for your game.

## Table of Contents

- [Basic Collectibles](#basic-collectibles)
- [Temporary Buffs](#temporary-buffs)
- [Spawning Power-Ups](#spawning-power-ups)
- [Stacking Effects](#stacking-effects)
- [Rare/Legendary Items](#rarelegendary-items)
- [Pickup Zones](#pickup-zones)

---

## Basic Collectibles

**Use Case:** Coins, gems, health packs

Simple collectible items that disappear when picked up.

### Game Definition

```typescript
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, score: 0, health: 100 }])
    ),
    collectibles: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: random.range(50, 750),
      y: random.range(50, 550),
      type: 'coin' as const,
      value: 10,
    })),
    nextCollectibleId: 10,
  }),

  actions: {
    collect: {
      apply: (state, context, input: { collectibleId: number }) => {
        const player = state.players[context.targetId];
        const collectibleIndex = state.collectibles.findIndex(c => c.id === input.collectibleId);

        if (player && collectibleIndex !== -1) {
          const collectible = state.collectibles[collectibleIndex];

          // Apply collectible effect
          switch (collectible.type) {
            case 'coin':
              player.score += collectible.value;
              break;
            case 'health':
              player.health = Math.min(100, player.health + 25);
              break;
          }

          // Remove collectible
          state.collectibles.splice(collectibleIndex, 1);
          console.log(`Player collected ${collectible.type}`);
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        // Check for collisions (host only)
        for (const [playerId, player] of Object.entries(state.players)) {
          for (const collectible of state.collectibles) {
            const distance = Math.hypot(player.x - collectible.x, player.y - collectible.y);

            if (distance < 20) {
              // Auto-collect
              context.emit('collect', { playerId, collectibleId: collectible.id });

              // Submit collect action
              // Note: In real game, host would handle this automatically
            }
          }
        }
      },
    },
  },
});
```

### Phaser Scene (Rendering Collectibles)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager Helper** - Automatically syncs collectible sprites:

```typescript
import { PhaserAdapter, SpriteManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Automatically manage collectible sprites
  this.collectibleManager = new SpriteManager(this.adapter, this, {
    collection: 'collectibles',
    createSprite: (collectible) => {
      const color = collectible.type === 'coin' ? 0xffd700 : 0xff0000;
      return this.add.circle(collectible.x, collectible.y, 10, color);
    },
  });
}
```

**Benefits:**
- ✅ Auto-creates sprites when items spawn
- ✅ Auto-destroys sprites when items are collected
- ✅ Just 6 lines instead of 20+

{/snippet}

{#snippet core()}

**Manual Sprite Management** - Full control over sprite lifecycle:

```typescript
create() {
  this.collectibleSprites = new Map();

  this.adapter.onChange((state) => {
    const currentIds = new Set(state.collectibles.map(c => c.id));

    // Remove collected items
    for (const [id, sprite] of this.collectibleSprites.entries()) {
      if (!currentIds.has(id)) {
        sprite.destroy();
        this.collectibleSprites.delete(id);
      }
    }

    // Create new items
    for (const collectible of state.collectibles) {
      if (!this.collectibleSprites.has(collectible.id)) {
        const color = collectible.type === 'coin' ? 0xffd700 : 0xff0000;
        const sprite = this.add.circle(collectible.x, collectible.y, 10, color);
        this.collectibleSprites.set(collectible.id, sprite);
      }
    }
  });
}
```

**Use when:**
- Custom sprite animations needed
- Complex visual effects on pickup
- Sprite pooling for performance

{/snippet}
</CodeTabs>

**Features:**
- ✅ Collectible items
- ✅ Auto-pickup on collision
- ✅ Multiple types
- ✅ Score/health effects

---

## Temporary Buffs

**Use Case:** Speed boosts, shields, temporary powers

Time-limited power-ups with durations.

### Game Definition

```typescript
const BUFF_DURATION = 5000; // ms

type BuffType = 'speed' | 'shield' | 'damage';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          speed: 200,
          damage: 10,
          activeBuffs: [] as Array<{
            type: BuffType;
            duration: number; // ms remaining
          }>,
        },
      ])
    ),
    powerUps: [] as Array<{
      id: number;
      x: number;
      y: number;
      type: BuffType;
    }>,
    nextPowerUpId: 0,
  }),

  actions: {
    pickupPowerUp: {
      apply: (state, context, input: { powerUpId: number }) => {
        const player = state.players[context.targetId];
        const powerUpIndex = state.powerUps.findIndex(p => p.id === input.powerUpId);

        if (player && powerUpIndex !== -1) {
          const powerUp = state.powerUps[powerUpIndex];

          // Add buff
          player.activeBuffs.push({
            type: powerUp.type,
            duration: BUFF_DURATION,
          });

          // Apply immediate effect
          switch (powerUp.type) {
            case 'speed':
              player.speed = 400; // 2x speed
              break;
            case 'damage':
              player.damage = 20; // 2x damage
              break;
          }

          state.powerUps.splice(powerUpIndex, 1);
          console.log(`Applied ${powerUp.type} buff for ${BUFF_DURATION}ms`);
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        for (const player of Object.values(state.players)) {
          // Update buff durations
          for (let i = player.activeBuffs.length - 1; i >= 0; i--) {
            const buff = player.activeBuffs[i];
            buff.duration -= input.delta;

            if (buff.duration <= 0) {
              // Remove expired buff
              player.activeBuffs.splice(i, 1);

              // Remove effect
              switch (buff.type) {
                case 'speed':
                  player.speed = 200; // Reset to normal
                  break;
                case 'damage':
                  player.damage = 10; // Reset to normal
                  break;
              }

              console.log(`${buff.type} buff expired`);
            }
          }
        }
      },
    },
  },
});
```

### Phaser Scene (Buff UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using HUD Helper** - Reactive buff UI with automatic updates:

```typescript
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Buff icons container
  this.buffIcons = this.add.container(10, 50);

  // Create reactive HUD that shows active buffs
  this.hud = createPlayerHUD(this.adapter, this, {
    roleText: (myPlayer) => {
      if (!myPlayer) return '';
      return `Active Buffs: ${myPlayer.activeBuffs.length}`;
    },
    roleStyle: { fontSize: '14px', color: '#fff' },
    layout: { role: { x: 10, y: 30 } }
  });

  // Manually update buff icons
  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.playerId];
    if (myPlayer) {
      this.buffIcons.removeAll(true);

      myPlayer.activeBuffs.forEach((buff, index) => {
        const icon = this.add.circle(index * 30, 0, 12, this.getBuffColor(buff.type));
        const timePercent = buff.duration / BUFF_DURATION;

        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.beginPath();
        graphics.arc(index * 30, 0, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent);
        graphics.strokePath();

        this.buffIcons.add([icon, graphics]);
      });
    }
  });
}
```

{/snippet}

{#snippet core()}

**Manual UI Management** - Full control over buff visualization:

```typescript
create() {
  this.buffIcons = this.add.container(10, 50);

  this.adapter.onChange((state) => {
    const myPlayer = state.players[this.adapter.playerId];
    if (myPlayer) {
      // Clear existing icons
      this.buffIcons.removeAll(true);

      // Create icon for each active buff
      myPlayer.activeBuffs.forEach((buff, index) => {
        const icon = this.add.circle(index * 30, 0, 12, this.getBuffColor(buff.type));
        const timePercent = buff.duration / BUFF_DURATION;

        // Add timer arc
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.beginPath();
        graphics.arc(index * 30, 0, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent);
        graphics.strokePath();

        this.buffIcons.add([icon, graphics]);
      });
    }
  });
}

getBuffColor(type: BuffType): number {
  switch (type) {
    case 'speed': return 0x00ff00;
    case 'shield': return 0x00aaff;
    case 'damage': return 0xff0000;
  }
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ Temporary buffs
- ✅ Buff timers
- ✅ Multiple active buffs
- ✅ Visual indicators

---

## Spawning Power-Ups

**Use Case:** Respawning items at fixed locations

Power-ups that respawn after being collected.

### Game Definition

```typescript
const RESPAWN_TIME = 10000; // ms

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300 }])
    ),
    spawnPoints: [
      { x: 100, y: 100, type: 'speed' as BuffType },
      { x: 700, y: 500, type: 'shield' as BuffType },
      { x: 400, y: 300, type: 'damage' as BuffType },
    ],
    powerUps: [] as Array<{
      id: number;
      x: number;
      y: number;
      type: BuffType;
      spawnPointIndex: number;
    }>,
    spawnTimers: {} as Record<number, number>, // spawnPointIndex -> ms until respawn
    nextPowerUpId: 0,
  }),

  actions: {
    pickupPowerUp: {
      apply: (state, context, input: { powerUpId: number }) => {
        const powerUpIndex = state.powerUps.findIndex(p => p.id === input.powerUpId);

        if (powerUpIndex !== -1) {
          const powerUp = state.powerUps[powerUpIndex];

          // ... apply buff to player ...

          // Start respawn timer
          state.spawnTimers[powerUp.spawnPointIndex] = RESPAWN_TIME;

          // Remove power-up
          state.powerUps.splice(powerUpIndex, 1);
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        // Update respawn timers
        for (const [indexStr, timer] of Object.entries(state.spawnTimers)) {
          const index = parseInt(indexStr);
          state.spawnTimers[index] -= input.delta;

          if (state.spawnTimers[index] <= 0) {
            // Respawn power-up
            const spawnPoint = state.spawnPoints[index];
            state.powerUps.push({
              id: state.nextPowerUpId++,
              x: spawnPoint.x,
              y: spawnPoint.y,
              type: spawnPoint.type,
              spawnPointIndex: index,
            });

            delete state.spawnTimers[index];
            console.log(`Respawned ${spawnPoint.type} at spawn point ${index}`);
          }
        }
      },
    },
  },
});
```

**Features:**
- ✅ Fixed spawn points
- ✅ Timed respawn
- ✅ Multiple spawn locations
- ✅ Respawn timers

---

## Stacking Effects

**Use Case:** Cumulative power-ups

Multiple pickups that stack.

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
          speedMultiplier: 1.0,
          maxStackedBuffs: 3,
        },
      ])
    ),
  }),

  actions: {
    pickupSpeedBoost: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Stack speed boost (max 3x)
        if (player.speedMultiplier < player.maxStackedBuffs) {
          player.speedMultiplier += 0.5;
          console.log(`Speed multiplier: ${player.speedMultiplier}x`);
        } else {
          console.log('Max speed reached!');
        }
      },
    },
  },
});
```

**Features:**
- ✅ Cumulative effects
- ✅ Stack limits
- ✅ Multipliers

---

## Rare/Legendary Items

**Use Case:** Weighted loot tables and special drops

```typescript
const RARITY_TABLE = [
  { rarity: 'common', weight: 70, minStat: 1, maxStat: 2 },
  { rarity: 'rare', weight: 25, minStat: 3, maxStat: 4 },
  { rarity: 'legendary', weight: 5, minStat: 5, maxStat: 6 },
];

function rollRarity(random: SeededRandom) {
  const totalWeight = RARITY_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let roll = random.range(0, totalWeight);

  for (const item of RARITY_TABLE) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return RARITY_TABLE[0];
}

export const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(playerIds.map((id) => [id, { loot: [] as Array<{ rarity: string; stat: number }> }])),
  }),

  actions: {
    openChest: {
      apply: (state, context, input: { chestId: string }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const drop = rollRarity(context.random ?? random);
        player.loot.push({
          rarity: drop.rarity,
          stat: context.random?.range(drop.minStat, drop.maxStat) ?? random.range(drop.minStat, drop.maxStat),
        });

        console.log(`Player ${context.targetId} found a ${drop.rarity} item`);
      },
    },
  },
});
```

**Features:**
- ✅ Weighted rarity rolls
- ✅ Deterministic randomness via SeededRandom
- ✅ Distinct stat ranges per rarity tier

---

## Pickup Zones

**Use Case:** Area-based buffs or healing pads

```typescript
const ZONES = [
  { id: 'center', x: 400, y: 300, radius: 120, effect: 'heal' as const },
  { id: 'power', x: 650, y: 300, radius: 90, effect: 'damage' as const },
];

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(playerIds.map((id) => [id, { x: 0, y: 0, health: 100, damage: 10 }])),
  }),

  actions: {
    tick: {
      apply: (state, context, input: { delta: number }) => {
        for (const [playerId, player] of Object.entries(state.players)) {
          for (const zone of ZONES) {
            const distance = Math.hypot(player.x - zone.x, player.y - zone.y);
            const inside = distance <= zone.radius;

            if (!inside) continue;

            if (zone.effect === 'heal') {
              player.health = Math.min(100, player.health + 0.05 * input.delta);
            } else if (zone.effect === 'damage') {
              player.damage = Math.min(50, player.damage + 0.02 * input.delta);
            }
          }
        }
      },
    },
  },
});
```

**Features:**
- ✅ Circular pickup/healing zones
- ✅ Time-based buff application while inside zone
- ✅ Easily extensible for more effects

---

## See Also

- [Health and Damage](/docs/recipes/health-and-damage) - Health pickups
- [Shooting Mechanics](/docs/latest/recipes/shooting-mechanics/01-basics) - Weapon power-ups
- [Game Modes](/docs/recipes/game-modes) - Collectible objectives
