---
title: Basic Collectibles
description: Simple pickup items like coins, gems, and health packs
section: recipes
subsection: collectibles
order: 1
---

# Basic Collectibles

**Use Case:** Coins, gems, health packs, ammo

Simple collectible items that disappear when picked up and provide immediate benefits.

## Game Definition

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
      type: random.choice(['coin', 'gem', 'health']),
      value: 10,
    })),
    nextCollectibleId: 10,
  }),

  actions: {
    collect: {
      apply: (state, context, input: { collectibleId: number }) => {
        const player = state.players[context.targetId];
        const collectibleIndex = state.collectibles.findIndex(
          c => c.id === input.collectibleId
        );

        if (player && collectibleIndex !== -1) {
          const collectible = state.collectibles[collectibleIndex];

          // Apply collectible effect
          switch (collectible.type) {
            case 'coin':
              player.score += collectible.value;
              break;
            case 'gem':
              player.score += collectible.value * 5;
              break;
            case 'health':
              player.health = Math.min(100, player.health + 25);
              break;
          }

          // Remove collectible
          state.collectibles.splice(collectibleIndex, 1);
        }
      },
    },
  },
});
```

## Features

- ✅ Multiple collectible types
- ✅ Random spawning
- ✅ Immediate effects
- ✅ Auto-removal on pickup

## Variations

### Auto-Collection on Collision

```typescript
actions: {
  tick: createTickAction((state, delta) => {
    // Check for collisions
    for (const [playerId, player] of Object.entries(state.players)) {
      for (const collectible of state.collectibles) {
        const distance = Math.hypot(
          player.x - collectible.x,
          player.y - collectible.y
        );

        if (distance < 20) {
          // Auto-collect
          applyCollectible(state, playerId, collectible);
          state.collectibles = state.collectibles.filter(
            c => c.id !== collectible.id
          );
        }
      }
    }
  })
}
```

### Respawning Collectibles

```typescript
interface GameState {
  collectibles: Collectible[];
  collectibleSpawnTimer: number;
}

actions: {
  tick: createTickAction((state, delta, context) => {
    state.collectibleSpawnTimer -= delta;

    if (state.collectibleSpawnTimer <= 0 && state.collectibles.length < 10) {
      // Spawn new collectible
      state.collectibles.push({
        id: state.nextCollectibleId++,
        x: context.random.range(50, 750),
        y: context.random.range(50, 550),
        type: context.random.choice(['coin', 'gem', 'health']),
        value: 10
      });

      state.collectibleSpawnTimer = 2000; // 2 seconds
    }
  })
}
```

## See Also

- **[Determinism →](/docs/latest/concepts/determinism)** - Using seeded random
