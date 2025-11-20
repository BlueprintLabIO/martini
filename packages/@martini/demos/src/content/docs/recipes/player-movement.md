<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Player Movement Recipes

Common player movement patterns for multiplayer games. Copy and adapt these recipes for your game.

## Table of Contents

- [Top-Down Movement (8-Direction)](#top-down-movement-8-direction)
- [Top-Down Movement (Analog/Free)](#top-down-movement-analogfree)
- [Platformer Movement](#platformer-movement)
- [Mouse/Pointer Movement](#mousepointer-movement)
- [Continuous Rotation](#continuous-rotation)
- [Input Buffering](#input-buffering)

---

## Top-Down Movement (8-Direction)

**Use Case:** Arena shooters, zelda-like games, RPGs

Basic 8-direction movement with constant speed.

### Game Definition

```typescript
import { defineGame } from '@martini/core';

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
import { PhaserAdapter, InputManager } from '@martini/phaser';

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
import { PhaserAdapter } from '@martini/phaser';

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

## Top-Down Movement (Analog/Free)

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

---

## Platformer Movement

**Use Case:** Side-scrolling platformers, Mario-style games

Gravity, jumping, and ground detection.

### Game Definition

```typescript
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

**Features:**
- ✅ Gravity
- ✅ Jumping
- ✅ Ground detection
- ✅ Platform collision

---

## Mouse/Pointer Movement

**Use Case:** Click-to-move games, strategy games

Move player to clicked position.

### Game Definition

```typescript
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

### Phaser Scene

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

**Features:**
- ✅ Click-to-move
- ✅ Smooth pathfinding
- ✅ Automatic stopping

---

## Continuous Rotation

**Use Case:** Twin-stick shooters, space games

Player rotates to face movement direction or mouse cursor.

### Game Definition (Movement Direction)

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

### Game Definition (Mouse Aim)

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

### Phaser Scene

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

**Features:**
- ✅ 360° rotation
- ✅ Face movement direction
- ✅ Mouse aiming

---

## Input Buffering

**Use Case:** All games with client-side input

Efficient input synchronization using `createInputAction`.

### Game Definition

```typescript
import { createInputAction } from '@martini/core';

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

---

## See Also

- [Shooting Mechanics](/docs/latest/recipes/shooting-mechanics) - Projectile movement
- [Physics Integration](/docs/latest/guides/physics-and-collision) - Advanced physics
- [Input Manager](/docs/latest/api/phaser/input-manager) - Phaser input utilities
- [Arena Blaster Example](/docs/latest/examples/overview#arena-blaster) - Complete movement example
