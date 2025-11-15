import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

/**
 * Fire & Ice Scene - Cooperative Platformer
 */
export function createFireAndIceScene(
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean; down: boolean }; client: { left: boolean; right: boolean; up: boolean; down: boolean } }
) {
	return class FireAndIceScene extends Phaser.Scene {
		adapter!: PhaserAdapter;
		players: Record<string, Phaser.GameObjects.Arc> = {};
		sprites: Record<string, Phaser.GameObjects.Arc> = {};
		platform!: Phaser.GameObjects.Rectangle;
		isHost = isHost;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);
			this.isHost = this.adapter.isHost();

			// Register runtime with IDE sandbox (for DevTools metrics)
			if (typeof window !== 'undefined' && (window as any).__MARTINI_IDE__) {
				(window as any).__MARTINI_IDE__.registerRuntime(runtime);
			}

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

			// Platform (both host and client see it)
			this.platform = this.add.rectangle(400, 550, 600, 20, 0x8b4513);
			this.physics.add.existing(this.platform, true);

			if (this.isHost) {
				// HOST: Create ALL players with physics
				const state = runtime.getState();

				for (const [playerId, playerData] of Object.entries(state.players) as [string, any][]) {
					const color = playerData.role === 'fire' ? 0xff3300 : 0x0033ff;
					const circle = this.add.circle(playerData.x, playerData.y, 20, color);
					this.physics.add.existing(circle);
					const body = circle.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
					body.setBounce(0.2);
					this.physics.add.collider(circle, this.platform);

					this.adapter.trackSprite(circle, `player-${playerId}`);
					this.players[playerId] = circle;
				}

				// Labels
				this.add
					.text(10, 10, 'FIRE PLAYER (Host)', {
						fontSize: '18px',
						color: '#000000',
					})
					.setDepth(100);

				this.add
					.text(400, 570, 'WASD to Move & Jump', {
						fontSize: '14px',
						color: '#000000',
					})
					.setOrigin(0.5)
					.setDepth(100);
			} else {
				// CLIENT: Create sprites from state
				this.adapter.onChange((state: any) => {
					if (!state._sprites) return;

					for (const [key, data] of Object.entries(state._sprites) as [string, any][]) {
						if (!this.sprites[key]) {
							// Extract player ID from sprite key
							const spritePlayerId = key.replace('player-', '');

							// If this sprite belongs to ME (the client), I'm ice (blue)
							// Otherwise it's the host who is fire (red)
							const color = spritePlayerId === this.adapter.myId ? 0x0033ff : 0xff3300;

							const circle = this.add.circle(data.x || 400, data.y || 400, 20, color);
							this.sprites[key] = circle;
							this.adapter.registerRemoteSprite(key, circle);
						}
					}
				});

				// Labels
				this.add
					.text(10, 10, 'ICE PLAYER (Client)', {
						fontSize: '18px',
						color: '#000000',
					})
					.setDepth(100);

				this.add
					.text(400, 570, 'Arrow Keys to Move & Jump', {
						fontSize: '14px',
						color: '#000000',
					})
					.setOrigin(0.5)
					.setDepth(100);
			}
		}

		update() {
			const speed = 200;
			const jumpSpeed = -350;

			// CLIENT: Smooth interpolation
			if (!this.isHost) {
				this.adapter.updateInterpolation();
			}

			// Capture local input based on role
			const playerKeys = role === 'host' ? keys.host : keys.client;
			const input = {
				left: playerKeys.left,
				right: playerKeys.right,
				up: playerKeys.up,
			};

			// Send input to runtime (both host and client do this!)
			runtime.submitAction('move', input);

			if (this.isHost) {
				// HOST: Apply physics for ALL players
				const state = runtime.getState();
				const inputs = state.inputs || {};

				for (const [playerId, playerInput] of Object.entries(inputs) as [string, any][]) {
					const circle = this.players[playerId];
					if (!circle || !circle.body) continue;

					const body = circle.body as Phaser.Physics.Arcade.Body;

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
		}
	};
}
