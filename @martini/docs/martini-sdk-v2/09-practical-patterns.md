# Practical Implementation Patterns

This guide documents battle-tested patterns found in working martini-kit demos. These are critical implementation details that aren't obvious from the API reference alone.

---

## Host vs. Client Sprite Creation

The most important pattern: **host creates physics sprites, clients create visual-only sprites from state._sprites**.

### Host Pattern

```typescript
if (isHost) {
  // Create sprite with physics
  const sprite = this.physics.add.sprite(100, 100, 'player');
  sprite.body.setCollideWorldBounds(true);
  sprite.body.setBounce(0.2);

  // Add colliders
  this.physics.add.collider(sprite, platforms);

  // Track it (auto-syncs to state)
  adapter.trackSprite(sprite, `player-${playerId}`);
}
```

### Client Pattern

**Critical:** Clients must check `state._sprites` to know which sprites exist.

```typescript
if (!isHost) {
  adapter.onChange((state) => {
    // REQUIRED: Check _sprites exists
    if (!state._sprites) return;

    // Create sprites based on what host tracked
    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        // Create visual-only sprite (no physics!)
        const sprite = this.add.sprite(data.x, data.y, 'player');
        this.sprites[key] = sprite;

        // Register for auto-updates (NOT trackSprite!)
        adapter.registerRemoteSprite(key, sprite);
      }
    }
  });
}
```

**Key Points:**
- Host uses `this.physics.add.sprite()` + `trackSprite()`
- Client uses `this.add.sprite()` + `registerRemoteSprite()`
- Always check `if (!state._sprites) return`
- Client creates sprites in `onChange()`, NOT in `create()`

---

## Shape-Based Games (No Textures)

**Common in web IDEs and prototypes.** Use Phaser shapes instead of sprites when you don't have image assets.

### Host: Rectangle with Physics

```typescript
if (isHost) {
  // 1. Create rectangle shape
  const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000); // x, y, width, height, color

  // 2. Add physics to the shape
  this.physics.add.existing(rect);

  // 3. Configure physics body
  const body = rect.body as Phaser.Physics.Arcade.Body;
  body.setCollideWorldBounds(true);
  body.setBounce(0.2);

  // 4. Add colliders
  this.physics.add.collider(rect, platforms);

  // 5. Track for multiplayer sync
  this.adapter.trackSprite(rect, `player-${playerId}`);

  // Store reference
  this.players[playerId] = rect;
}
```

### Client: Rectangle WITHOUT Physics

```typescript
if (!isHost) {
  this.adapter.onChange((state) => {
    if (!state._sprites) return;

    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        // Create same shape, NO physics
        const rect = this.add.rectangle(data.x, data.y, 32, 32, 0xff0000);

        this.sprites[key] = rect;
        this.adapter.registerRemoteSprite(key, rect);
      }
    }
  });
}
```

### Creating Platforms (Static Shapes)

**Wrong ❌** (creates invisible sprite):
```typescript
platforms.create(400, 500, undefined); // Don't do this!
```

**Correct ✅** (creates visible rectangle):
```typescript
// Method 1: Create then add to group
const platform = this.add.rectangle(400, 500, 200, 20, 0x8b4513);
this.physics.add.existing(platform, true); // true = static
platforms.add(platform);

// Method 2: Direct creation
const ground = this.add.rectangle(400, 550, 800, 50, 0x34495e);
this.physics.add.existing(ground, true);
```

### Complete Shape-Based Scene Example

```typescript
export function createGameScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    players: Record<string, Phaser.GameObjects.Rectangle> = {};
    sprites: Record<string, Phaser.GameObjects.Rectangle> = {};
    isHost = false;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);
      this.isHost = (window as any).__IS_HOST__ || false;

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

      // Platform (both host and client see it)
      const platform = this.add.rectangle(400, 550, 600, 20, 0x8b4513);
      this.physics.add.existing(platform, true);

      if (this.isHost) {
        // HOST: Create local player immediately
        const myRect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
        this.physics.add.existing(myRect);
        const body = myRect.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.physics.add.collider(myRect, platform);

        this.adapter.trackSprite(myRect, `player-${this.adapter.myId}`);
        this.players[this.adapter.myId] = myRect;
      } else {
        // CLIENT: Create sprites from state
        this.adapter.onChange((state) => {
          if (!state._sprites) return;

          for (const [key, data] of Object.entries(state._sprites)) {
            if (!this.sprites[key]) {
              const rect = this.add.rectangle(data.x || 100, data.y || 100, 32, 32, 0xff0000);
              this.sprites[key] = rect;
              this.adapter.registerRemoteSprite(key, rect);
            }
          }
        });
      }
    }

    update() {
      // Client interpolation
      if (!this.isHost) {
        this.adapter.updateInterpolation();
        return;
      }

      // Host physics
      const cursors = this.input.keyboard!.createCursorKeys();
      runtime.submitAction('move', {
        left: cursors.left.isDown,
        right: cursors.right.isDown,
        up: cursors.up.isDown
      });

      const state = runtime.getState();
      for (const [playerId, input] of Object.entries(state.inputs || {})) {
        const rect = this.players[playerId];
        if (!rect || !rect.body) continue;

        const body = rect.body as Phaser.Physics.Arcade.Body;

        if (input.left) body.setVelocityX(-200);
        else if (input.right) body.setVelocityX(200);
        else body.setVelocityX(0);

        if (input.up && body.touching.down) {
          body.setVelocityY(-350);
        }
      }
    }
  };
}
```

### Circle Shapes

For circular objects (balls, characters):

```typescript
// Host
const circle = this.add.circle(100, 100, 20, 0xff0000); // x, y, radius, color
this.physics.add.existing(circle);
const body = circle.body as Phaser.Physics.Arcade.Body;
body.setCircle(20); // Match visual radius
this.adapter.trackSprite(circle, `player-${playerId}`);

// Client
const circle = this.add.circle(data.x, data.y, 20, 0xff0000);
this.adapter.registerRemoteSprite(key, circle);
```

**Key Differences from Sprites:**
1. ❌ **Don't** use `this.physics.add.sprite(x, y, undefined)` - creates invisible objects
2. ✅ **Do** use `this.add.rectangle()` or `this.add.circle()` first
3. ✅ **Then** call `this.physics.add.existing(shape)` to add physics
4. ✅ Shapes work with `trackSprite()` and `registerRemoteSprite()` just like sprites

---

## Input Handling Pattern

Store player inputs in state, then host reads them to apply physics.

### Game Logic (game.ts)

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100 }])
    ),
    inputs: {} // REQUIRED: Store inputs here
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        // Safety check
        if (!state.inputs) state.inputs = {};

        // Store input for this player
        state.inputs[context.targetId] = input;
      }
    }
  }
});
```

### Scene Logic (scene.ts)

```typescript
update() {
  // Everyone submits input
  const cursors = this.input.keyboard.createCursorKeys();
  runtime.submitAction('move', {
    left: cursors.left.isDown,
    right: cursors.right.isDown,
    up: cursors.up.isDown
  });

  if (isHost) {
    // Host reads inputs and applies physics
    const state = runtime.getState();
    const inputs = state.inputs || {};

    for (const [playerId, input] of Object.entries(inputs)) {
      const sprite = this.players[playerId];
      if (!sprite || !sprite.body) continue;

      const body = sprite.body as Phaser.Physics.Arcade.Body;

      if (input.left) {
        body.setVelocityX(-200);
      } else if (input.right) {
        body.setVelocityX(200);
      } else {
        body.setVelocityX(0);
      }

      if (input.up && body.touching.down) {
        body.setVelocityY(-350);
      }
    }
  }
}
```

**Why this pattern?**
- Separates input capture from physics simulation
- Host has complete authority over physics
- Works even with network lag

---

## Client Interpolation

Clients must call `updateInterpolation()` every frame for smooth remote sprite movement.

```typescript
update() {
  // REQUIRED for clients
  if (!isHost) {
    this.adapter?.updateInterpolation();
  }

  // ... rest of update logic
}
```

**What it does:**
- Smoothly interpolates sprite positions between state updates
- Prevents jittery movement on clients
- Host doesn't need this (physics handles smoothing)

---

## Player Join/Leave Hooks

Handle dynamic player joining with `onPlayerJoin` and `onPlayerLeave`.

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, {
        x: index === 0 ? 200 : 600,
        y: 300,
        role: index === 0 ? 'fire' : 'ice'
      }])
    )
  }),

  onPlayerJoin: (state, playerId) => {
    // Add new player to state
    const existingCount = Object.keys(state.players).length;
    state.players[playerId] = {
      x: existingCount === 0 ? 200 : 600,
      y: 300,
      role: existingCount === 0 ? 'fire' : 'ice'
    };
  },

  onPlayerLeave: (state, playerId) => {
    // Remove player from state
    delete state.players[playerId];
  }
});
```

### Handle Peer Joins in Scene

**Important:** LocalTransport connects instantly, so check for existing peers!

```typescript
if (isHost) {
  // Create host's player
  const mySprite = this.physics.add.sprite(100, 100, 'player');
  adapter.trackSprite(mySprite, `player-${playerId}`);

  // Helper to create other player sprites
  const createPeerSprite = (peerId: string) => {
    if (this.players[peerId]) return; // Already created

    const sprite = this.physics.add.sprite(600, 100, 'player');
    this.players[peerId] = sprite;
    adapter.trackSprite(sprite, `player-${peerId}`);
  };

  // CRITICAL: Check for existing peers (LocalTransport connects instantly!)
  const existingPeers = transport.getPeerIds();
  existingPeers.forEach((peerId) => {
    createPeerSprite(peerId);
  });

  // Also listen for future joins
  transport.onPeerJoin((peerId) => {
    createPeerSprite(peerId);
  });
}
```

---

## Targeting Specific Players

Use the third argument of `submitAction()` to specify which player should be affected.

```typescript
// Scoring example - specify who gets the point
const winnerId = findWinner();
runtime.submitAction('score', undefined, winnerId);
// context.targetId will be winnerId

// Action definition
actions: {
  score: {
    apply: (state, context) => {
      // context.targetId is the player who gets the point
      state.players[context.targetId].score += 1;
    }
  }
}
```

**API signature:**
```typescript
runtime.submitAction(actionName, payload, targetId?)
```

- `actionName`: Which action to run
- `payload`: Action data (can be `undefined`)
- `targetId`: Who to affect (defaults to current player)

---

## State Initialization Safety Checks

Always check if state properties exist before using them.

```typescript
actions: {
  move: {
    apply: (state, context, input) => {
      // Safety check for inputs object
      if (!state.inputs) state.inputs = {};

      state.inputs[context.targetId] = input;
    }
  },

  collect: {
    apply: (state, context, coinId) => {
      // Safety check for coins array
      if (!state.coins) return;

      state.coins = state.coins.filter(c => c.id !== coinId);
      state.players[context.targetId].score += 10;
    }
  }
}
```

**Why?**
- Actions can run before `setup()` completes
- State can be partially initialized during joins
- Prevents runtime errors

---

## Common Patterns Checklist

When building a martini-kit game, make sure you:

- [ ] Host creates sprites with `this.physics.add.sprite()`
- [ ] Host calls `adapter.trackSprite(sprite, key)`
- [ ] Client checks `if (!state._sprites) return`
- [ ] Client creates sprites with `this.add.sprite()`
- [ ] Client calls `adapter.registerRemoteSprite(key, sprite)`
- [ ] Client calls `adapter.updateInterpolation()` in `update()`
- [ ] Store inputs in `state.inputs = {}`
- [ ] Host reads `state.inputs` to apply physics
- [ ] Add safety checks: `if (!state.inputs) state.inputs = {}`
- [ ] Handle `onPlayerJoin` and `onPlayerLeave`
- [ ] Check for existing peers with `transport.getPeerIds()`
- [ ] Use `context.random` instead of `Math.random()` for deterministic randomness

---

## Deterministic Random

**Problem:** Using `Math.random()` in `setup()` or actions causes state desync between host and clients.

**Solution:** Use `context.random` - a deterministic random number generator that produces identical values across all clients.

### Why You Need This

```typescript
// ❌ WRONG - Desyncs between host and client
setup: ({ playerIds }) => ({
  food: Array.from({ length: 50 }, (_, i) => ({
    id: `food-${i}`,
    x: Math.random() * 800,  // Different on each client!
    y: Math.random() * 600
  }))
})
```

```typescript
// ✅ CORRECT - Synced across all clients
setup: ({ playerIds, random }) => ({
  food: Array.from({ length: 50 }, (_, i) => ({
    id: `food-${i}`,
    x: random.range(0, 800),  // Same on all clients!
    y: random.range(0, 600)
  }))
})
```

### Available in Setup Context

Use `random` in your `setup()` function for deterministic initial state:

```typescript
export const game = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, {
        x: random.range(100, 700),          // Random start position
        y: random.range(100, 500),
        color: random.choice(['red', 'blue', 'green', 'yellow']),
        size: random.range(20, 40)
      }])
    ),
    obstacles: Array.from({ length: 10 }, (_, i) => ({
      id: `obstacle-${i}`,
      x: random.range(0, 800),
      y: random.range(0, 600),
      radius: random.range(10, 30)
    })),
    powerUps: [],
    treasureChest: {
      x: random.range(200, 600),
      y: random.range(200, 400),
      locked: random.boolean(0.5)  // 50% chance of being locked
    }
  })
});
```

### Available in Action Context

Use `random` in actions for deterministic gameplay events:

```typescript
actions: {
  spawnEnemy: {
    apply: (state, context) => {
      state.enemies.push({
        id: `enemy-${Date.now()}`,
        x: context.random.range(0, 800),
        y: context.random.range(0, 600),
        speed: context.random.float(1, 3),
        type: context.random.choice(['zombie', 'skeleton', 'ghost'])
      });
    }
  },

  openChest: {
    apply: (state, context) => {
      const chest = state.chests[context.targetId];
      if (!chest) return;

      // Deterministic loot generation
      const loot = {
        gold: context.random.range(10, 100),
        item: context.random.choice(['sword', 'potion', 'key', 'map']),
        isMagic: context.random.boolean(0.2)  // 20% chance of magic item
      };

      state.players[context.playerId].inventory.push(loot);
      delete state.chests[context.targetId];
    }
  }
}
```

### API Reference

`context.random` provides these methods:

| Method | Usage | Returns |
|--------|-------|---------|
| `next()` | `random.next()` | Float in [0, 1) |
| `range(min, max)` | `random.range(0, 100)` | Integer in [min, max) |
| `float(min, max)` | `random.float(0, 1)` | Float in [min, max] |
| `choice(array)` | `random.choice(['a', 'b', 'c'])` | Random element from array |
| `shuffle(array)` | `random.shuffle([1, 2, 3, 4])` | New shuffled copy of array |
| `boolean(probability)` | `random.boolean(0.3)` | true with given probability (default 0.5) |

### Complete Example: Blob Battle

```typescript
export const blobBattleGame = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, {
        // Random starting positions
        x: random.range(100, 700),
        y: random.range(100, 500),
        size: 20,
        targetX: random.range(100, 700),
        targetY: random.range(100, 500)
      }])
    ),
    // Random food positions
    food: Array.from({ length: 50 }, (_, i) => ({
      id: `food-${i}`,
      x: random.range(0, 800),
      y: random.range(0, 600)
    }))
  }),

  actions: {
    tick: {
      apply: (state, context) => {
        if (!context.isHost) return;

        // ... physics logic ...

        // Spawn new food with deterministic random
        const newFoodCount = 50 - state.food.length;
        for (let i = 0; i < newFoodCount; i++) {
          state.food.push({
            id: `food-${Date.now()}-${i}`,
            x: context.random.range(0, 800),
            y: context.random.range(0, 600)
          });
        }
      }
    }
  }
});
```

### Key Points

- ✅ **Always use `context.random`** instead of `Math.random()`
- ✅ Same seed produces **identical sequences** across all clients
- ✅ Each action gets a **different seed** (based on action counter)
- ✅ Works in both **setup** and **actions**
- ❌ Don't use `Math.random()` - it will cause state desync!

---

## Next Steps

- See [Best Practices](./05-best-practices.md) for performance and security patterns
- See [Troubleshooting](./06-troubleshooting.md) for common issues
- Check the [demos](../../../demos) for complete working examples
