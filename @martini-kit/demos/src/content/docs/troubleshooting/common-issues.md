---
title: Common Issues
description: Solutions to frequently encountered problems in martini-kit SDK
---

# Common Issues

This guide covers common issues you might encounter when using martini-kit SDK and how to resolve them.

## State Not Syncing

### Symptom
Client state doesn't update or lags behind the host.

### Possible Causes
1. Transport not connected
2. Host not sending state updates
3. Client not receiving messages
4. Network connectivity issues

### Solutions

**1. Check Transport Connection**
```typescript
// Check connection state
const connectionState = transport.metrics?.getConnectionState();
console.log('Connection state:', connectionState);

// Should be 'connected'
if (connectionState !== 'connected') {
  console.error('Transport not connected');
}
```

**2. Verify Host Configuration**
```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,  // Make sure this is true on host
  playerIds: [transport.getPlayerId()],
  syncRateMs: 50,  // Check sync rate is reasonable
});
```

**3. Check Browser Console**
- Open DevTools (F12)
- Look for errors in Console tab
- Check Network tab for failed requests

**4. Test with LocalTransport First**
```typescript
// Simplify to test locally
const transport = new LocalTransport({
  roomId: 'test-room',
  isHost: true,
});
```

## Actions Not Applying

### Symptom
Calling `submitAction` doesn't affect the game state.

### Possible Causes
1. Using `playerId` instead of `targetId`
2. Action handler has an error
3. State structure mismatch
4. Action not registered

### Solutions

**1. Use `targetId` Correctly**
```typescript
// CORRECT ✅
actions: {
  takeDamage: {
    apply(state, context, input: { amount: number }) {
      const player = state.players[context.targetId];  // Use targetId!
      if (player) {
        player.health -= input.amount;
      }
    }
  }
}

// WRONG ❌
actions: {
  takeDamage: {
    apply(state, context, input: { amount: number }) {
      const player = state.players[context.playerId];  // Wrong!
      if (player) {
        player.health -= input.amount;
      }
    }
  }
}
```

**2. Add Logging to Action Handlers**
```typescript
actions: {
  move: {
    apply(state, context, input) {
      console.log('Move action:', { context, input });
      // Your action logic
    }
  }
}
```

**3. Verify State Structure**
```typescript
// Make sure your state matches your interface
interface GameState {
  players: Record<string, Player>;  // Not Player[]
}
```

**4. Check Action Registration**
```typescript
const game = defineGame({
  actions: {
    move: { apply: () => {} },  // Make sure action is here
    jump: { apply: () => {} },
  }
});

// Later...
runtime.submitAction('move', input);  // Action name must match
```

## Sprites Not Appearing on Client

### Symptom
Sprites visible on host but not on client.

### Possible Causes
1. Wrong sprite namespace
2. Sprite not tracked on host
3. Assets not preloaded on client
4. Sprite created but not added to scene

### Solutions

**1. Verify Sprite Namespace**
```typescript
// In adapter config
const adapter = new PhaserAdapter(runtime, scene, {
  spriteNamespace: '_sprites',  // Must match state key
});

// In state
interface GameState {
  _sprites: Record<string, SpriteData>;  // Key must match namespace
}
```

**2. Track Sprites on Host**
```typescript
// On host only
if (this.runtime.isHost) {
  const sprite = this.add.sprite(x, y, 'player');
  this.adapter.trackSprite(sprite, playerId);
}
```

**3. Preload Assets on All Clients**
```typescript
preload() {
  // Load on BOTH host and clients
  this.load.image('player', '/assets/player.png');
  this.load.image('enemy', '/assets/enemy.png');
}
```

**4. Use SpriteManager**
```typescript
// Automatically creates sprites on clients
const playerManager = this.adapter.createSpriteManager({
  onCreate: (key, data, scene) => {
    return scene.add.sprite(data.x, data.y, 'player');
  },
  onUpdate: (sprite, data) => {
    sprite.x = data.x;
    sprite.y = data.y;
  }
});
```

## TypeScript Errors

### "Type 'any' is not assignable..."

**Cause:** Strict type checking enabled.

**Solution:** Add proper typing
```typescript
// Before
function handleData(data: any) {
  // ...
}

// After
interface PlayerData {
  x: number;
  y: number;
}

function handleData(data: PlayerData) {
  // ...
}
```

### "Property 'x' does not exist on type..."

**Cause:** State interface doesn't match actual state.

**Solution:** Update interface
```typescript
interface GameState {
  players: Record<string, Player>;
  score: number;  // Add missing property
}
```

### "Cannot find module '@martini-kit/core'"

**Cause:** Package not installed or build not run.

**Solution:**
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build
```

## Performance Issues

### Symptom
Game lags, stutters, or has high CPU usage.

### Possible Causes
1. Sync rate too high
2. Too many sprites/objects
3. Inefficient action handlers
4. Memory leaks

### Solutions

**1. Adjust Sync Rate**
```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncRateMs: 100,  // Increase for better performance (default: 50)
});
```

**2. Use Object Pooling**
```typescript
class ProjectilePool {
  private pool: Projectile[] = [];

  acquire(): Projectile {
    return this.pool.pop() ?? this.createProjectile();
  }

  release(projectile: Projectile): void {
    this.pool.push(projectile);
  }
}
```

**3. Optimize Action Handlers**
```typescript
// Bad - creates new object every frame
actions: {
  tick: {
    apply(state) {
      state.players = { ...state.players };  // Don't do this!
    }
  }
}

// Good - mutate directly
actions: {
  tick: {
    apply(state) {
      for (const player of Object.values(state.players)) {
        player.x += player.vx;
      }
    }
  }
}
```

**4. Profile with DevTools**
```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector({
  maxSnapshots: 50,
  actionFilter: {
    exclude: ['tick'],  // Exclude high-frequency actions
  }
});

inspector.attach(runtime);
console.log(inspector.getStats());
```

## Player Join/Leave Issues

### Symptom
Players can't join or game breaks when someone leaves.

### Possible Causes
1. Not handling `onPlayerJoin`/`onPlayerLeave`
2. State not cleaned up on leave
3. Race condition in join logic

### Solutions

**1. Implement Lifecycle Handlers**
```typescript
const game = defineGame({
  onPlayerJoin(state, playerId) {
    state.players[playerId] = {
      x: 100,
      y: 100,
      health: 100,
    };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});
```

**2. Use PlayerManager Helper**
```typescript
const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 100 + index * 50,
    y: 200,
  }),
});

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
  }),

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  },
});
```

## Determinism Issues

### Symptom
Game state diverges between host and clients.

### Cause
Using non-deterministic functions like `Math.random()` or `Date.now()`.

### Solutions

**1. Use SeededRandom**
```typescript
// WRONG ❌
const angle = Math.random() * Math.PI * 2;

// CORRECT ✅
const angle = context.random.float(0, Math.PI * 2);
```

**2. Avoid Date.now()**
```typescript
// WRONG ❌
const timestamp = Date.now();

// CORRECT ✅ - Track time in state
actions: {
  tick: {
    apply(state, context, input: { deltaTime: number }) {
      state.gameTime += input.deltaTime;
    }
  }
}
```

## Build Errors

### "Cannot find module" in production build

**Cause:** Missing dependencies or incorrect imports.

**Solution:**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Circular dependency warnings

**Cause:** Files importing each other.

**Solution:** Refactor to break the cycle
```typescript
// Before (circular)
// a.ts
import { B } from './b';

// b.ts
import { A } from './a';

// After (fixed)
// types.ts
export interface A {}
export interface B {}

// a.ts
import type { B } from './types';

// b.ts
import type { A } from './types';
```

## Still Having Issues?

If you can't find a solution here:

1. **Check the [Debugging Guide](/docs/latest/troubleshooting/debugging)** for detailed debugging steps
2. **Search [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues)** for similar problems
3. **Ask in [GitHub Discussions](https://github.com/BlueprintLabIO/martini/discussions)**
4. **Open a new issue** with a minimal reproduction

When asking for help, include:
- martini-kit SDK version
- Browser and OS
- Minimal code reproduction
- Console errors
- Steps to reproduce
