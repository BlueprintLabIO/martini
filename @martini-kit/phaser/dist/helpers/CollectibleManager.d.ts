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
    getPosition: (item: TItem) => {
        x: number;
        y: number;
    };
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
    getPlayerPosition?: (player: TPlayer) => {
        x: number;
        y: number;
    };
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
export declare function createCollectibleManager(adapter: PhaserAdapter, scene: Phaser.Scene, config: CollectibleManagerConfig): CollectibleManager;
//# sourceMappingURL=CollectibleManager.d.ts.map