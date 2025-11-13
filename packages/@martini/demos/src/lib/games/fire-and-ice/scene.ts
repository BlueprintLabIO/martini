import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

export function createFireAndIceScene(
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
			this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

			// Create adapter
			const adapter = new PhaserAdapter(runtime, this);
			(this as any).adapter = adapter;

			// Platform
			const platform = this.add.rectangle(400, 550, 600, 20, 0x8b4513);
			this.physics.add.existing(platform, true);

			// Store player sprites
			(this as any).players = {};

			if (isHost) {
				// HOST: Create fire player (red) immediately
				const firePlayer = this.add.circle(200, 400, 20, 0xff3300);
				this.physics.add.existing(firePlayer);
				(firePlayer.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
				(firePlayer.body as Phaser.Physics.Arcade.Body).setBounce(0.2);
				this.physics.add.collider(firePlayer, platform);
				(this as any).players[playerId] = firePlayer;

				// Track fire player
				adapter.trackSprite(firePlayer, `player-${playerId}`);

				// Helper to create ice player
				const createIcePlayer = (peerId: string) => {
					if ((this as any).players[peerId]) return; // Already created

					const icePlayer = this.add.circle(600, 400, 20, 0x0033ff);
					this.physics.add.existing(icePlayer);
					(icePlayer.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(icePlayer.body as Phaser.Physics.Arcade.Body).setBounce(0.2);
					this.physics.add.collider(icePlayer, platform);
					(this as any).players[peerId] = icePlayer;
					adapter.trackSprite(icePlayer, `player-${peerId}`);
				};

				// HOST: Check for existing peers (LocalTransport connects instantly!)
				const existingPeers = transport.getPeerIds();
				existingPeers.forEach((peerId) => {
					createIcePlayer(peerId);
				});

				// HOST: Also listen for future peer joins (in case more join later)
				transport.onPeerJoin((peerId: string) => {
					createIcePlayer(peerId);
				});
			} else {
				// CLIENT: Render sprites from state
				adapter.onChange((state: any) => {
					if (!state._sprites) return;

					for (const [key, data] of Object.entries(state._sprites) as [string, any][]) {
						if (!(this as any).players[key]) {
							// Extract player ID from sprite key
							const spritePlayerId = key.replace('player-', '');

							// If this sprite belongs to ME (the client), I'm ice (blue)
							// Otherwise it's the host who is fire (red)
							const color = spritePlayerId === playerId ? 0x0033ff : 0xff3300;

							const sprite = this.add.circle(data.x || 400, data.y || 400, 20, color);
							(this as any).players[key] = sprite;
							adapter.registerRemoteSprite(key, sprite);
						}
					}
				});
			}

			// Labels
			this.add
				.text(10, 10, isHost ? 'FIRE PLAYER (Host)' : 'ICE PLAYER (Client)', {
					fontSize: '18px',
					color: '#000000',
				})
				.setDepth(100);

			const controls = role === 'host' ? 'WASD to Move & Jump' : 'Arrow Keys to Move & Jump';
			this.add
				.text(400, 570, controls, {
					fontSize: '14px',
					color: '#000000',
				})
				.setOrigin(0.5)
				.setDepth(100);
		},

		update: function (this: Phaser.Scene) {
			const speed = 200;
			const jumpSpeed = -350;

			// CLIENT: Smooth interpolation
			if (!isHost) {
				(this as any).adapter?.updateInterpolation();
			}

			// Capture local input from global keyboard state based on role
			const playerKeys = role === 'host' ? keys.host : keys.client;
			const input = {
				left: playerKeys.left,
				right: playerKeys.right,
				up: playerKeys.up,
			};

			// Send input to runtime
			runtime.submitAction('move', input);

			if (isHost) {
				// HOST: Apply physics for ALL players
				const state = runtime.getState();
				const inputs = state.inputs || {};

				for (const [pid, playerInput] of Object.entries(inputs) as [string, any][]) {
					const sprite = (this as any).players[pid];
					if (!sprite || !sprite.body) {
						console.warn(
							'No sprite or body for player:',
							pid,
							'Available players:',
							Object.keys((this as any).players)
						);
						continue;
					}

					const body = sprite.body as Phaser.Physics.Arcade.Body;

					// Apply input
					if (playerInput.left) {
						body.setVelocityX(-speed);
					} else if (playerInput.right) {
						body.setVelocityX(speed);
					} else {
						body.setVelocityX(0);
					}

					if (playerInput.up && body.touching.down) {
						body.setVelocityY(jumpSpeed);
					}
				}
			}
		},
	};
}
