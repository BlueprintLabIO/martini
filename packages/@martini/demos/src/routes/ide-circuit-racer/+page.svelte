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
import { PhaserAdapter, createSpeedDisplay, attachDirectionalIndicator } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class CircuitRacerScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private physicsManager: any;
		private inputManager: any;
		private speedDisplay: any;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background - racing track
			this.add.rectangle(400, 300, 800, 600, 0x228b22);
			this.add.rectangle(400, 300, 600, 400, 0x808080);

			// Title
			this.add.text(400, 20, 'Circuit Racer - Pit of Success Demo!', {
				fontSize: '28px',
				color: '#fff',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			// SpriteManager for cars with directional indicator!
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					// Create car body
					const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);
					return car;
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
				},

				// NEW: onAdd hook - uses attachDirectionalIndicator helper!
				onAdd: (sprite: any, key: string) => {
					// One-liner! No rotation offset math needed!
					sprite.directionArrow = attachDirectionalIndicator(this, sprite, {
						shape: 'triangle',
						offset: 20,
						color: 0xffffff
					});

					// Store update function on sprite
					(sprite as any)._updateArrow = () => sprite.directionArrow?.update();
				}
			});

			// InputManager with top-down profile
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.useProfile('topDown');

			// NEW: Racing PhysicsManager - replaces 35 lines of manual physics!
			this.physicsManager = this.adapter.createPhysicsManager({
				spriteManager: this.spriteManager,
				inputKey: 'inputs'
			});
			this.physicsManager.addBehavior('racing', {
				acceleration: 5,
				maxSpeed: 300,
				turnSpeed: 0.05,
				friction: 0.98
			});

			// NEW: Reactive speed display - auto-updates when velocity changes!
			// No manual update() needed - it subscribes to PhysicsManager events!
			this.speedDisplay = createSpeedDisplay(this.physicsManager, this.adapter, this, {
				position: { x: 400, y: 55 },
				format: (velocity) => \`Speed: \${Math.round(velocity)} mph\`,
				style: { fontSize: '20px', color: '#4a9eff' }
			});

			// Controls hint
			this.add.text(400, 85, 'Arrow Keys: Steer & Accelerate', {
				fontSize: '14px',
				color: '#aaa'
			}).setOrigin(0.5);

			// HOST: Create initial players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}
			}
		}

		update() {
			// HOST: Check for new players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}
			}

			// Update directional arrows
			for (const sprite of this.spriteManager.getAll().values()) {
				if ((sprite as any)._updateArrow) {
					(sprite as any)._updateArrow();
				}
			}

			// InputManager captures keyboard
			this.inputManager.update();

			// SpriteManager handles interpolation
			this.spriteManager.update();

			// NEW: PhysicsManager handles ALL racing physics automatically!
			this.physicsManager.update();

			// No speedDisplay.update() needed - it's reactive!
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
		<h1>Circuit Racer - Pit of Success Demo</h1>
		<p>
			Showcasing <strong>event-driven architecture</strong>: <code>createSpeedDisplay</code> auto-updates via <code>PhysicsManager.onVelocityChange</code>,
			and <code>attachDirectionalIndicator</code> handles Phaser rotation conventions automatically. No manual update() calls, no rotation offset bugs!
		</p>
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

	header strong {
		color: #4a9eff;
	}

	.ide-container {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
</style>
