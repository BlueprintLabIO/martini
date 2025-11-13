import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

const PLAYER_SPEED = 200;
const PLAYER_RADIUS = 15;
const BULLET_RADIUS = 4;
const COLLISION_THRESHOLD = PLAYER_RADIUS + BULLET_RADIUS; // 19px
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const WALL_THICKNESS = 20;

export function createArenaBlasterScene(
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean; down: boolean; shoot: boolean }; client: { left: boolean; right: boolean; up: boolean; down: boolean; shoot: boolean } }
) {
	return {
		create: function (this: Phaser.Scene) {
			// Background
			this.add.rectangle(400, 300, 800, 600, 0x2d3748);

			// Arena walls
			const wallColor = 0x4a5568;
			this.add.rectangle(400, 10, 800, 20, wallColor); // Top
			this.add.rectangle(400, 590, 800, 20, wallColor); // Bottom
			this.add.rectangle(10, 300, 20, 600, wallColor); // Left
			this.add.rectangle(790, 300, 20, 600, wallColor); // Right

			// Create adapter
			const adapter = new PhaserAdapter(runtime, this);
			(this as any).adapter = adapter;

			// Store sprites and UI elements
			(this as any).players = {};
			(this as any).bullets = {};
			(this as any).healthBars = {};
			(this as any).facingIndicators = {};
			(this as any).scoreText = null;
			(this as any).winText = null;

			// Track shoot button state for edge detection
			(this as any).shootButtonPressed = false;

			if (isHost) {
				// HOST: Create player sprites
				const state = runtime.getState();

				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					createPlayerSprite(this, pid, playerData, playerId, adapter);
				}

				// Listen for peer joins
				const createPeerSprite = (peerId: string) => {
					if ((this as any).players[peerId]) return;

					const state = runtime.getState();
					const playerData = state.players[peerId];
					if (!playerData) return;

					createPlayerSprite(this, peerId, playerData, playerId, adapter);
				};

				const existingPeers = transport.getPeerIds();
				existingPeers.forEach(createPeerSprite);
				transport.onPeerJoin(createPeerSprite);
			} else {
				// CLIENT: Render from state
				adapter.onChange((state: any) => {
					if (!state._sprites) return;

					for (const [key, data] of Object.entries(state._sprites) as [string, any][]) {
						// Render players
						if (key.startsWith('player-')) {
							const pid = key.replace('player-', '');
							if (!(this as any).players[key]) {
								const color = pid === playerId ? 0x48bb78 : 0xf56565;
								const player = this.add.circle(data.x || 400, data.y || 300, PLAYER_RADIUS, color);
								(this as any).players[key] = player;
								adapter.registerRemoteSprite(key, player);

								// Create health bar
								const healthBar = this.add.rectangle(data.x || 400, (data.y || 300) - 30, 50, 5, 0x48bb78);
								(this as any).healthBars[pid] = healthBar;

								// Create facing indicator
								const facingLine = this.add.line(0, 0, 0, 0, 20, 0, 0xffffff, 0.8);
								facingLine.setOrigin(0, 0.5);
								facingLine.setLineWidth(2);
								(this as any).facingIndicators[pid] = facingLine;
							}
						}
					}

					// Update health bars, invulnerability, and facing indicators
					if (state.players) {
						for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
							// Update health bar
							if ((this as any).healthBars[pid]) {
								const healthPercent = (playerData.health || 100) / 100;
								(this as any).healthBars[pid].setScale(healthPercent, 1);

								// Color based on health
								const healthColor =
									healthPercent > 0.5 ? 0x48bb78 : healthPercent > 0.25 ? 0xeab308 : 0xef4444;
								(this as any).healthBars[pid].setFillStyle(healthColor);
							}

							// Update invulnerability flashing
							const playerSprite = (this as any).players[`player-${pid}`];
							if (playerSprite && playerData.isInvulnerable) {
								// Flash every 100ms
								const flashPhase = Math.floor(Date.now() / 100) % 2;
								playerSprite.setAlpha(flashPhase === 0 ? 0.3 : 1.0);
							} else if (playerSprite) {
								playerSprite.setAlpha(1.0);
							}

							// Update facing indicator
							if ((this as any).facingIndicators[pid] && playerSprite) {
								const indicator = (this as any).facingIndicators[pid];
								indicator.setPosition(playerSprite.x, playerSprite.y);
								indicator.setRotation(playerData.rotation || 0);
							}
						}
					}

					// Render bullets
					if (state.bullets) {
						// Remove bullets that no longer exist
						for (const bulletId of Object.keys((this as any).bullets)) {
							const exists = state.bullets.some((b: any) => `bullet-${b.id}` === bulletId);
							if (!exists) {
								(this as any).bullets[bulletId]?.destroy();
								delete (this as any).bullets[bulletId];
							}
						}

						// Create/update bullets
						for (const bullet of state.bullets) {
							const bulletKey = `bullet-${bullet.id}`;
							if (!(this as any).bullets[bulletKey]) {
								// Determine bullet color based on owner
								const ownerColor = bullet.ownerId === playerId ? 0x48bb78 : 0xf56565;
								const bulletSprite = this.add.circle(bullet.x, bullet.y, BULLET_RADIUS, ownerColor);
								(this as any).bullets[bulletKey] = bulletSprite;
							} else {
								// Update position
								(this as any).bullets[bulletKey].x = bullet.x;
								(this as any).bullets[bulletKey].y = bullet.y;
							}
						}
					}
				});
			}

			// Score display (top-left)
			const scoreText = this.add.text(10, 10, '', {
				fontSize: '18px',
				color: '#ffffff',
				fontStyle: 'bold',
			});
			scoreText.setDepth(100);
			(this as any).scoreText = scoreText;

			// Win text (center, hidden initially)
			const winText = this.add.text(400, 250, '', {
				fontSize: '48px',
				color: '#48bb78',
				fontStyle: 'bold',
				align: 'center',
			});
			winText.setOrigin(0.5);
			winText.setDepth(100);
			winText.setVisible(false);
			(this as any).winText = winText;

			// Color explanation
			this.add
				.text(10, 550, 'Your player: Green | Opponent: Red', {
					fontSize: '12px',
					color: '#aaaaaa',
				})
				.setDepth(100);

			// Controls (bottom-center)
			const controls = role === 'host' ? 'WASD: Move | Space: Shoot' : 'Arrow Keys: Move | Enter: Shoot';
			this.add
				.text(400, 570, controls, {
					fontSize: '14px',
					color: '#ffffff',
				})
				.setOrigin(0.5)
				.setDepth(100);

			// Reset instructions
			this.add
				.text(400, 585, 'Press R to Reset', {
					fontSize: '12px',
					color: '#888888',
				})
				.setOrigin(0.5)
				.setDepth(100);

			// Keyboard handler for reset
			this.input.keyboard?.on('keydown-R', () => {
				runtime.submitAction('reset', undefined);
			});
		},

		update: function (this: Phaser.Scene, time: number, delta: number) {
			const state = runtime.getState();

			// CLIENT: Smooth interpolation
			if (!isHost) {
				(this as any).adapter?.updateInterpolation();
			}

			// Capture local input based on role
			const playerKeys = role === 'host' ? keys.host : keys.client;

			// Use global keyboard state (from DualViewDemo.svelte)
			const shootPressed = playerKeys.shoot;

			// Detect shoot button press (edge trigger)
			const wasPressed = (this as any).shootButtonPressed;
			(this as any).shootButtonPressed = shootPressed;
			const shootTriggered = shootPressed && !wasPressed;

			if (shootTriggered) {
				console.log(`[${role}] ✅ SHOOT TRIGGERED!`);
			}

			// Send input to runtime
			const input = {
				left: playerKeys.left,
				right: playerKeys.right,
				up: playerKeys.up,
				down: playerKeys.down,
				shoot: shootPressed,
			};
			runtime.submitAction('move', input);

			// Trigger shoot action on button press
			if (shootTriggered) {
				console.log(`[${role}] Shoot triggered!`);
				runtime.submitAction('shoot', undefined);
			}

			if (isHost) {
				// HOST: Apply physics and game logic
				const inputs = state.inputs || {};

				// Update players
				for (const [pid, playerInput] of Object.entries(inputs) as [string, any][]) {
					const player = (this as any).players[pid];
					if (!player || !player.body) continue;

					const body = player.body as Phaser.Physics.Arcade.Body;
					const playerState = state.players[pid];
					if (!playerState) continue;

					// Calculate movement vector
					const dx = (playerInput.right ? 1 : 0) - (playerInput.left ? 1 : 0);
					const dy = (playerInput.down ? 1 : 0) - (playerInput.up ? 1 : 0);

					// Normalize diagonal movement
					const length = Math.sqrt(dx * dx + dy * dy);
					let vx = 0;
					let vy = 0;

					if (length > 0) {
						vx = (dx / length) * PLAYER_SPEED;
						vy = (dy / length) * PLAYER_SPEED;
					}

					body.setVelocity(vx, vy);

					// Update state position and rotation
					playerState.x = player.x;
					playerState.y = player.y;
					player.rotation = playerState.rotation || 0;

					// Update health bar position
					if ((this as any).healthBars[pid]) {
						(this as any).healthBars[pid].x = player.x;
						(this as any).healthBars[pid].y = player.y - 30;

						const healthPercent = (playerState.health || 100) / 100;
						(this as any).healthBars[pid].setScale(healthPercent, 1);

						const healthColor = healthPercent > 0.5 ? 0x48bb78 : healthPercent > 0.25 ? 0xeab308 : 0xef4444;
						(this as any).healthBars[pid].setFillStyle(healthColor);
					}

					// Update facing indicator
					if ((this as any).facingIndicators[pid]) {
						const indicator = (this as any).facingIndicators[pid];
						indicator.setPosition(player.x, player.y);
						indicator.setRotation(playerState.rotation || 0);
					}

					// Update invulnerability flashing
					if (playerState.isInvulnerable) {
						const flashPhase = Math.floor(Date.now() / 100) % 2;
						player.setAlpha(flashPhase === 0 ? 0.3 : 1.0);
					} else {
						player.setAlpha(1.0);
					}
				}

				// Update bullets
				if (state.bullets) {
					const deltaSeconds = delta / 1000;

					for (let i = state.bullets.length - 1; i >= 0; i--) {
						const bullet = state.bullets[i];

						// Update position
						bullet.x += bullet.velocityX * deltaSeconds;
						bullet.y += bullet.velocityY * deltaSeconds;

						// Update lifetime
						bullet.lifetime -= delta;

						// Check wall collision
						const hitWall =
							bullet.x - BULLET_RADIUS < WALL_THICKNESS ||
							bullet.x + BULLET_RADIUS > ARENA_WIDTH - WALL_THICKNESS ||
							bullet.y - BULLET_RADIUS < WALL_THICKNESS ||
							bullet.y + BULLET_RADIUS > ARENA_HEIGHT - WALL_THICKNESS;

						// Check player collision
						let hitPlayer = false;
						for (const [pid, playerState] of Object.entries(state.players) as [string, any][]) {
							if (pid === bullet.ownerId) continue; // Can't hit self
							if (playerState.isInvulnerable) continue; // Can't hit invulnerable players

							const dx = bullet.x - playerState.x;
							const dy = bullet.y - playerState.y;
							const distance = Math.sqrt(dx * dx + dy * dy);

							if (distance < COLLISION_THRESHOLD) {
								// Hit!
								runtime.submitAction('hit', { damage: 20, shooterId: bullet.ownerId }, pid);
								hitPlayer = true;
								break;
							}
						}

						// Remove bullet if expired, hit wall, or hit player
						if (bullet.lifetime <= 0 || hitWall || hitPlayer) {
							state.bullets.splice(i, 1);
						}
					}

					// Render bullets on host
					// Remove old bullet sprites
					for (const bulletId of Object.keys((this as any).bullets)) {
						const exists = state.bullets.some((b: any) => `bullet-${b.id}` === bulletId);
						if (!exists) {
							(this as any).bullets[bulletId]?.destroy();
							delete (this as any).bullets[bulletId];
						}
					}

					// Create/update bullet sprites
					for (const bullet of state.bullets) {
						const bulletKey = `bullet-${bullet.id}`;
						if (!(this as any).bullets[bulletKey]) {
							const ownerColor = bullet.ownerId === playerId ? 0x48bb78 : 0xf56565;
							const bulletSprite = this.add.circle(bullet.x, bullet.y, BULLET_RADIUS, ownerColor);
							(this as any).bullets[bulletKey] = bulletSprite;
						} else {
							(this as any).bullets[bulletKey].x = bullet.x;
							(this as any).bullets[bulletKey].y = bullet.y;
						}
					}
				}

				// Update cooldowns and invulnerability timers
				const deltaMs = delta;

				for (const pid of Object.keys(state.shootCooldowns)) {
					state.shootCooldowns[pid] = Math.max(0, state.shootCooldowns[pid] - deltaMs);
				}

				for (const pid of Object.keys(state.players)) {
					const playerState = state.players[pid];
					if (playerState.invulnerabilityTimer > 0) {
						playerState.invulnerabilityTimer = Math.max(0, playerState.invulnerabilityTimer - deltaMs);
						if (playerState.invulnerabilityTimer === 0) {
							playerState.isInvulnerable = false;
						}
					}
				}
			} else {
				// CLIENT: Update health bar positions
				for (const [key, player] of Object.entries((this as any).players) as [string, any][]) {
					const pid = key.replace('player-', '');
					if ((this as any).healthBars[pid] && player) {
						(this as any).healthBars[pid].x = player.x;
						(this as any).healthBars[pid].y = player.y - 30;
					}
				}
			}

			// Update score display
			if ((this as any).scoreText && state.players) {
				const playerIds = Object.keys(state.players);
				const scores = playerIds.map((pid, index) => {
					const playerState = state.players[pid];
					return `P${index + 1}: ${playerState.score || 0}`;
				});
				(this as any).scoreText.setText(scores.join('  |  '));
			}

			// Update win screen
			if ((this as any).winText) {
				if (state.gameOver && state.winner) {
					const isWinner = state.winner === playerId;
					(this as any).winText.setText(isWinner ? 'YOU WIN!\n\nPress R to play again' : 'YOU LOSE\n\nPress R to play again');
					(this as any).winText.setColor(isWinner ? '#48bb78' : '#ef4444');
					(this as any).winText.setVisible(true);
				} else {
					(this as any).winText.setVisible(false);
				}
			}
		},
	};
}

// Helper function to create player sprite with all associated UI elements
function createPlayerSprite(
	scene: Phaser.Scene,
	pid: string,
	playerData: any,
	localPlayerId: string,
	adapter: any
) {
	const color = pid === localPlayerId ? 0x48bb78 : 0xf56565;
	const player = scene.add.circle(playerData.x, playerData.y, PLAYER_RADIUS, color);
	scene.physics.add.existing(player);
	(player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
	(scene as any).players[pid] = player;
	adapter.trackSprite(player, `player-${pid}`);

	// Health bar
	const healthBar = scene.add.rectangle(playerData.x, playerData.y - 30, 50, 5, 0x48bb78);
	(scene as any).healthBars[pid] = healthBar;

	// Facing indicator (line showing aim direction)
	const facingLine = scene.add.line(playerData.x, playerData.y, 0, 0, 20, 0, 0xffffff, 0.8);
	facingLine.setOrigin(0, 0.5);
	facingLine.setLineWidth(2);
	(scene as any).facingIndicators[pid] = facingLine;
}
