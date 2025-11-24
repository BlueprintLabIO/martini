---
title: "Phaser Physics & Input"
description: Host-authoritative input and collisions with Phaser
section: engine-tracks
subsection: phaser
order: 3
scope: phaser
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Phaser Physics & Input

This track is Phaser-specific. For engine-agnostic patterns, start with [Physics & Collisions (Engine-Agnostic)](/docs/latest/guides/physics-and-collisions).

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

## Basic Physics Setup

### Host-Only Physics

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    if (this.adapter.isHost()) {
      // ONLY host creates physics sprites
      const player = this.physics.add.sprite(100, 100, 'player');
      player.setBounce(0.2);
      player.setCollideWorldBounds(true);

      // Track sprite for automatic syncing
      this.adapter.trackSprite(player, `player-${playerId}`);
    } else {
      // Clients create VISUAL-ONLY sprites
      const player = this.add.sprite(100, 100, 'player');
      this.adapter.trackSprite(player, `player-${playerId}`);
    }

    // Subscribe to state changes (both host and clients)
    this.adapter.onChange((state) => {
      this.updateSprites(state);
    });
  }
}
```

### Syncing Physics Properties

When using `trackSprite()`, these properties are automatically synced:

- **Position**: `x`, `y`
- **Rotation**: `rotation` or `angle`
- **Velocity**: `velocityX`, `velocityY` (if you enable velocity syncing)
- **Scale**: `scaleX`, `scaleY`
- **Visibility**: `visible`

```typescript
// Host: Physics moves sprite automatically
if (this.adapter.isHost()) {
  const sprite = this.physics.add.sprite(100, 100, 'player');
  this.adapter.trackSprite(sprite, 'player-1', {
    syncVelocity: true  // Also sync velocity for smoother client interpolation
  });

  // Apply physics forces
  sprite.setVelocityX(200);
  // Position updates automatically, synced by martini-kit
}
```

---

## Collision Handling

Collisions should ONLY be detected on the host. Use `CollisionManager` for declarative collision rules, or standard Phaser physics with state updates.

### Using CollisionManager (Recommended)

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

### Standard Phaser Collisions

When collisions affect game state, use actions:

```typescript
create() {
  if (this.adapter.isHost()) {
    const players = this.physics.add.group();
    const enemies = this.physics.add.group();

    // Detect overlap
    this.physics.add.overlap(
      players,
      enemies,
      (playerSprite, enemySprite) => {
        // Get IDs from sprite data
        const playerId = playerSprite.getData('id');
        const enemyId = enemySprite.getData('id');

        // Submit action to update state
        runtime.submitAction('playerHitEnemy', {
          playerId,
          enemyId,
          damage: 10
        });
      }
    );
  }
}
```

### Collision Actions Pattern

```typescript
// In game definition
actions: {
  playerHitEnemy: {
    apply(state, context, input: { playerId: string; enemyId: string; damage: number }) {
      const player = state.players[input.playerId];
      const enemy = state.enemies[input.enemyId];

      if (!player || !enemy) return;

      // Update health
      player.health -= input.damage;

      // Check for death
      if (player.health <= 0) {
        delete state.players[input.playerId];
      }

      // Emit event for client-side effects
      context.emit('playerHit', {
        playerId: input.playerId,
        damage: input.damage
      });
    }
  }
}
```

### Client-Side Visual Effects

Clients listen for collision events to show effects:

```typescript
create() {
  // Listen for collision events
  runtime.onEvent('playerHit', (playerId, payload) => {
    if (playerId === this.adapter.getMyPlayerId()) {
      // Show damage effect
      this.cameras.main.shake(100, 0.01);
      this.showDamageNumber(payload.damage);
    }
  });
}

private showDamageNumber(damage: number) {
  const player = this.playerSprites.get(this.adapter.getMyPlayerId());
  if (!player) return;

  const text = this.add.text(player.x, player.y - 40, `-${damage}`, {
    fontSize: '24px',
    color: '#ff0000',
    fontStyle: 'bold'
  });

  this.tweens.add({
    targets: text,
    y: text.y - 50,
    alpha: 0,
    duration: 1000,
    onComplete: () => text.destroy()
  });
}
```

---

## Common Pitfalls

### Pitfall 1: Running Physics on Clients

```typescript
// WRONG ❌
update() {
  const player = this.playerSprites.get(this.adapter.getMyPlayerId());
  if (player) {
    player.setVelocityX(200); // Physics on client!
  }
}

// CORRECT ✅
update() {
  if (this.adapter.isHost()) {
    const player = this.playerSprites.get(this.adapter.getMyPlayerId());
    if (player) {
      player.setVelocityX(200); // Physics only on host
    }
  }
}
```

### Pitfall 2: Not Syncing Collision Results

```typescript
// WRONG ❌ - Collision detected but state not updated
this.physics.add.overlap(players, coins, (player, coin) => {
  coin.destroy(); // Only destroys on host's screen!
});

// CORRECT ✅ - Update state via action
this.physics.add.overlap(players, coins, (player, coin) => {
  const playerId = player.getData('id');
  const coinId = coin.getData('id');

  runtime.submitAction('collectCoin', { playerId, coinId });
  // Action removes coin from state, synced to all clients
});
```

### Pitfall 3: Forgetting to Check `isHost()`

```typescript
// WRONG ❌
create() {
  this.physics.add.sprite(100, 100, 'player');
  // Creates physics on both host and clients!
}

// CORRECT ✅
create() {
  if (this.adapter.isHost()) {
    this.physics.add.sprite(100, 100, 'player');
  } else {
    this.add.sprite(100, 100, 'player'); // Visual only
  }
}
```

## See Also

- [Movement Patterns](/docs/latest/guides/movement/01-top-down) - Player movement guides
- [Phaser Adapter API](/docs/latest/api/phaser/adapter) - PhaserAdapter reference
- [State Management](/docs/latest/concepts/state-management) - Understanding state sync
- [Actions](/docs/latest/concepts/actions) - Writing action handlers
