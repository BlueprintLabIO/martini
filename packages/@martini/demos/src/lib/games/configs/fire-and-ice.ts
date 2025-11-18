import type { MartiniIDEConfig } from '@martini/ide';

// Fire & Ice cooperative platformer game (restored from the legacy preview source)
const config: MartiniIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

// Phase 1: PlayerManager - prevents setup/join divergence bugs
const playerManager = createPlayerManager({
	factory: (playerId, index) => ({
		x: index === 0 ? 200 : 600,
		y: 400,
		role: index === 0 ? 'fire' : 'ice'
	}),
	roles: ['fire', 'ice']
});

export const game = defineGame({
	setup: ({ playerIds }) => ({
		players: playerManager.initialize(playerIds),
		inputs: {}
	}),

	actions: {
		// Phase 1: createInputAction helper (uses targetId correctly)
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
	return class FireAndIceScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private platform?: Phaser.Physics.Arcade.StaticGroup;
		private spriteManager: any;
		private physicsManager: any;
		private inputManager: any;
		private hud: any;

		create() {
			// Initialize adapter
			this.adapter = new PhaserAdapter(runtime, this);

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

			// NEW: HUD Helper - replaces 48 lines of manual HUD code!
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Fire & Ice - Cooperative Platformer',

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					const role = myPlayer.role === 'fire' ? 'Fire Player' : 'Ice Player';
					return \`You are: \${role}\`;
				},

				controlHints: (myPlayer: any) => {
					if (!myPlayer) return '';
					return 'Arrow Keys + SPACE to Jump';
				}
			});

			// Create platform
			this.platform = this.physics.add.staticGroup();
			this.platform.add(this.add.rectangle(400, 550, 600, 20, 0x8b4513));

			// Additional platforms for fun
			this.platform.add(this.add.rectangle(200, 450, 150, 15, 0x8b4513));
			this.platform.add(this.add.rectangle(600, 400, 150, 15, 0x8b4513));
			this.platform.add(this.add.rectangle(400, 300, 200, 15, 0x8b4513));

			// NEW: SpriteManager with staticProperties + built-in labels
			this.spriteManager = this.adapter.createSpriteManager({
				// Static metadata (synced once, not every frame)
				staticProperties: ['role'],

				// Built-in label support (no manual tracking needed!)
				label: {
					getText: (data: any) => data.role === 'fire' ? 'Fire' : 'Ice',
					offset: { y: -30 },
					style: {
						fontSize: '12px',
						color: '#fff',
						backgroundColor: '#000',
						padding: { x: 4, y: 2 }
					}
				},

				onCreate: (key: string, data: any) => {
					// data.role is available from staticProperties (no hacks needed!)
					const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
					return this.add.circle(data.x, data.y, 20, color);
				},

				// DEFENSE IN DEPTH: Update sprite color if role changes
				// With Fix #1 (metadata buffering), this should never be needed,
				// but it's good practice for properties that might change dynamically.
				onUpdate: (sprite: any, data: any) => {
					const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
					if (sprite.fillColor !== color) {
						sprite.setFillStyle(color);
					}
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
					body.setBounce(0.2);
					// Note: Platform collisions are set up below using the group
				}
			});

			// NEW: Group-first collision approach!
			// Single collider handles ALL players (early and late-joining)
			// No need to add colliders in onCreatePhysics - the group handles it
			if (this.adapter.isHost()) {
				this.physics.add.collider(this.spriteManager.group, this.platform!);
			}

			// Phase 2: Use Input Profile - 1 line instead of 5!
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.useProfile('platformer');

			// Phase 3: PhysicsManager - automates all physics!
			this.physicsManager = this.adapter.createPhysicsManager({
				spriteManager: this.spriteManager,
				inputKey: 'inputs'
			});
			this.physicsManager.addBehavior('platformer', {
				speed: 200,
				jumpPower: 350
			});

			// HOST: Create initial players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}
			}
		}

		update() {
			// HOST: Check if new players need sprites created
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}
			}

			// InputManager captures keyboard input
			this.inputManager.update();

			// SpriteManager handles interpolation + label positioning automatically!
			this.spriteManager.update();

			// PhysicsManager handles all physics automatically!
			this.physicsManager.update();
		}
	};
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini/phaser';
import { game } from './game';
import { createScene } from './scene';

// Initialize game - transport is handled automatically by the platform
initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 400 },
        debug: false
      }
    },
    backgroundColor: '#87ceeb'
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
