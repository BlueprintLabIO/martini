<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Paddle Battle - Classic multiplayer Pong
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

// PlayerManager - ensures both players spawn correctly
const playerManager = createPlayerManager({
	factory: (playerId, index) => ({
		y: 250,
		score: 0,
		side: index === 0 ? 'left' : 'right'
	})
});

export const game = defineGame({
	setup: ({ playerIds }) => ({
		players: playerManager.initialize(playerIds),
		ball: {
			x: 400,
			y: 300,
			velocityX: 200,
			velocityY: 150
		},
		inputs: {},
		gameStarted: false
	}),

	actions: {
		// createInputAction - uses targetId correctly
		move: createInputAction('inputs'),

		score: {
			apply: (state, context) => {
				const player = state.players[context.targetId];
				if (!player) return;

				player.score += 1;

				// Reset ball
				state.ball.x = 400;
				state.ball.y = 300;
				state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
				state.ball.velocityY = 150 * (Math.random() > 0.5 ? 1 : -1);
			}
		},

		startGame: {
			apply: (state) => {
				state.gameStarted = true;
			}
		}
	},

	onPlayerJoin: (state, playerId) => {
		playerManager.handleJoin(state.players, playerId);
	},

	onPlayerLeave: (state, playerId) => {
		playerManager.handleLeave(state.players, playerId);
	}
});
`,

			'/src/scene.ts': `import type { GameRuntime } from '@martini/core';
import { PhaserAdapter, createPlayerHUD, CollisionManager, PlayerUIManager } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class PaddleBattleScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private inputManager: any;
		private collisionManager!: CollisionManager;
		private playerUI!: PlayerUIManager;
		private hud: any;
		private ball?: Phaser.GameObjects.Arc;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

			// Center line
			for (let i = 0; i < 600; i += 20) {
				this.add.rectangle(400, i + 10, 4, 10, 0x444444);
			}

			// HUD Helper
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Paddle Battle',
				titleStyle: { fontSize: '24px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					return \`\${myPlayer.side === 'left' ? 'Left' : 'Right'} Paddle\`;
				},
				roleStyle: { fontSize: '16px', color: '#fff' },

				controlHints: () => 'UP/DOWN Arrows to Move',
				controlsStyle: { fontSize: '14px', color: '#aaa' },

				layout: {
					title: { x: 400, y: 15 },
					role: { x: 400, y: 45 },
					controls: { x: 400, y: 575 }
				}
			});

			// SpriteManager for paddles (host-authoritative by default!)
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['side'],

				onCreate: (key: string, data: any) => {
					const x = data.side === 'left' ? 30 : 770;
					return this.add.rectangle(x, data.y, 15, 80, 0xffffff);
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setImmovable(true);
					body.setCollideWorldBounds(true);
				}
			});

			// PlayerUIManager - Handles scores for ALL players automatically!
			// Waits for 'side' metadata before creating, preventing overlap bug
			this.playerUI = this.adapter.createPlayerUIManager({
				score: {
					position: (player: any) => ({
						x: player.side === 'left' ? 200 : 600,
						y: 80
					}),
					getText: (player: any) => String(player.score || 0),
					style: { fontSize: '48px', color: '#ffffff' },
					origin: 0.5,
					requiredMetadata: ['side'] // Wait for 'side' before creating!
				}
			});

			// InputManager with top-down profile
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.useProfile('topDown');

			// HOST ONLY: Create game objects
			if (this.adapter.isHost()) {
				const initialState = runtime.getState();

				// Create paddles (host-authoritative!)
				for (const [playerId, playerData] of Object.entries(initialState.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}

				// Create ball - NO world bounds collision (we handle manually)
				this.ball = this.add.circle(initialState.ball.x, initialState.ball.y, 10, 0xff6b6b);
				this.physics.add.existing(this.ball);
				const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
				ballBody.setBounce(1, 1);
				ballBody.setCollideWorldBounds(false); // Disable - we check manually
				ballBody.setVelocity(initialState.ball.velocityX, initialState.ball.velocityY);

				// Track ball for sync
				this.adapter.trackSprite(this.ball, 'ball');

				// CollisionManager - Declare collision rules ONCE
				// Automatically handles collisions for ALL paddles (early and late-joining!)
				this.collisionManager = this.adapter.createCollisionManager();
				this.collisionManager.registerSprite('ball', this.ball);
				this.collisionManager.addCollision('ball', this.spriteManager);
			}

			// CLIENT: Create ball sprite when it appears in state
			this.adapter.onChange((state: any) => {
				if (!this.adapter.isHost() && !this.ball && state._sprites?.ball) {
					this.ball = this.add.circle(state._sprites.ball.x, state._sprites.ball.y, 10, 0xff6b6b);
					this.adapter.registerRemoteSprite('ball', this.ball);
				}
			});
		}

		update() {
			// HOST: Update game logic
			if (this.adapter.isHost()) {
				const state = runtime.getState();

				// Check for new players
				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}

				// Update paddle positions based on input
				const inputs = state.inputs || {};
				for (const [playerId, input] of Object.entries(inputs) as [string, any][]) {
					const paddle = this.spriteManager.get(\`player-\${playerId}\`);
					if (!paddle?.body) continue;

					const body = paddle.body as Phaser.Physics.Arcade.Body;
					const speed = 300;

					if (input.up) {
						body.setVelocityY(-speed);
					} else if (input.down) {
						body.setVelocityY(speed);
					} else {
						body.setVelocityY(0);
					}

					// Update state with paddle position
					state.players[playerId].y = paddle.y;
				}

				// Ball physics and scoring
				if (this.ball) {
					const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

					// Update ball state
					state.ball.x = this.ball.x;
					state.ball.y = this.ball.y;
					state.ball.velocityX = ballBody.velocity.x;
					state.ball.velocityY = ballBody.velocity.y;

					// Manual top/bottom bounce (since we disabled world bounds)
					if (this.ball.y <= 10) {
						this.ball.y = 10;
						ballBody.setVelocityY(Math.abs(ballBody.velocity.y));
					} else if (this.ball.y >= 590) {
						this.ball.y = 590;
						ballBody.setVelocityY(-Math.abs(ballBody.velocity.y));
					}

					// Check for scoring (ball goes past edges)
					if (this.ball.x < -10) {
						// Right player scores
						const rightPlayer = Object.entries(state.players).find(
							([, p]: [string, any]) => p.side === 'right'
						);
						if (rightPlayer) {
							runtime.submitAction('score', undefined, rightPlayer[0]);
							// Immediately reset ball position to prevent multiple score triggers
							this.ball.setPosition(400, 300);
							// Wait for state update, then set velocity
							setTimeout(() => {
								const newState = runtime.getState();
								ballBody.setVelocity(newState.ball.velocityX, newState.ball.velocityY);
							}, 10);
						}
					} else if (this.ball.x > 810) {
						// Left player scores
						const leftPlayer = Object.entries(state.players).find(
							([, p]: [string, any]) => p.side === 'left'
						);
						if (leftPlayer) {
							runtime.submitAction('score', undefined, leftPlayer[0]);
							// Immediately reset ball position to prevent multiple score triggers
							this.ball.setPosition(400, 300);
							// Wait for state update, then set velocity
							setTimeout(() => {
								const newState = runtime.getState();
								ballBody.setVelocity(newState.ball.velocityX, newState.ball.velocityY);
							}, 10);
						}
					}
				}
			}

			// InputManager captures keyboard
			this.inputManager.update();

			// SpriteManager handles interpolation
			this.spriteManager.update();

			// CLIENT: Interpolate ball movement
			if (!this.adapter.isHost()) {
				this.adapter.updateInterpolation();
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
		},
		engine: 'phaser',
		transport: { type: 'iframe-bridge' },
		layout: 'dual'
	};
</script>

<div class="demo-page">
	<header>
		<h1>Paddle Battle - Multiplayer Pong</h1>
		<p>Classic Pong reimagined for multiplayer. First to 5 points wins!</p>
	</header>

	<div class="ide-container">
		<MartiniIDE {config} />
	</div>
</div>

<style>
	.demo-page {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
		color: #fff;
	}

	header {
		padding: 1.5rem;
		text-align: center;
		background: linear-gradient(180deg, #1e1e1e 0%, #0a0a0a 100%);
		border-bottom: 1px solid #333;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
	}

	header p {
		margin: 0;
		color: #888;
		font-size: 1.125rem;
	}

	.ide-container {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
</style>
