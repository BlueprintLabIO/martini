import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

export function createArenaBlasterScene(
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean }; client: { left: boolean; right: boolean; up: boolean } }
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

			// Store sprites
			(this as any).players = {};
			(this as any).bullets = {};
			(this as any).healthBars = {};
			(this as any).scoreTexts = {};

			if (isHost) {
				// HOST: Create player sprites
				const state = runtime.getState();

				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					const color = pid === playerId ? 0x48bb78 : 0xf56565; // Green for self, red for others
					const player = this.add.circle(playerData.x, playerData.y, 15, color);
					this.physics.add.existing(player);
					(player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(this as any).players[pid] = player;
					adapter.trackSprite(player, `player-${pid}`);

					// Health bar
					const healthBar = this.add.rectangle(playerData.x, playerData.y - 30, 50, 5, 0x48bb78);
					(this as any).healthBars[pid] = healthBar;

					// Score text
					const scoreText = this.add.text(10, 30 + Object.keys(this.players).length * 20, `P${Object.keys(state.players).length}: 0`, {
						fontSize: '14px',
						color: '#ffffff',
					});
					(this as any).scoreTexts[pid] = scoreText;
				}

				// Listen for peer joins to create their sprites
				const createPlayerSprite = (peerId: string) => {
					if ((this as any).players[peerId]) return;

					const state = runtime.getState();
					const playerData = state.players[peerId];
					if (!playerData) return;

					const color = peerId === playerId ? 0x48bb78 : 0xf56565;
					const player = this.add.circle(playerData.x, playerData.y, 15, color);
					this.physics.add.existing(player);
					(player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(this as any).players[peerId] = player;
					adapter.trackSprite(player, `player-${peerId}`);

					const healthBar = this.add.rectangle(playerData.x, playerData.y - 30, 50, 5, 0x48bb78);
					(this as any).healthBars[peerId] = healthBar;

					const scoreText = this.add.text(10, 30 + Object.keys((this as any).players).length * 20, `P${Object.keys(state.players).length}: 0`, {
						fontSize: '14px',
						color: '#ffffff',
					});
					(this as any).scoreTexts[peerId] = scoreText;
				};

				const existingPeers = transport.getPeerIds();
				existingPeers.forEach(createPlayerSprite);
				transport.onPeerJoin(createPlayerSprite);
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
								const player = this.add.circle(data.x || 400, data.y || 300, 15, color);
								(this as any).players[key] = player;
								adapter.registerRemoteSprite(key, player);

								const healthBar = this.add.rectangle(data.x || 400, (data.y || 300) - 30, 50, 5, 0x48bb78);
								(this as any).healthBars[pid] = healthBar;
							}
						}
					}

					// Update health bars and scores
					if (state.players) {
						for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
							if ((this as any).healthBars[pid]) {
								const healthPercent = (playerData.health || 100) / 100;
								(this as any).healthBars[pid].setScale(healthPercent, 1);
								(this as any).healthBars[pid].setFillStyle(
									healthPercent > 0.5 ? 0x48bb78 : healthPercent > 0.25 ? 0xecc94b : 0xf56565
								);
							}
							if (!(this as any).scoreTexts[pid]) {
								const scoreText = this.add.text(10, 30 + Object.keys((this as any).scoreTexts).length * 20, `Score: ${playerData.score || 0}`, {
									fontSize: '14px',
									color: '#ffffff',
								});
								(this as any).scoreTexts[pid] = scoreText;
							} else {
								(this as any).scoreTexts[pid].setText(`Score: ${playerData.score || 0}`);
							}
						}
					}
				});
			}

			// Labels
			const label = isHost ? 'PLAYER 1 (Host)' : 'PLAYER 2 (Client)';
			this.add
				.text(10, 10, label, {
					fontSize: '16px',
					color: '#ffffff',
				})
				.setDepth(100);

			const controls = role === 'host' ? 'WASD to Move' : 'Arrow Keys to Move';
			this.add
				.text(400, 570, controls, {
					fontSize: '14px',
					color: '#ffffff',
				})
				.setOrigin(0.5)
				.setDepth(100);
		},

		update: function (this: Phaser.Scene) {
			const speed = 200;

			// CLIENT: Smooth interpolation
			if (!isHost) {
				(this as any).adapter?.updateInterpolation();
			}

			// Capture local input based on role
			const playerKeys = role === 'host' ? keys.host : keys.client;
			const input = {
				left: playerKeys.left,
				right: playerKeys.right,
				up: playerKeys.up,
				down: false, // Not used in this demo
			};

			// Send input to runtime
			runtime.submitAction('move', input);

			if (isHost) {
				// HOST: Apply physics
				const state = runtime.getState();
				const inputs = state.inputs || {};

				// Update players
				for (const [pid, playerInput] of Object.entries(inputs) as [string, any][]) {
					const player = (this as any).players[pid];
					if (!player || !player.body) continue;

					const body = player.body as Phaser.Physics.Arcade.Body;
					let vx = 0;
					let vy = 0;

					if (playerInput.left) vx = -speed;
					if (playerInput.right) vx = speed;
					if (playerInput.up) vy = -speed;
					if (playerInput.down) vy = speed;

					body.setVelocity(vx, vy);

					// Update state
					state.players[pid].x = player.x;
					state.players[pid].y = player.y;

					// Update health bar position
					if ((this as any).healthBars[pid]) {
						(this as any).healthBars[pid].x = player.x;
						(this as any).healthBars[pid].y = player.y - 30;

						const healthPercent = (state.players[pid].health || 100) / 100;
						(this as any).healthBars[pid].setScale(healthPercent, 1);
						(this as any).healthBars[pid].setFillStyle(
							healthPercent > 0.5 ? 0x48bb78 : healthPercent > 0.25 ? 0xecc94b : 0xf56565
						);
					}
				}

				// Update score displays
				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					if ((this as any).scoreTexts[pid]) {
						(this as any).scoreTexts[pid].setText(`Score: ${playerData.score || 0}`);
					}
				}
			} else {
				// CLIENT: Update health bar positions based on interpolated sprite positions
				for (const [key, player] of Object.entries((this as any).players) as [string, any][]) {
					const pid = key.replace('player-', '');
					if ((this as any).healthBars[pid] && player) {
						(this as any).healthBars[pid].x = player.x;
						(this as any).healthBars[pid].y = player.y - 30;
					}
				}
			}
		},
	};
}
