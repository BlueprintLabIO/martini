<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Blob Battle - Agar.io-style multiplayer
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame, createPlayerManager, createTickAction } from '@martini/core';

const WORLD_SIZE = { width: 800, height: 600 };
const BASE_SIZE = 20;
const MOVE_SPEED = 2;

// PlayerManager with random spawn positions
const playerManager = createPlayerManager({
	factory: (playerId, index, random) => ({
		x: 100 + index * 300,
		y: 300,
		targetX: 100 + index * 300,
		targetY: 300,
		size: BASE_SIZE,
		color: index === 0 ? 0xff3300 : 0x0033ff
	})
});

export const game = defineGame({
	setup: ({ playerIds, random }) => ({
		players: playerManager.initialize(playerIds),
		food: Array.from({ length: 30 }, (_, i) => ({
			id: \`food-\${i}\`,
			x: random.range(0, WORLD_SIZE.width),
			y: random.range(0, WORLD_SIZE.height)
		}))
	}),

	actions: {
		// Mouse movement action
		move: {
			apply: (state, context, input) => {
				const player = state.players[context.targetId];
				if (player) {
					player.targetX = input.x;
					player.targetY = input.y;
				}
			}
		},

		// Host-only tick action using helper
		tick: createTickAction((state, delta) => {
			// Move players toward target
			for (const player of Object.values(state.players)) {
				const dx = player.targetX - player.x;
				const dy = player.targetY - player.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist > 1) {
					player.x += (dx / dist) * MOVE_SPEED;
					player.y += (dy / dist) * MOVE_SPEED;
				}
			}
		})
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
	return class BlobBattleScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private hud: any;
		private food: Map<string, Phaser.GameObjects.Arc> = new Map();

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

			// HUD Helper
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Blob Battle',
				titleStyle: { fontSize: '32px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					return \`Size: \${myPlayer.size}\`;
				},
				roleStyle: { fontSize: '18px', color: '#fff' },

				controlHints: () => 'Click to move your blob',
				controlsStyle: { fontSize: '14px', color: '#aaa' },

				layout: {
					title: { x: 400, y: 30 },
					role: { x: 400, y: 70 },
					controls: { x: 400, y: 575 }
				}
			});

			// SpriteManager for player blobs
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					return this.add.circle(data.x, data.y, data.size, data.color);
				}
			});

			// Mouse input
			this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
				runtime.submitAction('move', {
					x: pointer.x,
					y: pointer.y
				});
			});

			// HOST: Create initial players and food
			if (this.adapter.isHost()) {
				const state = runtime.getState();

				// Create player blobs
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}

				// Create food
				for (const foodItem of state.food) {
					const foodSprite = this.add.circle(foodItem.x, foodItem.y, 5, 0x00ff00);
					this.food.set(foodItem.id, foodSprite);
				}

				// Start tick loop (host only)
				this.time.addEvent({
					delay: 16, // 60 FPS
					loop: true,
					callback: () => {
						runtime.submitAction('tick', { delta: 16 });
					}
				});
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
    backgroundColor: '#1a1a1a'
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
		<h1>Blob Battle - Multiplayer Agar.io</h1>
		<p>Move your blob around and compete for the biggest size!</p>
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
