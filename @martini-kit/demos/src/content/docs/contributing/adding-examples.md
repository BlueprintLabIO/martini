---
title: Adding Example Games
description: Learn how to create and add example games to the martini-kit SDK documentation
---

# Adding Example Games

Example games are crucial for showcasing martini-kit SDK's capabilities and helping users learn through real implementations. This guide walks you through creating a new example game.

## Overview

An example game typically consists of:

1. **Game definition** - State, actions, and player lifecycle
2. **Phaser scene** - Visual rendering and interaction
3. **Route/page** - Playable demo on the docs site
4. **Documentation** - Explanation of key concepts

## Step-by-Step Guide

### Step 1: Plan Your Game

Before coding, define:

- **Game mechanics** - What can players do?
- **Learning objective** - What will this teach?
- **Complexity level** - Beginner, intermediate, or advanced?
- **Unique features** - What makes this example valuable?

**Good example games demonstrate:**
- Core martini-kit concepts (state sync, actions, player lifecycle)
- Common patterns (movement, collision, scoring)
- Best practices (determinism, testing, structure)

### Step 2: Create Game Directory

Create a new directory in the games folder:

```bash
cd @martini-kit/demos/src/lib/games
mkdir my-game
cd my-game
```

Your game directory should contain:

```
my-game/
├── index.ts       # Exports
├── game.ts        # Game definition
└── scene.ts       # Phaser scene
```

### Step 3: Implement Game Definition

Create [`game.ts`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games) with your game logic:

```typescript
// game.ts
import { defineGame, createPlayerManager, createInputAction } from '@martini-kit/core';

// Define your state interface
export interface MyGameState {
  players: Record<string, Player>;
  inputs: Record<string, PlayerInput>;
  score: number;
  // Add other game state here
}

interface Player {
  x: number;
  y: number;
  health: number;
}

interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

// Create player manager for lifecycle handling
const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 100 + index * 100,
    y: 200,
    health: 100,
  }),
});

// Define your game
export const myGame = defineGame<MyGameState>({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {},
    score: 0,
  }),

  actions: {
    // Use helper for input handling
    move: createInputAction('inputs'),

    // Custom action
    jump: {
      apply(state, context) {
        const player = state.players[context.targetId];
        if (player && canJump(player)) {
          player.velocityY = -500;
        }
      },
    },
  },

  onPlayerJoin(state, playerId) {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave(state, playerId) {
    playerManager.handleLeave(state.players, playerId);
  },
});

// Helper function
function canJump(player: Player): boolean {
  return player.y >= 200; // On ground
}
```

### Step 4: Create Phaser Scene

Create [`scene.ts`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games) with your Phaser implementation:

```typescript
// scene.ts
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';
import { GameRuntime } from '@martini-kit/core';
import { MyGameState, myGame } from './game';

export class MyGameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter<MyGameState>;
  private runtime!: GameRuntime<MyGameState>;

  constructor() {
    super({ key: 'MyGameScene' });
  }

  preload() {
    // Load assets
    this.load.image('player', '/assets/player.png');
    this.load.image('ground', '/assets/ground.png');
  }

  create(data: { runtime: GameRuntime<MyGameState> }) {
    // Get runtime from data
    this.runtime = data.runtime;

    // Create adapter
    this.adapter = new PhaserAdapter(this.runtime, this, {
      spriteNamespace: '_sprites',
      autoInterpolate: true,
    });

    // Set up world
    this.createWorld();

    // Set up players
    this.setupPlayers();

    // Set up input
    this.setupInput();

    // Listen for state changes
    this.runtime.onChange((state) => {
      this.updateUI(state);
    });

    // Cleanup on shutdown
    this.events.once('shutdown', () => {
      this.adapter.destroy();
    });
  }

  private createWorld() {
    // Add background
    this.add.rectangle(0, 0, 800, 600, 0x87ceeb).setOrigin(0, 0);

    // Add ground
    this.add.rectangle(0, 550, 800, 50, 0x228b22).setOrigin(0, 0);
  }

  private setupPlayers() {
    // Create sprite manager for players
    const playerSprites = this.adapter.createSpriteManager({
      onCreate: (key, data, scene) => {
        const sprite = scene.add.sprite(data.x, data.y, 'player');
        return sprite;
      },

      onUpdate: (sprite, data) => {
        sprite.x = data.x;
        sprite.y = data.y;
      },
    });

    // Update sprites when state changes
    this.runtime.onChange((state) => {
      Object.entries(state.players).forEach(([id, player]) => {
        playerSprites.add(id, player);
      });
    });
  }

  private setupInput() {
    // Create input manager
    const inputManager = this.adapter.createInputManager({
      keyBindings: {
        'A': { action: 'move', input: { left: true } },
        'D': { action: 'move', input: { right: true } },
        'W': { action: 'jump' },
      },
    });

    inputManager.enable();
  }

  private updateUI(state: MyGameState) {
    // Update score text, etc.
  }

  update(time: number, delta: number) {
    // Update adapter for interpolation
    this.adapter.update(time, delta);
  }
}
```

### Step 5: Create Exports

Create [`index.ts`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games) to export your game:

```typescript
// index.ts
export { myGame } from './game';
export { MyGameScene } from './scene';
export type { MyGameState } from './game';
```

### Step 6: Register Game Configuration

Add your game to the IDE configuration in [`src/lib/games/ide-configs-map.ts`](https://github.com/BlueprintLabIO/martini/blob/main/@martini-kit/demos/src/lib/games/ide-configs-map.ts):

```typescript
import { myGameConfig } from './configs/my-game';

export const ideConfigsMap = {
  'fire-and-ice': fireAndIceConfig,
  'paddle-battle': paddleBattleConfig,
  'my-game': myGameConfig, // Add your game
  // ...
};
```

Create the config file at [`src/lib/games/configs/my-game.ts`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games/configs):

```typescript
import type { IdeGameConfig } from '../types';

export const myGameConfig: IdeGameConfig = {
  id: 'my-game',
  name: 'My Awesome Game',
  description: 'A description of what this game demonstrates',
  difficulty: 'beginner', // or 'intermediate', 'advanced'
  tags: ['movement', 'physics', 'collision'],
  // Source code that will appear in the IDE
  sourceFiles: {
    'game.ts': `// Your game.ts source code as a string`,
    'scene.ts': `// Your scene.ts source code as a string`,
  },
};
```

### Step 7: Add to Navigation

Update the navigation in [`src/lib/docs/navigation.ts`](https://github.com/BlueprintLabIO/martini/blob/main/@martini-kit/demos/src/lib/docs/navigation.ts) if you want it in the examples section:

```typescript
{
  title: 'Examples & Recipes',
  items: [
    { title: 'Examples Overview', href: '/docs/latest/examples/overview' },
    // ...existing examples
    { title: 'My Awesome Game', href: '/docs/latest/examples/my-game' },
  ]
}
```

### Step 8: Write Documentation

Create documentation at [`src/content/docs/examples/my-game.md`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/content/docs/examples):

```markdown
---
title: My Awesome Game Example
description: Learn how to build a [type of game] with martini-kit SDK
---

# My Awesome Game

This example demonstrates [key concepts].

## What You'll Learn

- How to [concept 1]
- How to [concept 2]
- Best practices for [concept 3]

## Game Overview

[Describe the game and its mechanics]

## Key Implementation Details

### Game Definition

[Explain important parts of game.ts]

\`\`\`typescript
// Highlight interesting code
const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: 100 + index * 100,
    y: 200,
  }),
});
\`\`\`

### Phaser Integration

[Explain important parts of scene.ts]

## Try It Yourself

[Link to live demo or IDE version]

## Next Steps

- Try modifying [something]
- Add [feature idea]
- Learn more about [related concept]
```

### Step 9: Test Your Game

**Manual testing:**

1. **Build the project**
   ```bash
   pnpm build
   ```

2. **Run dev server**
   ```bash
   pnpm --filter @martini-kit/demos dev
   ```

3. **Test in browser**
   - Navigate to your game route
   - Test with multiple players (open multiple tabs)
   - Check console for errors
   - Verify state synchronization

**Automated testing:**

Create tests at [`src/lib/games/my-game/game.test.ts`](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games):

```typescript
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
import { myGame } from './game';

describe('MyGame', () => {
  it('should initialize with correct state', () => {
    const transport = new LocalTransport({
      roomId: 'test',
      isHost: true,
    });

    const runtime = new GameRuntime(myGame, transport, {
      isHost: true,
      playerIds: ['p1'],
    });

    const state = runtime.getState();
    expect(state.score).toBe(0);
    expect(Object.keys(state.players)).toHaveLength(1);

    runtime.destroy();
  });

  it('should handle player jump action', () => {
    // Test implementation
  });
});
```

## Best Practices for Example Games

### 1. Keep It Simple

- Focus on one or two concepts
- Avoid unnecessary complexity
- Use clear, descriptive names

### 2. Add Comments

Explain non-obvious code:

```typescript
// Calculate jump velocity using gravity and desired jump height
// Formula: v = sqrt(2 * gravity * height)
const jumpVelocity = Math.sqrt(2 * 800 * 150);
```

### 3. Follow Patterns

- Use `createPlayerManager` for player lifecycle
- Use `createInputAction` for input handling
- Follow naming conventions from other examples

### 4. Include Learning Resources

In your documentation:
- Explain why you made certain choices
- Link to relevant API documentation
- Suggest variations and extensions

### 5. Make It Visually Appealing

- Use clear, distinct sprites
- Add visual feedback (animations, particles)
- Include UI elements (score, health bars)

### 6. Test Thoroughly

- Test with 1, 2, and multiple players
- Test player join/leave
- Test on different browsers
- Check for console errors

## Example Game Checklist

Before submitting your example game:

- [ ] Game definition is clear and well-structured
- [ ] Phaser scene is properly integrated
- [ ] All assets are loaded correctly
- [ ] Input handling works for all players
- [ ] State synchronization is correct
- [ ] Documentation explains key concepts
- [ ] Tests are written and passing
- [ ] Code follows coding standards
- [ ] Game is added to navigation
- [ ] Configuration is registered
- [ ] Manual testing completed

## Getting Feedback

Before finalizing:

1. **Share in discussions** - Get early feedback
2. **Open a draft PR** - Let maintainers review
3. **Ask for testing help** - Community can play-test
4. **Iterate based on feedback**

## Inspiration

Need ideas? Check existing examples:

- **[Fire & Ice](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games/fire-and-ice)** - Cooperative gameplay, roles
- **[Paddle Battle](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games/paddle-battle)** - Simple 1v1, physics
- **[Arena Blaster](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games/arena-blaster)** - Combat, projectiles
- **[Blob Battle](https://github.com/BlueprintLabIO/martini/tree/main/@martini-kit/demos/src/lib/games/blob-battle)** - Physics-based gameplay

## Example Game Ideas

Here are some game ideas that would make great examples:

### Beginner Level
- **Pong Clone** - Classic 1v1 paddle game
- **Catch the Falling Objects** - Reaction-based collection game
- **Tag Game** - Simple chase mechanics

### Intermediate Level
- **Platformer** - Jump, double-jump, wall-jump
- **Racing Game** - Lap-based competitive racing
- **Tower Defense** - Wave-based strategy

### Advanced Level
- **Real-Time Strategy** - Resource management, unit control
- **Card Game** - Turn-based, deck building
- **Battle Royale** - Shrinking play area, survival

---

Ready to create your example game? Start with [Getting Started](/docs/latest/contributing/getting-started)!
