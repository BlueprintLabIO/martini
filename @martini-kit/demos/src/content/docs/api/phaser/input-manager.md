---
title: InputManager
description: Simplified keyboard and pointer input handling
---

# InputManager

`InputManager` simplifies input handling in multiplayer Phaser games. It automatically maps keyboard/pointer input to game actions, handles debouncing, and supports both continuous and one-shot inputs.

## Quick Start

```typescript
// Create input manager
const inputManager = adapter.createInputManager();

// Bind keys
inputManager.bindKeys({
  'W': { action: 'move', input: { y: -1 } },
  'S': { action: 'move', input: { y: 1 } },
  'Space': 'jump'  // Shorthand
});

// Update in game loop
update() {
  inputManager.update();
}
```

## API Reference

```typescript
class InputManager {
  bindKeys(bindings: KeyBindings): void;
  bindKeysAggregated(action: string, keyMap: Record<string, string>, options?: AggregateOptions): void;
  bindCursors(cursors: Phaser.Types.Input.Keyboard.CursorKeys, bindings: CursorBindings): void;
  loadProfile(profileName: string, options?: ProfileOptions): void;
  update(): void;
}

interface KeyBindings {
  [key: string]: ActionBinding | string;
}

interface ActionBinding {
  action: string;
  input?: any;
  mode?: 'continuous' | 'oneshot';
  targetId?: string;
}
```

## Binding Keys

### bindKeys()

Map individual keys to actions.

```typescript
bindKeys(bindings: KeyBindings): void
```

**Example:**

```typescript
inputManager.bindKeys({
  // Full binding
  'W': {
    action: 'move',
    input: { y: -1 },
    mode: 'continuous'  // Fires every frame while held
  },

  'S': {
    action: 'move',
    input: { y: 1 },
    mode: 'continuous'
  },

  // One-shot (fires once on press)
  'Space': {
    action: 'jump',
    mode: 'oneshot'
  },

  // Shorthand (defaults to oneshot, no input)
  'E': 'interact',
  'R': 'reload'
});
```

### bindKeysAggregated()

Aggregate multiple keys into a single input state. **Perfect for platformers and twin-stick shooters**.

```typescript
bindKeysAggregated(
  action: string,
  keyMap: Record<string, string>,
  options?: {
    initialState?: Record<string, any>;
    mode?: 'continuous' | 'oneshot';
    targetId?: string;
  }
): void
```

**Example:**

```typescript
// Platformer movement
inputManager.bindKeysAggregated('move', {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'Space'
});
// Automatically tracks: { left: true/false, right: true/false, up: true/false }

// Top-down movement (WASD)
inputManager.bindKeysAggregated('move', {
  left: 'A',
  right: 'D',
  up: 'W',
  down: 'S'
});

// Twin-stick shooter (move with WASD, aim with arrows)
inputManager.bindKeysAggregated('move', {
  left: 'A',
  right: 'D',
  up: 'W',
  down: 'S'
});

inputManager.bindKeysAggregated('aim', {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown'
});
```

### bindCursors()

Bind Phaser's cursor keys.

```typescript
bindCursors(
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  bindings: CursorBindings
): void
```

**Example:**

```typescript
const cursors = this.input.keyboard.createCursorKeys();

inputManager.bindCursors(cursors, {
  left: { action: 'move', input: { x: -1 } },
  right: { action: 'move', input: { x: 1 } },
  up: { action: 'move', input: { y: -1 } },
  down: { action: 'move', input: { y: 1 } },
  space: 'jump',
  shift: 'dash'
});
```

## Input Modes

### Continuous

Fires **every frame** while key is held. Perfect for movement.

```typescript
inputManager.bindKeys({
  'W': {
    action: 'move',
    input: { y: -1 },
    mode: 'continuous'  // Default
  }
});

// Submits action every frame while W is held
```

### One-shot

Fires **once** when key is pressed (debounced). Perfect for jumps, attacks.

```typescript
inputManager.bindKeys({
  'Space': {
    action: 'jump',
    mode: 'oneshot'
  }
});

// Only fires once per key press, not every frame
```

## Input Profiles

Pre-configured input schemes for common game types.

### loadProfile()

Load a predefined input profile.

```typescript
loadProfile(profileName: string, options?: ProfileOptions): void
```

**Available profiles:**
- `'platformer'` - Arrow keys + Space
- `'topdown'` - WASD + Space
- `'twinstick'` - WASD move + Arrow aim + Space shoot

**Example:**

```typescript
// Basic platformer controls
inputManager.loadProfile('platformer');

// With custom options
inputManager.loadProfile('platformer', {
  jumpKey: 'W',           // Use W instead of Space
  shootKey: 'Space',       // Add shoot
  interactKey: 'E'        // Add interact
});

// Top-down shooter
inputManager.loadProfile('topdown');

// Twin-stick shooter
inputManager.loadProfile('twinstick');
```

## Complete Examples

### Platformer

```typescript
import { PhaserAdapter } from '@martini-kit/phaser';

class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;

  create() {
    const adapter = new PhaserAdapter(runtime, this);
    this.inputManager = adapter.createInputManager();

    // Aggregated movement input
    this.inputManager.bindKeysAggregated('move', {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'Space'  // Jump
    });

    // Additional actions
    this.inputManager.bindKeys({
      'E': 'interact',
      'R': { action: 'restart', mode: 'oneshot' }
    });
  }

  update() {
    // Process input
    this.inputManager.update();
  }
}
```

### Top-Down Shooter

```typescript
class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(runtime, this);
    this.inputManager = adapter.createInputManager();

    // Movement (WASD)
    this.inputManager.bindKeysAggregated('move', {
      left: 'A',
      right: 'D',
      up: 'W',
      down: 'S'
    });

    // Shooting
    this.inputManager.bindKeys({
      'Space': {
        action: 'shoot',
        mode: 'continuous'  // Hold to shoot
      }
    });

    // Or use profile
    // this.inputManager.loadProfile('topdown');
  }

  update() {
    this.inputManager.update();
  }
}
```

### Twin-Stick Shooter

```typescript
class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(runtime, this);
    this.inputManager = adapter.createInputManager();

    // Movement (WASD)
    this.inputManager.bindKeysAggregated('move', {
      left: 'A',
      right: 'D',
      up: 'W',
      down: 'S'
    });

    // Aim (Arrow keys)
    this.inputManager.bindKeysAggregated('aim', {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown'
    });

    // Shoot
    this.inputManager.bindKeys({
      'Space': { action: 'shoot', mode: 'continuous' }
    });

    // Or use profile
    // this.inputManager.loadProfile('twinstick');
  }

  update() {
    this.inputManager.update();
  }
}
```

### Fighting Game

```typescript
class GameScene extends Phaser.Scene {
  create() {
    const adapter = new PhaserAdapter(runtime, this);
    this.inputManager = adapter.createInputManager();

    // Directional input
    this.inputManager.bindKeysAggregated('direction', {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown'
    });

    // Attack buttons
    this.inputManager.bindKeys({
      'Z': { action: 'punch', mode: 'oneshot' },
      'X': { action: 'kick', mode: 'oneshot' },
      'C': { action: 'special', mode: 'oneshot' },
      'Space': { action: 'block', mode: 'continuous' }
    });
  }

  update() {
    this.inputManager.update();
  }
}
```

## Game Definition Integration

**In your game definition:**

```typescript
import { defineGame, createInputAction } from '@martini-kit/core';

interface GameState {
  players: Record<string, {
    x: number;
    y: number;
  }>;
  inputs: Record<string, {
    left: boolean;
    right: boolean;
    up: boolean;
  }>;
}

const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 400, y: 300 }])
    ),
    inputs: {}
  }),

  actions: {
    // Store aggregated input
    move: createInputAction('inputs'),

    // One-shot action
    jump: {
      apply(state, context) {
        const player = state.players[context.targetId];
        if (player && player.onGround) {
          player.vy = -400;  // Jump velocity
        }
      }
    }
  }
});
```

**Process input in update:**

```typescript
update() {
  // InputManager submits actions automatically
  this.inputManager.update();

  // Read input from state
  const state = runtime.getState();
  const myInput = state.inputs[adapter.myId];

  if (myInput) {
    const speed = 200;
    if (myInput.left) this.playerSprite.x -= speed * delta;
    if (myInput.right) this.playerSprite.x += speed * delta;
  }
}
```

## Best Practices

### ✅ Do

- **Call `update()` every frame** - In `scene.update()`
- **Use `bindKeysAggregated()` for movement** - Cleaner than individual keys
- **Use `mode: 'oneshot'` for jumps/attacks** - Prevents spam
- **Use input profiles** - Quick setup for common patterns
- **Store input in state** - Use `createInputAction()`

### ❌ Don't

- **Don't forget to call `update()`** - Input won't work
- **Don't bind the same key twice** - Later binding overwrites
- **Don't use continuous for one-time actions** - Use oneshot instead
- **Don't read input directly in actions** - Store in state first

## See Also

- [PhaserAdapter](./adapter) - Creating input managers
- [Helpers (Core)](../core/helpers) - `createInputAction()`
- [Actions](/docs/concepts/actions) - Action system
