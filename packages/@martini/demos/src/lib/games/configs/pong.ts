import type { MartiniIDEConfig } from '@martini/ide';

// Pong starter - classic Pong game for learning multiplayer basics
const config: MartiniIDEConfig = {
	engine: 'phaser',
	transport: { type: 'local' },
	files: {
		'/src/game.ts': `import { defineGame } from '@martini/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          y: 300,
          score: 0,
          side: index === 0 ? 'left' : 'right'
        }
      ])
    ),
    ball: { x: 400, y: 300, velocityX: 200, velocityY: 150 },
    inputs: {}
  }),

  actions: {
    move: {
      apply: (state, context, input: any) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      }
    },

    score: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (player) {
          player.score += 1;
          state.ball.x = 400;
          state.ball.y = 300;
          state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
          state.ball.velocityY = 150 * (Math.random() > 0.5 ? 1 : -1);
        }
      }
    }
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      y: 300,
      score: 0,
      side: index === 0 ? 'left' : 'right'
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
`,

		'/src/scene.ts': `import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';

export function createScene(runtime: GameRuntime) {
  return class PongScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private spriteManager: any;
    private inputManager: any;
    private ball!: Phaser.GameObjects.Arc;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

      // Center line
      for (let i = 0; i < 600; i += 20) {
        this.add.rectangle(400, i + 10, 4, 10, 0x444444);
      }

      // SpriteManager for paddles
      this.spriteManager = this.adapter.createSpriteManager({
        onCreate: (key: string, data: any) => {
          const x = data.side === 'left' ? 50 : 750;
          return this.add.rectangle(x, data.y, 15, 100, 0xffffff);
        },
        onCreatePhysics: (sprite: any) => {
          this.physics.add.existing(sprite);
          sprite.body.setImmovable(true);
          sprite.body.setCollideWorldBounds(true);
        }
      });

      // Input
      this.inputManager = this.adapter.createInputManager();
      this.inputManager.useProfile('platformer');

      // HUD
      createPlayerHUD(this.adapter, this, {
        title: 'Pong',
        stats: (state: any) => {
          const scores = Object.entries(state.players)
            .map(([_, p]: any) => \`\${p.side}: \${p.score}\`)
            .join('   |   ');
          return scores;
        },
        controlHints: () => 'W/S or ↑/↓ to Move'
      });

      // Create ball (host only)
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
        this.physics.add.existing(this.ball);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setBounce(1, 1);
        ballBody.setVelocity(state.ball.velocityX, state.ball.velocityY);
        this.adapter.trackSprite(this.ball, 'ball');

        // Collisions
        for (const paddle of Object.values(this.spriteManager.group.getChildren())) {
          this.physics.add.collider(this.ball, paddle as any);
        }

        // Create players
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.spriteManager.add(\`paddle-\${playerId}\`, playerData);
        }
      } else {
        // Client: receive ball updates
        this.adapter.onChange((state: any) => {
          if (!state._sprites?.ball || this.ball) return;
          const data = state._sprites.ball;
          this.ball = this.add.circle(data.x || 400, data.y || 300, 10, 0xff6b6b);
          this.adapter.registerRemoteSprite('ball', this.ball);
        });
      }
    }

    update() {
      // New players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          const key = \`paddle-\${playerId}\`;
          if (!this.spriteManager.get(key)) {
            this.spriteManager.add(key, playerData);
          }
        }
      }

      this.spriteManager.update();

      if (!this.adapter.isHost()) {
        this.adapter.updateInterpolation();
        return;
      }

      // Host: input handling
      this.inputManager.update();
      const input = this.inputManager.getState();
      runtime.submitAction('move', { up: input.move.up, down: input.move.down });

      // Host: physics
      const state = runtime.getState();
      const speed = 300;
      for (const [playerId, playerInput] of Object.entries(state.inputs)) {
        const paddle = this.spriteManager.get(\`paddle-\${playerId}\`);
        if (!paddle?.body) continue;

        const body = paddle.body as Phaser.Physics.Arcade.Body;
        if (playerInput.up) {
          body.setVelocityY(-speed);
        } else if (playerInput.down) {
          body.setVelocityY(speed);
        } else {
          body.setVelocityY(0);
        }

        state.players[playerId].y = paddle.y;
      }

      // Ball physics
      if (this.ball?.body) {
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        state.ball.x = this.ball.x;
        state.ball.y = this.ball.y;
        state.ball.velocityX = ballBody.velocity.x;
        state.ball.velocityY = ballBody.velocity.y;

        if (this.ball.y <= 10) {
          this.ball.y = 10;
          ballBody.setVelocityY(Math.abs(ballBody.velocity.y));
        } else if (this.ball.y >= 590) {
          this.ball.y = 590;
          ballBody.setVelocityY(-Math.abs(ballBody.velocity.y));
        }

        // Scoring
        if (this.ball.x < -10) {
          const rightPlayer = Object.entries(state.players).find(
            ([_, p]: any) => p.side === 'right'
          );
          if (rightPlayer) {
            runtime.submitAction('score', undefined, rightPlayer[0]);
          }
        } else if (this.ball.x > 810) {
          const leftPlayer = Object.entries(state.players).find(
            ([_, p]: any) => p.side === 'left'
          );
          if (leftPlayer) {
            runtime.submitAction('score', undefined, leftPlayer[0]);
          }
        }
      }
    }
  };
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    backgroundColor: '#1a1a2e'
  }
});
`
	}
};

export default config;
