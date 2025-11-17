<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Blob Battle - Agar.io-style multiplayer
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame, createPlayerManager, createTickAction } from '@martini/core';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const BASE_SIZE = 20;
const FOOD_COUNT = 50;
const FOOD_SIZE = 5;
const MOVE_SPEED = 2;
const GROWTH_PER_FOOD = 2;
const GROWTH_FACTOR = 0.5; // When eating another player

// PlayerManager for spawn positions
const playerManager = createPlayerManager({
	factory: (playerId, index) => {
		// Deterministic spawn based on player index
		const x = 200 + (index * 400);
		const y = 300;
		return {
			x,
			y,
			targetX: x,
			targetY: y,
			size: BASE_SIZE
		};
	}
});

export const game = defineGame({
	setup: ({ playerIds, random }) => ({
		players: playerManager.initialize(playerIds),
		food: Array.from({ length: FOOD_COUNT }, (_, i) => ({
			id: \`food-init-\${i}\`,
			x: random.range(0, WORLD_WIDTH),
			y: random.range(0, WORLD_HEIGHT)
		}))
	}),

	actions: {
		// Mouse movement action - sets target position
		move: {
			apply: (state, context, input) => {
				const player = state.players[context.targetId];
				if (!player) return;

				// Clamp target to world bounds
				player.targetX = Math.max(0, Math.min(WORLD_WIDTH, input.x));
				player.targetY = Math.max(0, Math.min(WORLD_HEIGHT, input.y));
			}
		},

		// Server-side game tick (physics, collisions, etc.)
		// Only runs on the host - createTickAction ensures this!
		tick: createTickAction((state, delta, context) => {
			const playerIds = Object.keys(state.players);

			// Move players toward their targets
			for (const playerId of playerIds) {
				const player = state.players[playerId];
				if (!player) continue;

				const dx = player.targetX - player.x;
				const dy = player.targetY - player.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist > 0) {
					// Speed decreases with size (larger = slower)
					const speed = MOVE_SPEED * (BASE_SIZE / player.size);
					const moveAmount = Math.min(speed, dist);

					player.x += (dx / dist) * moveAmount;
					player.y += (dy / dist) * moveAmount;
				}
			}

			// Check food collisions
			const eatenFood: string[] = [];

			for (const playerId of playerIds) {
				const player = state.players[playerId];
				if (!player) continue;

				for (const food of state.food) {
					const dx = player.x - food.x;
					const dy = player.y - food.y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < player.size / 2 + FOOD_SIZE) {
						// Player ate the food
						player.size += GROWTH_PER_FOOD;
						eatenFood.push(food.id);
					}
				}
			}

			// Remove eaten food
			state.food = state.food.filter((food) => !eatenFood.includes(food.id));

			// Spawn new food to replace eaten food
			const newFoodCount = FOOD_COUNT - state.food.length;
			for (let i = 0; i < newFoodCount; i++) {
				state.food.push({
					id: \`food-\${Date.now()}-\${i}\`,
					x: context.random.range(0, WORLD_WIDTH),
					y: context.random.range(0, WORLD_HEIGHT)
				});
			}

			// Check player collisions
			const playersToRemove: string[] = [];

			for (let i = 0; i < playerIds.length; i++) {
				const id1 = playerIds[i];
				const p1 = state.players[id1];
				if (!p1 || playersToRemove.includes(id1)) continue;

				for (let j = i + 1; j < playerIds.length; j++) {
					const id2 = playerIds[j];
					const p2 = state.players[id2];
					if (!p2 || playersToRemove.includes(id2)) continue;

					const dx = p1.x - p2.x;
					const dy = p1.y - p2.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const threshold = (p1.size + p2.size) / 4;

					if (dist < threshold) {
						// Collision detected - larger eats smaller
						if (p1.size > p2.size) {
							p1.size += p2.size * GROWTH_FACTOR;
							playersToRemove.push(id2);
						} else {
							p2.size += p1.size * GROWTH_FACTOR;
							playersToRemove.push(id1);
							break; // p1 is dead, stop checking
						}
					}
				}
			}

			// Remove eaten players
			for (const playerId of playersToRemove) {
				delete state.players[playerId];
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

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

export function createScene(runtime: GameRuntime) {
	return class BlobBattleScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private foodManager: any;
		private playerSpawner: any;
		private foodSpawner: any;
		private hud: any;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

			// Grid pattern for visual reference
			const graphics = this.add.graphics();
			graphics.lineStyle(1, 0x333333, 0.3);
			for (let x = 0; x <= WORLD_WIDTH; x += 50) {
				graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
			}
			for (let y = 0; y <= WORLD_HEIGHT; y += 50) {
				graphics.lineBetween(0, y, WORLD_WIDTH, y);
			}

			// HUD Helper - displays game info
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Blob Battle',
				titleStyle: { fontSize: '32px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any) => {
					if (!myPlayer) return 'Spectator';
					return \`Size: \${myPlayer.size}\`;
				},
				roleStyle: { fontSize: '18px', color: '#fff' },

				controlHints: () => 'Click anywhere to move your blob',
				controlsStyle: { fontSize: '14px', color: '#aaa' },

				layout: {
					title: { x: 400, y: 30 },
					role: { x: 400, y: 70 },
					controls: { x: 400, y: 575 }
				}
			});

			// SpriteManager for player blobs
			this.spriteManager = this.adapter.createSpriteManager({
				onCreate: (key: string, data: any) => {
					const isLocal = key === \`player-\${this.adapter.getMyPlayerId()}\`;
					const color = isLocal ? 0x00ff00 : this.getPlayerColor(key);
					return this.add.circle(data.x, data.y, data.size / 2, color, 0.8);
				}
			});

			// SpriteManager for food pellets
			this.foodManager = this.adapter.createSpriteManager({
				namespace: 'food_sprites',

				onCreate: (key: string, data: any) => {
					return this.add.circle(data.x, data.y, 5, 0xffaa00, 1);
				}
			});

			// NEW: StateDrivenSpawner for players!
			// Automatically creates/removes player sprites based on state.players
			this.playerSpawner = this.adapter.createStateDrivenSpawner({
				stateKey: 'players',
				spriteManager: this.spriteManager,
				keyPrefix: 'player-'
			});

			// NEW: StateDrivenSpawner for food!
			// Automatically creates/removes food sprites based on state.food
			this.foodSpawner = this.adapter.createStateDrivenSpawner({
				stateKey: 'food',
				spriteManager: this.foodManager,
				keyPrefix: 'food-',
				keyField: 'id', // Use food.id as the key
				syncProperties: ['x', 'y'] // Auto-sync positions from state
			});

			// Mouse input for blob movement
			// Click anywhere to set target position
			this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
				runtime.submitAction('move', {
					x: pointer.x,
					y: pointer.y
				});
			});

			// HOST: Start tick loop
			if (this.adapter.isHost()) {
				this.time.addEvent({
					delay: 16, // 60 FPS
					loop: true,
					callback: () => {
						runtime.submitAction('tick', { delta: 16 });
					}
				});
			}

			// Initial spawn
			this.playerSpawner.sync();
			this.foodSpawner.sync();
		}

		update() {
			const state = runtime.getState();

			// HOST: Auto-spawn players and food via StateDrivenSpawner!
			// This replaces the manual "check for new players" loop
			if (this.adapter.isHost()) {
				this.playerSpawner.update();
				this.foodSpawner.update();
			}

			// Update player sprite sizes based on state
			for (const [key, sprite] of this.spriteManager.getAll()) {
				const playerId = key.replace('player-', '');
				const playerState = state.players[playerId];

				if (playerState) {
					// Update size (radius = size / 2)
					sprite.setRadius(playerState.size / 2);
				}
			}

			// SpriteManager handles interpolation
			this.spriteManager.update();
			this.foodManager.update();
		}

		// Generate consistent color for each player based on their ID
		private getPlayerColor(key: string): number {
			let hash = 0;
			for (let i = 0; i < key.length; i++) {
				hash = key.charCodeAt(i) + ((hash << 5) - hash);
			}

			const colors = [
				0xff6b6b, // red
				0x4ecdc4, // cyan
				0x95e1d3, // mint
				0xfeca57, // yellow
				0xee5a6f, // pink
				0xc56cf0, // purple
				0x48dbfb, // light blue
				0xff9ff3  // light pink
			];

			return colors[Math.abs(hash) % colors.length];
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
		<h1>Blob Battle - Agar.io-style Multiplayer</h1>
		<p>
			Showcasing <strong>StateDrivenSpawner</strong> (auto-spawns players & food from state) and
			<strong>createTickAction</strong> (server-side physics with collisions).
			Click to move, eat food to grow, eat smaller blobs to win!
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
		line-height: 1.6;
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
