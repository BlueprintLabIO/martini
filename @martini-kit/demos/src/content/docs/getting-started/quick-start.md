---
title: Quick Start
description: Build your first multiplayer game in 15 minutes
section: getting-started
order: 2
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
  import CodeBlock from '$lib/components/docs/CodeBlock.svelte';
  import PackageBadge from '$lib/components/docs/PackageBadge.svelte';
</script>

# Quick Start

Build a simple multiplayer platformer in 15 minutes. You'll learn the core martini-kit workflow: define state, create actions, and let the SDK handle all the networking.

## What We're Building

A 2-player cooperative platformer where players can move and jump on platforms. The host runs the physics, and all players stay in sync automatically.

## Prerequisites

Make sure you've [installed martini-kit](/docs/getting-started/installation) first.

## Step 1: Define Your Game Logic

Create `game.ts` to define your game state and actions:

```typescript
// game.ts
import { defineGame } from '@martini-kit/core';
import { createInputAction } from '@martini-kit/core';

export const game = defineGame({
  // Initialize game state
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: index === 0 ? 200 : 600,  // Spawn positions
          y: 300,
          role: index === 0 ? 'player1' : 'player2'
        }
      ])
    ),
    inputs: {}  // Store player inputs here
  }),

  actions: {
    // Players send input, host applies physics
    move: createInputAction('inputs')
  },

  // Handle new players joining mid-game
  onPlayerJoin: (state, playerId) => {
    const playerCount = Object.keys(state.players).length;
    state.players[playerId] = {
      x: playerCount === 0 ? 200 : 600,
      y: 300,
      role: `player${playerCount + 1}`
    };
  },

  // Clean up when players leave
  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
```

<Callout type="info" title="What just happened?">

- **`setup()`** creates the initial state with player positions
- **`actions.move`** stores player input in `state.inputs`
- **`createInputAction('inputs')`** is a helper that handles the boilerplate
- **`onPlayerJoin/Leave`** manage dynamic player connections

</Callout>

## Step 2: Create Your Phaser Scene

Create `scene.ts` for rendering and physics:

```typescript
// scene.ts
import Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

export function createScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    players: Record<string, Phaser.GameObjects.Rectangle> = {};
    sprites: Record<string, Phaser.GameObjects.Rectangle> = {};
    platforms!: Phaser.Physics.Arcade.StaticGroup;

    create() {
      // Create adapter first
      this.adapter = new PhaserAdapter(runtime, this);
      const isHost = this.adapter.isHost();

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

      // Create platforms (both host and clients need to see these)
      this.platforms = this.physics.add.staticGroup();

      const ground = this.add.rectangle(400, 550, 800, 50, 0x8b4513);
      this.physics.add.existing(ground, true);
      this.platforms.add(ground);

      const platform = this.add.rectangle(400, 400, 200, 20, 0x8b4513);
      this.physics.add.existing(platform, true);
      this.platforms.add(platform);

      if (isHost) {
        // HOST: Create physics sprites
        const myId = this.adapter.getMyPlayerId();
        const state = runtime.getState();
        const myData = state.players[myId];

        const player = this.add.rectangle(myData.x, myData.y, 32, 32, 0xff0000);
        this.physics.add.existing(player);

        const body = player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        this.physics.add.collider(player, this.platforms);

        this.adapter.trackSprite(player, `player-${myId}`);
        this.players[myId] = player;
      } else {
        // CLIENT: Create visual sprites from network state
        this.adapter.onChange((state) => {
          if (!state._sprites) return;

          for (const [key, data] of Object.entries(state._sprites)) {
            if (!this.sprites[key]) {
              const player = this.add.rectangle(
                data.x || 100,
                data.y || 100,
                32,
                32,
                0xff0000
              );
              this.sprites[key] = player;
              this.adapter.registerRemoteSprite(key, player);
            }
          }
        });
      }
    }

    update() {
      // Clients: Smooth interpolation
      if (!this.adapter.isHost()) {
        this.adapter.updateInterpolation();
        return;
      }

      // Everyone: Submit inputs
      const cursors = this.input.keyboard!.createCursorKeys();
      runtime.submitAction('move', {
        left: cursors.left.isDown,
        right: cursors.right.isDown,
        up: cursors.up.isDown
      });

      // Host: Apply physics based on inputs
      const state = runtime.getState();
      const inputs = state.inputs || {};

      for (const [playerId, input] of Object.entries(inputs)) {
        const player = this.players[playerId];
        if (!player || !player.body) continue;

        const body = player.body as Phaser.Physics.Arcade.Body;

        // Horizontal movement
        if (input.left) {
          body.setVelocityX(-200);
        } else if (input.right) {
          body.setVelocityX(200);
        } else {
          body.setVelocityX(0);
        }

        // Jump (only when touching ground)
        if (input.up && body.touching.down) {
          body.setVelocityY(-350);
        }
      }
    }
  };
}
```

<Callout type="warning" title="Host vs Client Pattern">

This is the **most important pattern** in martini-kit:

- **Host** creates sprites with `this.physics.add.*` and calls `trackSprite()`
- **Clients** create sprites with `this.add.*` and call `registerRemoteSprite()`
- **Clients must always** call `updateInterpolation()` for smooth movement

</Callout>

## Step 3: Initialize the Game

Create `main.ts` to start everything:

```typescript
// main.ts
import { initializeGame } from '@martini-kit/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 800 },
        debug: false
      }
    },
    backgroundColor: '#1a1a2e'
  }
});
```

## Step 4: Test It!

Open your game in two browser windows side by side. You should see both players in sync!

<Callout type="tip" title="Testing Tip">

For local development, martini-kit automatically uses `LocalTransport` which lets you test multiplayer in multiple tabs on the same machine.

</Callout>

## What You Learned

1. **Define game state** with `defineGame()` - this is your source of truth
2. **Actions are the only way to change state** - keeps everything in sync
3. **Host-authoritative model** - host runs physics, clients mirror the results
4. **Transport-agnostic** - same code works with P2P, WebSocket, etc.

## Next Steps

- **[@martini-kit/core API](/docs/api/core)** - Complete API reference
- **[@martini-kit/phaser API](/docs/api/phaser)** - Phaser integration details
- **[Transports](/docs/api/transports)** - Choose your networking backend

## Common Issues

**Players don't move?**
- Make sure the host is calling `runtime.submitAction('move', ...)`
- Check that your `move` action is updating `state.inputs`

**Sprites are jittery on clients?**
- Call `adapter.updateInterpolation()` in your `update()` method

**Second player doesn't appear?**
- Clients must check `if (!state._sprites) return` before creating sprites
- Make sure you're using `onChange()` to detect new sprites

Ready to learn more? Check out the [API documentation](/docs/api/core)!
