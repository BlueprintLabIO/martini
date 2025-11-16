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
		sprites: any;
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

			// Create sprite registry with type-safe player management
			this.sprites = this.adapter.createSpriteRegistry({
				players: {
					onCreate: (key: string, data: { x: number; y: number; role: string }) => {
						const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
						return this.add.circle(data.x, data.y, 20, color);
					},
					onCreatePhysics: (sprite: any) => {
						this.physics.add.existing(sprite);
						const body = sprite.body as Phaser.Physics.Arcade.Body;
						body.setCollideWorldBounds(true);
						body.setBounce(0.2);
						this.physics.add.collider(sprite, this.platform);
					},
					staticProperties: ['role'],
					label: {
						getText: (data: any) => data.role.toUpperCase() + ' PLAYER',
						offset: { y: -30 },
						style: { fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }
					}
				}
			});

			if (this.isHost) {
				// HOST: Create ALL players using registry
				const state = runtime.getState();

				for (const [playerId, playerData] of Object.entries(state.players) as [string, any][]) {
					this.sprites.players.add(playerId, {
						x: playerData.x,
						y: playerData.y,
						role: playerData.role
					});
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
				// CLIENT: Auto-syncs via registry (no manual onChange needed!)

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

			// Update sprite registry (handles interpolation on clients)
			this.sprites.players.update();

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
					const circle = this.sprites.players.get(playerId);
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
