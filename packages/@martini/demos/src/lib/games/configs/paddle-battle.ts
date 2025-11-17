import type { MartiniIDEConfig } from '@martini/ide';

// Paddle Battle - Classic multiplayer Pong (restored from the legacy preview source)
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

		private addHostPaddle(playerId: string, playerData: any) {
			if (!this.adapter.isHost()) return;

			const spriteKey = 'player-' + playerId;
			if (!this.spriteManager.get(spriteKey)) {
				this.spriteManager.add(spriteKey, playerData);
			}
		}

		create() {
			this.adapter = new PhaserAdapter(runtime, this);
			(this as any).debugLog = (event: string, payload?: any) => {
				const role = this.adapter.isHost() ? 'HOST' : 'CLIENT';
				console.log('[PaddleBattle][' + role + '] ' + event, payload ?? '');
			};

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
				staticProperties: ['side', 'y'],

				onCreate: (key: string, data: any) => {
					(this as any).debugLog?.('spriteManager.onCreate', { key, data });
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
					this.addHostPaddle(playerId, playerData);
				}
				// Create ball - NO world bounds collision (we handle manually)
				this.ball = this.add.circle(initialState.ball.x, initialState.ball.y, 10, 0xff6b6b);
				this.physics.add.existing(this.ball);
				const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
				ballBody.setBounce(1, 1);
				ballBody.setCollideWorldBounds(false); // Disable - we check manually
				ballBody.setVelocity(initialState.ball.velocityX, initialState.ball.velocityY);

				// CollisionManager - Declare collision rules ONCE
				// Automatically handles collisions for ALL paddles (early and late-joining!)
				this.collisionManager = this.adapter.createCollisionManager();
				this.collisionManager.registerSprite('ball', this.ball);
				this.collisionManager.addCollision('ball', this.spriteManager);
			}

			// CLIENT: Mirror ball using state (no sprite manager entry)
			this.adapter.onChange((state: any) => {
				if (this.adapter.isHost()) return;
				if (!state.ball) return;

				if (!this.ball) {
					this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
				} else {
					this.ball.setPosition(state.ball.x, state.ball.y);
				}
			});
		}

		update() {
			const state = runtime.getState();

			// HOST: Keep paddles synced
			if (this.adapter.isHost()) {
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.addHostPaddle(playerId, playerData);
				}
			}

			// Input handling (auto-sends move actions via profile)
			this.inputManager.update();

			// Sprite interpolation
			this.spriteManager.update();

			// HOST ONLY - Ball physics + scoring
			if (this.adapter.isHost() && this.ball) {
				const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

				// Manual world bounds checks for scoring (no duplicates)
				if (this.ball.x < 0) {
					runtime.submitAction('score', {}, { targetId: Object.keys(state.players)[1] });
				} else if (this.ball.x > 800) {
					runtime.submitAction('score', {}, { targetId: Object.keys(state.players)[0] });
				}

				// Simple AI bounce (reverse horizontal velocity on paddle hit)
				this.physics.world.collide(this.ball, this.spriteManager.group, () => {
					ballBody.setVelocityX(-ballBody.velocity.x);
				});
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
    backgroundColor: '#0f172a'
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
