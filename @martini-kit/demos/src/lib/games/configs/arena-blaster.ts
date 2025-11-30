import type { MartiniKitIDEConfig } from '@martini-kit/ide';

// Arena Blaster - Top-down shooter with health, scoring, and bullet physics
const config: MartiniKitIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager } from '@martini-kit/core';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const WALL_THICKNESS = 20;
const SPAWN_POINTS = [
	{ x: 50, y: 50 },
	{ x: 750, y: 550 }
];
const PLAYER_COLORS = [0x48bb78, 0xf56565];

const playerManager = createPlayerManager({
	factory: (_playerId, index) => {
		const spawn = SPAWN_POINTS[index % SPAWN_POINTS.length];
		return {
			x: spawn.x,
			y: spawn.y,
			health: 100,
			score: 0,
			rotation: 0,
			isInvulnerable: false,
			invulnerabilityTimer: 0,
			color: PLAYER_COLORS[index % PLAYER_COLORS.length],
			spawnIndex: index % SPAWN_POINTS.length
		};
	}
});

export const game = defineGame({
	lobby: {
		minPlayers: 2,
		maxPlayers: 2,
		requireAllReady: true,
		autoStartTimeout: 30000,
		allowLateJoin: false
	},

	setup: ({ playerIds }) => {
		return {
			players: playerManager.initialize(playerIds),
			bullets: [] as Array<{
				id: number;
				x: number;
				y: number;
				velocityX: number;
				velocityY: number;
				ownerId: string;
				lifetime: number; // ms remaining
			}>,
			inputs: {} as Record<string, {
				left: boolean;
				right: boolean;
				up: boolean;
				down: boolean;
				shoot: boolean;
			}>,
			shootCooldowns: {} as Record<string, number>, // ms until next shot
			nextBulletId: 0,
			winner: null as string | null,
			gameOver: false
		};
	},

		actions: {
			move: {
				apply: (state, context, input) => {
					if (!state.inputs) state.inputs = {};

					const snapshot = {
						left: Boolean(input.left),
						right: Boolean(input.right),
						up: Boolean(input.up),
						down: Boolean(input.down),
						shoot: Boolean(input.shoot)
					};

					state.inputs[context.targetId] = snapshot;

					const player = state.players[context.targetId];
					if (!player) return;

					const dx = (snapshot.right ? 1 : 0) - (snapshot.left ? 1 : 0);
					const dy = (snapshot.down ? 1 : 0) - (snapshot.up ? 1 : 0);

					if (dx !== 0 || dy !== 0) {
						player.rotation = Math.atan2(dy, dx);
					}
				}
			},

		shoot: {
			apply: (state, context) => {
				const player = state.players[context.targetId];
				if (!player || state.gameOver) return;

				// Check cooldown
				const cooldown = state.shootCooldowns[context.targetId] || 0;
				if (cooldown > 0) return;

				// Create bullet (include static metadata so SpriteManager can mirror on clients)
				const BULLET_SPEED = 400;
				const ownerColor = PLAYER_COLORS[player.spawnIndex ?? 0] || 0xffff00;
				state.bullets.push({
					id: state.nextBulletId++,
					x: player.x,
					y: player.y,
					velocityX: Math.cos(player.rotation) * BULLET_SPEED,
					velocityY: Math.sin(player.rotation) * BULLET_SPEED,
					ownerId: context.targetId,
					color: ownerColor,
					lifetime: 2000 // 2 seconds
				});

				// Set cooldown (500ms)
				state.shootCooldowns[context.targetId] = 500;
			}
		},

		hit: {
			apply: (state, context, input) => {
				const player = state.players[context.targetId];
				if (!player || player.isInvulnerable) return;

				const { damage, shooterId } = input;

				// Apply damage
				player.health -= damage;

				// Check for elimination
				if (player.health <= 0) {
					// Award point to shooter
					if (shooterId && state.players[shooterId]) {
						state.players[shooterId].score += 1;
					}

					// Check win condition (first to 5)
					if (state.players[context.targetId]?.score >= 5) {
						state.winner = shooterId;
						state.gameOver = true;
					} else {
						const playerIds = Object.keys(state.players);
						const highestScore = Math.max(...playerIds.map((id) => state.players[id].score || 0));
						if (highestScore >= 5) {
							state.winner = playerIds.find((id) => state.players[id].score === highestScore) || null;
							state.gameOver = true;
						}
					}

					// Respawn player at their assigned spawn point
					player.health = 100;
					const spawnPoint = SPAWN_POINTS[player.spawnIndex ?? 0] || { x: 400, y: 300 };
					player.x = spawnPoint.x;
					player.y = spawnPoint.y;
					player.isInvulnerable = true;
					player.invulnerabilityTimer = 1000; // 1 second
				}
			}
		},

		reset: {
			apply: (state) => {
				// Reset scores and game state
				for (const playerId of Object.keys(state.players)) {
					state.players[playerId].score = 0;
					state.players[playerId].health = 100;
					state.players[playerId].isInvulnerable = false;
					state.players[playerId].invulnerabilityTimer = 0;
				}

				// Reset positions
				for (const playerId of Object.keys(state.players)) {
					const player = state.players[playerId];
					const spawnPoint = SPAWN_POINTS[player.spawnIndex ?? 0] || { x: 400, y: 300 };
					player.x = spawnPoint.x;
					player.y = spawnPoint.y;
					state.players[playerId].rotation = 0;
				}

				// Clear bullets
				state.bullets = [];
				state.shootCooldowns = {};
				state.winner = null;
				state.gameOver = false;
			}
			}
		},

	onPhaseChange: (state, { from, to, reason }) => {
		console.log(\`[Arena Blaster] Phase: \${from} -> \${to} (\${reason})\`);
	},

	onPlayerReady: (state, playerId, ready) => {
		console.log(\`[Arena Blaster] Player \${playerId} is \${ready ? 'ready' : 'not ready'}\`);
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
import { PhaserAdapter, attachDirectionalIndicator, LobbyUI } from '@martini-kit/phaser';
import Phaser from 'phaser';

const PLAYER_SPEED = 200;
const PLAYER_RADIUS = 15;
const BULLET_RADIUS = 4;
const COLLISION_THRESHOLD = PLAYER_RADIUS + BULLET_RADIUS;

export function createScene(runtime: GameRuntime) {
	return class ArenaBlasterScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private spriteManager: any;
		private bulletManager: any;
		private inputManager: any;
		private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
		private wasdKeys: Record<string, Phaser.Input.Keyboard.Key> = {};
		private physicsManager: any;
		private playerSpawner: any;
		private bulletSpawner: any;
		private healthBarManager: any;
		private scoreText: Phaser.GameObjects.Text | null = null;
		private winText: Phaser.GameObjects.Text | null = null;
		private lobbyUI?: LobbyUI;
		private debugInterval?: any;
		private debugWindowCount = 0;
		private readonly debugMaxWindows = 6; // auto-stop after ~30s
		private debugStats = {
			fps: { sum: 0, count: 0, min: Number.POSITIVE_INFINITY, max: 0 },
			hostSync: { lastTs: 0, sum: 0, count: 0, max: 0 },
			arrival: { lastTs: 0, sum: 0, count: 0, max: 0 },
			bufferBuckets: { len1: 0, len2: 0, len3: 0, len4p: 0 },
			clamps: 0
		};

		create() {
			this.adapter = new PhaserAdapter(runtime, this, {
				// Slightly deeper buffer to absorb arrival jitter in preview
				snapshotBufferSize: 3
			});
		const isHost = this.adapter.isHost();

		// Create lobby UI
		this.lobbyUI = new LobbyUI(this.adapter, this, {
			title: 'Arena Blaster',
			subtitle: 'Waiting for players...',
			position: { x: 400, y: 200 },
			showInstructions: true
		});

		// Update lobby UI on state changes
		this.adapter.onChange((state: any) => {
			if (this.lobbyUI && state.__lobby) {
				this.lobbyUI.update(state.__lobby);
				if (state.__lobby.phase === 'lobby') {
					this.lobbyUI.show();
				} else {
					this.lobbyUI.hide();
				}
			}
		});

		// Background
			this.add.rectangle(400, 300, 800, 600, 0x2d3748);

			// Arena walls
			const wallColor = 0x4a5568;
			this.add.rectangle(400, 10, 800, 20, wallColor); // Top
			this.add.rectangle(400, 590, 800, 20, wallColor); // Bottom
			this.add.rectangle(10, 300, 20, 600, wallColor); // Left
			this.add.rectangle(790, 300, 20, 600, wallColor); // Right

			// SpriteManager for players with directional indicators
			this.spriteManager = this.adapter.createSpriteManager({
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					return this.add.circle(data.x, data.y, PLAYER_RADIUS, data.color);
				},

				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
				},

				onAdd: (sprite: any, key: string) => {
					// Attach directional indicator - auto-updates by default!
					attachDirectionalIndicator(this, sprite, {
						shape: 'triangle',
						offset: 20,
						color: 0xffffff
						// autoUpdate: true (default) - no manual update() needed!
					});
				}
			});

			// SpriteManager for bullets
			this.bulletManager = this.adapter.createSpriteManager({
				namespace: 'bullets_sprites',
				staticProperties: ['color'],

				onCreate: (key: string, data: any) => {
					// Get owner color from player state
					const state = runtime.getState();
					const ownerColor = state.players[data.ownerId]?.color || 0xffff00;
					return this.add.circle(data.x, data.y, BULLET_RADIUS, ownerColor);
				}
			});

			// NEW: StateDrivenSpawner for players!
			// Eliminates the manual "check for new players" loop!
			this.playerSpawner = this.adapter.createStateDrivenSpawner({
				stateKey: 'players',
				spriteManager: this.spriteManager,
				keyPrefix: 'player-',
				// Host physics drives position, so disable state→sprite sync
				sync: { properties: [] }
			});

			// NEW: StateDrivenSpawner for bullets!
			this.bulletSpawner = this.adapter.createStateDrivenSpawner({
				stateKey: 'bullets',
				spriteManager: this.bulletManager,
				keyPrefix: 'bullet-',
				keyField: 'id', // Use bullet.id as the key
				sync: { properties: ['x', 'y'] } // Auto-sync positions from state!
			});

			// NEW: HealthBarManager - auto-creates, positions, scales, colors!
			this.healthBarManager = this.adapter.createHealthBarManager({
				spriteManager: this.spriteManager,
				healthKey: 'health',
				maxHealth: 100,
				offset: { x: 0, y: -30 },
				width: 50,
				height: 5
			});

			// InputManager handles edge-triggered actions
			this.inputManager = this.adapter.createInputManager();

			// NEW: Edge-triggered actions via InputManager!
			this.inputManager.bindEdgeTriggers({
				'Space': 'shoot',
				'R': 'reset'
			});

			// Debug: low-noise telemetry every 5s to hunt jitter
			runtime.onChange(() => {
				const now = Date.now();
				if (isHost) {
					if (this.debugStats.hostSync.lastTs) {
						const delta = now - this.debugStats.hostSync.lastTs;
						this.debugStats.hostSync.sum += delta;
						this.debugStats.hostSync.count += 1;
						this.debugStats.hostSync.max = Math.max(this.debugStats.hostSync.max, delta);
					}
					this.debugStats.hostSync.lastTs = now;
				} else {
					if (this.debugStats.arrival.lastTs) {
						const delta = now - this.debugStats.arrival.lastTs;
						this.debugStats.arrival.sum += delta;
						this.debugStats.arrival.count += 1;
						this.debugStats.arrival.max = Math.max(this.debugStats.arrival.max, delta);
					}
					this.debugStats.arrival.lastTs = now;
				}
			});

			this.debugInterval = setInterval(() => {
				this.debugWindowCount += 1;

				// Snapshot buffer depth sampling
				const remoteSprites = (this.adapter as any).remoteSprites as Map<string, any>;
				if (remoteSprites) {
					for (const [, data] of remoteSprites.entries()) {
						const len = data.snapshots?.length || 0;
						if (len <= 1) {
							this.debugStats.bufferBuckets.len1 += 1;
							this.debugStats.clamps += 1;
						} else if (len === 2) {
							this.debugStats.bufferBuckets.len2 += 1;
						} else if (len === 3) {
							this.debugStats.bufferBuckets.len3 += 1;
						} else {
							this.debugStats.bufferBuckets.len4p += 1;
						}
					}
				}

				// Console debug intentionally removed (was logging every 5s)

				// Reset rolling stats for next window
				this.debugStats.fps = { sum: 0, count: 0, min: Number.POSITIVE_INFINITY, max: 0 };
				this.debugStats.hostSync = {
					...this.debugStats.hostSync,
					sum: 0,
					count: 0,
					max: 0,
					lastTs: 0
				};
				this.debugStats.arrival = {
					...this.debugStats.arrival,
					sum: 0,
					count: 0,
					max: 0,
					lastTs: 0
				};
				this.debugStats.bufferBuckets = { len1: 0, len2: 0, len3: 0, len4p: 0 };
				this.debugStats.clamps = 0;

				if (this.debugWindowCount >= this.debugMaxWindows) {
					clearInterval(this.debugInterval);
					this.debugInterval = undefined;
				}
			}, 5000);

			this.events.on('shutdown', () => {
				if (this.debugInterval) {
					clearInterval(this.debugInterval);
					this.debugInterval = undefined;
				}
			});

			// Capture Arrow + WASD movement keys manually (submit via adapter)
			this.cursors = this.input.keyboard.createCursorKeys();
			this.wasdKeys = this.input.keyboard.addKeys({
				W: Phaser.Input.Keyboard.KeyCodes.W,
				A: Phaser.Input.Keyboard.KeyCodes.A,
				S: Phaser.Input.Keyboard.KeyCodes.S,
				D: Phaser.Input.Keyboard.KeyCodes.D
			}) as Record<string, Phaser.Input.Keyboard.Key>;

			// PhysicsManager for top-down movement
			this.physicsManager = this.adapter.createPhysicsManager({
				spriteManager: this.spriteManager,
				inputKey: 'inputs'
			});
			this.physicsManager.addBehavior('topDown', { speed: PLAYER_SPEED });

			// Score display
			this.scoreText = this.add.text(10, 10, '', {
				fontSize: '18px',
				color: '#ffffff',
				fontStyle: 'bold'
			});
			this.scoreText.setDepth(100);

			// Win text
			this.winText = this.add.text(400, 250, '', {
				fontSize: '48px',
				color: '#48bb78',
				fontStyle: 'bold',
				align: 'center'
			});
			this.winText.setOrigin(0.5);
			this.winText.setDepth(100);
			this.winText.setVisible(false);

			// Controls
			this.add.text(400, 570, 'Arrow Keys or WASD: Move | Space: Shoot | R: Reset', {
				fontSize: '14px',
				color: '#ffffff'
			}).setOrigin(0.5).setDepth(100);

			// Initial spawn
			this.playerSpawner.sync();
			this.bulletSpawner.sync();
		}

		update(time: number, delta: number) {
			const state = runtime.getState();
			const fps = this.game.loop.actualFps || 0;
			this.debugStats.fps.sum += fps;
			this.debugStats.fps.count += 1;
			this.debugStats.fps.min = Math.min(this.debugStats.fps.min, fps);
			this.debugStats.fps.max = Math.max(this.debugStats.fps.max, fps);

			// Capture movement input (Arrow + WASD) and submit when changed
			const moveInput = {
				left: Boolean(this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown),
				right: Boolean(this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown),
				up: Boolean(this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown),
				down: Boolean(this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown)
			};
			this.adapter.submitActionOnChange('move', moveInput);

			// HOST: Auto-spawn players and bullets via StateDrivenSpawner!
			if (this.adapter.isHost()) {
				this.playerSpawner.update();
				this.bulletSpawner.update();

				// Update bullets physics
				const deltaSeconds = delta / 1000;
				for (let i = state.bullets.length - 1; i >= 0; i--) {
					const bullet = state.bullets[i];

					// Update position in state (SpriteManager will sync to sprites)
					bullet.x += bullet.velocityX * deltaSeconds;
					bullet.y += bullet.velocityY * deltaSeconds;

					// Update lifetime
					bullet.lifetime -= delta;

					// Check wall collision
					const hitWall =
						bullet.x - BULLET_RADIUS < 20 ||
						bullet.x + BULLET_RADIUS > 780 ||
						bullet.y - BULLET_RADIUS < 20 ||
						bullet.y + BULLET_RADIUS > 580;

					// Check player collision
					let hitPlayer = false;
					const playerIds = Object.keys(state.players);
					for (const pid of playerIds) {
						if (pid === bullet.ownerId) continue;
						const playerState = state.players[pid];
						if (!playerState || playerState.isInvulnerable) continue;

						const dx = bullet.x - playerState.x;
						const dy = bullet.y - playerState.y;
						const distance = Math.sqrt(dx * dx + dy * dy);

						if (distance < COLLISION_THRESHOLD) {
							runtime.submitAction('hit', { damage: 20, shooterId: bullet.ownerId }, pid);
							hitPlayer = true;
							break;
						}
					}

					// Remove bullet if needed
					if (bullet.lifetime <= 0 || hitWall || hitPlayer) {
						state.bullets.splice(i, 1);
					}
				}

				// Update cooldowns and invulnerability
				for (const pid of Object.keys(state.shootCooldowns)) {
					state.shootCooldowns[pid] = Math.max(0, state.shootCooldowns[pid] - delta);
				}

				for (const pid of Object.keys(state.players)) {
					const playerState = state.players[pid];
					if (playerState.invulnerabilityTimer > 0) {
						playerState.invulnerabilityTimer = Math.max(0, playerState.invulnerabilityTimer - delta);
						if (playerState.invulnerabilityTimer === 0) {
							playerState.isInvulnerable = false;
						}
					}
				}
			}

			// Update sprite rotation and invulnerability flash
			for (const [key, sprite] of this.spriteManager.getAll()) {
				const playerId = key.replace('player-', '');
				const playerState = state.players[playerId];

				// Sync sprite rotation (directional indicator auto-updates via scene events)
				if (playerState) {
					sprite.rotation = playerState.rotation;
				}

				// Invulnerability flash
				if (playerState?.isInvulnerable) {
					const flashPhase = Math.floor(Date.now() / 100) % 2;
					sprite.setAlpha(flashPhase === 0 ? 0.3 : 1.0);
				} else {
					sprite.setAlpha(1.0);
				}
			}

			// NEW: HealthBarManager auto-updates all health bars!
			this.healthBarManager.update();

			// Update score display
			if (this.scoreText) {
				const playerIds = Object.keys(state.players);
				const scores = playerIds.map((pid, index) => {
					const playerState = state.players[pid];
					return \`P\${index + 1}: \${playerState.score || 0}\`;
				});
				this.scoreText.setText(scores.join('  |  '));
			}

			// Update win screen
			if (this.winText) {
				if (state.gameOver && state.winner) {
					const myPlayerId = this.adapter.getMyPlayerId();
					const isWinner = state.winner === myPlayerId;
					this.winText.setText(isWinner ? 'YOU WIN!\\n\\nPress R to play again' : 'YOU LOSE\\n\\nPress R to play again');
					this.winText.setColor(isWinner ? '#48bb78' : '#ef4444');
					this.winText.setVisible(true);
				} else {
					this.winText.setVisible(false);
				}
			}

			// InputManager captures keyboard
			this.inputManager.update();

			// SpriteManager handles interpolation
			this.spriteManager.update();
			this.bulletManager.update();

			// PhysicsManager handles movement
			this.physicsManager.update();
		}

		private safeAvg(sum: number, count: number): string {
			if (!count) return '0.0';
			return (sum / count).toFixed(1);
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
		backgroundColor: '#2d3748'
	}
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
