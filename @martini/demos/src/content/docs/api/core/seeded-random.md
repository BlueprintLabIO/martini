---
title: SeededRandom
description: Deterministic pseudo-random number generator
---

# SeededRandom

`SeededRandom` is a **deterministic pseudo-random number generator** (PRNG) that produces the same sequence of random numbers given the same seed. This is essential for multiplayer games to ensure all clients generate identical random values.

## Why Determinism Matters

In multiplayer games, randomness must be **deterministic** - all players must see the same "random" outcomes:

```typescript
// ❌ BAD - Different on each client!
const angle = Math.random() * Math.PI * 2;
const damage = Math.floor(Math.random() * 10) + 1;

// ✅ GOOD - Same on all clients!
const angle = context.random.float(0, Math.PI * 2);
const damage = context.random.range(1, 11);
```

:::danger[Never use Math.random()]
Using `Math.random()` in actions or setup will cause **desynchronization** - clients will diverge in state because they generate different random numbers. Always use `context.random` (which is a `SeededRandom` instance).
:::

## API Reference

```typescript
class SeededRandom {
  constructor(seed: number);

  // Core
  next(): number;

  // Integers
  range(min: number, max: number): number;

  // Floats
  float(min: number, max: number): number;

  // Arrays
  choice<T>(array: T[]): T;
  shuffle<T>(array: T[]): T[];

  // Booleans
  boolean(probability?: number): boolean;
}
```

## Constructor

Creates a new deterministic RNG with the given seed.

```typescript
constructor(seed: number)
```

**Parameters:**
- `seed` - Any integer (will be normalized to positive integer)

**Same seed = same sequence:**
```typescript
const rng1 = new SeededRandom(12345);
const rng2 = new SeededRandom(12345);

rng1.next(); // 0.5145891420543194
rng2.next(); // 0.5145891420543194 (identical!)

rng1.range(0, 100); // 42
rng2.range(0, 100); // 42 (identical!)
```

**Different seed = different sequence:**
```typescript
const rng1 = new SeededRandom(12345);
const rng2 = new SeededRandom(54321);

rng1.next(); // 0.5145891420543194
rng2.next(); // 0.3821746362373233 (different)
```

## Methods

### next()

Generates the next random number in the sequence.

```typescript
next(): number
```

**Returns:** Random float in range `[0, 1)` (0.0 to 0.999...)

**Example:**
```typescript
const rng = new SeededRandom(12345);

console.log(rng.next()); // 0.5145891420543194
console.log(rng.next()); // 0.1732890680432320
console.log(rng.next()); // 0.8421053411811590
```

:::tip
You rarely need to call `next()` directly. Use the convenience methods (`range()`, `float()`, etc.) instead.
:::

### range()

Generates a random **integer** in the specified range.

```typescript
range(min: number, max: number): number
```

**Parameters:**
- `min` - Minimum value (**inclusive**)
- `max` - Maximum value (**exclusive**)

**Returns:** Random integer in `[min, max)` (min to max-1)

**Example:**
```typescript
const rng = new SeededRandom(12345);

// Dice roll (1-6)
rng.range(1, 7);  // 1, 2, 3, 4, 5, or 6

// Array index
const index = rng.range(0, 10);  // 0-9

// Damage
const damage = rng.range(10, 21);  // 10-20

// Negative values
rng.range(-5, 5);  // -5 to 4

// Same min/max
rng.range(5, 5);  // Always 5
```

**Common use cases:**
```typescript
// Random position on 800x600 canvas
const x = context.random.range(0, 800);
const y = context.random.range(0, 600);

// Random player spawn index
const spawnIndex = context.random.range(0, spawnPoints.length);

// Random enemy type (0=goblin, 1=orc, 2=dragon)
const enemyType = context.random.range(0, 3);

// Random HP variation
const baseHP = 100;
const hp = baseHP + context.random.range(-10, 11);  // 90-110
```

### float()

Generates a random **float** in the specified range.

```typescript
float(min: number, max: number): number
```

**Parameters:**
- `min` - Minimum value (**inclusive**)
- `max` - Maximum value (**exclusive**)

**Returns:** Random float in `[min, max)`

**Example:**
```typescript
const rng = new SeededRandom(12345);

// Random angle (radians)
rng.float(0, Math.PI * 2);  // 0 to 2π

// Random velocity
rng.float(-10, 10);  // -10.0 to 9.999...

// Random opacity
rng.float(0, 1);  // 0.0 to 0.999...

// Random temperature
rng.float(-273.15, 5778);  // Absolute zero to Sun's surface
```

**Common use cases:**
```typescript
// Projectile spread
const baseAngle = Math.PI / 4;
const spread = context.random.float(-0.1, 0.1);
const finalAngle = baseAngle + spread;

// Movement speed variation
const baseSpeed = 100;
const speedMultiplier = context.random.float(0.9, 1.1);
const speed = baseSpeed * speedMultiplier;

// Particle lifetime
const lifetime = context.random.float(1.0, 3.0);  // 1-3 seconds
```

### choice()

Picks a random element from an array.

```typescript
choice<T>(array: T[]): T
```

**Parameters:**
- `array` - Array to choose from (must not be empty)

**Returns:** Random element from array

**Throws:** Error if array is empty

**Example:**
```typescript
const rng = new SeededRandom(12345);

// Pick random color
const color = rng.choice(['red', 'blue', 'green', 'yellow']);

// Pick random power-up
const powerUp = rng.choice(['speed', 'shield', 'weapon', 'health']);

// Pick random spawn point
const spawn = rng.choice(spawnPoints);

// Pick random sound effect
const sound = rng.choice(['hit1.wav', 'hit2.wav', 'hit3.wav']);
```

**Type-safe:**
```typescript
type WeaponType = 'sword' | 'bow' | 'staff';
const weapons: WeaponType[] = ['sword', 'bow', 'staff'];
const weapon: WeaponType = rng.choice(weapons);  // ✅ Type preserved
```

**Common use cases:**
```typescript
// Random enemy type
const enemyTypes = ['goblin', 'orc', 'troll', 'dragon'];
const enemyType = context.random.choice(enemyTypes);

// Random loot drop
const loot = context.random.choice([
  { type: 'gold', amount: 100 },
  { type: 'potion', amount: 1 },
  { type: 'weapon', id: 'sword' }
]);

// Random player role
const roles = ['tank', 'healer', 'damage'];
const role = context.random.choice(roles);
```

### shuffle()

Shuffles an array using the Fisher-Yates algorithm.

```typescript
shuffle<T>(array: T[]): T[]
```

**Parameters:**
- `array` - Array to shuffle

**Returns:** **New** shuffled array (original unchanged)

**Example:**
```typescript
const rng = new SeededRandom(12345);

const cards = ['A', 'K', 'Q', 'J', '10'];
const shuffled = rng.shuffle(cards);

console.log(cards);     // ['A', 'K', 'Q', 'J', '10'] (unchanged)
console.log(shuffled);  // ['Q', '10', 'A', 'J', 'K'] (randomized)
```

**Deterministic shuffling:**
```typescript
const rng1 = new SeededRandom(123);
const rng2 = new SeededRandom(123);

const deck = ['A', 'B', 'C', 'D'];

const shuffle1 = rng1.shuffle(deck);  // ['C', 'A', 'D', 'B']
const shuffle2 = rng2.shuffle(deck);  // ['C', 'A', 'D', 'B'] (same!)
```

**Common use cases:**
```typescript
// Shuffle deck of cards
const deck = createDeck();
const shuffledDeck = context.random.shuffle(deck);

// Randomize player order
const playerIds = ['p1', 'p2', 'p3', 'p4'];
const turnOrder = context.random.shuffle(playerIds);

// Randomize spawn points
const spawns = [
  { x: 100, y: 100 },
  { x: 700, y: 100 },
  { x: 400, y: 500 }
];
const randomSpawns = context.random.shuffle(spawns);
```

### boolean()

Generates a random boolean with optional probability.

```typescript
boolean(probability?: number): boolean
```

**Parameters:**
- `probability` - Probability of `true` (0.0 to 1.0, default: 0.5)

**Returns:** `true` or `false` based on probability

**Example:**
```typescript
const rng = new SeededRandom(12345);

// 50/50 chance
if (rng.boolean()) {
  console.log('Heads');
} else {
  console.log('Tails');
}

// 70% chance of true
if (rng.boolean(0.7)) {
  console.log('Common event');
}

// 10% chance of true
if (rng.boolean(0.1)) {
  console.log('Rare event');
}

// Edge cases
rng.boolean(1.0);  // Always true
rng.boolean(0.0);  // Always false
```

**Common use cases:**
```typescript
// Critical hit (20% chance)
const isCritical = context.random.boolean(0.2);
const damage = baseDamage * (isCritical ? 2 : 1);

// Random direction
const moveRight = context.random.boolean();
const vx = moveRight ? 100 : -100;

// Spawn enemy (30% chance per tick)
if (context.random.boolean(0.3)) {
  spawnEnemy();
}

// Loot drop (15% chance)
if (context.random.boolean(0.15)) {
  dropLoot(position);
}
```

## Usage in Game Definition

### In setup()

Use `context.random` to create deterministic initial state:

```typescript
const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, {
        x: random.range(100, 700),    // ✅ Deterministic
        y: random.range(100, 500),
        color: random.choice(['red', 'blue', 'green']),
        health: 100
      }])
    ),
    obstacles: Array.from({ length: 10 }, () => ({
      x: random.range(0, 800),
      y: random.range(0, 600),
      radius: random.range(20, 50)
    }))
  })
});
```

### In actions

Use `context.random` for in-game randomness:

```typescript
const game = defineGame({
  actions: {
    shoot: {
      apply(state, context, input: { angle: number }) {
        const shooter = state.players[context.targetId];

        // Add random spread
        const spread = context.random.float(-0.1, 0.1);
        const finalAngle = input.angle + spread;

        // Random damage (8-12)
        const damage = context.random.range(8, 13);

        state.projectiles.push({
          id: `proj-${Date.now()}`,
          x: shooter.x,
          y: shooter.y,
          angle: finalAngle,
          damage,
          speed: 200
        });
      }
    },

    spawnEnemy: {
      apply(state, context) {
        // Random enemy type
        const type = context.random.choice(['goblin', 'orc', 'troll']);

        // Random spawn location
        const spawnPoints = [
          { x: 100, y: 100 },
          { x: 700, y: 100 },
          { x: 400, y: 500 }
        ];
        const spawn = context.random.choice(spawnPoints);

        state.enemies.push({
          id: `enemy-${Date.now()}`,
          type,
          x: spawn.x,
          y: spawn.y,
          health: type === 'troll' ? 200 : type === 'orc' ? 100 : 50
        });
      }
    }
  }
});
```

## Implementation Details

### Algorithm

`SeededRandom` uses a **Linear Congruential Generator (LCG)**:

```
state[n+1] = (a × state[n] + c) mod m

Where:
- a = 1103515245 (multiplier)
- c = 12345 (increment)
- m = 2^31 (modulus)
```

This is the same algorithm used by many C standard libraries.

### Properties

**Deterministic:** Same seed always produces the same sequence

**Fast:** Single multiplication and modulo operation per call

**Sufficient for games:** Good statistical properties for gameplay randomness

**Not cryptographically secure:** Do NOT use for passwords, tokens, or security

### Period

The generator has a full period of **2^31 ≈ 2.1 billion** values before repeating.

For reference:
- At 60 FPS calling once per frame: ~1 year before repeat
- At 1000 calls per second: ~24 days before repeat
- At 1 million calls per second: ~35 minutes before repeat

For most games, this period is more than sufficient.

## Best Practices

### ✅ Do

- **Always use in actions** - For any randomness affecting gameplay
- **Use in setup** - For deterministic initial state
- **Seed from action counter** - GameRuntime does this automatically
- **Pick appropriate method** - Use `range()` for integers, `float()` for decimals
- **Test with same seed** - Verify determinism in tests

### ❌ Don't

- **Don't use `Math.random()`** - Will cause desync
- **Don't use `Date.now()`** - Different on each client
- **Don't use for cryptography** - Not cryptographically secure
- **Don't reuse same seed** - Each action gets its own seed automatically
- **Don't mutate the result** - Methods return new arrays/values

## Testing Determinism

```typescript
import { describe, it, expect } from 'vitest';
import { SeededRandom } from '@martini-kit/core';

describe('Determinism', () => {
  it('should produce same sequence with same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should shuffle identically', () => {
    const rng1 = new SeededRandom(999);
    const rng2 = new SeededRandom(999);

    const arr = [1, 2, 3, 4, 5];

    const shuffle1 = rng1.shuffle(arr);
    const shuffle2 = rng2.shuffle(arr);

    expect(shuffle1).toEqual(shuffle2);
  });
});
```

## Complete Example

```typescript
import { defineGame, createTickAction } from '@martini-kit/core';

interface GameState {
  players: Record<string, Player>;
  enemies: Enemy[];
  powerUps: PowerUp[];
}

const game = defineGame<GameState>({
  setup: ({ playerIds, random }) => ({
    // Random player spawns
    players: Object.fromEntries(
      playerIds.map(id => [id, {
        x: random.range(100, 700),
        y: random.range(100, 500),
        color: random.choice(['red', 'blue', 'green', 'yellow']),
        health: 100,
        damage: 10
      }])
    ),

    // Random obstacles
    enemies: Array.from({ length: 5 }, (_, i) => ({
      id: `enemy-${i}`,
      x: random.range(0, 800),
      y: random.range(0, 600),
      type: random.choice(['goblin', 'orc', 'troll']),
      health: 50
    })),

    powerUps: []
  }),

  actions: {
    // Shoot with random spread and damage
    shoot: {
      apply(state, context, input: { angle: number }) {
        const shooter = state.players[context.targetId];

        state.projectiles.push({
          x: shooter.x,
          y: shooter.y,
          angle: input.angle + context.random.float(-0.1, 0.1), // Spread
          damage: context.random.range(8, 13), // Variable damage
          speed: 200
        });
      }
    },

    // Spawn random power-up
    spawnPowerUp: {
      apply(state, context) {
        const types = ['health', 'speed', 'damage', 'shield'];
        const type = context.random.choice(types);

        state.powerUps.push({
          id: `powerup-${Date.now()}`,
          type,
          x: context.random.range(50, 750),
          y: context.random.range(50, 550),
          duration: context.random.float(5, 15)
        });
      }
    },

    // Critical hit (20% chance)
    attack: {
      apply(state, context, input: { targetId: string }) {
        const attacker = state.players[context.targetId];
        const target = state.enemies.find(e => e.id === input.targetId);

        if (!target) return;

        const isCritical = context.random.boolean(0.2);
        const damage = attacker.damage * (isCritical ? 2 : 1);

        target.health -= damage;

        if (isCritical) {
          console.log('Critical hit!');
        }
      }
    }
  }
});
```

## See Also

- [Determinism Concepts](/docs/concepts/determinism) - Why determinism matters
- [defineGame](./define-game) - Using random in game definition
- [Actions](/docs/concepts/actions) - Using random in actions
