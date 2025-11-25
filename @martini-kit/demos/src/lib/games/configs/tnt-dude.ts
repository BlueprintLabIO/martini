import type { MartiniKitIDEConfig } from '@martini-kit/ide';

// TNT Dude - Classic Bomberman-style battle
const config: MartiniKitIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager, createTickAction, forEachPlayerInput, createMultiCollisionCheck } from '@martini-kit/core';

// Constants
const GRID_SIZE = 13;
const TILE_SIZE = 52;
const WORLD_SIZE = GRID_SIZE * TILE_SIZE; // 676px
const BOMB_FUSE_TIME = 3000; // 3 seconds
const EXPLOSION_DURATION = 500; // 0.5 seconds
const POWERUP_LIFETIME = 15000; // 15 seconds
const ROUND_DURATION = 120000; // 2 minutes
const SUDDEN_DEATH_START = 90000; // Start at 90s (30s remaining)
const ROUNDS_TO_WIN = 3;

// Player spawn positions (corners, safe zones)
const SPAWN_POSITIONS = [
	{ x: 1, y: 1 },     // Top-left
	{ x: 11, y: 1 },    // Top-right
	{ x: 1, y: 11 },    // Bottom-left
	{ x: 11, y: 11 }    // Bottom-right
];

const PLAYER_COLORS = [0x48bb78, 0xf56565, 0xfbbf24, 0x3b82f6];

// PlayerManager for spawning
const playerManager = createPlayerManager({
	factory: (playerId, index) => {
		const spawn = SPAWN_POSITIONS[index % SPAWN_POSITIONS.length];
		return {
			// Grid-locked movement state
			currentCell: { x: spawn.x, y: spawn.y },
			targetCell: null as { x: number; y: number } | null,
			moveProgress: 0,
			// World position (for rendering)
			x: spawn.x * TILE_SIZE + TILE_SIZE / 2,
			y: spawn.y * TILE_SIZE + TILE_SIZE / 2,
			// Game state
			alive: true,
			bombCount: 1,        // Max bombs
			bombRange: 2,        // Explosion radius
			speed: 1.0,          // Movement multiplier (cells per second)
			canKick: false,      // Can kick bombs
			score: 0,            // Round wins
			color: PLAYER_COLORS[index % PLAYER_COLORS.length],
			spawnIndex: index % SPAWN_POSITIONS.length,
			activeBombs: 0       // Current bombs placed
		};
	}
});


// Helper: Check if position has hard block
function hasHardBlock(blocks: any[], x: number, y: number): boolean {
	return blocks.some(b => b.x === x && b.y === y && b.type === 'hard');
}

// Helper: Check if position has soft block
function hasSoftBlock(blocks: any[], x: number, y: number): boolean {
	return blocks.some(b => b.x === x && b.y === y && b.type === 'soft');
}

// Helper: Check if position has bomb
function hasBomb(bombs: any[], x: number, y: number): boolean {
	return bombs.some(b => b.x === x && b.y === y && !b.isKicked);
}

// Helper: Generate initial blocks (hardcoded good layout)
function generateBlocks(): any[] {
	const blocks: any[] = [];

	// Hardcoded map layout - H = hard, S = soft, . = empty
	// This layout ensures good pathways and strategic gameplay
	const layout = [
		'HHHHHHHHHHHHH',
		'H...S.S.S...H',
		'H.H.H.H.H.H.H',
		'H.S.S.S.S.S.H',
		'HSH.H.H.H.HSH',
		'H.S.S.S.S.S.H',
		'HSH.H.H.H.HSH',
		'H.S.S.S.S.S.H',
		'HSH.H.H.H.HSH',
		'H.S.S.S.S.S.H',
		'H.H.H.H.H.H.H',
		'H...S.S.S...H',
		'HHHHHHHHHHHHH'
	];

	for (let y = 0; y < GRID_SIZE; y++) {
		for (let x = 0; x < GRID_SIZE; x++) {
			const cell = layout[y][x];
			if (cell === 'H') {
				blocks.push({ x, y, type: 'hard', id: \`hard-\${x}-\${y}\` });
			} else if (cell === 'S') {
				blocks.push({ x, y, type: 'soft', id: \`soft-\${x}-\${y}\` });
			}
		}
	}

	return blocks;
}

export const game = defineGame({
	setup: ({ playerIds, random }) => ({
		players: playerManager.initialize(playerIds),
		bombs: [] as Array<{
			id: number;
			x: number;
			y: number;
			ownerId: string;
			range: number;
			timer: number;
			isKicked: boolean;
			velocityX: number;
			velocityY: number;
		}>,
		blocks: generateBlocks(),
		powerups: [] as Array<{
			id: number;
			x: number;
			y: number;
			type: 'bomb' | 'range' | 'speed' | 'kick';
			lifetime: number;
		}>,
		explosions: [] as Array<{
			id: number;
			x: number;
			y: number;
			direction: 'center' | 'up' | 'down' | 'left' | 'right';
			lifetime: number;
		}>,
		inputs: {} as Record<string, {
			left: boolean;
			right: boolean;
			up: boolean;
			down: boolean;
			bomb: boolean;
		}>,
		nextBombId: 0,
		nextPowerupId: 0,
		nextExplosionId: 0,
		round: 1,
		roundTimer: ROUND_DURATION,
		suddenDeath: false,
		gameOver: false,
		winner: null as string | null
	}),

	actions: {
		// Input handling
		move: {
			apply: (state, context, input) => {
				if (!state.inputs) state.inputs = {};
				state.inputs[context.targetId] = {
					left: Boolean(input.left),
					right: Boolean(input.right),
					up: Boolean(input.up),
					down: Boolean(input.down),
					bomb: Boolean(input.bomb)
				};
			}
		},

		// Place bomb
		placeBomb: {
			apply: (state, context) => {
				const player = state.players[context.targetId];
				if (!player || !player.alive || state.gameOver) return;

				// Check if at bomb capacity
				if (player.activeBombs >= player.bombCount) return;

				// Get grid position from current cell (always aligned)
				const gridX = player.currentCell.x;
				const gridY = player.currentCell.y;

				// Check if bomb already at position
				const hasBomb = state.bombs.some(b => b.x === gridX && b.y === gridY);
				if (hasBomb) return;

				// Create bomb
				state.bombs.push({
					id: state.nextBombId++,
					x: gridX,
					y: gridY,
					ownerId: context.targetId,
					range: player.bombRange,
					timer: BOMB_FUSE_TIME,
					isKicked: false,
					velocityX: 0,
					velocityY: 0
				});

				player.activeBombs++;
			}
		},

		// Kick bomb (when player walks into it)
		kickBomb: {
			apply: (state, context, input) => {
				const { bombId, directionX, directionY } = input;
				const bomb = state.bombs.find(b => b.id === bombId);
				if (!bomb || bomb.isKicked) return;

				const player = state.players[context.targetId];
				if (!player || !player.canKick) return;

				// Set bomb velocity
				bomb.isKicked = true;
				bomb.velocityX = directionX;
				bomb.velocityY = directionY;
			}
		},

		// Explode bomb
		explode: {
			apply: (state, context, input) => {
				const { bombId } = input;
				const bombIndex = state.bombs.findIndex(b => b.id === bombId);
				if (bombIndex === -1) return;

				const bomb = state.bombs[bombIndex];

				// Return bomb capacity to owner
				if (state.players[bomb.ownerId]) {
					state.players[bomb.ownerId].activeBombs--;
				}

				// Calculate explosion cells
				const explosionCells: Array<{ x: number; y: number; direction: string }> = [
					{ x: bomb.x, y: bomb.y, direction: 'center' }
				];

				// Raycast in 4 directions
				const directions = [
					{ dx: 0, dy: -1, dir: 'up' },
					{ dx: 0, dy: 1, dir: 'down' },
					{ dx: -1, dy: 0, dir: 'left' },
					{ dx: 1, dy: 0, dir: 'right' }
				];

				for (const { dx, dy, dir } of directions) {
					for (let i = 1; i <= bomb.range; i++) {
						const checkX = bomb.x + dx * i;
						const checkY = bomb.y + dy * i;

						// Stop at hard blocks
						if (hasHardBlock(state.blocks, checkX, checkY)) break;

						explosionCells.push({ x: checkX, y: checkY, direction: dir });

						// Stop at soft blocks (but destroy them)
						if (hasSoftBlock(state.blocks, checkX, checkY)) break;
					}
				}

				// Create explosion sprites
				for (const cell of explosionCells) {
					state.explosions.push({
						id: state.nextExplosionId++,
						x: cell.x,
						y: cell.y,
						direction: cell.direction as any,
						lifetime: EXPLOSION_DURATION
					});
				}

				// Destroy soft blocks and spawn powerups
				for (const cell of explosionCells) {
					const blockIndex = state.blocks.findIndex(
						b => b.x === cell.x && b.y === cell.y && b.type === 'soft'
					);

					if (blockIndex !== -1) {
						state.blocks.splice(blockIndex, 1);

						// 50% chance to spawn powerup
						if (Math.random() > 0.5) {
							const types = ['bomb', 'range', 'speed', 'kick'];
							const type = types[Math.floor(Math.random() * types.length)] as any;

							state.powerups.push({
								id: state.nextPowerupId++,
								x: cell.x,
								y: cell.y,
								type,
								lifetime: POWERUP_LIFETIME
							});
						}
					}
				}

				// Damage players in explosion
				for (const [playerId, player] of Object.entries(state.players)) {
					if (!player.alive) continue;

					const playerGridX = Math.round(player.x / TILE_SIZE);
					const playerGridY = Math.round(player.y / TILE_SIZE);

					const inExplosion = explosionCells.some(
						cell => cell.x === playerGridX && cell.y === playerGridY
					);

					if (inExplosion) {
						player.alive = false;
					}
				}

				// Chain reaction: explode nearby bombs instantly
				for (const otherBomb of state.bombs) {
					if (otherBomb.id === bombId) continue;

					const inExplosion = explosionCells.some(
						cell => cell.x === otherBomb.x && cell.y === otherBomb.y
					);

					if (inExplosion) {
						// Trigger explosion immediately
						otherBomb.timer = 0;
					}
				}

				// Remove exploded bomb
				state.bombs.splice(bombIndex, 1);
			}
		},

		// Collect powerup
		collectPowerup: {
			apply: (state, context, input) => {
				const { powerupId } = input;
				const powerupIndex = state.powerups.findIndex(p => p.id === powerupId);
				if (powerupIndex === -1) return;

				const powerup = state.powerups[powerupIndex];
				const player = state.players[context.targetId];
				if (!player || !player.alive) return;

				// Apply powerup effect
				switch (powerup.type) {
					case 'bomb':
						player.bombCount = Math.min(5, player.bombCount + 1);
						break;
					case 'range':
						player.bombRange = Math.min(6, player.bombRange + 1);
						break;
					case 'speed':
						player.speed = Math.min(2.0, player.speed + 0.2);
						break;
					case 'kick':
						player.canKick = true;
						break;
				}

				// Remove powerup
				state.powerups.splice(powerupIndex, 1);
			}
		},

		// Round end
		endRound: {
			apply: (state, context, input) => {
				const { winnerId } = input;

				if (winnerId && state.players[winnerId]) {
					state.players[winnerId].score++;

					// Check for match win
					if (state.players[winnerId].score >= ROUNDS_TO_WIN) {
						state.gameOver = true;
						state.winner = winnerId;
						return;
					}
				}

				// Reset for next round
				state.round++;
				state.roundTimer = ROUND_DURATION;
				state.suddenDeath = false;
				state.bombs = [];
				state.powerups = [];
				state.explosions = [];

				// Regenerate blocks
				state.blocks = generateBlocks();

				// Reset players
				for (const [playerId, player] of Object.entries(state.players)) {
					const index = player.spawnIndex;
					const spawn = SPAWN_POSITIONS[index];
					// Reset grid-locked state
					player.currentCell = { x: spawn.x, y: spawn.y };
					player.targetCell = null;
					player.moveProgress = 0;
					player.x = spawn.x * TILE_SIZE + TILE_SIZE / 2;
					player.y = spawn.y * TILE_SIZE + TILE_SIZE / 2;
					player.alive = true;
					player.bombCount = 1;
					player.bombRange = 2;
					player.speed = 1.0;
					player.canKick = false;
					player.activeBombs = 0;
				}
			}
		},

		// Game tick (host only)
		tick: createTickAction((state, delta) => {
			// Process movement - TRUE GRID-LOCKED (like classic Bomberman)
			forEachPlayerInput(
				state,
				(player, input) => {
					const cellsPerSecond = 3.0 * player.speed; // Base movement speed
					const progressDelta = (cellsPerSecond * delta) / 1000;

					// If currently moving, continue to target cell
					if (player.targetCell) {
						player.moveProgress += progressDelta;

						if (player.moveProgress >= 1.0) {
							// Reached target - snap to center
							player.currentCell = { ...player.targetCell };
							player.targetCell = null;
							player.moveProgress = 0;

							// Update world position to exact cell center
							player.x = player.currentCell.x * TILE_SIZE + TILE_SIZE / 2;
							player.y = player.currentCell.y * TILE_SIZE + TILE_SIZE / 2;
						} else {
							// Interpolate position between cells
							const currentX = player.currentCell.x * TILE_SIZE + TILE_SIZE / 2;
							const currentY = player.currentCell.y * TILE_SIZE + TILE_SIZE / 2;
							const targetX = player.targetCell.x * TILE_SIZE + TILE_SIZE / 2;
							const targetY = player.targetCell.y * TILE_SIZE + TILE_SIZE / 2;

							player.x = currentX + (targetX - currentX) * player.moveProgress;
							player.y = currentY + (targetY - currentY) * player.moveProgress;
						}
					} else {
						// Aligned to cell - can start new move
						const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
						const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

						// Grid-locked movement: no diagonal, pick one direction
						let finalDx = dx;
						let finalDy = dy;
						if (dx !== 0 && dy !== 0) {
							// Prioritize horizontal movement
							finalDy = 0;
						}

						if (finalDx !== 0 || finalDy !== 0) {
							const nextCell = {
								x: player.currentCell.x + finalDx,
								y: player.currentCell.y + finalDy
							};

							// Check if next cell is walkable
							const inBounds = 
								nextCell.x >= 0 && nextCell.x < GRID_SIZE &&
								nextCell.y >= 0 && nextCell.y < GRID_SIZE;

							const hasCollision = inBounds &&
								(hasHardBlock(state.blocks, nextCell.x, nextCell.y) ||
								 hasSoftBlock(state.blocks, nextCell.x, nextCell.y) ||
								 hasBomb(state.bombs, nextCell.x, nextCell.y));

							if (inBounds && !hasCollision) {
								player.targetCell = nextCell;
								player.moveProgress = 0;
							}
						}
					}
				},
				{ filter: (player) => player.alive }
			)

			// Update round timer
			state.roundTimer = Math.max(0, state.roundTimer - delta);

			// Activate sudden death
			if (state.roundTimer <= (ROUND_DURATION - SUDDEN_DEATH_START) && !state.suddenDeath) {
				state.suddenDeath = true;
			}

			// Update bomb timers
			const explodedBombs: number[] = [];
			for (const bomb of state.bombs) {
				bomb.timer -= delta;
				if (bomb.timer <= 0) {
					explodedBombs.push(bomb.id);
				}
			}

			// Explode bombs (chain reactions handled in explode action)
			for (const bombId of explodedBombs) {
				// This will be picked up and processed
				// We need to mark it for explosion
				const bomb = state.bombs.find(b => b.id === bombId);
				if (bomb) bomb.timer = -1; // Mark as ready to explode
			}

			// Update kicked bomb positions
			for (const bomb of state.bombs) {
				if (!bomb.isKicked) continue;

				const nextX = bomb.x + bomb.velocityX;
				const nextY = bomb.y + bomb.velocityY;

				// Check collision with blocks or walls
				const hasBlock = state.blocks.some(b => b.x === nextX && b.y === nextY);
				const outOfBounds = nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE;

				if (hasBlock || outOfBounds) {
					// Stop bomb
					bomb.isKicked = false;
					bomb.velocityX = 0;
					bomb.velocityY = 0;
				} else {
					// Move bomb
					bomb.x = nextX;
					bomb.y = nextY;
				}
			}

			// Update explosion lifetimes
			state.explosions = state.explosions.filter(e => {
				e.lifetime -= delta;
				return e.lifetime > 0;
			});

			// Update powerup lifetimes
			state.powerups = state.powerups.filter(p => {
				p.lifetime -= delta;
				return p.lifetime > 0;
			});
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

		'/src/scene.ts': `import type { GameRuntime } from '@martini-kit/core';
import { 
	PhaserAdapter, 
	createPlayerStatsPanel,
	createCollectibleManager,
	createRoundManager
} from '@martini-kit/phaser';
import Phaser from 'phaser';

const GRID_SIZE = 13;
const TILE_SIZE = 52;
const WORLD_SIZE = GRID_SIZE * TILE_SIZE;

export function createScene(runtime: GameRuntime) {
	return class BlastArenaScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
		private blockSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
		private bombSprites: Map<number, Phaser.GameObjects.Container> = new Map();
		private powerupSprites: Map<number, Phaser.GameObjects.Container> = new Map();
		private explosionSprites: Map<number, Phaser.GameObjects.Container> = new Map();
		private statsPanel?: ReturnType<typeof createPlayerStatsPanel>;
		private collectibleManager?: ReturnType<typeof createCollectibleManager>;
		private roundManager?: ReturnType<typeof createRoundManager>;
		private keys!: any;

		create() {
			this.adapter = new PhaserAdapter(runtime, this, {
				interpolationMode: 'snapshot-buffer',
				snapshotBufferSize: 2,
				autoTick: true // ✅ Automatically call tick action in update()
			});

			// Background
			this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0x1a472a);

			// Grid lines (subtle)
			const gridGraphics = this.add.graphics();
			gridGraphics.lineStyle(1, 0x2d5a3d, 0.3);
			for (let i = 0; i <= GRID_SIZE; i++) {
				gridGraphics.lineBetween(i * TILE_SIZE, 0, i * TILE_SIZE, WORLD_SIZE);
				gridGraphics.lineBetween(0, i * TILE_SIZE, WORLD_SIZE, i * TILE_SIZE);
			}

			// Setup input
			this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE') as any;

			// ✨ NEW: Stats Panel (shows equipped powerups)
			this.statsPanel = createPlayerStatsPanel(this.adapter, this, {
				position: 'top-left',
				stats: {
					bombs: {
						icon: '💣',
						getValue: (player: any) => player.activeBombs + '/' + player.bombCount,
						tooltip: 'Bombs (current/max)'
					},
					range: {
						icon: '💥',
						getValue: (player: any) => player.bombRange,
						tooltip: 'Explosion range'
					},
					speed: {
						icon: '⚡',
						getValue: (player: any) => Math.round(player.speed * 100) + '%',
						tooltip: 'Movement speed',
						highlight: (player: any) => player.speed > 1.0
					},
					kick: {
						icon: '🦵',
						getValue: () => '✓',
						visible: (player: any) => player.canKick,
						tooltip: 'Can kick bombs'
					}
				}
			});

			// ✨ NEW: Collectible Manager (auto collision detection)
			this.collectibleManager = createCollectibleManager(this.adapter, this, {
				powerup: {
					stateKey: 'powerups',
					collectAction: 'collectPowerup',
					getPosition: (powerup: any) => ({
						x: powerup.x * TILE_SIZE,
						y: powerup.y * TILE_SIZE
					}),
					getPlayerPosition: (player: any) => ({
						x: player.x - TILE_SIZE / 2,
						y: player.y - TILE_SIZE / 2
					}),
					radius: TILE_SIZE,
					collisionType: 'grid',
					idField: 'id',
					onCollect: (powerup: any) => ({
						popup: '+' + powerup.type.toUpperCase() + '!',
						particle: 'sparkle'
					})
				}
			});

			// ✨ NEW: Round Manager (timer, scoring, announcements)
			this.roundManager = createRoundManager(this.adapter, this, {
				roundsToWin: 3,
				checkWinner: (state: any) => {
					const alivePlayers = Object.entries(state.players).filter(([_, p]: any) => p.alive);
					if (alivePlayers.length === 1) return alivePlayers[0][0]; // Winner
					if (state.roundTimer <= 0) return null; // Draw
					return undefined; // Continue
				},
				ui: {
					timer: {
						position: { x: WORLD_SIZE / 2, y: 50 },
						format: (ms: number) => {
							const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
							const minutes = Math.floor(totalSeconds / 60);
							const seconds = totalSeconds % 60;
							return minutes + ':' + seconds.toString().padStart(2, '0');
						},
						warningAt: 30000,
						style: { fontSize: '16px', color: '#fff' },
						warningStyle: { fontSize: '16px', color: '#ef4444', fontStyle: 'bold' }
					},
					announcement: {
						winner: (player: any) => 'P' + (player.spawnIndex + 1) + ' WINS ROUND!',
						draw: () => 'DRAW - NO WINNER',
						matchWin: (player: any) => 'P' + (player.spawnIndex + 1) + ' WINS THE MATCH!',
						freezeDuration: 3000
					},
					scoreboard: {
						position: { x: 20, y: 80 },
						format: (player: any, index: number) => 'P' + (index + 1) + ': ' + player.score + ' wins',
						style: { fontSize: '14px', color: '#fff' }
					}
				}
			});

			// Title
			this.add.text(WORLD_SIZE / 2, 20, 'TNT DUDE', {
				fontSize: '28px',
				color: '#fff',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			// Controls hint
			this.add.text(WORLD_SIZE / 2, WORLD_SIZE - 20,
				'WASD/Arrows: Move | SPACE: Place Bomb', {
				fontSize: '14px',
				color: '#aaa'
			}).setOrigin(0.5);
			// State change handler
			this.adapter.onChange((state: any) => {
				this.updatePlayers(state);
				this.updateBlocks(state);
				this.updateBombs(state);
				this.updatePowerups(state);
				this.updateExplosions(state);
			});

			// Initial render
			const initialState = runtime.getState();
			this.updateBlocks(initialState);
		}

		private updatePlayers(state: any) {
			const isHost = this.adapter.isHost();

			for (const [playerId, player] of Object.entries(state.players as any)) {
				if (!player.alive) {
					// Remove sprite if dead
					const sprite = this.playerSprites.get(playerId);
					if (sprite) {
						sprite.destroy();
						this.playerSprites.delete(playerId);
					}
					continue;
				}

				let sprite = this.playerSprites.get(playerId);

				if (!sprite) {
					// Create player sprite
					const container = this.add.container(player.x, player.y);

					// Body circle
					const body = this.add.circle(0, 0, 20, player.color);

					// Direction indicator
					const indicator = this.add.triangle(0, -15, 0, -5, -5, 5, 5, 5, 0xffffff);

					// Name label
					const nameText = this.add.text(0, -35, 'P' + (player.spawnIndex + 1), {
						fontSize: '12px',
						color: '#fff',
						backgroundColor: '#000',
						padding: { x: 4, y: 2 }
					}).setOrigin(0.5);

					container.add([body, indicator, nameText]);
					sprite = container;
					this.playerSprites.set(playerId, sprite);
				}

				// Update position
				sprite.setPosition(player.x, player.y);

				// Update rotation based on movement
				const input = state.inputs?.[playerId];
				if (input) {
					const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
					const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
					if (dx !== 0 || dy !== 0) {
						const angle = Math.atan2(dy, dx);
						(sprite.list[1] as any).setRotation(angle + Math.PI / 2);
					}
				}
			}
		}

		private updateBlocks(state: any) {
			// Remove blocks that no longer exist
			for (const [id, sprite] of this.blockSprites.entries()) {
				const exists = state.blocks.some((b: any) => b.id === id);
				if (!exists) {
					sprite.destroy();
					this.blockSprites.delete(id);
				}
			}

			// Create/update blocks
			for (const block of state.blocks) {
				let sprite = this.blockSprites.get(block.id);

				if (!sprite) {
					const x = block.x * TILE_SIZE + TILE_SIZE / 2;
					const y = block.y * TILE_SIZE + TILE_SIZE / 2;

					// Gray = hard (indestructible walls), Brown = soft (destructible crates)
					const color = block.type === 'hard' ? 0x4a5568 : 0x92400e;
					sprite = this.add.rectangle(x, y, TILE_SIZE - 2, TILE_SIZE - 2, color);

					if (block.type === 'soft') {
						sprite.setStrokeStyle(2, 0x78350f);
						// Add subtle icon to show it's destructible
						const crateIcon = this.add.text(x, y, '📦', {
							fontSize: '24px'
						}).setOrigin(0.5);
						crateIcon.setDepth(1);
					}

					this.blockSprites.set(block.id, sprite);
				}
			}
		}

		private updateBombs(state: any) {
			// Remove bombs that no longer exist
			for (const [id, sprite] of this.bombSprites.entries()) {
				const exists = state.bombs.some((b: any) => b.id === id);
				if (!exists) {
					sprite.destroy();
					this.bombSprites.delete(id);
				}
			}

			// Create/update bombs
			for (const bomb of state.bombs) {
				let sprite = this.bombSprites.get(bomb.id);

				if (!sprite) {
					const x = bomb.x * TILE_SIZE + TILE_SIZE / 2;
					const y = bomb.y * TILE_SIZE + TILE_SIZE / 2;

					const container = this.add.container(x, y);

					// Bomb body
					const body = this.add.circle(0, 0, 15, 0x000000);

					// Fuse
					const fuse = this.add.rectangle(0, -20, 3, 10, 0xff0000);

					container.add([body, fuse]);
					sprite = container;
					this.bombSprites.set(bomb.id, sprite);

					// Pulse animation
					this.tweens.add({
						targets: body,
						scale: 1.1,
						duration: 200,
						yoyo: true,
						repeat: -1
					});
				}

				// Update position for kicked bombs
				if (bomb.isKicked) {
					const x = bomb.x * TILE_SIZE + TILE_SIZE / 2;
					const y = bomb.y * TILE_SIZE + TILE_SIZE / 2;
					sprite.setPosition(x, y);
				}
			}
		}

		private updatePowerups(state: any) {
			// Remove powerups that no longer exist
			for (const [id, sprite] of this.powerupSprites.entries()) {
				const exists = state.powerups.some((p: any) => p.id === id);
				if (!exists) {
					sprite.destroy();
					this.powerupSprites.delete(id);
				}
			}

			// Create/update powerups
			for (const powerup of state.powerups) {
				let sprite = this.powerupSprites.get(powerup.id);

				if (!sprite) {
					const x = powerup.x * TILE_SIZE + TILE_SIZE / 2;
					const y = powerup.y * TILE_SIZE + TILE_SIZE / 2;

					const container = this.add.container(x, y);

					// Color based on type
					const colors: any = {
						bomb: 0x3b82f6,
						range: 0xef4444,
						speed: 0xfbbf24,
						kick: 0x10b981
					};

					const color = colors[powerup.type];
					const icon = this.add.circle(0, 0, 12, color);

					// Glow effect
					const glow = this.add.circle(0, 0, 15, color, 0.3);

					container.add([glow, icon]);
					sprite = container;
					this.powerupSprites.set(powerup.id, sprite);

					// Hover animation
					this.tweens.add({
						targets: container,
						y: y - 5,
						duration: 800,
						yoyo: true,
						repeat: -1,
						ease: 'Sine.easeInOut'
					});
				}
			}
		}

		private updateExplosions(state: any) {
			// Remove explosions that no longer exist
			for (const [id, sprite] of this.explosionSprites.entries()) {
				const exists = state.explosions.some((e: any) => e.id === id);
				if (!exists) {
					sprite.destroy();
					this.explosionSprites.delete(id);
				}
			}

			// Create explosions
			for (const explosion of state.explosions) {
				let sprite = this.explosionSprites.get(explosion.id);

				if (!sprite) {
					const x = explosion.x * TILE_SIZE + TILE_SIZE / 2;
					const y = explosion.y * TILE_SIZE + TILE_SIZE / 2;

					const container = this.add.container(x, y);

					// Explosion shape (center is circle, directions are rectangles)
					if (explosion.direction === 'center') {
						const circle = this.add.circle(0, 0, TILE_SIZE / 2, 0xff6b35, 0.8);
						container.add(circle);
					} else {
						const width = explosion.direction === 'left' || explosion.direction === 'right'
							? TILE_SIZE : TILE_SIZE * 0.6;
						const height = explosion.direction === 'up' || explosion.direction === 'down'
							? TILE_SIZE : TILE_SIZE * 0.6;

						const rect = this.add.rectangle(0, 0, width, height, 0xff6b35, 0.7);
						container.add(rect);
					}

					sprite = container;
					this.explosionSprites.set(explosion.id, sprite);

					// Fade out animation
					this.tweens.add({
						targets: container,
						alpha: 0,
						scale: 1.5,
						duration: 500,
						ease: 'Power2'
					});
				}
			}
		}

		update(time: number, delta: number) {
			// ✅ Automatically handles tick + interpolation
			this.adapter.update(time, delta);

			const state = runtime.getState();
			const myPlayerId = runtime.getMyPlayerId();
			const myPlayer = state.players?.[myPlayerId];

			// Host-only game logic
			if (this.adapter.isHost()) {
				// Process bomb explosions marked in tick
				for (const bomb of state.bombs) {
					if (bomb.timer < 0) {
						runtime.submitAction('explode', { bombId: bomb.id });
					}
				}
			}

			// Host handles collectible collisions centrally
			if (this.adapter.isHost()) {
				this.collectibleManager?.update();
			}

			// Player input
			if (myPlayer && myPlayer.alive && !state.gameOver) {
				const input = {
					left: this.keys.A?.isDown || this.keys.LEFT?.isDown,
					right: this.keys.D?.isDown || this.keys.RIGHT?.isDown,
					up: this.keys.W?.isDown || this.keys.UP?.isDown,
					down: this.keys.S?.isDown || this.keys.DOWN?.isDown,
					bomb: this.keys.SPACE?.isDown
				};

				// Submit input (will be processed in tick action on host)
				runtime.submitAction('move', input);

				// Place bomb (with debounce)
				if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
					runtime.submitAction('placeBomb', {});
				}

				// Clients still submit their own powerup pickups to host
				if (!this.adapter.isHost()) {
					const playerGridX = Math.round(myPlayer.x / TILE_SIZE);
					const playerGridY = Math.round(myPlayer.y / TILE_SIZE);

					for (const powerup of state.powerups) {
						if (powerup.x === playerGridX && powerup.y === playerGridY) {
							runtime.submitAction('collectPowerup', { powerupId: powerup.id });
						}
					}
				}
			}
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
    width: 676,
    height: 676,
    backgroundColor: '#1a472a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    }
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
