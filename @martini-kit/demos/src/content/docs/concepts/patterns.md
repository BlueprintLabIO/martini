---
title: "Architectural Patterns"
description: Common architectural patterns for scalable martini-kit games
section: guides
order: 2
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Architectural Patterns

This guide covers common architectural patterns for building scalable martini-kit games.

## 1. Component-Based Entities

For complex games, use component pattern:

```typescript
// Define components
interface Position { x: number; y: number }
interface Velocity { vx: number; vy: number }
interface Health { current: number; max: number }
interface Sprite { key: string; scale: number }

// Compose entities
interface GameState {
  entities: Record<string, {
    position: Position;
    velocity?: Velocity;  // Optional components
    health?: Health;
    sprite?: Sprite;
  }>;
}

// Systems operate on components
actions: {
  applyVelocity: {
    apply(state, context) {
      for (const entity of Object.values(state.entities)) {
        if (entity.position && entity.velocity) {
          entity.position.x += entity.velocity.vx;
          entity.position.y += entity.velocity.vy;
        }
      }
    }
  }
}
```

## 2. State Machines

For entity AI and game modes:

```typescript
type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack';

interface Enemy {
  x: number;
  y: number;
  state: EnemyState;
  target?: string; // Player ID
}

actions: {
  updateEnemies: {
    apply(state, context) {
      for (const [id, enemy] of Object.entries(state.enemies)) {
        switch (enemy.state) {
          case 'idle':
            // Check for nearby players
            const nearbyPlayer = findNearestPlayer(state, enemy);
            if (nearbyPlayer) {
              enemy.state = 'chase';
              enemy.target = nearbyPlayer;
            }
            break;

          case 'chase':
            // Move toward target
            if (enemy.target && state.players[enemy.target]) {
              const player = state.players[enemy.target];
              const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

              if (distance < 50) {
                enemy.state = 'attack';
              }
            } else {
              enemy.state = 'idle';
              enemy.target = undefined;
            }
            break;

          case 'attack':
            // Attack logic
            break;
        }
      }
    }
  }
}
```

## 3. Event System

For decoupled game events:

```typescript
interface GameState {
  players: Record<string, Player>;
  events: Array<{
    type: 'player-hit' | 'item-collected' | 'level-complete';
    data: any;
    timestamp: number;
  }>;
}

actions: {
  hit: {
    apply(state, context, { targetId }) {
      state.players[targetId].health -= 10;

      // Emit event
      state.events.push({
        type: 'player-hit',
        data: { targetId, damage: 10 },
        timestamp: Date.now()
      });
    }
  }
}

// In scene - consume events
this.adapter.onChange((state, prevState) => {
  const newEvents = state.events.slice(prevState?.events.length || 0);

  for (const event of newEvents) {
    switch (event.type) {
      case 'player-hit':
        this.playHitSound();
        this.showDamageNumber(event.data.damage);
        break;
      // ...
    }
  }
});
```

## 4. Input Buffering

For responsive controls:

```typescript
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    inputBuffer: Array<{ action: string; timestamp: number }>;
  }>;
}

actions: {
  bufferInput: {
    apply(state, context, { action }) {
      const player = state.players[context.playerId];
      player.inputBuffer.push({
        action,
        timestamp: Date.now()
      });

      // Keep only recent inputs
      player.inputBuffer = player.inputBuffer.slice(-10);
    }
  },

  processInputs: {
    apply(state, context) {
      for (const player of Object.values(state.players)) {
        // Process buffered inputs
        for (const input of player.inputBuffer) {
          // Apply input action
        }
        player.inputBuffer = [];
      }
    }
  }
}
```

## 5. Pointer Input with Camera Scrolling

<Callout type="warning">
**Critical:** Always use world coordinates for pointer input, not screen coordinates!
</Callout>

When your camera follows the player (or scrolls for any reason), `pointer.x/y` gives **screen** coordinates, not **world** coordinates. This causes bugs where clicks appear at the wrong position.

**❌ Wrong - Uses screen coordinates:**
```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  runtime.submitAction('move', {
    x: pointer.x,  // ⚠️ WRONG! Screen position, not world position
    y: pointer.y
  });
});
```

**✅ Correct - Uses world coordinates:**
```typescript
// Option 1: Use pointer.worldX/worldY directly
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  runtime.submitAction('move', {
    x: pointer.worldX,  // ✅ World position (accounts for camera scroll)
    y: pointer.worldY
  });
});

// Option 2: Use PhaserAdapter helper
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  const worldPos = adapter.pointerToWorld(pointer);
  runtime.submitAction('move', {
    x: worldPos.x,
    y: worldPos.y
  });
});
```
