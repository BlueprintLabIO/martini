/**
 * Martini SDK Documentation for AI System Prompt
 *
 * Concise reference for the Martini multiplayer game SDK.
 * Import: import { MARTINI_SDK_DOCS } from '$lib/ai/api-docs-prompt';
 */

export const MARTINI_SDK_DOCS = `
# Martini SDK - Multiplayer Game Framework

## Quick Start

Every Martini project has 3 TypeScript files:

1. **game.ts** - Game logic (state & actions)
2. **scene.ts** - Rendering (Phaser scene)
3. **main.ts** - Wiring (runtime initialization)

### game.ts - Define Game Logic

\`\`\`typescript
import { defineGame } from '@martini/phaser';

export const myGame = defineGame({
  // Initial state when game starts
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, {
        x: 200 + index * 400,
        y: 300,
        score: 0
      }])
    )
  }),

  // All possible actions
  actions: {
    // Player input
    input: {
      apply: (state, context, input: { left: boolean; right: boolean; jump: boolean }) => {
        state.inputs[context.targetId] = input;
      }
    },

    // Scoring
    addScore: {
      apply: (state, context, points: number) => {
        state.players[context.targetId].score += points;
      }
    }
  }
});
\`\`\`

### scene.ts - Render with Phaser

\`\`\`typescript
import Phaser from 'phaser';
import { GameRuntime, PhaserAdapter } from '@martini/phaser';

export function createGameScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

    create() {
      // Connect runtime to Phaser
      this.adapter = new PhaserAdapter(runtime, this);

      // HMR support (optional)
      if ((window as any).__HMR__) {
        (window as any).__HMR__.adapter = this.adapter;
      }

      // React to state changes
      this.adapter.onChange((state) => {
        // Create/update sprites for each player
        Object.entries(state.players).forEach(([id, player]) => {
          let sprite = this.sprites.get(id);
          if (!sprite) {
            sprite = this.add.sprite(player.x, player.y, 'player');
            this.sprites.set(id, sprite);
          }
          sprite.setPosition(player.x, player.y);
        });
      });
    }

    update() {
      // Smooth interpolation for remote players
      this.adapter.updateInterpolation();

      // Handle local player input
      const cursors = this.input.keyboard!.createCursorKeys();
      runtime.submitAction('input', {
        left: cursors.left!.isDown,
        right: cursors.right!.isDown,
        jump: cursors.space!.isDown
      });
    }
  };
}
\`\`\`

### main.ts - Initialize Runtime

\`\`\`typescript
import Phaser from 'phaser';
import { GameRuntime, TrysteroTransport } from '@martini/phaser';
import { myGame } from './game';
import { createGameScene } from './scene';

// Setup multiplayer transport
const transport = new TrysteroTransport({
  roomId: (window as any).__ROOM_ID__,
  isHost: (window as any).__IS_HOST__
});

// Create game runtime
const runtime = new GameRuntime(myGame, transport);

// HMR support (optional)
if ((window as any).__HMR__) {
  (window as any).__HMR__.runtime = runtime;
}

// Start Phaser
new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  scene: createGameScene(runtime),
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300, x: 0 } }
  }
});
\`\`\`

## Core API

### defineGame()

Define deterministic game logic.

\`\`\`typescript
const game = defineGame({
  setup: ({ playerIds, isHost }) => ({
    // Return initial state
    players: {},
    enemies: [],
    score: 0
  }),

  actions: {
    actionName: {
      apply: (state, context, ...args) => {
        // Mutate state directly
        state.score += 10;
      }
    }
  }
});
\`\`\`

**Key Points:**
- \`setup()\` runs once when game starts
- \`apply()\` must be deterministic (same inputs → same output)
- Mutate \`state\` directly, don't return anything
- Context provides: \`targetId\`, \`actorId\`, \`timestamp\`, \`isHost\`

### GameRuntime

Manages game state and synchronization.

\`\`\`typescript
const runtime = new GameRuntime(myGame, transport);

// Submit actions
runtime.submitAction('move', { x: 100, y: 200 });

// Read state (read-only)
const state = runtime.getState();

// Listen to state changes
runtime.onChange((state) => {
  console.log('State updated:', state);
});

// Direct mutation (use sparingly)
runtime.mutateState((state) => {
  state.score = 0;
});
\`\`\`

### PhaserAdapter

Bridges GameRuntime and Phaser scenes.

\`\`\`typescript
class MyScene extends Phaser.Scene {
  adapter!: PhaserAdapter;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    this.adapter.onChange((state) => {
      // Update visuals based on state
    });
  }

  update() {
    // Smooth remote player movement
    this.adapter.updateInterpolation();
  }
}
\`\`\`

### TrysteroTransport

P2P WebRTC multiplayer (serverless).

\`\`\`typescript
const transport = new TrysteroTransport({
  roomId: 'my-room-123',  // Share this to join same game
  isHost: true            // First player = host
});
\`\`\`

## Common Patterns

### Player Movement

\`\`\`typescript
// game.ts
actions: {
  move: {
    apply: (state, context, velocity: { x: number; y: number }) => {
      const player = state.players[context.targetId];
      player.x += velocity.x;
      player.y += velocity.y;
    }
  }
}

// scene.ts update()
const speed = 5;
const cursors = this.input.keyboard!.createCursorKeys();
const vx = cursors.right!.isDown ? speed : cursors.left!.isDown ? -speed : 0;
const vy = cursors.down!.isDown ? speed : cursors.up!.isDown ? -speed : 0;
runtime.submitAction('move', { x: vx, y: vy });
\`\`\`

### Collecting Items

\`\`\`typescript
// game.ts
actions: {
  collect: {
    apply: (state, context, coinId: string) => {
      const index = state.coins.findIndex(c => c.id === coinId);
      if (index !== -1) {
        state.coins.splice(index, 1);
        state.players[context.targetId].score += 10;
      }
    }
  }
}

// scene.ts
checkCollisions() {
  const localPlayer = state.players[runtime.getLocalPlayerId()!];
  state.coins.forEach(coin => {
    if (distance(localPlayer, coin) < 30) {
      runtime.submitAction('collect', coin.id);
    }
  });
}
\`\`\`

### Spawning Enemies (Host Only)

\`\`\`typescript
// game.ts
actions: {
  spawnEnemy: {
    apply: (state, context) => {
      if (!context.isHost) return; // Host only
      state.enemies.push({
        id: \`enemy-\${Date.now()}\`,
        x: Math.random() * 800,
        y: 100
      });
    }
  }
}

// scene.ts (host only)
if (runtime.isHost() && Math.random() < 0.01) {
  runtime.submitAction('spawnEnemy');
}
\`\`\`

## Best Practices

1. **Keep actions deterministic** - No \`Math.random()\`, \`Date.now()\`, or external state in \`apply()\`
2. **Use context for randomness** - Pass random values as action arguments
3. **Minimize state size** - Only store what's needed for game logic
4. **Use PhaserAdapter.onChange()** - Don't poll state every frame
5. **Call updateInterpolation()** - Makes remote players smooth

## Debugging

\`\`\`typescript
// Check current state
console.log(runtime.getState());

// Check if you're host
console.log(runtime.isHost());

// Get your player ID
console.log(runtime.getLocalPlayerId());

// Log all actions
runtime.onChange((state, action) => {
  if (action) console.log('Action:', action);
});
\`\`\`

## Common Mistakes

❌ **Don't use Math.random() in apply()**
\`\`\`typescript
// BAD
actions: {
  spawn: {
    apply: (state) => {
      state.enemy = { x: Math.random() * 800 }; // Different on each client!
    }
  }
}
\`\`\`

✅ **Pass randomness as arguments**
\`\`\`typescript
// GOOD
actions: {
  spawn: {
    apply: (state, context, x: number) => {
      state.enemy = { x };
    }
  }
}

// In scene.ts (host only)
if (runtime.isHost()) {
  runtime.submitAction('spawn', Math.random() * 800);
}
\`\`\`

---

For more details, see the full SDK documentation in the docs folder.
`;
