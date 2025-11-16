/**
 * SpriteManager - Automatic sprite synchronization helper
 *
 * Handles all the complexity of host/client sprite management:
 * - Host: Creates sprites, enables physics, tracks for sync
 * - Client: Creates visual sprites, registers for interpolation
 * - Automatic cleanup when sprites are removed
 *
 * Usage:
 * ```ts
 * const spriteManager = adapter.createSpriteManager({
 *   onCreate: (key, data) => {
 *     const sprite = this.add.sprite(data.x, data.y, 'player');
 *     if (this.adapter.isHost()) {
 *       this.physics.add.existing(sprite);
 *     }
 *     return sprite;
 *   }
 * });
 *
 * // Add sprites (works on both host and client)
 * spriteManager.add('player-1', { x: 100, y: 100 });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';
export interface SpriteData {
    x: number;
    y: number;
    [key: string]: any;
}
export interface SpriteManagerConfig<TData extends SpriteData = SpriteData> {
    /**
     * Factory function to create a sprite
     * Called on both host and client
     *
     * @example
     * ```ts
     * onCreate: (key, data) => {
     *   return this.add.sprite(data.x, data.y, 'player');
     * }
     * ```
     */
    onCreate: (key: string, data: TData) => any;
    /**
     * Optional: Setup physics (HOST ONLY - automatic)
     * Use this to add physics, colliders, and other host-authoritative logic
     * Framework automatically ensures this ONLY runs on host
     *
     * @example
     * ```ts
     * onCreatePhysics: (sprite, key, data) => {
     *   this.physics.add.existing(sprite);
     *   sprite.body.setCollideWorldBounds(true);
     *   sprite.body.setBounce(0.2);
     *   this.physics.add.collider(sprite, this.platforms);
     * }
     * ```
     */
    onCreatePhysics?: (sprite: any, key: string, data: TData) => void;
    /**
     * Optional: Update sprite properties when data changes (client only)
     * Useful for syncing non-position properties like color, scale, etc.
     */
    onUpdate?: (sprite: any, data: TData) => void;
    /**
     * Optional: Cleanup when sprite is removed
     */
    onDestroy?: (sprite: any, key: string) => void;
    /**
     * Optional: Keys from the initial data object to sync exactly once
     * Useful for metadata like player roles that should be available on clients.
     */
    staticProperties?: (keyof TData & string)[];
    /**
     * Properties to sync (default: x, y, rotation, alpha)
     */
    syncProperties?: string[];
    /**
     * Sync interval in ms (default: 50ms / 20 FPS)
     */
    syncInterval?: number;
    /**
     * Optional label configuration. When provided, SpriteManager renders labels above sprites.
     */
    label?: {
        getText: (data: TData) => string;
        offset?: {
            x?: number;
            y?: number;
        };
        style?: Phaser.Types.GameObjects.Text.TextStyle;
    };
}
export declare class SpriteManager<TData extends SpriteData = SpriteData> {
    private sprites;
    private spriteData;
    private labels;
    private config;
    private adapter;
    private unsubscribe?;
    constructor(adapter: PhaserAdapter, config: SpriteManagerConfig<TData>);
    /**
     * Add a sprite (call this on HOST only)
     * The sprite will automatically sync to clients
     */
    add(key: string, data: TData): any;
    /**
     * Remove a sprite
     */
    remove(key: string): void;
    /**
     * Get a sprite by key
     */
    get(key: string): any;
    /**
     * Get all sprites
     */
    getAll(): Map<string, any>;
    /**
     * Update loop (call this in scene.update() for smooth interpolation on clients)
     */
    update(): void;
    /**
     * Cleanup
     */
    destroy(): void;
    /**
     * CLIENT ONLY: Sync sprites from state
     */
    private syncFromState;
    private createLabel;
    private updateLabels;
    private updateLabelText;
    private updateLabelPosition;
}
//# sourceMappingURL=SpriteManager.d.ts.map