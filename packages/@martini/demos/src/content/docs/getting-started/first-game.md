---
title: First Game - Paddle Battle
description: Build a complete multiplayer Pong game step-by-step
section: getting-started
order: 3
---

# Your First Multiplayer Game

In this tutorial, you'll build **Paddle Battle** - a complete multiplayer Pong game. You'll learn core Martini concepts by building a real game from scratch.

## What You'll Build

A 2-player Pong game where:
- Each player controls a paddle (left or right)
- Players bounce a ball back and forth
- Score points when the ball passes the opponent
- Everything stays in perfect sync across both clients

**Time to complete:** 20-30 minutes

## Prerequisites

Make sure you've [installed Martini](/docs/latest/getting-started/installation) first.

## Project Setup

Create a new directory and initialize your project:

```bash
mkdir paddle-battle
cd paddle-battle
pnpm init
pnpm add @martini/core @martini/phaser @martini/transport-local phaser
pnpm add -D typescript vite
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  }
});
```

---

## Step 1: Define Game State

First, let's think about what state we need to track:

- **Players**: Position, score, which side (left/right)
- **Ball**: Position, velocity
- **Inputs**: Current player controls
- **Game status**: Has the game started?

Create `src/game.ts`:

```typescript
import { defineGame } from '@martini/core';

// Define the shape of our game state
interface Player {
  y: number;          // Paddle vertical position
  score: number;      // Player's score
  side: 'left' | 'right';  // Which side of screen
}

interface Ball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface GameState {
  players: Record<string, Player>;
  ball: Ball;
  inputs: Record<string, { up: boolean; down: boolean }>;
  gameStarted: boolean;
}

export const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    // Initialize players
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          y: 250,  // Center of 600px height
          score: 0,
          side: index === 0 ? 'left' : 'right',
        },
      ])
    ),

    // Initialize ball
    ball: {
      x: 400,      // Center of 800px width
      y: 300,      // Center of 600px height
      velocityX: 200,
      velocityY: 150,
    },

    inputs: {},
    gameStarted: false,
  }),

  actions: {
    // Players send their input each frame
    move: {
      apply: (state, context, input: { up: boolean; down: boolean }) => {
        // Store input in state - host will use this to update physics
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },

    // Award point when ball goes off screen
    score: {
      apply: (state, context) => {
        // context.targetId is the player who should receive the score
        const player = state.players[context.targetId];
        if (!player) return;

        player.score += 1;

        // Reset ball to center
        state.ball.x = 400;
        state.ball.y = 300;
        // Random direction
        state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
        state.ball.velocityY = 150 * (Math.random() > 0.5 ? 1 : -1);
      },
    },

    startGame: {
      apply: (state) => {
        state.gameStarted = true;
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      y: 250,
      score: 0,
      side: index === 0 ? 'left' : 'right',
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
```

**Key Concepts:**

1. **Type Safety**: We defined `GameState` interface for full TypeScript support
2. **setup()**: Creates initial state - each player gets assigned left or right side
3. **move action**: Stores player input (doesn't move paddles directly!)
4. **score action**: Uses `context.targetId` to award points to correct player
5. **Player lifecycle**: Handles mid-game joins and disconnects

---

## Step 2: Create the Phaser Scene

Now let's render our game with Phaser. Create `src/scene.ts`:

```typescript
import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

export function createPaddleBattleScene(runtime: GameRuntime, isHost: boolean) {
  return class PaddleBattleScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private paddles: Record<string, Phaser.GameObjects.Rectangle> = {};
    private ball!: Phaser.GameObjects.Arc;
    private scoreTexts: Record<string, Phaser.GameObjects.Text> = {};

    constructor() {
      super({ key: 'PaddleBattle' });
    }

    create() {
      // Background
      this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

      // Center line (dashed)
      for (let i = 0; i < 600; i += 20) {
        this.add.rectangle(400, i + 10, 4, 10, 0x444444);
      }

      // Create adapter - this connects Martini to Phaser
      this.adapter = new PhaserAdapter(runtime, this);

      if (isHost) {
        this.setupHost();
      } else {
        this.setupClient();
      }

      // Add controls label
      const label = isHost ? 'W/S to Move (Left Paddle)' : '↑/↓ to Move (Right Paddle)';
      this.add.text(400, 570, label, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5);
    }

    private setupHost() {
      const state = runtime.getState();

      // Create paddles for each player
      for (const [playerId, playerData] of Object.entries(state.players)) {
        const x = playerData.side === 'left' ? 50 : 750;

        // Create paddle with physics
        const paddle = this.add.rectangle(x, playerData.y, 15, 100, 0xffffff);
        this.physics.add.existing(paddle, false);

        const body = paddle.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);  // Keep paddle on screen
        body.setImmovable(true);           // Ball bounces off it

        this.paddles[playerId] = paddle;

        // Track sprite - Martini will sync position automatically
        this.adapter.trackSprite(paddle, `paddle-${playerId}`);

        // Score text
        const scoreX = playerData.side === 'left' ? 200 : 600;
        this.scoreTexts[playerId] = this.add.text(scoreX, 50, '0', {
          fontSize: '48px',
          color: '#ffffff',
        });
      }

      // Create ball with physics
      this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
      this.physics.add.existing(this.ball);

      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
      ballBody.setBounce(1, 1);  // Perfect bounce
      ballBody.setCollideWorldBounds(false);  // We'll handle bounds manually
      ballBody.setVelocity(state.ball.velocityX, state.ball.velocityY);

      // Track ball sprite
      this.adapter.trackSprite(this.ball, 'ball');

      // Add colliders between ball and all paddles
      for (const paddle of Object.values(this.paddles)) {
        this.physics.add.collider(this.ball, paddle);
      }
    }

    private setupClient() {
      // Clients create sprites when they appear in state
      this.adapter.onChange((state: any) => {
        if (!state._sprites) return;

        for (const [key, data] of Object.entries(state._sprites)) {
          // Create paddles
          if (key.startsWith('paddle-') && !this.paddles[key]) {
            const paddle = this.add.rectangle(
              data.x || 50,
              data.y || 300,
              15,
              100,
              0xffffff
            );
            this.paddles[key] = paddle;
            this.adapter.registerRemoteSprite(key, paddle);
          }

          // Create ball
          if (key === 'ball' && !this.ball) {
            this.ball = this.add.circle(
              data.x || 400,
              data.y || 300,
              10,
              0xff6b6b
            );
            this.adapter.registerRemoteSprite(key, this.ball);
          }
        }

        // Update score displays
        if (state.players) {
          for (const [playerId, playerData] of Object.entries(state.players)) {
            if (!this.scoreTexts[playerId]) {
              const scoreX = playerData.side === 'left' ? 200 : 600;
              this.scoreTexts[playerId] = this.add.text(
                scoreX,
                50,
                String(playerData.score || 0),
                { fontSize: '48px', color: '#ffffff' }
              );
            } else {
              this.scoreTexts[playerId].setText(String(playerData.score || 0));
            }
          }
        }
      });
    }

    update() {
      // CLIENTS: Smooth interpolation
      if (!isHost) {
        this.adapter.updateInterpolation();
        return;  // Clients don't run game logic
      }

      // HOST ONLY: Run game logic
      this.handleInput();
      this.updatePhysics();
      this.checkScoring();
    }

    private handleInput() {
      const state = runtime.getState();
      const speed = 300;

      // Get keyboard input
      const cursors = this.input.keyboard!.createCursorKeys();
      const wasd = this.input.keyboard!.addKeys('W,S') as any;

      // Determine which controls this player uses
      const myId = this.adapter.playerId;
      const myPlayer = state.players[myId];

      if (!myPlayer) return;

      // Left player uses W/S, right player uses arrow keys
      const input = {
        up: myPlayer.side === 'left' ? wasd.W.isDown : cursors.up.isDown,
        down: myPlayer.side === 'left' ? wasd.S.isDown : cursors.down.isDown,
      };

      // Submit input to runtime
      runtime.submitAction('move', input);

      // Apply physics to all paddles based on their inputs
      const inputs = state.inputs || {};
      for (const [playerId, playerInput] of Object.entries(inputs)) {
        const paddle = this.paddles[playerId];
        if (!paddle?.body) continue;

        const body = paddle.body as Phaser.Physics.Arcade.Body;

        if (playerInput.up) {
          body.setVelocityY(-speed);
        } else if (playerInput.down) {
          body.setVelocityY(speed);
        } else {
          body.setVelocityY(0);
        }

        // Update state with new position
        state.players[playerId].y = paddle.y;
      }
    }

    private updatePhysics() {
      const state = runtime.getState();

      if (!this.ball?.body) return;

      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

      // Update ball state
      state.ball.x = this.ball.x;
      state.ball.y = this.ball.y;
      state.ball.velocityX = ballBody.velocity.x;
      state.ball.velocityY = ballBody.velocity.y;

      // Manual top/bottom bounce
      if (this.ball.y <= 10) {
        this.ball.y = 10;
        ballBody.setVelocityY(Math.abs(ballBody.velocity.y));
      } else if (this.ball.y >= 590) {
        this.ball.y = 590;
        ballBody.setVelocityY(-Math.abs(ballBody.velocity.y));
      }
    }

    private checkScoring() {
      const state = runtime.getState();

      // Ball went past left edge - RIGHT player scores
      if (this.ball.x < -10) {
        const rightPlayer = Object.entries(state.players).find(
          ([_, data]) => data.side === 'right'
        );
        if (rightPlayer) {
          runtime.submitAction('score', undefined, rightPlayer[0]);
          this.resetBall();
        }
      }
      // Ball went past right edge - LEFT player scores
      else if (this.ball.x > 810) {
        const leftPlayer = Object.entries(state.players).find(
          ([_, data]) => data.side === 'left'
        );
        if (leftPlayer) {
          runtime.submitAction('score', undefined, leftPlayer[0]);
          this.resetBall();
        }
      }
    }

    private resetBall() {
      // Wait for state update, then reset ball physics
      setTimeout(() => {
        const state = runtime.getState();
        this.ball.setPosition(state.ball.x, state.ball.y);
        (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(
          state.ball.velocityX,
          state.ball.velocityY
        );

        // Update score displays
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.scoreTexts[playerId]?.setText(String(playerData.score || 0));
        }
      }, 10);
    }
  }
}
```

**Key Concepts:**

1. **PhaserAdapter**: Bridges Martini runtime with Phaser scene
2. **Host vs Client Setup**:
   - Host creates sprites with `this.physics.add.*` and calls `trackSprite()`
   - Clients create sprites with `this.add.*` and calls `registerRemoteSprite()`
3. **updateInterpolation()**: Clients must call this for smooth movement
4. **Input Handling**: Both players submit input, but only host applies physics
5. **targetId Parameter**: `submitAction('score', data, playerId)` specifies who scores

---

## Step 3: Initialize the Game

Create `src/main.ts` to wire everything together:

```typescript
import Phaser from 'phaser';
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
import { game } from './game';
import { createPaddleBattleScene } from './scene';

// Create transport - LocalTransport lets you test with multiple browser tabs
const transport = new LocalTransport({
  roomId: 'paddle-battle-room',
  isHost: true,  // First tab is host
});

// Create runtime
const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()],
});

// Create Phaser game
const PaddleBattleScene = createPaddleBattleScene(runtime, transport.isHost());

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },  // No gravity for Pong
      debug: false,
    },
  },
  backgroundColor: '#1a1a2e',
  scene: PaddleBattleScene,
});
```

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paddle Battle - Multiplayer Pong</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #0a0a0a;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #game {
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
  </style>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

---

## Step 4: Test Your Game!

Start the development server:

```bash
pnpm dev
```

Open http://localhost:3000 in **two browser tabs side by side**:

1. **First tab** (Host): Controls left paddle with W/S keys
2. **Second tab** (Client): Controls right paddle with arrow keys

You should see both paddles and the ball in sync across both tabs!

---

## How It Works

### The Multiplayer Flow

```
1. Player presses W (move up)
   ↓
2. runtime.submitAction('move', { up: true })
   ↓
3. Action sent to host via transport
   ↓
4. Host applies action: state.inputs[playerId] = { up: true }
   ↓
5. Host runs physics: paddle.body.setVelocityY(-speed)
   ↓
6. adapter.trackSprite() updates state._sprites.paddle-123
   ↓
7. Host generates diff: [{ op: 'replace', path: ['_sprites','paddle-123','y'], value: 245 }]
   ↓
8. Host broadcasts patches to all clients
   ↓
9. Clients apply patches to their state
   ↓
10. adapter.updateInterpolation() smoothly moves client sprites
```

### Key Patterns

**1. Input → State → Physics**

```typescript
// DON'T do this (direct sprite manipulation)
runtime.submitAction('move', { up: true });
paddle.y -= 10;  // ❌ Not synced!

// DO this (state-driven)
runtime.submitAction('move', { up: true });  // Store input in state
// Host reads state.inputs and applies physics
// Sprites update automatically via trackSprite()
```

**2. Host Authority**

Only the host runs `this.physics.*` and collision detection. Clients are "dumb terminals" that just render what they receive.

**3. targetId for Multi-Target Actions**

```typescript
// Award point to right player
const rightPlayer = findRightPlayer();
runtime.submitAction('score', undefined, rightPlayer.id);
//                                       ↑ targetId parameter
```

---

## Next Steps

### Add More Features

**1. Add a Winning Condition**

```typescript
// In score action:
if (player.score >= 5) {
  state.gameOver = true;
  state.winner = context.targetId;
}
```

**2. Add Sound Effects**

```typescript
// In scene.ts create():
this.sound.add('bounce');
this.sound.add('score');

// In ball collision:
this.sound.play('bounce');
```

**3. Add Power-ups**

```typescript
// Add to state:
powerups: [
  { x: 400, y: 300, type: 'speed' }
]

// Check collision:
if (ballTouchesPowerup()) {
  state.ball.velocityX *= 1.5;
}
```

### Learn More

- [Core Concepts](/docs/latest/concepts/architecture) - Understand Martini's architecture
- [Actions Deep Dive](/docs/latest/concepts/actions) - Master action patterns
- [Phaser Integration](/docs/latest/guides/phaser-integration) - Advanced Phaser techniques
- [Production Deployment](/docs/latest/guides/deployment) - Deploy to real servers

---

## Troubleshooting

**Ball doesn't bounce off paddles?**
- Make sure you're calling `this.physics.add.collider(ball, paddle)` on the host
- Check that `ballBody.setBounce(1, 1)` is set

**Second player's paddle doesn't appear?**
- Clients must check `if (!state._sprites) return` before creating sprites
- Make sure `adapter.registerRemoteSprite()` is called

**Paddles are jittery on client?**
- Call `adapter.updateInterpolation()` in the client's `update()` method

**Scores don't update?**
- Use `context.targetId` in the score action, not `context.playerId`
- Make sure you're using the third parameter: `submitAction('score', undefined, winnerId)`

---

## Congratulations! 🎉

You've built a complete multiplayer game with Martini! You now understand:

✅ Defining game state with TypeScript
✅ Creating actions that modify state
✅ Host-authoritative architecture
✅ Sprite synchronization with PhaserAdapter
✅ Input handling and physics
✅ Using targetId for multi-player actions

Ready for more? Check out our [example games](/docs/latest/examples/overview) to see advanced patterns!
