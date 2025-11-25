/**
 * CollectibleManager - Automatic collectible collision detection & visual feedback
 *
 * Eliminates common bugs in collectible/powerup systems:
 * - Forgetting isHost() checks → desync bugs
 * - Manual coordinate transformations
 * - No built-in visual feedback
 * - Each game reimplements the same collision logic
 *
 * Features:
 * - Automatic host-only collision detection (prevents desyncs!)
 * - Supports grid-based and continuous coordinate spaces
 * - Built-in visual feedback (particles, sounds, popups)
 * - Type-safe configuration
 *
 * @example
 * ```ts
 * import { createCollectibleManager } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.collectibles = createCollectibleManager(this.adapter, this, {
 *   powerup: {
 *     stateKey: 'powerups',
 *     collectAction: 'collectPowerup',
 *     
 *     getPosition: (item) => ({
 *       x: item.x * TILE_SIZE + TILE_SIZE / 2,
 *       y: item.y * TILE_SIZE + TILE_SIZE / 2
 *     }),
 *     
 *     radius: 20,
 *     collisionType: 'grid', // or 'continuous'
 *     
 *     onCollect: (item) => ({
 *       popup: `+${item.type.toUpperCase()}!`,
 *       sound: 'pickup'
 *     })
 *   }
 * });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { GameRuntime } from '@martini-kit/core';

export type CollisionType = 'grid' | 'continuous';

export interface CollectibleConfig<TItem = any, TPlayer = any> {
	/**
	 * Key in state where collectibles are stored
	 * e.g., 'powerups', 'coins', 'items'
	 */
	stateKey: string;

	/**
	 * Action name to submit when collectible is collected
	 * e.g., 'collectPowerup', 'collectCoin'
	 */
	collectAction: string;

	/**
	 * Get world position of collectible
	 * For grid-based, convert grid coords to world coords
	 */
	getPosition: (item: TItem) => { x: number; y: number };

	/**
	 * Collision radius in world units
	 */
	radius: number;

	/**
	 * Collision type
	 * - 'grid': Snap positions to grid, exact cell match
	 * - 'continuous': Use radius-based collision in continuous space
	 */
	collisionType?: CollisionType;

	/**
	 * Optional: Get player position (defaults to player.x, player.y)
	 */
	getPlayerPosition?: (player: TPlayer) => { x: number; y: number };

	/**
	 * Optional: Visual feedback when collected
	 */
	onCollect?: (item: TItem, scene: Phaser.Scene) => {
		/** Popup text to show (e.g., "+BOMB!") */
		popup?: string;
		/** Sound key to play */
		sound?: string;
		/** Particle effect key */
		particle?: string;
	} | void;

	/**
	 * Optional: ID field name (default: 'id')
	 */
	idField?: string;
}

export interface CollectibleManagerConfig {
	/**
	 * Collectible types to manage
	 * Key is a friendly name, value is the config
	 */
	[collectibleType: string]: CollectibleConfig;
}

export interface CollectibleManager {
	/** Update collision detection (automatically called in adapter.update) */
	update: () => void;
	/** Manually trigger collection (for testing) */
	collect: (collectibleType: string, itemId: any) => void;
	/** Destroy manager */
	destroy: () => void;
}

/**
 * Create a collectible manager with automatic host-only collision detection
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Collectible configurations
 * @returns CollectibleManager instance
 */
export function createCollectibleManager(
	adapter: PhaserAdapter,
	scene: Phaser.Scene,
	config: CollectibleManagerConfig
): CollectibleManager {
	const runtime = adapter.getRuntime();
	let unsubscribe: (() => void) | undefined;

	/**
	 * Check collision between player and collectible
	 */
	const checkCollision = (
		playerPos: { x: number; y: number },
		itemPos: { x: number; y: number },
		radius: number,
		collisionType: CollisionType
	): boolean => {
		if (collisionType === 'grid') {
			// Grid-based: exact cell match (with rounding)
			const playerGridX = Math.round(playerPos.x / radius);
			const playerGridY = Math.round(playerPos.y / radius);
			const itemGridX = Math.round(itemPos.x / radius);
			const itemGridY = Math.round(itemPos.y / radius);

			return playerGridX === itemGridX && playerGridY === itemGridY;
		} else {
			// Continuous: radius-based collision
			const dx = playerPos.x - itemPos.x;
			const dy = playerPos.y - itemPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			return distance < radius;
		}
	};

	/**
	 * Show visual feedback
	 */
	const showFeedback = (
		itemPos: { x: number; y: number },
		feedback: { popup?: string; sound?: string; particle?: string }
	) => {
		// Popup text
		if (feedback.popup) {
			const text = scene.add.text(itemPos.x, itemPos.y - 20, feedback.popup, {
				fontSize: '16px',
				color: '#fbbf24',
				fontStyle: 'bold',
				stroke: '#000',
				strokeThickness: 3
			});
			text.setOrigin(0.5);

			// Animate up and fade out
			scene.tweens.add({
				targets: text,
				y: itemPos.y - 50,
				alpha: 0,
				duration: 800,
				ease: 'Cubic.easeOut',
				onComplete: () => text.destroy()
			});
		}

		// Sound
		if (feedback.sound && scene.sound) {
			try {
				scene.sound.play(feedback.sound);
			} catch (e) {
				// Sound not loaded, ignore
			}
		}

		// Particles (simple implementation)
		if (feedback.particle) {
			// Create simple particle effect using graphics
			for (let i = 0; i < 8; i++) {
				const angle = (i / 8) * Math.PI * 2;
				const speed = 50 + Math.random() * 50;
				const vx = Math.cos(angle) * speed;
				const vy = Math.sin(angle) * speed;

				const particle = scene.add.circle(itemPos.x, itemPos.y, 3, 0xfbbf24);
				scene.tweens.add({
					targets: particle,
					x: itemPos.x + vx,
					y: itemPos.y + vy,
					alpha: 0,
					scale: 0,
					duration: 400,
					ease: 'Cubic.easeOut',
					onComplete: () => particle.destroy()
				});
			}
		}
	};

	/**
	 * Main update function - checks collisions for current player
	 * IMPORTANT: Only runs on HOST to prevent desyncs!
	 */
	const update = () => {
		// ✅ AUTOMATIC HOST-ONLY CHECK - prevents desync bugs!
		if (!adapter.isHost()) return;

		const state = runtime.getState();
		const myPlayerId = runtime.getMyPlayerId();
		const myPlayer = state.players?.[myPlayerId];

		if (!myPlayer) return;

		// Check each collectible type
		for (const [collectibleType, collectibleConfig] of Object.entries(config)) {
			const items = state[collectibleConfig.stateKey];
			if (!Array.isArray(items)) continue;

			const idField = collectibleConfig.idField || 'id';
			const playerPos = collectibleConfig.getPlayerPosition
				? collectibleConfig.getPlayerPosition(myPlayer)
				: { x: myPlayer.x, y: myPlayer.y };

			// Check collision with each item
			for (const item of items) {
				const itemPos = collectibleConfig.getPosition(item);
				const collisionType = collectibleConfig.collisionType || 'continuous';

				if (checkCollision(playerPos, itemPos, collectibleConfig.radius, collisionType)) {
					// Collision detected! Submit action
					const itemId = item[idField];

					// Show visual feedback (client-side)
					const feedback = collectibleConfig.onCollect?.(item, scene);
					if (feedback) {
						showFeedback(itemPos, feedback);
					}

					// Submit action (server authoritative)
					runtime.submitAction(collectibleConfig.collectAction, { [idField]: itemId });
				}
			}
		}
	};

	/**
	 * Manual collection trigger (for testing/buttons)
	 */
	const collect = (collectibleType: string, itemId: any) => {
		const collectibleConfig = config[collectibleType];
		if (!collectibleConfig) {
			console.warn(`Unknown collectible type: ${collectibleType}`);
			return;
		}

		const idField = collectibleConfig.idField || 'id';
		runtime.submitAction(collectibleConfig.collectAction, { [idField]: itemId });
	};

	/**
	 * Auto-update on state changes (optional optimization)
	 * We could also let the scene call update() manually
	 */
	// unsubscribe = adapter.onChange(() => {
	//   update();
	// });

	return {
		update,
		collect,
		destroy: () => {
			unsubscribe?.();
		}
	};
}
