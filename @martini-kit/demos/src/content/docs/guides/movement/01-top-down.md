---
title: Top-Down Movement
description: Top-down movement patterns for arena shooters, RPGs, and twin-stick shooters
section: guides
subsection: movement
order: 1
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Top-Down Movement

Movement patterns for top-down games like arena shooters, Zelda-like games, RPGs, and twin-stick shooters.

## 8-Direction Movement

**Use Case:** Arena shooters, zelda-like games, RPGs

Basic 8-direction movement with constant speed.

### Game Definition

```typescript
import { defineGame } from '@martini-kit/core';

const PLAYER_SPEED = 200; // pixels per second

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 400,
          y: 300,
          vx: 0,
          vy: 0,
        },
      ])
    ),
    inputs: {} as Record<string, {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
    }>,
  }),

  actions: {
    move: {
      apply: (state, context, input: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      }) => {
        // Store input for physics update
        state.inputs[context.targetId] = input;

        const player = state.players[context.targetId];
        if (!player) return;

        // Calculate movement direction
        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          player.vx = (dx / length) * PLAYER_SPEED;
          player.vy = (dy / length) * PLAYER_SPEED;
        } else {
          player.vx = dx * PLAYER_SPEED;
          player.vy = dy * PLAYER_SPEED;
        }
      },
    },

    // Physics update (called every frame on host)
    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          // Update position
          player.x += player.vx * deltaSeconds;
          player.y += player.vy * deltaSeconds;

          // Clamp to arena bounds
          player.x = Math.max(20, Math.min(780, player.x));
          player.y = Math.max(20, Math.min(580, player.y));
        }
      },
    },
  },
});
```

### Phaser Scene (Input Handling)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager Helper** - Automatic WASD/Arrow key handling:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter, InputManager } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private inputManager!: InputManager;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Automatically handles WASD + Arrow keys
    this.inputManager = new InputManager(this.adapter, this, {
      type: 'wasd-arrows',
      actionName: 'move',
    });

    // That's it! Input is automatically submitted every frame
  }

  update(time: number, delta: number) {
    // Update physics (host only)
    if (this.adapter.isHost()) {
      this.runtime.submitAction('tick', { delta });
    }

    this.adapter.update(time, delta);
  }
}
```

**Benefits:**
- ✅ Handles both WASD and Arrow keys automatically
- ✅ Auto-submits input every frame
- ✅ Just 3 lines instead of 20+
- ✅ Supports gamepad out of the box

{/snippet}

{#snippet core()}

**Manual Input Handling** - Full control over keyboard:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Set up keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as any;

    // ... create sprites ...
  }

  update(time: number, delta: number) {
    // Read input state
    const input = {
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
    };

    // Submit movement action
    this.runtime.submitAction('move', input);

    // Update physics (host only)
    if (this.adapter.isHost()) {
      this.runtime.submitAction('tick', { delta });
    }

    // Update adapter (handles sprite interpolation)
    this.adapter.update(time, delta);
  }
}
```

**Use when:**
- Custom key bindings needed
- Special input processing required
- Non-standard control schemes

{/snippet}
</CodeTabs>

**Features:**
- ✅ Smooth 8-direction movement
- ✅ Diagonal speed normalization
- ✅ Boundary clamping
- ✅ WASD and arrow key support

---

## Analog/Free Movement

**Use Case:** Racing games, twin-stick shooters

Analog movement with acceleration and deceleration.

### Game Definition

```typescript
const MAX_SPEED = 300;
const ACCELERATION = 800; // pixels/s²
const FRICTION = 600; // deceleration when no input

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          vx: 0,
          vy: 0,
        },
      ])
    ),
    inputs: {} as Record<string, {
      x: number; // -1 to 1
      y: number; // -1 to 1
    }>,
  }),

  actions: {
    move: {
      apply: (state, context, input: { x: number; y: number }) => {
        state.inputs[context.targetId] = input;
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const [playerId, player] of Object.entries(state.players)) {
          const inputData = state.inputs[playerId];
          if (!inputData) continue;

          // Apply acceleration
          if (inputData.x !== 0 || inputData.y !== 0) {
            player.vx += inputData.x * ACCELERATION * deltaSeconds;
            player.vy += inputData.y * ACCELERATION * deltaSeconds;

            // Cap at max speed
            const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
            if (speed > MAX_SPEED) {
              player.vx = (player.vx / speed) * MAX_SPEED;
              player.vy = (player.vy / speed) * MAX_SPEED;
            }
          } else {
            // Apply friction
            const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
            if (speed > 0) {
              const frictionAmount = Math.min(FRICTION * deltaSeconds, speed);
              player.vx -= (player.vx / speed) * frictionAmount;
              player.vy -= (player.vy / speed) * frictionAmount;
            }
          }

          // Update position
          player.x += player.vx * deltaSeconds;
          player.y += player.vy * deltaSeconds;

          // Boundary bounce
          if (player.x < 20 || player.x > 780) {
            player.vx *= -0.5; // Bounce with energy loss
            player.x = Math.max(20, Math.min(780, player.x));
          }
          if (player.y < 20 || player.y > 580) {
            player.vy *= -0.5;
            player.y = Math.max(20, Math.min(580, player.y));
          }
        }
      },
    },
  },
});
```

**Features:**
- ✅ Smooth acceleration
- ✅ Friction/deceleration
- ✅ Speed capping
- ✅ Boundary bounce

## See Also

- [Platformer Movement](/docs/latest/guides/movement/02-platformer) - Side-scrolling movement with gravity
- [Advanced Movement](/docs/latest/guides/movement/03-advanced) - Mouse/pointer and rotation
- [Physics & Collision](/docs/latest/guides/physics-and-collisions) - Physics integration
