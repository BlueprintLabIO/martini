---
title: Framework-Agnostic Patterns
description: Core multiplayer patterns that work with any rendering engine
section: guides
subsection: core
order: 1
scope: agnostic
---

# Framework-Agnostic Patterns

These patterns work with **any rendering engine** - Phaser, Godot, Three.js, or even headless servers. They focus on game logic, not rendering.

## When to Use Core Patterns

Use framework-agnostic patterns when:
- Building game logic (state, actions)
- Implementing multiplayer mechanics
- Creating reusable game systems
- Writing tests
- Building headless game servers

## Common Patterns

### 1. Input Storage Pattern

Store player input separately from player state:

```typescript
interface GameState {
  players: Record<string, Player>;
  inputs: Record<string, PlayerInput>; // Separate!
}

actions: {
  move: createInputAction('inputs'),
  
  tick: createTickAction((state, delta) => {
    // Process all inputs
    Object.entries(state.inputs).forEach(([playerId, input]) => {
      const player = state.players[playerId];
      if (input.left) player.x -= 5 * delta;
      if (input.right) player.x += 5 * delta;
    });
  })
}
```

**Why?** Separates concerns - input collection vs input processing.

---

### 2. Entity-Component Pattern

Structure game entities as components:

```typescript
interface Entity {
  id: string;
  position: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: { current: number; max: number };
  weapon?: { type: string; ammo: number };
}

const state = {
  entities: [] as Entity[]
};
```

---

### 3. Event Emission Pattern

Emit events for side effects (UI, sound, particles):

```typescript
actions: {
  takeDamage: {
    apply(state, context, input) {
      const player = state.players[context.targetId];
      player.health -= input.damage;
      
      // Emit event for rendering layer
      context.emit('playerDamaged', {
        playerId: context.targetId,
        damage: input.damage,
        position: { x: player.x, y: player.y }
      });
    }
  }
}

// In your rendering code (Phaser, etc.)
runtime.onEvent('playerDamaged', (senderId, payload) => {
  // Show damage number, play sound, etc.
});
```

---

### 4. State Machine Pattern

Manage complex state transitions:

```typescript
type PlayerState = 'idle' | 'moving' | 'jumping' | 'attacking';

interface Player {
  state: PlayerState;
  stateTimer: number;
}

actions: {
  tick: createTickAction((state, delta) => {
    Object.values(state.players).forEach(player => {
      player.stateTimer -= delta;
      
      switch (player.state) {
        case 'attacking':
          if (player.stateTimer <= 0) {
            player.state = 'idle';
          }
          break;
        case 'jumping':
          if (player.onGround) {
            player.state = 'idle';
          }
          break;
      }
    });
  })
}
```

---

### 5. Cooldown Pattern

Implement ability cooldowns:

```typescript
interface Player {
  abilities: {
    dash: { cooldown: number; duration: number };
    shoot: { cooldown: number; duration: number };
  };
}

actions: {
  dash: {
    apply(state, context) {
      const player = state.players[context.targetId];
      
      if (player.abilities.dash.cooldown > 0) {
        return; // Still on cooldown
      }
      
      // Apply dash effect
      player.velocityX = 20;
      player.abilities.dash.cooldown = player.abilities.dash.duration;
    }
  },
  
  tick: createTickAction((state, delta) => {
    Object.values(state.players).forEach(player => {
      // Reduce cooldowns
      player.abilities.dash.cooldown = Math.max(0, player.abilities.dash.cooldown - delta);
      player.abilities.shoot.cooldown = Math.max(0, player.abilities.shoot.cooldown - delta);
    });
  })
}
```

---

### 6. Spatial Partitioning

Optimize collision detection with spatial grids:

```typescript
function getEntitiesInRadius(
  entities: Entity[],
  center: { x: number; y: number },
  radius: number
): Entity[] {
  return entities.filter(entity => {
    const distance = Math.hypot(entity.x - center.x, entity.y - center.y);
    return distance <= radius;
  });
}

actions: {
  explode: {
    apply(state, context, input) {
      const nearby = getEntitiesInRadius(
        Object.values(state.players),
        input.position,
        input.radius
      );
      
      nearby.forEach(player => {
        player.health -= input.damage;
      });
    }
  }
}
```

---

## Best Practices

### ✅ Do

- Keep game logic in `defineGame()` - framework-agnostic
- Use `context.random` for all randomness
- Emit events for rendering side effects
- Test game logic without a rendering engine
- Structure state for easy serialization

### ❌ Don't

- Mix rendering code with game logic
- Use `Math.random()` (causes desyncs)
- Directly manipulate DOM/sprites in actions
- Store non-serializable data in state (functions, classes)

---

## Framework-Specific Guides

Once you have your core logic, integrate with a rendering engine:

- **[Phaser Integration →](/docs/guides/phaser)** - Phaser 3 adapter
- **[Godot Integration →](/docs/guides/godot)** - Coming soon
- **[Custom Integration →](/docs/latest/api/core)** - Build your own adapter

## See Also

- **[State Management →](/docs/latest/concepts/state-management)** - Structuring state
- **[Actions →](/docs/latest/concepts/actions)** - Action patterns
- **[Testing →](/docs/guides/testing)** - Testing game logic
