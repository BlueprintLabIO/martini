import type { martini-kitIDEConfig } from '@martini-kit/ide';

// Circuit Racer - Top-down racing game (restored from the legacy preview source)
const config: martini-kitIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini-kit/core';

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

		'/src/scene.ts': `import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter, createSpeedDisplay, attachDirectionalIndicator } from '@martini-kit/phaser';
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

					// Attach directional indicator - auto-updates by default!
					// No manual update() calls needed - it "just works"!
					attachDirectionalIndicator(this, car, {
						shape: 'triangle',
						offset: 20,
						color: 0xffffff
						// autoUpdate: true (default) - uses scene events for automatic updates
					});

					return car;
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

			// HOST: Spawn cars for existing players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}
			}
		}

		update() {
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}
			}

			this.inputManager.update();
			this.physicsManager.update();
			this.spriteManager.update();
		}
	};
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini-kit/phaser';
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
    backgroundColor: '#0c1f0c'
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
