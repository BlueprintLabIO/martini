import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

/**
 * Fire & Ice Scene - Web App Architecture Pattern
 *
 * Self-contained class-based scene that only needs runtime.
 * Works in web IDEs and matches AI-generated code structure.
 */
export function createFireAndIceScene(runtime: GameRuntime) {
	return class FireAndIceScene extends Phaser.Scene {
		adapter!: PhaserAdapter;
		players: Record<string, Phaser.GameObjects.Arc> = {};
		sprites: Record<string, Phaser.GameObjects.Arc> = {};
		platform!: Phaser.GameObjects.Rectangle;
		isHost = false;

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
				// HOST: Create local player (fire - red) immediately
				const myCircle = this.add.circle(200, 400, 20, 0xff3300);
				this.physics.add.existing(myCircle);
				const body = myCircle.body as Phaser.Physics.Arcade.Body;
				body.setCollideWorldBounds(true);
				body.setBounce(0.2);
				this.physics.add.collider(myCircle, this.platform);

				this.adapter.trackSprite(myCircle, `player-${this.adapter.myId}`);
				this.players[this.adapter.myId] = myCircle;

				// Labels
				this.add
					.text(10, 10, 'FIRE PLAYER (Host)', {
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
				return;
			}

			// Capture keyboard input
			const cursors = this.input.keyboard!.createCursorKeys();
			const input = {
				left: cursors.left.isDown,
				right: cursors.right.isDown,
				up: cursors.up.isDown,
			};

			// Send input to runtime
			runtime.submitAction('move', input);

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
	};
}
