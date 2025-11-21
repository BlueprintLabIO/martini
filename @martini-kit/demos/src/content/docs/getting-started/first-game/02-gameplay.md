---
title: First Game - Gameplay
description: Implement the Phaser scene with player paddles and ball physics
section: getting-started
order: 4
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Step 2: Create the Phaser Scene

This is where the magic happens! The implementation differs significantly between Phaser Helpers and Core Primitives.

Create `src/scene.ts`:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

## Using Phaser Helpers

```typescript
import Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter, createPlayerHUD } from '@martini-kit/phaser';

export function createPaddleBattleScene(runtime: GameRuntime, isHost: boolean) {
  return class PaddleBattleScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private spriteManager: any;
    private inputManager: any;
    private ball!: Phaser.GameObjects.Arc;
    private hud: any;

    constructor() {
      super({ key: 'PaddleBattle' });
    }

    create() {
      // Initialize adapter
      this.adapter = new PhaserAdapter(runtime, this);

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

      // Center line (dashed)
      for (let i = 0; i < 600; i += 20) {
        this.add.rectangle(400, i + 10, 4, 10, 0x444444);
      }

      // ====== HELPER 1: SpriteManager ======
      // Automatically syncs all paddles (players) between host and clients
      this.spriteManager = this.adapter.createSpriteManager({
        // staticProperties = metadata synced once, not every frame
        staticProperties: ['side'],

        // Built-in labels (no manual positioning needed!)
        label: {
          getText: (data: any) => data.side === 'left' ? 'P1' : 'P2',
          offset: { y: -35 },
          style: {
            fontSize: '14px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 },
          },
        },

        // Create the visual sprite
        onCreate: (key: string, data: any) => {
          const x = data.side === 'left' ? 50 : 750;
          return this.add.rectangle(x, data.y, 15, 100, 0xffffff);
        },

        // Set up physics for each sprite
        onCreatePhysics: (sprite: any) => {
          this.physics.add.existing(sprite);
          const body = sprite.body as Phaser.Physics.Arcade.Body;
          body.setCollideWorldBounds(true);
          body.setImmovable(true);
        },
      });

      // ====== HELPER 2: HUD ======
      this.hud = createPlayerHUD(this.adapter, this, {
        title: 'Paddle Battle - Multiplayer Pong',

        roleText: (myPlayer: any) => {
          if (!myPlayer) return 'Spectator';
          return myPlayer.side === 'left' ? 'Left Player' : 'Right Player';
        },

        controlHints: () => 'W/S or ↑/↓ to Move',

        stats: (state: any) => {
          const scores = Object.entries(state.players)
            .map(([_, player]: any) => `${player.side}: ${player.score}`)
            .join('   |   ');
          return scores;
        },
      });

      // ====== HELPER 3: InputManager ======
      this.inputManager = this.adapter.createInputManager();
      this.inputManager.useProfile('platformer');

      // Create ball manually (special object, not managed by sprite manager)
      if (isHost) {
        const state = runtime.getState();
        this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
        this.physics.add.existing(this.ball);

        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setBounce(1, 1);
        ballBody.setCollideWorldBounds(false);
        ballBody.setVelocity(state.ball.velocityX, state.ball.velocityY);

        this.adapter.trackSprite(this.ball, 'ball');

        // Add collisions between ball and all paddles
        for (const paddle of Object.values(this.spriteManager.group.getChildren())) {
          this.physics.add.collider(this.ball, paddle as any);
        }
      } else {
        // Clients receive ball updates via sprite tracking
        this.adapter.onChange((state: any) => {
          if (!state._sprites?.ball) return;
          if (this.ball) return;

          const data = state._sprites.ball;
          this.ball = this.add.circle(data.x || 400, data.y || 300, 10, 0xff6b6b);
          this.adapter.registerRemoteSprite('ball', this.ball);
        });
      }

      // HOST SETUP
      if (isHost) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.spriteManager.add(`paddle-${playerId}`, playerData);
        }
      }
    }

    update() {
      // HOST: Ensure new players get sprites
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          const key = `paddle-${playerId}`;
          if (!this.spriteManager.get(key)) {
            this.spriteManager.add(key, playerData);
          }
        }
      }

      // CLIENT & HOST: Smooth interpolation
      this.spriteManager.update();

      if (!isHost) return; // Clients don't run logic

      // ====== HOST ONLY ======

      // Capture input and submit actions
      this.inputManager.update();
      const myInput = this.inputManager.getState();

      runtime.submitAction('move', {
        up: myInput.up || false,
        down: myInput.down || false,
      });

      // Update physics
      this.updatePhysics();

      // Check scoring
      this.checkScoring();
    }

    private updatePhysics() {
      const state = runtime.getState();
      if (!this.ball?.body) return;

      const speed = 300;
      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

      // Apply input to paddles
      const inputs = state.inputs || {};
      for (const [playerId, input] of Object.entries(inputs)) {
        const paddle = this.spriteManager.get(`paddle-${playerId}`);
        if (!paddle?.body) continue;

        const paddleBody = paddle.body as Phaser.Physics.Arcade.Body;
        if (input.up) {
          paddleBody.setVelocityY(-speed);
        } else if (input.down) {
          paddleBody.setVelocityY(speed);
        } else {
          paddleBody.setVelocityY(0);
        }

        // Update state with new position
        state.players[playerId].y = paddle.y;
      }

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

      if (this.ball.x < -10) {
        const rightPlayer = Object.entries(state.players).find(
          ([_, data]: any) => data.side === 'right'
        );
        if (rightPlayer) {
          runtime.submitAction('score', undefined, rightPlayer[0]);
          this.resetBall();
        }
      } else if (this.ball.x > 810) {
        const leftPlayer = Object.entries(state.players).find(
          ([_, data]: any) => data.side === 'left'
        );
        if (leftPlayer) {
          runtime.submitAction('score', undefined, leftPlayer[0]);
          this.resetBall();
        }
      }
    }

    private resetBall() {
      setTimeout(() => {
        const state = runtime.getState();
        this.ball.setPosition(state.ball.x, state.ball.y);
        (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(
          state.ball.velocityX,
          state.ball.velocityY
        );
      }, 10);
    }
  };
}
```

**What Helpers Do:**
- **SpriteManager**: Automatically syncs paddle positions between host and clients
- **InputManager**: Handles keyboard input with preset profiles (platformer = up/down keys)
- **HUD**: Displays scores and player information automatically

{/snippet}

{#snippet core()}

## Using Core Primitives

```typescript
import Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

export function createPaddleBattleScene(runtime: GameRuntime, isHost: boolean) {
  return class PaddleBattleScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private paddles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
    private ball!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: any;
    private scoreText!: Phaser.GameObjects.Text;

    constructor() {
      super({ key: 'PaddleBattle' });
    }

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

      // Center line
      for (let i = 0; i < 600; i += 20) {
        this.add.rectangle(400, i + 10, 4, 10, 0x444444);
      }

      // Manual input setup
      this.cursors = this.input.keyboard!.createCursorKeys();
      this.wasd = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
      });

      // Manual HUD
      this.scoreText = this.add.text(400, 30, 'Waiting...', {
        fontSize: '24px',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.scoreText.setScrollFactor(0);

      // HOST: Create ball with physics
      if (isHost) {
        const state = runtime.getState();
        this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
        this.physics.add.existing(this.ball);

        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setBounce(1, 1);
        ballBody.setCollideWorldBounds(false);
        ballBody.setVelocity(state.ball.velocityX, state.ball.velocityY);

        // Track ball for clients
        this.adapter.trackSprite(this.ball, 'ball');

        // Create initial paddles
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.createPaddle(playerId, playerData);
        }
      } else {
        // CLIENT: Listen for ball data
        this.adapter.onChange((state: any) => {
          if (!state._sprites?.ball) return;
          if (this.ball) return;

          const data = state._sprites.ball;
          this.ball = this.add.circle(data.x || 400, data.y || 300, 10, 0xff6b6b);
          this.adapter.registerRemoteSprite('ball', this.ball);
        });

        // CLIENT: Listen for player data
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.createPaddle(playerId, playerData);
        }
      }

      // Listen for state changes (both host and client)
      this.adapter.onChange((state: any) => {
        // Update HUD
        const scores = Object.entries(state.players)
          .map(([_, p]: any) => `${p.side}: ${p.score}`)
          .join('  |  ');
        this.scoreText.setText(scores);

        // Update paddle positions
        for (const [playerId, playerData] of Object.entries(state.players)) {
          const paddle = this.paddles.get(playerId);
          if (paddle) {
            paddle.y = playerData.y;
          } else {
            this.createPaddle(playerId, playerData);
          }
        }
      });
    }

    private createPaddle(playerId: string, playerData: any) {
      const x = playerData.side === 'left' ? 50 : 750;
      const paddle = this.add.rectangle(x, playerData.y, 15, 100, 0xffffff);

      if (isHost) {
        this.physics.add.existing(paddle);
        const body = paddle.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setImmovable(true);

        // Add collision with ball
        if (this.ball) {
          this.physics.add.collider(this.ball, paddle);
        }
      }

      this.paddles.set(playerId, paddle);
    }

    update() {
      if (!isHost) return; // Clients don't run physics

      const state = runtime.getState();

      // Manual input capture
      const up = this.cursors.up.isDown || this.wasd.up.isDown;
      const down = this.cursors.down.isDown || this.wasd.down.isDown;

      runtime.submitAction('move', { up, down });

      // Update physics
      this.updatePhysics();

      // Check scoring
      this.checkScoring();
    }

    private updatePhysics() {
      const state = runtime.getState();
      const speed = 300;

      // Apply input to paddles
      for (const [playerId, input] of Object.entries(state.inputs || {})) {
        const paddle = this.paddles.get(playerId);
        if (!paddle?.body) continue;

        const body = paddle.body as Phaser.Physics.Arcade.Body;
        if (input.up) {
          body.setVelocityY(-speed);
        } else if (input.down) {
          body.setVelocityY(speed);
        } else {
          body.setVelocityY(0);
        }

        // Update state
        state.players[playerId].y = paddle.y;
      }

      // Update ball state
      if (this.ball?.body) {
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        state.ball.x = this.ball.x;
        state.ball.y = this.ball.y;
        state.ball.velocityX = ballBody.velocity.x;
        state.ball.velocityY = ballBody.velocity.y;

        // Manual bounce
        if (this.ball.y <= 10 || this.ball.y >= 590) {
          ballBody.setVelocityY(-ballBody.velocity.y);
        }
      }
    }

    private checkScoring() {
      const state = runtime.getState();

      if (this.ball.x < -10) {
        const rightPlayer = Object.entries(state.players).find(
          ([_, data]: any) => data.side === 'right'
        );
        if (rightPlayer) {
          runtime.submitAction('score', undefined, rightPlayer[0]);
          this.resetBall();
        }
      } else if (this.ball.x > 810) {
        const leftPlayer = Object.entries(state.players).find(
          ([_, data]: any) => data.side === 'left'
        );
        if (leftPlayer) {
          runtime.submitAction('score', undefined, leftPlayer[0]);
          this.resetBall();
        }
      }
    }

    private resetBall() {
      setTimeout(() => {
        const state = runtime.getState();
        this.ball.setPosition(state.ball.x, state.ball.y);
        (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(
          state.ball.velocityX,
          state.ball.velocityY
        );
      }, 10);
    }
  };
}
```

**Manual Implementation Details:**
- Explicit sprite creation and management
- Manual keyboard input handling
- Custom HUD with text updates
- Direct state change listeners

{/snippet}
</CodeTabs>

---

## How It Works

### The Multiplayer Flow

```
1. Player presses W
   ↓
2. Input captured (InputManager or manual)
   ↓
3. runtime.submitAction('move', { up: true })
   ↓
4. Action sent to host, applies to state
   ↓
5. state.inputs[playerId] = { up: true }
   ↓
6. Host's updatePhysics() reads state.inputs
   ↓
7. paddleBody.setVelocityY(-speed) applies physics
   ↓
8. SpriteManager/adapter tracks new position
   ↓
9. Host broadcasts state diff to all clients
   ↓
10. Clients receive diff and update their sprites
   ↓
11. Smooth interpolation displays movement
```

---

## Next: Initialize & Test

Now we'll wire everything together and test the game!

👉 Continue to [Part 3: Running Your Game](/docs/latest/getting-started/first-game/03-finishing)
