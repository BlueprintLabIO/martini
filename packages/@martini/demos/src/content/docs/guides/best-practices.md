---
title: "Best Practices"
description: Performance optimization, debugging techniques, and architectural patterns for Martini multiplayer games
section: guides
order: 2
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Best Practices

This guide covers performance optimization, debugging techniques, state design patterns, and production deployment best practices for Martini games.

---

## State Design

### Keep State Minimal

**Only store what needs to be synced.** Every byte in state gets serialized, diffed, and sent over the network.

```typescript
// BAD - Stores redundant computed values
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    velocityX: number;  // Physics engine already tracks this
    velocityY: number;
    speed: number;      // Can be constant
    isMoving: boolean;  // Can be computed from velocity
  }>;
}

// GOOD - Only essential state
interface GameState {
  players: Record<string, {
    x: number;
    y: number;
    health: number;
    score: number;
  }>;
  inputs: Record<string, { x?: number; y?: number }>;
}
```

**Why?** Martini's diff algorithm compares previous state to current state. Fewer properties = faster diffs = better performance.

### Avoid Deep Nesting

```typescript
// BAD - Deep nesting is slower to diff
interface GameState {
  world: {
    regions: Record<string, {
      zones: Record<string, {
        entities: Record<string, {
          components: Record<string, any>;
        }>;
      }>;
    }>;
  };
}

// GOOD - Flat structure
interface GameState {
  entities: Record<string, {
    regionId: string;
    zoneId: string;
    x: number;
    y: number;
  }>;
  regions: Record<string, { name: string }>;
}
```

### Use Indexes, Not Arrays for Entities

```typescript
// BAD - Arrays require full re-send when items are added/removed
interface GameState {
  enemies: Array<{ id: string; x: number; y: number }>;
}

// GOOD - Records allow efficient per-entity diffs
interface GameState {
  enemies: Record<string, { x: number; y: number }>;
}
```

**Why?** When an array changes, Martini has to diff the entire array. With records, only changed entities are diffed.

---

## Performance Optimization

### 1. Limit Physics Bodies

**Problem**: Too many physics bodies tank frame rate on the host.

```typescript
// BAD - 1000 physics bodies
setup: ({ random }) => ({
  particles: Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [
      `particle-${i}`,
      { x: random.range(0, 800), y: random.range(0, 600) }
    ])
  )
})

// If host creates physics sprite for each particle = 1000 physics bodies
```

**Solution**: Use visual effects for non-interactive elements.

```typescript
// GOOD - Physics only for gameplay entities
setup: ({ random }) => ({
  players: {},
  enemies: {},  // Only ~10-20 enemies with physics
  // Particles handled by Phaser particle emitters (visual only)
})
```

**Guideline**: Keep physics bodies under 200 for 60 FPS.

### 2. Debounce Rapid State Changes

**Problem**: Updating state 60 times per second for smooth movement.

```typescript
// BAD - State update every frame
update() {
  if (this.adapter.isHost()) {
    runtime.submitAction('updatePosition', {
      x: sprite.x,
      y: sprite.y
    }); // 60 updates/second!
  }
}
```

**Solution**: Use `trackSprite()` for automatic efficient syncing.

```typescript
// GOOD - Automatic optimized syncing
create() {
  if (this.adapter.isHost()) {
    const sprite = this.physics.add.sprite(100, 100, 'player');
    this.adapter.trackSprite(sprite, `player-${playerId}`);
    // Martini handles efficient position syncing
  }
}
```

`trackSprite()` only sends updates when position actually changes.

### 3. Use `onTick` for Periodic Logic

**Problem**: Running expensive logic every frame.

```typescript
// BAD - Expensive logic every frame (60 times/second)
actions: {
  gameLoop: {
    apply(state, context) {
      // Check win condition
      // Spawn enemies
      // Update timers
      // All 60 times per second!
    }
  }
}
```

**Solution**: Use `onTick` for periodic updates.

```typescript
// GOOD - Run every 500ms
export const game = defineGame({
  // ...
  onTick: {
    interval: 500, // 2 times per second
    handler(state, context) {
      // Check win condition
      if (Object.values(state.players).every(p => p.score >= 100)) {
        state.gameOver = true;
      }

      // Spawn enemy every few seconds
      if (context.tick % 6 === 0) { // Every 3 seconds (6 ticks * 500ms)
        const id = `enemy-${context.tick}`;
        state.enemies[id] = {
          x: context.random.range(0, 800),
          y: context.random.range(0, 600)
        };
      }
    }
  }
});
```

**Bandwidth savings**: Periodic logic doesn't trigger state diffs unless state actually changes.

### 4. Batch State Changes

```typescript
// BAD - Multiple action submissions
onClick() {
  runtime.submitAction('incrementScore', {});
  runtime.submitAction('updateHealth', { delta: -10 });
  runtime.submitAction('addItem', { item: 'sword' });
  // 3 state updates, 3 diffs, 3 network messages
}

// GOOD - Single action with all changes
onClick() {
  runtime.submitAction('playerHit', {
    scoreIncrement: 10,
    healthDelta: -10,
    item: 'sword'
  });
  // 1 state update, 1 diff, 1 network message
}
```

---

## Debugging Techniques

### 1. Enable Debug Logging

```typescript
import { Logger } from '@martini/core';

// Set log level (default: 'error')
Logger.setLogLevel('debug');

// Now you'll see:
// [DEBUG] State diff: { players: { p1: { x: 105 } } }
// [DEBUG] Action applied: move
// [DEBUG] State synced to 2 peers
```

**Log levels**: `'debug'` | `'info'` | `'warn'` | `'error'` | `'none'`

### 2. Log State Changes

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Log every state change
  this.adapter.onChange((state, prevState) => {
    console.log('State updated:', state);
    console.log('Previous:', prevState);

    // Check specific changes
    if (state.players !== prevState?.players) {
      console.log('Players changed:', state.players);
    }
  });
}
```

### 3. Inspect Current State

```typescript
// Get current state snapshot
const state = this.adapter.getState();
console.log('Current state:', state);

// Check specific values
console.log('My player:', state.players[this.adapter.getMyPlayerId()]);
console.log('Enemy count:', Object.keys(state.enemies).length);
```

### 4. Check Host vs Client

```typescript
create() {
  console.log('Is host?', this.adapter.isHost());
  console.log('My player ID:', this.adapter.getMyPlayerId());
  console.log('All player IDs:', runtime.getPlayerIds());
}
```

### 5. Debug State Desyncs

If state looks different on host vs clients:

```typescript
// Add this to both host and client
this.adapter.onChange((state) => {
  console.log('[State Snapshot]', JSON.stringify(state, null, 2));
});
```

**Common causes of desync:**
- Using `Math.random()` instead of `context.random`
- Running game logic on clients (should be host-only)
- Mutating state outside of actions
- Not checking `if (isHost())` before physics

### 6. Phaser Debug Graphics

```typescript
create() {
  if (this.adapter.isHost()) {
    // Show physics bodies
    this.physics.world.createDebugGraphic();

    // Show collision shapes
    this.physics.world.debugGraphic.clear();
  }
}
```

---

## Architectural Patterns

### 1. Component-Based Entities

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

### 2. State Machines

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

### 3. Event System

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

### 4. Input Buffering

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

---

## Production Deployment

### 1. Choose the Right Transport

**Development**:
```typescript
import { LocalTransport } from '@martini/transport-local';
const transport = new LocalTransport();
```

**Quick Prototype**:
```typescript
import { TrysteroTransport } from '@martini/transport-trystero';
const transport = new TrysteroTransport({
  appId: 'my-game-v1',
  roomId: generateRoomId()
});
```

**Production**:
```typescript
import { WebSocketTransport } from '@martini/transport-ws';
const transport = new WebSocketTransport({
  url: 'wss://game.example.com',
  roomId: roomId,
  autoReconnect: true
});
```

### 2. Error Handling

```typescript
// Catch action errors
try {
  runtime.submitAction('move', { x, y });
} catch (error) {
  console.error('Action failed:', error);
  // Show error to user
}

// Handle disconnections
transport.onPeerLeave((peerId) => {
  console.log(`Player ${peerId} disconnected`);
  // Show notification
  // Handle host migration if needed
});
```

### 3. Host Migration

If host disconnects, you may want to migrate host role:

```typescript
transport.onPeerLeave((peerId) => {
  if (peerId === runtime.getHostId()) {
    // Host left - elect new host
    const remainingPlayers = runtime.getPlayerIds();
    if (remainingPlayers.length > 0) {
      // Lowest ID becomes new host
      const newHost = remainingPlayers.sort()[0];

      if (newHost === runtime.getMyPlayerId()) {
        // I'm the new host
        console.log('Becoming new host');
        // Reinitialize as host
        location.reload(); // Simple approach
      }
    }
  }
});
```

<Callout type="warning" title="Host Migration Complexity">

Host migration is complex and may require custom server logic. For production games, consider using a dedicated server as the host instead of peer-to-peer.

</Callout>

### 4. Matchmaking

For multi-room games:

```typescript
// Server generates room IDs
async function createRoom() {
  const roomId = generateUniqueId();
  const roomData = {
    id: roomId,
    players: [],
    maxPlayers: 4,
    createdAt: Date.now()
  };

  await db.rooms.insert(roomData);
  return roomId;
}

// Client joins room
async function joinRoom(roomId: string) {
  const transport = new WebSocketTransport({
    url: 'wss://game.example.com',
    roomId
  });

  // Wait for connection
  await new Promise((resolve) => {
    transport.onPeerJoin(() => resolve(true));
  });

  initializeGame({ game, scene, transport });
}
```

### 5. Analytics

Track game events:

```typescript
actions: {
  playerDied: {
    apply(state, context, { reason }) {
      const player = state.players[context.playerId];
      player.deaths++;

      // Send analytics event
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('player_died', {
          playerId: context.playerId,
          reason,
          survivalTime: Date.now() - player.spawnedAt
        });
      }
    }
  }
}
```

---

## Testing

### Unit Test Actions

```typescript
import { describe, it, expect } from 'vitest';
import { game } from './game';

describe('Game Actions', () => {
  it('should move player', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    game.actions.move.apply(state, { playerId: 'p1' }, { x: 200, y: 300 });

    expect(state.players.p1.x).toBe(200);
    expect(state.players.p1.y).toBe(300);
  });

  it('should handle player join', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    game.onPlayerJoin?.(state, 'p2');

    expect(state.players.p2).toBeDefined();
  });
});
```

### Integration Test with LocalTransport

```typescript
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
import { game } from './game';

describe('Multiplayer Integration', () => {
  it('should sync state between peers', async () => {
    const transport = new LocalTransport();

    const host = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: ['p1', 'p2']
    });

    const client = new GameRuntime(game, transport, {
      isHost: false,
      playerIds: ['p1', 'p2']
    });

    // Host submits action
    host.submitAction('move', { x: 100, y: 200 });

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 100));

    // Client should have same state
    expect(client.getState().players.p1.x).toBe(100);
    expect(client.getState().players.p1.y).toBe(200);
  });
});
```

---

## Performance Checklist

Before deploying:

- [ ] **State is minimal** - Only sync essential data
- [ ] **Records, not arrays** - For efficient diffs
- [ ] **Physics bodies &lt; 200** - For 60 FPS
- [ ] **Using `onTick`** - For periodic logic
- [ ] **Using `context.random`** - No `Math.random()`
- [ ] **Batching actions** - Reduce network traffic
- [ ] **Host-only logic** - Collisions, spawning on host
- [ ] **Client interpolation** - Calling `updateInterpolation()`
- [ ] **Error handling** - Try/catch around actions
- [ ] **Reconnection logic** - Handle disconnects gracefully

---

## Security Considerations

<Callout type="warning" title="Client Trust">

Clients can be hacked. Never trust client input without validation.

</Callout>

### Validate Actions

```typescript
actions: {
  move: {
    apply(state, context, input: { x: number; y: number }) {
      // BAD - Trust client blindly
      state.players[context.playerId].x = input.x;
      state.players[context.playerId].y = input.y;

      // GOOD - Validate input
      const player = state.players[context.playerId];
      const maxSpeed = 10;

      const dx = input.x - player.x;
      const dy = input.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= maxSpeed) {
        player.x = input.x;
        player.y = input.y;
      } else {
        // Client sent invalid move - clamp it
        const ratio = maxSpeed / distance;
        player.x += dx * ratio;
        player.y += dy * ratio;
      }
    }
  }
}
```

### Server-Authoritative for Critical Data

For competitive games, run host on a dedicated server:

```typescript
// server.ts (Node.js server)
import { GameRuntime } from '@martini/core';
import { WebSocketTransport } from '@martini/transport-ws';

const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  roomId: 'room-1'
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: []
});

// Server is always the host
// Clients can't cheat by modifying host logic
```

---

## Next Steps

- **[Phaser Integration](/docs/guides/phaser-integration)** - Deep dive into Phaser patterns
- **[@martini/core API](/docs/api/core)** - Core API reference
- **[@martini/phaser API](/docs/api/phaser)** - Phaser API reference

## Examples

Study production-quality examples:
- [Fire & Ice](../../preview/fire-and-ice) - Cooperative platformer
- [Blob Battle](../../preview/blob-battle) - Competitive battle game
- [Paddle Battle](../../preview/paddle-battle) - Classic multiplayer Pong
