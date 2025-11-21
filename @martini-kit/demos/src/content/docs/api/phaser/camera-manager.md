---
title: CameraFollower
description: Automatic camera following with smooth tracking modes
---

# CameraFollower

`CameraFollower` automatically tracks a player with the camera, handling initialization timing correctly and providing smooth follow modes.

## Why Use CameraFollower?

**Problem:** Manually setting camera position in `update()` causes timing bugs:
- Camera not positioned in `create()` → sprites spawn off-screen on navigation
- Boilerplate camera code repeated in every game
- Easy to forget edge cases (player doesn't exist, player removed, etc.)

**Solution:** `createCameraFollower()` handles all of this automatically:
- ✅ Waits for player state, then initializes camera immediately
- ✅ Auto-updates camera position every frame
- ✅ Handles all edge cases (missing player, cleanup, etc.)
- ✅ Multiple follow modes (instant, lerp, deadzone)

## Quick Start

```typescript
// In scene.create() - that's it!
this.cameraFollower = this.adapter.createCameraFollower({
  target: 'myPlayer',
  bounds: { width: 1600, height: 1200 }
});

// No manual camera code needed in update()!
// Camera automatically follows and handles initialization timing.
```

**Before (15 lines, buggy):**
```typescript
create() {
  this.cameras.main.setBounds(0, 0, 800, 600);
}

update() {
  // BUG: Camera not initialized in create() → off-screen spawn on navigation
  const localPlayer = state.players[this.adapter.getMyPlayerId()];
  if (localPlayer) {
    this.cameras.main.scrollX = localPlayer.x - 400;
    this.cameras.main.scrollY = localPlayer.y - 300;
  }
}
```

**After (3 lines, automatic):**
```typescript
create() {
  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    bounds: { width: 800, height: 600 }
  });
}
// No update() code needed!
```

## Configuration

### CameraFollowerConfig

```typescript
interface CameraFollowerConfig {
  target?: 'myPlayer' | CameraFollowerTarget;
  mode?: 'instant' | 'lerp' | 'deadzone';
  lerpFactor?: number;
  offset?: { x: number; y: number };
  bounds?: { width: number; height: number };
  deadzone?: { width: number; height: number };
  centerOnTarget?: boolean;
}
```

#### `target`
- **Type:** `'myPlayer'` | `{ stateKey?: string, playerId?: string }`
- **Default:** `'myPlayer'`
- **Description:** Which player to follow

```typescript
// Follow local player (default)
this.adapter.createCameraFollower({ target: 'myPlayer' });

// Follow specific player
this.adapter.createCameraFollower({
  target: { stateKey: 'players', playerId: 'player-123' }
});
```

#### `mode`
- **Type:** `'instant'` | `'lerp'` | `'deadzone'`
- **Default:** `'instant'`
- **Description:** Camera follow behavior

```typescript
// Instant snap (no smoothing)
mode: 'instant'

// Smooth lerp (cinematic)
mode: 'lerp'

// Deadzone (camera only moves when player leaves center area)
mode: 'deadzone'
```

#### `lerpFactor`
- **Type:** `number` (0-1)
- **Default:** `0.1`
- **Description:** Smoothness for lerp mode (lower = smoother, higher = snappier)

```typescript
this.adapter.createCameraFollower({
  mode: 'lerp',
  lerpFactor: 0.05  // Very smooth
});
```

#### `offset`
- **Type:** `{ x: number; y: number }`
- **Default:** `{ x: 0, y: 0 }`
- **Description:** Camera offset from target center

```typescript
this.adapter.createCameraFollower({
  offset: { x: 0, y: 50 }  // Offset camera 50px down
});
```

#### `bounds`
- **Type:** `{ width: number; height: number }`
- **Default:** `undefined`
- **Description:** World bounds (prevents showing outside world)

```typescript
this.adapter.createCameraFollower({
  bounds: { width: 1600, height: 1200 }
});
```

#### `deadzone`
- **Type:** `{ width: number; height: number }`
- **Default:** `{ width: 200, height: 150 }`
- **Description:** Deadzone size (only used when `mode: 'deadzone'`)

```typescript
this.adapter.createCameraFollower({
  mode: 'deadzone',
  deadzone: { width: 300, height: 200 }
});
```

#### `centerOnTarget`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to center camera on target

## Follow Modes

### Instant Mode (Default)

Camera snaps directly to target. Best for most games.

```typescript
this.adapter.createCameraFollower({
  mode: 'instant'
});
```

**Use when:**
- You want responsive, tight camera control
- Player movement is smooth enough without camera smoothing

### Lerp Mode

Camera smoothly interpolates to target. Cinematic feel.

```typescript
this.adapter.createCameraFollower({
  mode: 'lerp',
  lerpFactor: 0.1  // Lower = smoother, higher = snappier
});
```

**Use when:**
- You want smooth, cinematic camera movement
- Player can change direction quickly (lerp smooths it out)

**Lerp factor guide:**
- `0.05` - Very smooth, noticeable lag (cinematic)
- `0.1` - Balanced smoothness (recommended)
- `0.2` - Snappy, minimal lag
- `0.5+` - Almost instant (defeats the purpose)

### Deadzone Mode

Camera only moves when player leaves deadzone rectangle.

```typescript
this.adapter.createCameraFollower({
  mode: 'deadzone',
  deadzone: { width: 200, height: 150 }
});
```

**Use when:**
- You want player to move freely in center of screen
- You want camera to feel less "twitchy"
- Classic platformer/action game feel

## API Reference

### CameraFollower Instance

The object returned by `createCameraFollower()`:

```typescript
interface CameraFollower {
  update(): void;
  destroy(): void;
  setTarget(playerId: string): void;
  getTarget(): string | null;
}
```

#### `update()`

Manually update camera position. Automatically called every frame, rarely needed.

```typescript
this.cameraFollower.update();
```

#### `destroy()`

Clean up and stop following. Call in `scene.shutdown()`:

```typescript
shutdown() {
  this.cameraFollower.destroy();
}
```

#### `setTarget(playerId)`

Change which player to follow:

```typescript
// Switch to different player
this.cameraFollower.setTarget('player-456');
```

#### `getTarget()`

Get current target player ID:

```typescript
const targetId = this.cameraFollower.getTarget();
console.log('Following:', targetId);
```

## Complete Examples

### Top-Down Game (Blob Battle Style)

```typescript
export function createBlobBattleScene(runtime: GameRuntime) {
  return class BlobBattleScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private cameraFollower: any;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Auto-follow local player
      this.cameraFollower = this.adapter.createCameraFollower({
        target: 'myPlayer',
        bounds: { width: 800, height: 600 }
      });

      // That's it! Camera automatically follows.
    }

    shutdown() {
      this.cameraFollower.destroy();
    }
  };
}
```

### Platformer with Smooth Camera

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    mode: 'lerp',
    lerpFactor: 0.1,
    bounds: { width: 2400, height: 1600 }
  });
}
```

### Racing Game with Deadzone

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    mode: 'deadzone',
    deadzone: { width: 300, height: 200 },
    bounds: { width: 3200, height: 2400 }
  });
}
```

### Spectator Mode (Switch Targets)

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer'
  });

  // Switch to different player on keypress
  this.input.keyboard.on('keydown-TAB', () => {
    const state = runtime.getState();
    const playerIds = Object.keys(state.players);
    const currentIdx = playerIds.indexOf(this.cameraFollower.getTarget());
    const nextIdx = (currentIdx + 1) % playerIds.length;
    this.cameraFollower.setTarget(playerIds[nextIdx]);
  });
}
```

## Common Patterns

### Center Camera on Spawn

```typescript
create() {
  // Camera automatically centers on player when they spawn
  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    bounds: { width: 1600, height: 1200 }
  });
  // That's it! No manual initialization needed.
}
```

### Camera with Offset (Over-the-shoulder)

```typescript
create() {
  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    offset: { x: 0, y: -100 },  // Show more ahead of player
    mode: 'lerp',
    lerpFactor: 0.15
  });
}
```

### Bounded World

```typescript
create() {
  this.cameraFollower = this.adapter.createCameraFollower({
    target: 'myPlayer',
    bounds: { width: 2400, height: 1600 }  // Camera won't show beyond world
  });
}
```

## Troubleshooting

### Camera not following player

**Cause:** Player state doesn't have `x` and `y` properties.

**Fix:** Ensure your game state has player position:
```typescript
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map(id => [id, { x: 100, y: 100 }])  // ✅ Must have x, y
  )
})
```

### Camera follows wrong player

**Cause:** Using wrong target configuration.

**Fix:** Verify target is correct:
```typescript
// Follow local player (most common)
target: 'myPlayer'

// Follow specific player
target: { playerId: 'player-123' }
```

### Camera too laggy (lerp mode)

**Cause:** `lerpFactor` is too low.

**Fix:** Increase lerp factor:
```typescript
lerpFactor: 0.2  // More responsive (was 0.1)
```

### Camera too twitchy (instant mode)

**Cause:** Instant mode has no smoothing.

**Fix:** Use lerp or deadzone mode:
```typescript
mode: 'lerp',
lerpFactor: 0.1
```

## Best Practices

### ✅ Do

- **Use CameraFollower for all camera tracking** - Handles timing correctly
- **Set world bounds** - Prevents showing outside world
- **Choose appropriate mode** - Instant for most, lerp for cinematic, deadzone for classic
- **Call destroy() in shutdown** - Clean up resources

### ❌ Don't

- **Don't manually set camera position** - Let CameraFollower handle it
- **Don't create in update()** - Create once in create()
- **Don't forget bounds** - Set bounds to match your world size
- **Don't use extreme lerp values** - Stay between 0.05-0.2

## Performance

CameraFollower is highly optimized:
- **Zero overhead** when player doesn't move
- **Automatic updates** via Phaser events (no manual polling)
- **Waits for state** before initializing (no wasted checks)
- **Instant cleanup** via destroy()

## See Also

- [PhaserAdapter](./adapter) - Main adapter API
- [SpriteManager](./sprite-manager) - Sprite synchronization
- [InputManager](./input-manager) - Input handling
- [Phaser Helpers](./helpers) - All available helpers
