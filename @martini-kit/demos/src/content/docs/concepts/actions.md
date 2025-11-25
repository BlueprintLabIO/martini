---
title: Actions Overview
description: Understanding martini-kit's action system
section: concepts
order: 1
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Actions Overview

Actions are **how you change game state** in martini-kit. They are the bridge between player input and state mutations.

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

## Submitting Actions

### Basic Submission

```typescript
runtime.submitAction('actionName', input);
```

**Example**:
```typescript
runtime.submitAction('move', { x: 100, y: 200 });
```

### With Target ID

```typescript
runtime.submitAction('actionName', input, targetId);
```

**Example**:
```typescript
// Player A heals Player B
runtime.submitAction('heal', { amount: 20 }, 'player-B');
```

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
```

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
    }
  }
}
```

### 2. Use Helper Functions

Keep actions readable:

```typescript
// ✅ Good - helper function
function updateProjectiles(state: GameState, delta: number) {
  state.projectiles.forEach(proj => {
    proj.x += proj.vx * delta;
    proj.y += proj.vy * delta;
  });
}

actions: {
  tick: createTickAction((state, delta) => {
    updateProjectiles(state, delta);
    checkCollisions(state);
  })
}
```

### 3. Always Use context.targetId

Even when `playerId === targetId`, use `targetId` for consistency:

```typescript
// ✅ Always correct
state.players[context.targetId].x = input.x;

// ❌ Avoid
state.players[context.playerId].x = input.x;
```

---

# Deep Dive: playerId vs targetId

The **#1 beginner mistake** in martini-kit is confusing `playerId` and `targetId`. This section explains the difference and when to use each.

## The Difference

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

## When They're the Same

Most of the time, `playerId === targetId`:

```typescript
// Player A moves their own character
runtime.submitAction('move', { x: 100, y: 200 });

// Inside action:
context.playerId  // 'player-A'
context.targetId  // 'player-A' (defaults to playerId)
```

In this common case, both would work. **But always use `targetId` for consistency.**

## When They're Different

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

## Common Mistakes

### Mistake 1: Using playerId for State Mutations

```typescript
// ❌ WRONG
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.playerId].x = input.x;
    }
  }
}

// ✅ CORRECT
actions: {
  move: {
    apply: (state, context, input) => {
      state.players[context.targetId].x = input.x;
    }
  }
}
```

### Mistake 2: Confusing Who Gets Affected

```typescript
// ❌ WRONG - Healer heals themselves!
runtime.submitAction('heal', { amount: 20 });
actions: {
  heal: {
    apply: (state, context, input) => {
      state.players[context.playerId].health += input.amount;
      // This heals the healer, not the target!
    }
  }
}

// ✅ CORRECT - Healer heals target
runtime.submitAction('heal', { amount: 20 }, 'player-B');
actions: {
  heal: {
    apply: (state, context, input) => {
      state.players[context.targetId].health += input.amount;
      // This heals player-B
    }
  }
}
```

## Rule of Thumb

**When in doubt, use `targetId`.**

- `targetId` = Who the action **affects**
- `playerId` = Who **triggered** the action

99% of state mutations should use `targetId`.

## Next Steps

- **[defineGame() API →](/docs/latest/api/core/define-game)** - Full reference
- **[Helpers API →](/docs/latest/api/core/helpers)** - createInputAction(), createTickAction()
