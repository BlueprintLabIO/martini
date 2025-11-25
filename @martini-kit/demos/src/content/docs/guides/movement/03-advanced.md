---
title: Advanced Movement
description: Mouse/pointer movement, rotation, aiming, and input buffering patterns
section: guides
subsection: movement
order: 3
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Advanced Movement

Advanced movement patterns including mouse/pointer movement, continuous rotation, aiming, and input buffering.

## Mouse/Pointer Movement

**Use Case:** Click-to-move games, strategy games, RTS

Move player to clicked position with smooth pathfinding.

### Game Definition

```typescript
import { defineGame } from '@martini-kit/core';

const MOVE_SPEED = 200;

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          targetX: 400,
          targetY: 300,
        },
      ])
    ),
  }),

  actions: {
    setTarget: {
      apply: (state, context, input: { x: number; y: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.targetX = input.x;
        player.targetY = input.y;
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const player of Object.values(state.players)) {
          const dx = player.targetX - player.x;
          const dy = player.targetY - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Move toward target
          if (distance > 5) {
            const moveDistance = Math.min(MOVE_SPEED * deltaSeconds, distance);
            player.x += (dx / distance) * moveDistance;
            player.y += (dy / distance) * moveDistance;
          }
        }
      },
    },
  },
});
```

### Phaser Scene (Input Handling)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using InputManager** - Automatic pointer tracking:

```typescript
import { PhaserAdapter, InputManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Track pointer clicks automatically
  this.inputManager = new InputManager(this.adapter, this, {
    type: 'pointer-click',
    actionName: 'setTarget',
  });

  // That's it! Clicks are auto-submitted as actions
}
```

**Benefits:**
- ✅ Auto-submits on pointer down
- ✅ Handles both mouse and touch
- ✅ Just 3 lines

{/snippet}

{#snippet core()}

**Manual Pointer Handling** - Full control:

```typescript
create() {
  // Handle pointer click
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    this.runtime.submitAction('setTarget', {
      x: pointer.x,
      y: pointer.y,
    });
  });
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ Click-to-move
- ✅ Smooth pathfinding
- ✅ Automatic stopping

---

## Continuous Rotation

**Use Case:** Twin-stick shooters, space games, top-down shooters

Player rotates to face movement direction or mouse cursor.

### Rotation Based on Movement Direction

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          rotation: 0, // radians
          vx: 0,
          vy: 0,
        },
      ])
    ),
  }),

  actions: {
    move: {
      apply: (state, context, input: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        // Update rotation if moving
        if (dx !== 0 || dy !== 0) {
          player.rotation = Math.atan2(dy, dx);

          // Normalize velocity
          const length = Math.sqrt(dx * dx + dy * dy);
          player.vx = (dx / length) * 200;
          player.vy = (dy / length) * 200;
        } else {
          player.vx = 0;
          player.vy = 0;
        }
      },
    },
  },
});
```

### Mouse Aim

For twin-stick shooters where player aims with mouse:

```typescript
actions: {
  aim: {
    apply: (state, context, input: { cursorX: number; cursorY: number }) => {
      const player = state.players[context.targetId];
      if (!player) return;

      const dx = input.cursorX - player.x;
      const dy = input.cursorY - player.y;

      player.rotation = Math.atan2(dy, dx);
    },
  },
}
```

### Phaser Scene (Rendering Rotation)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using SpriteManager** - Automatic rotation rendering:

```typescript
import { PhaserAdapter, SpriteManager } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Auto-sync rotation with updateSprite
  this.playerManager = new SpriteManager(this.adapter, this, {
    collection: 'players',
    createSprite: (player) => this.add.triangle(
      player.x, player.y, 0, -15, -10, 10, 10, 10, 0x00aaff
    ),
    updateSprite: (sprite, player) => {
      sprite.x = player.x;
      sprite.y = player.y;
      sprite.rotation = player.rotation; // Auto-updates!
    },
  });
}

update(time: number, delta: number) {
  // Track mouse cursor
  const pointer = this.input.activePointer;
  this.runtime.submitAction('aim', {
    cursorX: pointer.x,
    cursorY: pointer.y,
  });

  this.adapter.update(time, delta);
}
```

{/snippet}

{#snippet core()}

**Manual Rotation Rendering** - Full control:

```typescript
update(time: number, delta: number) {
  // Update aim rotation
  const pointer = this.input.activePointer;
  this.runtime.submitAction('aim', {
    cursorX: pointer.x,
    cursorY: pointer.y,
  });

  // Render rotation (if using SpriteManager, this is automatic)
  const state = this.runtime.getState();
  const myPlayer = state.players[this.adapter.getMyPlayerId()];
  if (myPlayer && this.playerSprite) {
    this.playerSprite.rotation = myPlayer.rotation;
  }
}
```

{/snippet}
</CodeTabs>

**Features:**
- ✅ 360° rotation
- ✅ Face movement direction
- ✅ Mouse aiming

---

## Input Buffering

**Use Case:** All games with client-side input

Efficient input synchronization using `createInputAction` to reduce network traffic.

### Game Definition

```typescript
import { createInputAction } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, vx: 0, vy: 0 }])
    ),
    inputs: {} as Record<string, {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
    }>,
  }),

  actions: {
    // Automatically stores input in state.inputs[playerId]
    move: createInputAction('inputs'),

    // Process all inputs in tick
    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        for (const [playerId, player] of Object.entries(state.players)) {
          const inputData = state.inputs[playerId];
          if (!inputData) continue;

          // Calculate velocity from input
          const dx = (inputData.right ? 1 : 0) - (inputData.left ? 1 : 0);
          const dy = (inputData.down ? 1 : 0) - (inputData.up ? 1 : 0);

          if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            player.vx = (dx / length) * 200;
            player.vy = (dy / length) * 200;
          } else {
            player.vx = 0;
            player.vy = 0;
          }

          // Update position
          player.x += player.vx * deltaSeconds;
          player.y += player.vy * deltaSeconds;
        }
      },
    },
  },
});
```

**Benefits:**
- ✅ Reduces network traffic
- ✅ Batches input updates
- ✅ Cleaner separation of input and physics

---

## Best Practices

### DO ✅

- **Normalize diagonal movement** to prevent faster diagonal speed
- **Use delta time** for frame-rate independent movement
- **Clamp boundaries** to prevent players going out of bounds
- **Buffer inputs** using `createInputAction` for efficiency
- **Separate input from physics** (input action + tick action)
- **Use InputManager** for automatic keyboard/gamepad handling

### DON'T ❌

- **Don't apply physics in the move action** - use a separate tick action
- **Don't use Math.random()** - use `context.random` for determinism
- **Don't forget to normalize** diagonal vectors
- **Don't hardcode delta** - always use actual frame delta
- **Don't sync every frame** - use reasonable sync rates (50-100ms)

## See Also

- [Top-Down Movement](/docs/latest/guides/movement/01-top-down) - Basic movement patterns
- [Platformer Movement](/docs/latest/guides/movement/02-platformer) - Gravity and jumping
- [Shooting Mechanics](/docs/latest/recipes/shooting-mechanics/01-basics) - Projectile movement
- [Physics Integration](/docs/latest/guides/physics-and-collisions) - Advanced physics
- [Input Manager API](/docs/latest/api/phaser/input-manager) - Phaser input utilities
