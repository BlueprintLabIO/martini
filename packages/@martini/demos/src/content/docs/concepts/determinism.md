---
title: Determinism
description: Why seeded random is critical for multiplayer consistency
section: concepts
order: 4
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Determinism

In multiplayer games, **determinism** means that given the same inputs, all clients produce the same results. This is critical for Martini's host-authoritative architecture to work correctly.

## Why Determinism Matters

### The Problem with Math.random()

`Math.random()` is **non-deterministic** - it produces different results on each machine:

```typescript
// On Host:
const x = Math.random() * 800;  // 234.5

// On Client:
const x = Math.random() * 800;  // 678.2  ❌ Different!
```

If used during `setup()` or in actions, **state desyncs** between host and clients.

---

### Example: State Desync

```typescript
// ❌ BAD: Using Math.random() in setup
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map(id => [
      id,
      {
        x: Math.random() * 800,  // ❌ Non-deterministic!
        y: Math.random() * 600   // ❌ Different on each client!
      }
    ])
  )
})

// Result:
// Host:   Player A at (234, 456), Player B at (567, 123)
// Client: Player A at (789, 234), Player B at (123, 890)  ❌ DESYNC!
```

---

## The Solution: SeededRandom

Martini provides `SeededRandom` - a **deterministic** pseudo-random number generator:

```typescript
// ✅ GOOD: Using SeededRandom
setup: ({ playerIds, random }) => ({
  players: Object.fromEntries(
    playerIds.map(id => [
      id,
      {
        x: random.range(0, 800),   // ✅ Deterministic!
        y: random.range(0, 600)    // ✅ Same on all clients!
      }
    ])
  )
})

// Result:
// Host:   Player A at (234, 456), Player B at (567, 123)
// Client: Player A at (234, 456), Player B at (567, 123)  ✅ SYNCED!
```

<Callout type="success" title="Same Seed = Same Sequence">

`SeededRandom` uses a **Linear Congruential Generator (LCG)** algorithm. Given the same seed, it produces the exact same sequence of numbers on all machines.

</Callout>

---

## Where to Use SeededRandom

### 1. In setup()

The `setup()` function receives a `random` generator:

```typescript
setup: ({ playerIds, random }) => {
  return {
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: random.range(100, 700),   // ✅ Use random
          y: random.range(100, 500),
          color: random.choice(['red', 'blue', 'green', 'yellow'])
        }
      ])
    ),

    // Random initial obstacles
    obstacles: Array.from({ length: 10 }, () => ({
      x: random.range(0, 800),
      y: random.range(0, 600),
      radius: random.range(20, 50)
    }))
  };
}
```

---

### 2. In Actions

Actions receive `context.random`:

```typescript
actions: {
  spawnEnemy: {
    apply: (state, context, input) => {
      // ✅ Use context.random
      const enemy = {
        id: crypto.randomUUID(),  // OK - doesn't affect game logic
        x: context.random.range(0, 800),
        y: context.random.range(0, 600),
        type: context.random.choice(['goblin', 'orc', 'troll']),
        health: context.random.range(50, 150)
      };

      state.enemies.push(enemy);
    }
  }
}
```

---

### 3. In Tick Actions

Use `context.random` for procedural generation:

```typescript
actions: {
  tick: createTickAction((state, delta, context) => {
    // Spawn enemy with 1% chance per tick
    if (context.random.boolean(0.01)) {
      state.enemies.push({
        id: crypto.randomUUID(),
        x: context.random.range(0, 800),
        y: 0,
        type: context.random.choice(['basic', 'fast', 'tank'])
      });
    }

    // Random power-up spawn
    if (state.powerups.length < 3 && context.random.boolean(0.005)) {
      state.powerups.push({
        id: crypto.randomUUID(),
        x: context.random.range(0, 800),
        y: context.random.range(0, 600),
        type: context.random.choice(['health', 'speed', 'shield'])
      });
    }
  })
}
```

---

## SeededRandom API

The `SeededRandom` class provides several useful methods:

### next()

Generate a random float in `[0, 1)`:

```typescript
const value = random.next();  // 0.0 to 0.999...
```

---

### range(min, max)

Generate random **integer** in `[min, max)`:

```typescript
random.range(0, 10);    // 0-9
random.range(10, 20);   // 10-19
random.range(-5, 5);    // -5 to 4
```

---

### float(min, max)

Generate random **float** in `[min, max)`:

```typescript
random.float(0, 1);       // 0.0 to 0.999...
random.float(0, 100);     // 0.0 to 99.999...
random.float(-1, 1);      // -1.0 to 0.999...

// Use for angles, velocities, etc.
const angle = random.float(0, Math.PI * 2);
const velocity = random.float(100, 200);
```

---

### choice(array)

Choose random element from array:

```typescript
const color = random.choice(['red', 'blue', 'green', 'yellow']);
const weapon = random.choice(['sword', 'axe', 'bow']);
const spawn = random.choice([
  { x: 100, y: 100 },
  { x: 700, y: 500 },
  { x: 400, y: 300 }
]);
```

---

### shuffle(array)

Shuffle array (Fisher-Yates algorithm):

```typescript
const cards = ['A', 'K', 'Q', 'J', '10', '9'];
const shuffled = random.shuffle(cards);
// cards unchanged, shuffled is randomized

// Deal shuffled cards
state.deck = random.shuffle(createDeck());
state.players[playerId].hand = state.deck.splice(0, 5);
```

---

### boolean(probability)

Random boolean with optional probability:

```typescript
// 50% chance
if (random.boolean()) {
  spawnPowerup(state);
}

// 70% chance
if (random.boolean(0.7)) {
  state.criticalHit = true;
}

// 1% chance
if (random.boolean(0.01)) {
  spawnRareDrop(state);
}
```

---

## Common Patterns

### Pattern 1: Random Spawn Points

```typescript
setup: ({ playerIds, random }) => {
  const spawnPoints = [
    { x: 100, y: 300 },
    { x: 700, y: 300 },
    { x: 400, y: 100 },
    { x: 400, y: 500 }
  ];

  // Shuffle spawn points
  const shuffled = random.shuffle(spawnPoints);

  return {
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        { ...shuffled[index], health: 100 }
      ])
    )
  };
}
```

---

### Pattern 2: Random Loot Drops

```typescript
actions: {
  enemyKilled: {
    apply: (state, context, input: { enemyId: string }) => {
      const enemy = state.enemies.find(e => e.id === input.enemyId);
      if (!enemy) return;

      // 50% chance to drop loot
      if (context.random.boolean(0.5)) {
        const lootTypes = ['coin', 'gem', 'potion', 'key'];
        const rarity = context.random.boolean(0.1) ? 'rare' : 'common';

        state.loot.push({
          id: crypto.randomUUID(),
          x: enemy.x,
          y: enemy.y,
          type: context.random.choice(lootTypes),
          rarity
        });
      }

      // Remove enemy
      state.enemies = state.enemies.filter(e => e.id !== input.enemyId);
    }
  }
}
```

---

### Pattern 3: Procedural Generation

```typescript
actions: {
  generateLevel: {
    apply: (state, context, input: { seed: number }) => {
      // Use input seed for reproducible levels
      const levelRng = new SeededRandom(input.seed);

      state.obstacles = [];
      const obstacleCount = levelRng.range(10, 20);

      for (let i = 0; i < obstacleCount; i++) {
        state.obstacles.push({
          id: crypto.randomUUID(),
          x: levelRng.range(0, 800),
          y: levelRng.range(0, 600),
          radius: levelRng.range(20, 50),
          type: levelRng.choice(['rock', 'tree', 'wall'])
        });
      }
    }
  }
}
```

---

## What NOT to Use Math.random() For

### ❌ Game Logic

Never use `Math.random()` for anything that affects game state:

```typescript
// ❌ BAD
actions: {
  attack: {
    apply: (state, context, input) => {
      const damage = Math.random() * 100;  // ❌ Non-deterministic!
      state.players[input.targetId].health -= damage;
    }
  }
}

// ✅ GOOD
actions: {
  attack: {
    apply: (state, context, input) => {
      const damage = context.random.range(50, 100);  // ✅ Deterministic!
      state.players[input.targetId].health -= damage;
    }
  }
}
```

---

### ❌ Initial State

```typescript
// ❌ BAD
setup: () => ({
  seed: Math.random() * 1000000,  // ❌ Different on each client!
  enemies: []
})

// ✅ GOOD
setup: ({ random }) => ({
  seed: 12345,  // Fixed seed, or use a seed passed in config
  enemies: []
})
```

---

### ❌ Procedural Content

```typescript
// ❌ BAD
actions: {
  spawnEnemies: {
    apply: (state, context, input) => {
      const count = Math.floor(Math.random() * 5);  // ❌ Different on each client!
      for (let i = 0; i < count; i++) {
        state.enemies.push({ ... });
      }
    }
  }
}

// ✅ GOOD
actions: {
  spawnEnemies: {
    apply: (state, context, input) => {
      const count = context.random.range(1, 6);  // ✅ Same on all clients!
      for (let i = 0; i < count; i++) {
        state.enemies.push({ ... });
      }
    }
  }
}
```

---

## When Math.random() is OK

You CAN use `Math.random()` for **visual effects that don't affect game logic**:

```typescript
// ✅ OK - client-side visual effects only
class GameScene extends Phaser.Scene {
  create() {
    runtime.onChange((state) => {
      // Visual particle effects (client-side only)
      if (state.explosions.length > 0) {
        state.explosions.forEach(explosion => {
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;  // ✅ OK - visual only
            const speed = Math.random() * 100 + 50;

            const particle = this.add.circle(
              explosion.x,
              explosion.y,
              2,
              0xff0000
            );

            // Animate particle (client-side)
            this.tweens.add({
              targets: particle,
              x: explosion.x + Math.cos(angle) * speed,
              y: explosion.y + Math.sin(angle) * speed,
              alpha: 0,
              duration: 500,
              onComplete: () => particle.destroy()
            });
          }
        });
      }
    });
  }
}
```

<Callout type="tip" title="Rule of Thumb">

If it affects **game state**, use `random` (seeded). If it's **visual-only**, `Math.random()` is fine.

</Callout>

---

## Other Non-Deterministic Operations

### Date.now() and Timestamps

`Date.now()` returns different values on each client:

```typescript
// ❌ BAD
actions: {
  shoot: {
    apply: (state, context, input) => {
      state.players[context.targetId].lastShot = Date.now();  // ❌ Different on each client!
    }
  }
}

// ✅ GOOD - use frame counter or game time
actions: {
  shoot: {
    apply: (state, context, input) => {
      state.players[context.targetId].lastShot = state.frame;  // ✅ Deterministic!
    }
  }
}
```

---

### Object Iteration Order

Object key iteration order is **not guaranteed** in JavaScript:

```typescript
// ❌ Potentially non-deterministic
Object.keys(state.players).forEach(playerId => {
  // Order might differ across clients
});

// ✅ Deterministic - sort first
Object.keys(state.players)
  .sort()
  .forEach(playerId => {
    // Order is guaranteed
  });
```

For critical logic, use **arrays** instead of objects for ordered collections.

---

### External API Calls

Never call external APIs in actions:

```typescript
// ❌ NEVER DO THIS
actions: {
  fetchData: {
    apply: async (state, context, input) => {
      const response = await fetch('/api/data');  // ❌ Non-deterministic!
      const data = await response.json();
      state.data = data;
    }
  }
}
```

Actions must be **synchronous** and **pure**.

---

## Testing Determinism

### Verify Same Output

```typescript
import { SeededRandom } from '@martini/core';

test('SeededRandom produces same sequence', () => {
  const rng1 = new SeededRandom(12345);
  const rng2 = new SeededRandom(12345);

  // Generate sequence
  const seq1 = [rng1.next(), rng1.next(), rng1.next()];
  const seq2 = [rng2.next(), rng2.next(), rng2.next()];

  expect(seq1).toEqual(seq2);  // ✅ Identical
});
```

---

### Test Action Determinism

```typescript
test('Action produces deterministic results', () => {
  const runtime1 = new GameRuntime(game, transport1, { ... });
  const runtime2 = new GameRuntime(game, transport2, { ... });

  // Submit same action
  runtime1.submitAction('spawnEnemy', {});
  runtime2.submitAction('spawnEnemy', {});

  // States should be identical
  expect(runtime1.getState()).toEqual(runtime2.getState());
});
```

---

## Debugging Non-Determinism

If you suspect desyncs:

1. **Enable strict mode**:
   ```typescript
   const runtime = new GameRuntime(game, transport, {
     isHost: true,
     playerIds: ['p1', 'p2'],
     strict: true  // Throws errors for common mistakes
   });
   ```

2. **Use StateInspector**:
   ```typescript
   import { StateInspector } from '@martini/devtools';

   const inspector = new StateInspector();
   inspector.attach(runtime);

   // Compare state snapshots between clients
   console.log(inspector.getSnapshots());
   ```

3. **Log action inputs**:
   ```typescript
   actions: {
     myAction: {
       apply: (state, context, input) => {
         console.log('Action input:', input, 'Random seed:', context.random);
         // ...
       }
     }
   }
   ```

---

## Performance

`SeededRandom` is very fast:

- **Algorithm**: Linear Congruential Generator (LCG)
- **Performance**: ~10-20 million operations/second
- **Use case**: Game randomness (not cryptography)

<Callout type="info" title="Not Cryptographically Secure">

`SeededRandom` is **not suitable for security** (passwords, tokens, etc.). For game logic, it's perfect.

</Callout>

---

## Summary

### ✅ Always Use SeededRandom For:
- Initial state generation (`setup()`)
- Game logic in actions
- Procedural generation
- Loot drops, spawn chances
- Any randomness that affects gameplay

### ❌ Never Use Math.random() For:
- Anything in `setup()` or actions
- Game state mutations
- Spawn positions, enemy types, damage values

### ✅ Math.random() is OK For:
- Client-side visual effects
- Particle systems (cosmetic)
- UI animations
- Sound effect variations

---

## Next Steps

- [SeededRandom API](/docs/latest/api/core/seeded-random) - Full API reference
- [Actions](/docs/latest/concepts/actions) - How to use `context.random` in actions
- [Testing Guide](/docs/latest/guides/testing) - How to test determinism
- [State Management](/docs/latest/concepts/state-management) - State consistency patterns
