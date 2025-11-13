import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

export function createCircuitRacerScene(
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
			this.add.rectangle(400, 300, 800, 600, 0x2d5016);

			// Draw track (simple oval)
			const trackGraphics = this.add.graphics();
			trackGraphics.lineStyle(100, 0x4a5568);
			trackGraphics.strokeEllipse(400, 300, 300, 200);

			trackGraphics.lineStyle(80, 0x2d5016);
			trackGraphics.strokeEllipse(400, 300, 300, 200);

			// Start/finish line
			const startLine = this.add.rectangle(100, 300, 5, 120, 0xffffff);

			// Checkpoints (invisible collision zones, visualized for demo)
			const checkpoint1 = this.add.rectangle(400, 100, 80, 20, 0xff6b6b, 0.3);
			const checkpoint2 = this.add.rectangle(700, 300, 20, 80, 0xff6b6b, 0.3);
			const checkpoint3 = this.add.rectangle(400, 500, 80, 20, 0xff6b6b, 0.3);

			// Create adapter
			const adapter = new PhaserAdapter(runtime, this);
			(this as any).adapter = adapter;

			// Store sprites
			(this as any).cars = {};
			(this as any).lapTexts = {};

			if (isHost) {
				// HOST: Create car sprites
				const state = runtime.getState();

				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					const color = pid === playerId ? 0x48bb78 : 0xf56565; // Green for self, red for others
					const car = this.add.rectangle(playerData.x, playerData.y, 20, 30, color);
					this.physics.add.existing(car);
					(car.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(this as any).cars[pid] = car;
					adapter.trackSprite(car, `car-${pid}`);

					// Lap counter
					const lapText = this.add.text(10, 30 + Object.keys((this as any).cars).length * 25, `P${Object.keys(state.players).length}: Lap 0/3`, {
						fontSize: '16px',
						color: '#ffffff',
					});
					(this as any).lapTexts[pid] = lapText;
				}

				// Listen for peer joins
				const createCarSprite = (peerId: string) => {
					if ((this as any).cars[peerId]) return;

					const state = runtime.getState();
					const playerData = state.players[peerId];
					if (!playerData) return;

					const color = peerId === playerId ? 0x48bb78 : 0xf56565;
					const car = this.add.rectangle(playerData.x, playerData.y, 20, 30, color);
					this.physics.add.existing(car);
					(car.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(this as any).cars[peerId] = car;
					adapter.trackSprite(car, `car-${peerId}`);

					const lapText = this.add.text(10, 30 + Object.keys((this as any).cars).length * 25, `P${Object.keys(state.players).length}: Lap 0/3`, {
						fontSize: '16px',
						color: '#ffffff',
					});
					(this as any).lapTexts[peerId] = lapText;
				};

				const existingPeers = transport.getPeerIds();
				existingPeers.forEach(createCarSprite);
				transport.onPeerJoin(createCarSprite);
			} else {
				// CLIENT: Render from state
				adapter.onChange((state: any) => {
					if (!state._sprites) return;

					for (const [key, data] of Object.entries(state._sprites) as [string, any][]) {
						// Render cars
						if (key.startsWith('car-')) {
							const pid = key.replace('car-', '');
							if (!(this as any).cars[key]) {
								const color = pid === playerId ? 0x48bb78 : 0xf56565;
								const car = this.add.rectangle(data.x || 100, data.y || 300, 20, 30, color);
								(this as any).cars[key] = car;
								adapter.registerRemoteSprite(key, car);
							}
						}
					}

					// Update lap displays
					if (state.players) {
						for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
							if (!(this as any).lapTexts[pid]) {
								const lapText = this.add.text(10, 30 + Object.keys((this as any).lapTexts).length * 25, `Lap ${playerData.lap || 0}/3`, {
									fontSize: '16px',
									color: '#ffffff',
								});
								(this as any).lapTexts[pid] = lapText;
							} else {
								const finishedText = playerData.finished ? ' - FINISHED!' : '';
								(this as any).lapTexts[pid].setText(`Lap ${playerData.lap || 0}/3${finishedText}`);
							}
						}
					}
				});
			}

			// Labels
			const label = isHost ? 'CAR 1 (Host)' : 'CAR 2 (Client)';
			this.add
				.text(10, 10, label, {
					fontSize: '16px',
					color: '#ffffff',
				})
				.setDepth(100);

			const controls = role === 'host' ? 'W/A/D to Drive' : 'Arrow Keys to Drive';
			this.add
				.text(400, 570, controls, {
					fontSize: '14px',
					color: '#ffffff',
				})
				.setOrigin(0.5)
				.setDepth(100);
		},

		update: function (this: Phaser.Scene, time: number, delta: number) {
			const acceleration = 5;
			const turnSpeed = 0.05;
			const maxSpeed = 200;
			const friction = 0.98;

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
			};

			// Send input to runtime
			runtime.submitAction('move', input);

			if (isHost) {
				// HOST: Apply physics
				const state = runtime.getState();
				const inputs = state.inputs || {};

				// Update cars
				for (const [pid, playerInput] of Object.entries(inputs) as [string, any][]) {
					const car = (this as any).cars[pid];
					if (!car || !car.body) continue;

					const body = car.body as Phaser.Physics.Arcade.Body;
					const player = state.players[pid];
					if (!player) continue;

					// Rotation
					if (playerInput.left) {
						player.rotation -= turnSpeed;
					}
					if (playerInput.right) {
						player.rotation += turnSpeed;
					}

					// Acceleration
					if (playerInput.up) {
						player.velocity = Math.min(player.velocity + acceleration, maxSpeed);
					} else {
						player.velocity *= friction;
					}

					// Apply velocity
					const vx = Math.cos(player.rotation) * player.velocity;
					const vy = Math.sin(player.rotation) * player.velocity;
					body.setVelocity(vx, vy);

					// Update rotation
					car.rotation = player.rotation;

					// Update state
					player.x = car.x;
					player.y = car.y;
				}

				// Update lap displays
				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					if ((this as any).lapTexts[pid]) {
						const finishedText = playerData.finished ? ' - FINISHED!' : '';
						(this as any).lapTexts[pid].setText(`Lap ${playerData.lap || 0}/3${finishedText}`);
					}
				}
			}
		},
	};
}
