---
title: Platformer Movement
description: Side-scrolling platformer movement with gravity, jumping, and ground detection
section: guides
subsection: movement
order: 2
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Platformer Movement

Movement patterns for side-scrolling platformers and Mario-style games with gravity, jumping, and ground detection.

## Basic Platformer Movement

**Use Case:** Side-scrolling platformers, Mario-style games

### Game Definition

```typescript
import { defineGame } from '@martini-kit/core';

const PLAYER_SPEED = 150;
const JUMP_VELOCITY = -400;
const GRAVITY = 800;

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 100 + index * 200,
          y: 400,
          vx: 0,
          vy: 0,
          onGround: false,
        },
      ])
    ),
    inputs: {} as Record<string, {
      left: boolean;
      right: boolean;
      jump: boolean;
    }>,
  }),

  actions: {
    move: {
      apply: (state, context, input: {
        left: boolean;
        right: boolean;
        jump: boolean;
      }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Horizontal movement
        if (input.left) {
          player.vx = -PLAYER_SPEED;
        } else if (input.right) {
          player.vx = PLAYER_SPEED;
        } else {
          player.vx = 0;
        }

        // Jump (only when on ground)
        if (input.jump && player.onGround) {
          player.vy = JUMP_VELOCITY;
          player.onGround = false;
        }
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          // Apply gravity
          if (!player.onGround) {
            player.vy += GRAVITY * deltaSeconds;
          }

          // Update position
          player.x += player.vx * deltaSeconds;
          player.y += player.vy * deltaSeconds;

          // Ground collision (simple)
          const GROUND_Y = 550;
          if (player.y >= GROUND_Y) {
            player.y = GROUND_Y;
            player.vy = 0;
            player.onGround = true;
          }

          // Boundary clamping
          player.x = Math.max(20, Math.min(780, player.x));
        }
      },
    },
  },
});
```

### Phaser Scene with Physics

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager** - Automatic input handling:

```typescript
import { PhaserAdapter, InputManager, SpriteManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Automatic WASD + Arrow + Space input
  this.inputManager = new InputManager(this.adapter, this, {
    type: 'platformer',
    actionName: 'move',
    jumpKey: 'SPACE',
  });

  // Create platform
  const platform = this.add.rectangle(400, 570, 600, 20, 0x8b4513);
  this.physics.add.existing(platform, true);

  // Auto-sync player sprites
  this.playerManager = new SpriteManager(this.adapter, this, {
    collection: 'players',
    createSprite: (player) => this.add.circle(player.x, player.y, 20, 0x00aaff),
    updateSprite: (sprite, player) => {
      sprite.x = player.x;
      sprite.y = player.y;
    },
  });
}

update(time: number, delta: number) {
  if (this.adapter.isHost()) {
    this.runtime.submitAction('tick', { delta });
  }
  this.adapter.update(time, delta);
}
```

**Benefits:**
- ✅ Automatic jump key handling
- ✅ Built-in ground detection support
- ✅ Less input boilerplate

{/snippet}

{#snippet core()}

**Manual Input Handling** - Full control:

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Create platform
  const platform = this.add.rectangle(400, 570, 600, 20, 0x8b4513);
  this.physics.add.existing(platform, true);

  // Create player sprites with physics (use SpriteManager for auto-sync)
}

update(time: number, delta: number) {
  const input = {
    left: this.cursors.left.isDown,
    right: this.cursors.right.isDown,
    jump: this.cursors.up.isDown || this.cursors.space.isDown,
  };

  this.runtime.submitAction('move', input);

  if (this.adapter.isHost()) {
    this.runtime.submitAction('tick', { delta });
  }

  this.adapter.update(time, delta);
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ Gravity
- ✅ Jumping
- ✅ Ground detection
- ✅ Platform collision

## See Also

- [Top-Down Movement](/docs/latest/guides/movement/01-top-down) - Arena shooter and RPG movement
- [Advanced Movement](/docs/latest/guides/movement/03-advanced) - Mouse/pointer and rotation
- [Physics & Collision](/docs/latest/guides/physics-and-collision) - Physics integration
