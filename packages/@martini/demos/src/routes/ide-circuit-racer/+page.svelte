<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Circuit Racer - Top-down racing game
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

// PlayerManager for racers
const playerManager = createPlayerManager({
	factory: (playerId, index) => ({
		x: 100 + index * 100,
		y: 300,
		rotation: 0,
		speed: 0,
		color: index === 0 ? 0xff0000 : 0x0000ff
	})
});

export const game = defineGame({
	setup: ({ playerIds }) => ({
		players: playerManager.initialize(playerIds),
		inputs: {}
	}),

	actions: {
		// createInputAction - auto-stores input per player
		move: createInputAction('inputs')
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
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class CircuitRacerScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private inputManager: any;
		private hud: any;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background - racing track
			this.add.rectangle(400, 300, 800, 600, 0x228b22);
			this.add.rectangle(400, 300, 600, 400, 0x808080);

			// HUD Helper
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Circuit Racer',
				titleStyle: { fontSize: '32px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					return \`Speed: \${Math.round(myPlayer.speed || 0)}\`;
				},
				roleStyle: { fontSize: '18px', color: '#fff' },

				controlHints: () => 'Arrow Keys: Steer & Accelerate',
				controlsStyle: { fontSize: '14px', color: '#aaa' }
			});

			// SpriteManager for cars
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					return this.add.rectangle(data.x, data.y, 30, 20, data.color);
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
				}
			});

			// InputManager with top-down profile
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.useProfile('topDown');

			// HOST: Create initial players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}
			}
		}

		update() {
			// HOST: Apply physics
			if (this.adapter.isHost()) {
				const state = runtime.getState();

				// Check for new players
				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}

				// Apply car physics based on input
				const inputs = state.inputs || {};
				for (const [playerId, input] of Object.entries(inputs) as [string, any][]) {
					const car = this.spriteManager.get(\`player-\${playerId}\`);
					const player = state.players[playerId];
					if (!car?.body || !player) continue;

					const body = car.body as Phaser.Physics.Arcade.Body;
					const maxSpeed = 300;
					const acceleration = 5;
					const turnSpeed = 3;

					// Accelerate/brake
					if (input.up) {
						player.speed = Math.min(player.speed + acceleration, maxSpeed);
					} else if (input.down) {
						player.speed = Math.max(player.speed - acceleration, -maxSpeed / 2);
					} else {
						player.speed *= 0.98; // Friction
					}

					// Turn
					if (input.left) {
						player.rotation -= turnSpeed * (Math.PI / 180);
					} else if (input.right) {
						player.rotation += turnSpeed * (Math.PI / 180);
					}

					// Apply movement
					body.setVelocity(
						Math.cos(player.rotation - Math.PI / 2) * player.speed,
						Math.sin(player.rotation - Math.PI / 2) * player.speed
					);
					car.rotation = player.rotation;
				}
			}

			// InputManager captures keyboard
			this.inputManager.update();

			// SpriteManager handles interpolation
			this.spriteManager.update();
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
    backgroundColor: '#228b22'
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
		<h1>Circuit Racer - Multiplayer Racing</h1>
		<p>Race against your friends on the circuit! Use arrow keys to drive.</p>
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
