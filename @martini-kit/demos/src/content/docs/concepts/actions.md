---
title: Actions
description: Understanding martini-kit's action system and the critical playerId vs targetId distinction
section: concepts
order: 3
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Actions

Actions are **how you change game state** in martini-kit. They are the bridge between player input and state mutations. Understanding actions—especially the difference between `playerId` and `targetId`—is critical.

## What is an Action?

An action is a **named, typed function** that modifies state:

```typescript
interface ActionDefinition<TState, TInput> {
  apply: (state: TState, context: ActionContext, input: TInput) => void;
}
```

**Example**:
```typescript
actions: {
  move: {
    apply: (state, context, input: { x: number; y: number }) => {
      state.players[context.targetId].x = input.x;
      state.players[context.targetId].y = input.y;
    }
  }
}
```

---

## Action Anatomy

### Full Action Definition

```typescript
actions: {
  actionName: {
    // Optional: Validate or transform input
    input?: (raw: any) => TInput,

    // Required: Mutate state
    apply: (state: TState, context: ActionContext, input: TInput) => void
  }
}
```

### Apply Function Signature

```typescript
apply: (
  state: TState,           // Current game state (mutable)
  context: ActionContext,  // Who submitted, who to affect, etc.
  input: TInput            // Action payload
) => void
```

---

## Action Context

The most important parameter is `context`, which tells you **who** is involved:

```typescript
interface ActionContext {
  playerId: string;   // Who called submitAction()
  targetId: string;   // Who should be affected (defaults to playerId)
  isHost: boolean;    // Whether this action runs on the host
  random: SeededRandom;  // Deterministic RNG (seeded per action)
}
```

<Callout type="danger" title="Critical: playerId vs targetId">

**The #1 mistake**: Using `playerId` instead of `targetId` in actions.

- `playerId` = Who **submitted** the action
- `targetId` = Who the action **affects**

**99% of the time, you want `targetId`.**

</Callout>

---

## playerId vs targetId Explained

### The Difference

```typescript
// ✅ CORRECT: Use targetId
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.targetId].x = input.x;  // ✅
    }
  }
}

// ❌ WRONG: Using playerId
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.playerId].x = input.x;  // ❌
    }
  }
}
```

### When They're the Same

Most of the time, `playerId === targetId`:

```typescript
// Player A moves their own character
runtime.submitAction('move', { x: 100, y: 200 });

// Inside action:
context.playerId  // 'player-A'
context.targetId  // 'player-A' (defaults to playerId)
```

In this common case, both would work. **But always use `targetId` for consistency.**

---

### When They're Different

Sometimes, one player affects another player:

```typescript
// Player A shoots Player B
runtime.submitAction('takeDamage', { amount: 10 }, 'player-B');
//                                                   ^^^^^^^^^^
//                                                   targetId

// Inside action:
apply: (state, context, input) => {
  console.log(context.playerId);  // 'player-A' (who shot)
  console.log(context.targetId);  // 'player-B' (who got hit)

  // ✅ Correct: Damage player-B
  state.players[context.targetId].health -= input.amount;

  // ❌ Wrong: Would damage player-A instead!
  state.players[context.playerId].health -= input.amount;
}
```

<Callout type="tip" title="When to Use playerId">

Use `playerId` for:
- **Logging**: "Player A triggered action X"
- **Permissions**: "Can this player do this?"
- **Scoring**: "Player A scored a kill"

Use `targetId` for:
- **State mutations**: Always!

</Callout>

---

## Real-World Examples

### Example 1: Player Movement

```typescript
actions: {
  move: {
    apply: (state, context, input: { x: number; y: number }) => {
      // ✅ Use targetId - affects the moving player
      const player = state.players[context.targetId];
      if (player) {
        player.x = input.x;
        player.y = input.y;
      }
    }
  }
}

// Usage:
runtime.submitAction('move', { x: 150, y: 200 });
```

---

### Example 2: Combat (One Player Affects Another)

```typescript
actions: {
  attack: {
    apply: (state, context, input: { damage: number; victimId: string }) => {
      // ✅ context.playerId = attacker
      // ✅ But we use input.victimId to know who to damage
      const victim = state.players[input.victimId];
      if (victim) {
        victim.health -= input.damage;

        // Log who attacked
        console.log(`${context.playerId} attacked ${input.victimId}`);
      }
    }
  }
}

// Player A attacks Player B
runtime.submitAction('attack', {
  damage: 25,
  victimId: 'player-B'
});
```

<Callout type="info">

In this case, `targetId` defaults to the attacker's ID, but we use `input.victimId` to know who to damage. This is a valid pattern when the action affects multiple entities.

</Callout>

---

### Example 3: Using targetId Explicitly

```typescript
actions: {
  heal: {
    apply: (state, context, input: { amount: number }) => {
      // ✅ Use targetId - heals the specified player
      const player = state.players[context.targetId];
      if (player) {
        player.health = Math.min(100, player.health + input.amount);
      }
    }
  }
}

// Healer (player-A) heals teammate (player-B)
runtime.submitAction('heal', { amount: 20 }, 'player-B');
//                                             ^^^^^^^^^^^
//                                             targetId

// Inside action:
// context.playerId = 'player-A' (healer)
// context.targetId = 'player-B' (patient)
```

---

## Action Helpers

martini-kit provides helpers to reduce boilerplate:

### createInputAction()

Stores input in `state[key][targetId]` automatically:

```typescript
import { createInputAction } from '@martini-kit/core';

actions: {
  move: createInputAction('inputs')
  // Equivalent to:
  // move: {
  //   apply: (state, context, input) => {
  //     if (!state.inputs) state.inputs = {};
  //     state.inputs[context.targetId] = input;  // ✅ Uses targetId!
  //   }
  // }
}
```

**With validation**:
```typescript
actions: {
  shoot: createInputAction('inputs', {
    validate: (input) => input.angle !== undefined && input.power > 0,
    onApply: (state, context, input) => {
      // Custom side effect
      state.players[context.targetId].ammo -= 1;
    }
  })
}
```

---

### createTickAction()

Host-only action for game loops:

```typescript
import { createTickAction } from '@martini-kit/core';

actions: {
  tick: createTickAction((state, delta, context) => {
    // This only runs on the host!
    updatePhysics(state, delta);
    checkCollisions(state);
    spawnEnemies(state, context.random);
  })
}

// Call from Phaser update loop (host only)
update(time, delta) {
  if (this.adapter.runtime.isHost()) {
    this.adapter.runtime.submitAction('tick', { delta });
  }
}
```

---

## Deterministic Random

Actions receive a **seeded random generator** via `context.random`:

```typescript
actions: {
  spawnEnemy: {
    apply: (state, context, input) => {
      // ✅ CORRECT: Use context.random
      const x = context.random.range(0, 800);
      const y = context.random.range(0, 600);
      const type = context.random.choice(['goblin', 'orc', 'troll']);

      state.enemies.push({ x, y, type });

      // ❌ WRONG: Don't use Math.random()
      // const x = Math.random() * 800;  // Non-deterministic!
    }
  }
}
```

<Callout type="danger" title="Never Use Math.random()">

Using `Math.random()` in actions will cause **desyncs** between host and clients. Always use `context.random`.

See [Determinism](/docs/latest/concepts/determinism) for details.

</Callout>

---

## Submitting Actions

### Basic Submission

```typescript
runtime.submitAction('actionName', input);
```

**Example**:
```typescript
runtime.submitAction('move', { x: 100, y: 200 });
```

---

### With Target ID

```typescript
runtime.submitAction('actionName', input, targetId);
```

**Example**:
```typescript
// Player A heals Player B
runtime.submitAction('heal', { amount: 20 }, 'player-B');
```

---

### From Phaser (via InputManager)

```typescript
const inputManager = adapter.createInputManager({
  keyBindings: {
    'W': { action: 'move', input: { direction: 'up' } },
    'S': { action: 'move', input: { direction: 'down' } },
    'SPACE': { action: 'shoot' }
  }
});
```

See [InputManager API](/docs/latest/api/phaser/input-manager) for details.

---

## Action Flow

Understanding the complete flow:

```
1. Player presses key
   ↓
2. InputManager (if used) or manual submitAction()
   ↓
3. runtime.submitAction('move', { x: 100, y: 200 })
   ↓
4. Create action context:
   - playerId: transport.getPlayerId()
   - targetId: targetId || playerId
   - random: new SeededRandom(actionSeed)
   ↓
5. If host: Apply action immediately to state
   ↓
6. Broadcast action message to all peers via transport
   ↓
7. All peers (including host) receive action message
   ↓
8. Clients apply action to their local state
   ↓
9. Notify onChange listeners
   ↓
10. UI/sprites update
```

<Callout type="info" title="Host Applies Immediately">

The host applies actions immediately, then broadcasts. Clients receive the action and apply it. This ensures the host is always authoritative.

</Callout>

---

## Best Practices

### 1. Keep Actions Pure

Actions should be **deterministic** and **side-effect-free**:

```typescript
// ✅ Good - pure, deterministic
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.targetId].x = input.x;
      state.players[context.targetId].y = input.y;
    }
  }
}

// ❌ Bad - side effects
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.targetId].x = input.x;

      // Don't do this!
      fetch('/api/log-move', { ... });  // API call
      localStorage.setItem('lastMove', ...);  // Side effect
      console.log('Player moved');  // OK for debugging, but not for logic
    }
  }
}
```

---

### 2. Validate Input (Optional)

Validate input to prevent invalid state:

```typescript
actions: {
  move: {
    apply: (state, context, input: { x: number; y: number }) => {
      // Validate bounds
      if (input.x < 0 || input.x > 800 || input.y < 0 || input.y > 600) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Invalid move input:', input);
        }
        return;  // Reject invalid input
      }

      state.players[context.targetId].x = input.x;
      state.players[context.targetId].y = input.y;
    }
  }
}
```

---

### 3. Use Helper Functions for Complex Logic

Keep actions readable:

```typescript
// ✅ Good - helper function
function updateProjectiles(state: GameState, delta: number) {
  state.projectiles.forEach(proj => {
    proj.x += proj.vx * delta;
    proj.y += proj.vy * delta;
  });

  // Remove off-screen projectiles
  state.projectiles = state.projectiles.filter(
    proj => proj.x >= 0 && proj.x <= 800 && proj.y >= 0 && proj.y <= 600
  );
}

actions: {
  tick: createTickAction((state, delta) => {
    updateProjectiles(state, delta);
    checkCollisions(state);
    spawnEnemies(state);
  })
}
```

---

### 4. Always Use context.targetId

Even when `playerId === targetId`, use `targetId` for consistency:

```typescript
// ✅ Always correct
state.players[context.targetId].x = input.x;

// ❌ Avoid
state.players[context.playerId].x = input.x;
```

---

### 5. Don't Modify Context

The `context` object is read-only:

```typescript
actions: {
  move: {
    apply: (state, context, input) => {
      // ❌ Don't do this
      context.targetId = 'someone-else';  // NO!

      // ✅ Use it as-is
      state.players[context.targetId].x = input.x;
    }
  }
}
```

---

## Common Patterns

### Pattern 1: Input Storage for Physics

Store input, process in tick action:

```typescript
interface GameState {
  players: Record<string, Player>;
  inputs: Record<string, PlayerInput>;  // Separate input state
}

actions: {
  // Store input
  move: createInputAction('inputs'),

  // Process input every frame
  tick: createTickAction((state, delta, context) => {
    Object.keys(state.inputs).forEach(playerId => {
      const input = state.inputs[playerId];
      const player = state.players[playerId];

      if (input.left) player.x -= 5 * delta;
      if (input.right) player.x += 5 * delta;
      if (input.jump && player.onGround) player.vy = -10;
    });
  })
}
```

---

### Pattern 2: Instant Actions

Apply immediately without input storage:

```typescript
actions: {
  shoot: {
    apply: (state, context, input: { angle: number; power: number }) => {
      const player = state.players[context.targetId];

      state.projectiles.push({
        id: crypto.randomUUID(),
        x: player.x,
        y: player.y,
        vx: Math.cos(input.angle) * input.power,
        vy: Math.sin(input.angle) * input.power,
        ownerId: context.targetId
      });

      player.ammo -= 1;
    }
  }
}
```

---

### Pattern 3: Multi-Entity Actions

Action affects multiple entities:

```typescript
actions: {
  explode: {
    apply: (state, context, input: { x: number; y: number; radius: number }) => {
      // Damage all players in radius
      Object.values(state.players).forEach(player => {
        const distance = Math.hypot(player.x - input.x, player.y - input.y);
        if (distance < input.radius) {
          const damage = Math.max(0, 50 - distance);
          player.health -= damage;
        }
      });

      // Remove projectile that exploded
      state.projectiles = state.projectiles.filter(p => p.id !== input.projectileId);
    }
  }
}
```

---

## Debugging Actions

### 1. Log Context

```typescript
actions: {
  move: {
    apply: (state, context, input) => {
      console.log('Action context:', {
        playerId: context.playerId,
        targetId: context.targetId,
        isHost: context.isHost
      });

      state.players[context.targetId].x = input.x;
    }
  }
}
```

---

### 2. Use StateInspector

Track action history:

```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector();
inspector.attach(runtime);

// View action history
console.log(inspector.getActionHistory());
```

---

### 3. Validate State After Actions

```typescript
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.targetId].x = input.x;

      // Validation
      if (process.env.NODE_ENV !== 'production') {
        if (state.players[context.targetId].x < 0) {
          console.error('Invalid state: player X is negative!');
        }
      }
    }
  }
}
```

---

## Next Steps

- [Determinism](/docs/latest/concepts/determinism) - Why seeded random is critical
- [defineGame() API](/docs/latest/api/core/define-game) - Full action definition reference
- [GameRuntime API](/docs/latest/api/core/game-runtime) - submitAction() details
- [Helpers API](/docs/latest/api/core/helpers) - createInputAction(), createTickAction()
