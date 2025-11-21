---
title: "Phaser Integration Guide"
description: Deep dive into integrating Phaser with martini-kit - host/client patterns, sprite management, and common pitfalls
section: guides
order: 1
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Phaser Integration Guide

This guide teaches you how to properly integrate Phaser 3 with martini-kit's host-authoritative multiplayer model. You'll learn the critical patterns that make multiplayer Phaser games work correctly.

## The Core Principle

**martini-kit is host-authoritative.** One player (the host) runs the actual game logic and physics. Other players (clients) receive state updates and mirror what's happening on the host.

This means:
- **Host**: Creates physics sprites, runs collisions, applies game logic
- **Clients**: Create visual-only sprites, interpolate movement, display state

<Callout type="warning" title="Critical Rule">

The #1 beginner mistake is creating physics sprites on clients. This causes state desyncs, duplicate physics calculations, and broken gameplay.

**Always check `adapter.isHost()` before creating physics objects.**

</Callout>

---

## Host vs Client Pattern

This pattern appears in every martini-kit game. Master it and you'll avoid 90% of multiplayer bugs.

### The Pattern

```typescript
import { PhaserAdapter } from '@martini-kit/phaser';

class GameScene extends Phaser.Scene {
  adapter!: PhaserAdapter;
  remoteSprites = new Map<string, Phaser.GameObjects.Sprite>();

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    if (this.adapter.isHost()) {
      this.createHostSprites();
    } else {
      this.createClientSprites();
    }
  }

  createHostSprites() {
    // HOST: Create physics sprites
    const state = this.adapter.getState();

    for (const [playerId, playerData] of Object.entries(state.players)) {
      const sprite = this.physics.add.sprite(
        playerData.x,
        playerData.y,
        'player'
      );

      sprite.setCollideWorldBounds(true);
      sprite.setBounce(0.2);

      // Track sprite for automatic syncing
      this.adapter.trackSprite(sprite, `player-${playerId}`);
    }
  }

  createClientSprites() {
    // CLIENT: Create visual sprites from state updates
    this.adapter.onChange((state) => {
      if (!state._sprites) return; // Critical check

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const sprite = this.add.sprite(data.x, data.y, 'player');

          // Register for interpolation
          this.adapter.registerRemoteSprite(key, sprite);
          this.remoteSprites.set(key, sprite);
        }
      }
    });
  }

  update() {
    // CLIENT: Apply interpolation for smooth movement
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
  }
}
```

### Why This Works

1. **Host creates `this.physics.add.sprite()`** - Gets a physics body that can move, collide, and respond to forces
2. **Host calls `trackSprite()`** - Automatically syncs position, rotation, velocity to state
3. **Client creates `this.add.sprite()`** - Visual-only sprite with no physics body
4. **Client calls `registerRemoteSprite()`** - Registers sprite for smooth interpolation
5. **Client calls `updateInterpolation()`** - Smoothly moves sprites to match host state

---

## Sprite Lifecycle Management

Real games have entities that spawn and despawn. Use `SpriteManager` for automatic lifecycle handling.

### Enemy Spawning Example

```typescript
// game.ts - Add enemies to state
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds),
    enemies: {} as Record<string, { x: number; y: number; health: number }>,
    inputs: {}
  }),

  actions: {
    spawnEnemy: {
      apply(state, context) {
        const id = `enemy-${Date.now()}`;
        state.enemies[id] = {
          x: context.random.range(50, 750),
          y: context.random.range(50, 550),
          health: 100
        };
      }
    },

    killEnemy: {
      apply(state, context, { enemyId }: { enemyId: string }) {
        delete state.enemies[enemyId];
      }
    }
  }
});
```

```typescript
// scene.ts - Automatic sprite creation/destruction
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  const enemyManager = this.adapter.createSpriteManager({
    stateKey: 'enemies',

    // HOST: Create enemy with physics
    onCreatePhysics: (scene, id, data) => {
      const enemy = scene.physics.add.sprite(data.x, data.y, 'enemy');
      enemy.setCollideWorldBounds(true);
      return enemy;
    },

    // CLIENT: Create visual enemy
    onCreate: (scene, id, data) => {
      return scene.add.sprite(data.x, data.y, 'enemy');
    },

    // Both host and client: Update sprite properties
    onUpdate: (sprite, data) => {
      // Example: Change tint based on health
      if (data.health < 30) {
        sprite.setTint(0xff0000);
      }
    },

    // Both host and client: Cleanup
    onDestroy: (sprite) => {
      sprite.destroy();
    }
  });
}
```

**What SpriteManager does:**
- Detects when `state.enemies[id]` is added → calls `onCreate` or `onCreatePhysics`
- Calls `onUpdate` every frame for existing sprites
- Detects when `state.enemies[id]` is deleted → calls `onDestroy`
- Handles host vs client creation automatically

---

## Shape-Based Games

Not all games need texture assets. Shapes are perfect for prototypes, web IDEs, and minimalist games.

### Creating Shape Sprites

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // HOST: Rectangle with physics
    const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
    this.physics.add.existing(rect);

    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setVelocity(100, 0);

    this.adapter.trackSprite(rect, `player-${playerId}`);

  } else {
    // CLIENT: Rectangle without physics
    this.adapter.onChange((state) => {
      if (!state._sprites) return;

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const rect = this.add.rectangle(
            data.x,
            data.y,
            32,
            32,
            0xff0000
          );
          this.adapter.registerRemoteSprite(key, rect);
          this.remoteSprites.set(key, rect);
        }
      }
    });
  }
}
```

### Available Shapes

All work with `trackSprite()` and `registerRemoteSprite()`:

```typescript
// Rectangles
const rect = this.add.rectangle(x, y, width, height, color);

// Circles
const circle = this.add.circle(x, y, radius, color);

// Ellipses
const ellipse = this.add.ellipse(x, y, width, height, color);

// Polygons
const triangle = this.add.triangle(x, y, x1, y1, x2, y2, x3, y3, color);

// Graphics (for complex shapes)
const graphics = this.add.graphics();
graphics.fillStyle(0xff0000);
graphics.fillRect(0, 0, 32, 32);
```

**Add physics to any shape:**
```typescript
this.physics.add.existing(shape);
const body = shape.body as Phaser.Physics.Arcade.Body;
```

---

## Input Handling Pattern

Inputs go through state, not directly to sprites. This keeps host and clients in sync.

### The Flow

1. Player presses key → `submitAction('move', { x, y })`
2. Action stores input in `state.inputs[playerId]`
3. Host reads inputs from state → applies to physics sprites
4. Clients receive updated state → sprites update automatically

### Implementation

```typescript
// game.ts
import { createInputAction } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds),
    inputs: {} as Record<string, { x?: number; y?: number }>
  }),

  actions: {
    move: createInputAction('inputs') // Stores input in state
  }
});
```

```typescript
// scene.ts
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Setup input manager
  const inputManager = this.adapter.createInputManager();

  inputManager.bindKeys({
    'W': { action: 'move', input: { y: -1 }, mode: 'continuous' },
    'S': { action: 'move', input: { y: 1 }, mode: 'continuous' },
    'A': { action: 'move', input: { x: -1 }, mode: 'continuous' },
    'D': { action: 'move', input: { x: 1 }, mode: 'continuous' }
  });

  // HOST: Apply inputs to physics
  if (this.adapter.isHost()) {
    const physicsManager = this.adapter.createPhysicsManager({
      stateKey: 'inputs',
      behaviors: [
        {
          type: 'top-down',
          speed: 200,
          applyTo: (playerId) => this.playerSprites.get(playerId)!
        }
      ]
    });
  }
}
```

<Callout type="info" title="Why Store Inputs in State?">

Inputs must be in state so the host can read them. The host runs all physics calculations, so it needs to know what every player is doing. Storing inputs in state automatically syncs them from clients to host.

</Callout>

---

## Collision Handling

Collisions only happen on the host. Use `CollisionManager` for declarative collision rules.

### Basic Collision

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // Create collision manager
    const collisionManager = this.adapter.createCollisionManager({
      rules: [
        {
          between: ['player', 'enemy'],
          onCollide: (player, enemy) => {
            // Submit action to update state
            runtime.submitAction('damage', { amount: 10 });
          }
        }
      ]
    });
  }
}
```

### SpriteManager Collisions

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    const playerManager = this.adapter.createSpriteManager({
      stateKey: 'players',
      // ... sprite creation
    });

    const coinManager = this.adapter.createSpriteManager({
      stateKey: 'coins',
      // ... sprite creation
    });

    this.adapter.createCollisionManager({
      rules: [
        {
          between: [playerManager, coinManager],
          onCollide: (playerSprite, coinSprite, playerKey, coinKey) => {
            // Submit action with entity IDs
            runtime.submitAction('collect', { coinId: coinKey });
          }
        }
      ]
    });
  }
}
```

### Why Host-Only?

Collisions are part of game logic. If clients also ran collisions:
- Same collision would trigger multiple times
- Network latency would cause different collision results on each client
- State would desync

**Rule**: All game logic (collisions, spawning, scoring) happens on host only.

---

## Deterministic Random

`Math.random()` will cause state desyncs. Always use `context.random`.

### The Problem

```typescript
// BAD - Will desync
setup: ({ playerIds }) => ({
  enemies: Array.from({ length: 10 }, () => ({
    x: Math.random() * 800,  // Different on each peer!
    y: Math.random() * 600
  }))
})
```

Host generates different random positions than clients. State desyncs immediately.

### The Solution

```typescript
// GOOD - Same result on all peers
setup: ({ playerIds, random }) => ({
  enemies: Array.from({ length: 10 }, () => ({
    x: random.range(0, 800),  // Deterministic
    y: random.range(0, 600)
  }))
})
```

`context.random` is a seeded random generator. Same seed = same sequence on all peers.

### Available Methods

```typescript
// In setup, actions, onTick
apply(state, context) {
  const { random } = context;

  // Random float [0, 1)
  const r = random.next();

  // Random integer [min, max)
  const x = random.range(0, 800);

  // Random float [min, max]
  const speed = random.float(50.5, 100.5);

  // Random array element
  const type = random.choice(['zombie', 'skeleton', 'ghost']);

  // Shuffle array
  const deck = random.shuffle([1, 2, 3, 4, 5]);

  // Random boolean (50% by default)
  if (random.boolean()) {
    // ...
  }

  // Random boolean with probability
  if (random.boolean(0.3)) { // 30% chance
    // ...
  }
}
```

---

## Player Join/Leave Handling

Handle players connecting and disconnecting gracefully.

### Basic Join/Leave

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  onPlayerJoin: (state, playerId) => {
    // Add new player to state
    state.players[playerId] = {
      x: 100,
      y: 100,
      score: 0
    };
  },

  onPlayerLeave: (state, playerId) => {
    // Remove disconnected player
    delete state.players[playerId];
  }
});
```

### Sprite Cleanup

If you're manually tracking sprites (not using SpriteManager):

```typescript
// scene.ts
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (!this.adapter.isHost()) {
    this.adapter.onChange((state, prevState) => {
      // Detect removed players
      if (prevState?.players) {
        for (const playerId of Object.keys(prevState.players)) {
          if (!state.players[playerId]) {
            // Player left - destroy their sprite
            const sprite = this.remoteSprites.get(`player-${playerId}`);
            if (sprite) {
              sprite.destroy();
              this.remoteSprites.delete(`player-${playerId}`);
            }
          }
        }
      }
    });
  }
}
```

**With SpriteManager**: Cleanup is automatic. When `state.players[id]` is deleted, `onDestroy` callback runs.

---

## Common Pitfalls

### 1. Creating Physics Sprites on Clients

```typescript
// WRONG
create() {
  const sprite = this.physics.add.sprite(100, 100, 'player'); // On everyone!
}

// RIGHT
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    const sprite = this.physics.add.sprite(100, 100, 'player');
  }
}
```

### 2. Forgetting to Check `state._sprites`

```typescript
// WRONG - Will crash on initial render
this.adapter.onChange((state) => {
  for (const [key, data] of Object.entries(state._sprites)) {
    // state._sprites is undefined initially!
  }
});

// RIGHT
this.adapter.onChange((state) => {
  if (!state._sprites) return; // Critical check

  for (const [key, data] of Object.entries(state._sprites)) {
    // Safe
  }
});
```

### 3. Forgetting `updateInterpolation()`

```typescript
// WRONG - Sprites will teleport instead of moving smoothly
update() {
  // Nothing
}

// RIGHT
update() {
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation();
  }
}
```

### 4. Using `Math.random()`

```typescript
// WRONG - State desync
actions: {
  spawn: {
    apply(state) {
      state.enemy.x = Math.random() * 800; // Different on each peer
    }
  }
}

// RIGHT
actions: {
  spawn: {
    apply(state, context) {
      state.enemy.x = context.random.range(0, 800); // Same on all peers
    }
  }
}
```

### 5. Modifying State Outside Actions

```typescript
// WRONG - Won't sync to other players
update() {
  const state = this.adapter.getState();
  state.players[this.playerId].score++; // Direct mutation
}

// RIGHT
update() {
  runtime.submitAction('incrementScore', {});
}
```

---

## Complete Example

Here's a complete platformer scene with all patterns:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';
import type { GameRuntime } from '@martini-kit/core';
import type { GameState } from './game';

export function createScene(runtime: GameRuntime<GameState>) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter<GameState>;
    playerSprites = new Map<string, Phaser.Physics.Arcade.Sprite>();
    remoteSprites = new Map<string, Phaser.GameObjects.Sprite>();

    constructor() {
      super({ key: 'GameScene' });
    }

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Create ground
      const ground = this.add.rectangle(400, 568, 800, 64, 0x00ff00);
      this.physics.add.existing(ground, true); // Static body

      if (this.adapter.isHost()) {
        this.createHostSprites(ground);
      } else {
        this.createClientSprites();
      }

      this.setupInput();
    }

    createHostSprites(ground: Phaser.GameObjects.GameObject) {
      const state = this.adapter.getState();

      for (const [playerId, playerData] of Object.entries(state.players)) {
        const sprite = this.physics.add.sprite(
          playerData.x,
          playerData.y,
          'player'
        );

        sprite.setCollideWorldBounds(true);
        sprite.setBounce(0.2);

        // Add collision with ground
        this.physics.add.collider(sprite, ground);

        this.adapter.trackSprite(sprite, `player-${playerId}`);
        this.playerSprites.set(playerId, sprite);
      }

      // Apply physics behaviors
      this.adapter.createPhysicsManager({
        stateKey: 'inputs',
        behaviors: [
          {
            type: 'platformer',
            speed: 200,
            jumpVelocity: -350,
            applyTo: (playerId) => this.playerSprites.get(playerId)!
          }
        ]
      });
    }

    createClientSprites() {
      this.adapter.onChange((state) => {
        if (!state._sprites) return;

        for (const [key, data] of Object.entries(state._sprites)) {
          if (!this.remoteSprites.has(key)) {
            const sprite = this.add.sprite(data.x, data.y, 'player');
            this.adapter.registerRemoteSprite(key, sprite);
            this.remoteSprites.set(key, sprite);
          }
        }
      });
    }

    setupInput() {
      const inputManager = this.adapter.createInputManager();

      inputManager.bindKeys({
        'A': { action: 'move', input: { x: -1 }, mode: 'continuous' },
        'D': { action: 'move', input: { x: 1 }, mode: 'continuous' },
        'SPACE': { action: 'move', input: { jump: true }, mode: 'pressed' }
      });
    }

    update() {
      if (!this.adapter.isHost()) {
        this.adapter.updateInterpolation();
      }
    }
  };
}
```

---

## Next Steps

- **[Best Practices](/docs/guides/best-practices)** - Performance optimization and patterns
- **[@martini-kit/phaser API](/docs/api/phaser)** - Complete API reference
- **[@martini-kit/core API](/docs/api/core)** - Core concepts and runtime

## Examples

Study working examples:
- [Fire & Ice](../../preview/fire-and-ice) - Cooperative platformer with roles
- [Blob Battle](../../preview/blob-battle) - Top-down competitive game
- [Paddle Battle](../../preview/paddle-battle) - Classic Pong with multiplayer
