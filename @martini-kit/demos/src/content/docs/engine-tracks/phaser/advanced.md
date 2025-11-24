---
title: "Advanced Topics"
description: Advanced Phaser integration topics including determinism and troubleshooting
section: engine-tracks
subsection: phaser
order: 8
scope: phaser
---

# Advanced Topics

## Deterministic Random

`Math.random()` will cause state desyncs. Always use `context.random`.

### The Problem

```typescript
// BAD - Will desync
setup: ({ playerIds }) => ({
  enemies: Array.from({ length: 10 }, () => ({
    x: Math.random() * 800,  // Different on each peer!
    y: Math.random() * 600
  }))
})
```

Host generates different random positions than clients. State desyncs immediately.

### The Solution

```typescript
// GOOD - Same result on all peers
setup: ({ playerIds, random }) => ({
  enemies: Array.from({ length: 10 }, () => ({
    x: random.range(0, 800),  // Deterministic
    y: random.range(0, 600)
  }))
})
```

`context.random` is a seeded random generator. Same seed = same sequence on all peers.

---

## Player Join/Leave Handling

Handle players connecting and disconnecting gracefully.

### Basic Join/Leave

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  onPlayerJoin: (state, playerId) => {
    // Add new player to state
    state.players[playerId] = {
      x: 100,
      y: 100,
      score: 0
    };
  },

  onPlayerLeave: (state, playerId) => {
    // Remove disconnected player
    delete state.players[playerId];
  }
});
```

### Sprite Cleanup

If you're manually tracking sprites (not using SpriteManager):

```typescript
// scene.ts
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (!this.adapter.isHost()) {
    this.adapter.onChange((state, prevState) => {
      // Detect removed players
      if (prevState?.players) {
        for (const playerId of Object.keys(prevState.players)) {
          if (!state.players[playerId]) {
            // Player left - destroy their sprite
            const sprite = this.remoteSprites.get(`player-${playerId}`);
            if (sprite) {
              sprite.destroy();
              this.remoteSprites.delete(`player-${playerId}`);
            }
          }
        }
      }
    });
  }
}
```

**With SpriteManager**: Cleanup is automatic. When `state.players[id]` is deleted, `onDestroy` callback runs.

---

## Common Pitfalls

### 1. Creating Physics Sprites on Clients

```typescript
// WRONG
create() {
  const sprite = this.physics.add.sprite(100, 100, 'player'); // On everyone!
}

// RIGHT
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    const sprite = this.physics.add.sprite(100, 100, 'player');
  }
}
```

### 2. Forgetting to Check `state._sprites`

```typescript
// WRONG - Will crash on initial render
this.adapter.onChange((state) => {
  for (const [key, data] of Object.entries(state._sprites)) {
    // state._sprites is undefined initially!
  }
});

// RIGHT
this.adapter.onChange((state) => {
  if (!state._sprites) return; // Critical check

  for (const [key, data] of Object.entries(state._sprites)) {
    // Safe
  }
});
```

### 3. Forgetting `updateInterpolation()`

```typescript
// WRONG - Sprites will teleport instead of moving smoothly
update() {
  // Nothing
}

// RIGHT
update() {
  if (!this.adapter.isHost()) {
    this.adapter.updateInterpolation();
  }
}
```

### 4. Using `Math.random()`

```typescript
// WRONG - State desync
actions: {
  spawn: {
    apply(state) {
      state.enemy.x = Math.random() * 800; // Different on each peer
    }
  }
}

// RIGHT
actions: {
  spawn: {
    apply(state, context) {
      state.enemy.x = context.random.range(0, 800); // Same on all peers
    }
  }
}
```

### 5. Modifying State Outside Actions

```typescript
// WRONG - Won't sync to other players
update() {
  const state = this.adapter.getState();
  state.players[this.playerId].score++; // Direct mutation
}

// RIGHT
update() {
  runtime.submitAction('incrementScore', {});
}
```
