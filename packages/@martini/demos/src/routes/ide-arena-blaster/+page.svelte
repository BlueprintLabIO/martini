<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Arena Blaster - Top-down shooter
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

// PlayerManager for arena fighters
const playerManager = createPlayerManager({
	factory: (playerId, index) => ({
		x: 200 + index * 400,
		y: 300,
		health: 100,
		color: index === 0 ? 0xff3300 : 0x3300ff
	})
});

export const game = defineGame({
	setup: ({ playerIds }) => ({
		players: playerManager.initialize(playerIds),
		inputs: {},
		bullets: []
	}),

	actions: {
		// createInputAction for movement
		move: createInputAction('inputs'),

		shoot: {
			apply: (state, context, input) => {
				const player = state.players[context.targetId];
				if (!player) return;

				// Add bullet to state
				state.bullets.push({
					id: \`\${context.targetId}-\${Date.now()}\`,
					x: player.x,
					y: player.y,
					velocityX: input.dirX * 400,
					velocityY: input.dirY * 400,
					ownerId: context.targetId
				});
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
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class ArenaBlasterScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private inputManager: any;
		private physicsManager: any;
		private hud: any;
		private bullets: Map<string, Phaser.GameObjects.Arc> = new Map();

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x2d3748);

			// HUD Helper
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Arena Blaster',
				titleStyle: { fontSize: '32px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					return \`Health: \${myPlayer.health}\`;
				},
				roleStyle: { fontSize: '18px', color: '#fff' },

				controlHints: () => 'WASD: Move | Arrow Keys: Shoot',
				controlsStyle: { fontSize: '14px', color: '#aaa' }
			});

			// SpriteManager for players
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					return this.add.circle(data.x, data.y, 20, data.color);
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
				}
			});

			// InputManager with twin-stick profile
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.useProfile('twinStick');

			// PhysicsManager for top-down movement
			this.physicsManager = this.adapter.createPhysicsManager({
				spriteManager: this.spriteManager,
				inputKey: 'inputs'
			});
			this.physicsManager.addBehavior('topDown', { speed: 200 });

			// Shooting input (arrow keys)
			this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
				const dirs: Record<string, {x: number, y: number}> = {
					'ArrowUp': { x: 0, y: -1 },
					'ArrowDown': { x: 0, y: 1 },
					'ArrowLeft': { x: -1, y: 0 },
					'ArrowRight': { x: 1, y: 0 }
				};

				const dir = dirs[event.code];
				if (dir) {
					runtime.submitAction('shoot', { dirX: dir.x, dirY: dir.y });
				}
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
			// HOST: Check for new players
			if (this.adapter.isHost()) {
				const state = runtime.getState();

				for (const [playerId, playerData] of Object.entries(state.players)) {
					const spriteKey = \`player-\${playerId}\`;
					if (!this.spriteManager.get(spriteKey)) {
						this.spriteManager.add(spriteKey, playerData);
					}
				}

				// Update bullets
				for (const bullet of state.bullets) {
					if (!this.bullets.has(bullet.id)) {
						const sprite = this.add.circle(bullet.x, bullet.y, 4, 0xffff00);
						this.bullets.set(bullet.id, sprite);
					} else {
						const sprite = this.bullets.get(bullet.id)!;
						sprite.x += bullet.velocityX * 0.016;
						sprite.y += bullet.velocityY * 0.016;

						// Remove off-screen bullets
						if (sprite.x < 0 || sprite.x > 800 || sprite.y < 0 || sprite.y > 600) {
							sprite.destroy();
							this.bullets.delete(bullet.id);
							state.bullets = state.bullets.filter(b => b.id !== bullet.id);
						}
					}
				}
			}

			// InputManager captures keyboard
			this.inputManager.update();

			// SpriteManager handles interpolation
			this.spriteManager.update();

			// PhysicsManager handles movement
			this.physicsManager.update();
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
    backgroundColor: '#2d3748'
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
		<h1>Arena Blaster - Top-Down Shooter</h1>
		<p>Twin-stick shooter action! WASD to move, Arrow keys to shoot.</p>
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
