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
     * Optional: Called after sprite is fully created and ready (onCreate + onCreatePhysics done)
     * Fires for BOTH initial sprites and late-joining sprites
     * Use this for inter-sprite setup (collisions, custom logic, event wiring, etc.)
     *
     * @example
     * ```ts
     * onAdd: (sprite, key, data, context) => {
     *   // Attach particle emitter
     *   const trail = this.add.particles(sprite.x, sprite.y, 'particle');
     *   trail.startFollow(sprite);
     *
     *   // Per-sprite collision with unique object
     *   if (this.boss) {
     *     this.physics.add.collider(sprite, this.boss);
     *   }
     * }
     * ```
     */
    onAdd?: (sprite: any, key: string, data: TData, context: {
        manager: SpriteManager<TData>;
        allSprites: Map<string, any>;
    }) => void;
    /**
     * Optional: Keys from the initial data object to sync exactly once
     * Useful for metadata like player roles that should be available on clients.
     */
    staticProperties?: (keyof TData & string)[];
    /**
     * **Unified Sync Configuration**
     *
     * Controls automatic property synchronization between sprites and state.
     *
     * @example
     * ```ts
     * // Default: Sync sprite → state (physics-driven, host only)
     * sync: {
     *   properties: ['x', 'y', 'rotation', 'alpha'],  // default
     *   interval: 50  // ms, default
     * }
     *
     * // Adaptive sync: Only sync when sprite moves
     * sync: {
     *   properties: ['x', 'y'],
     *   adaptive: true,  // Skip sync for idle sprites
     *   adaptiveThreshold: 1  // pixels per frame
     * }
     *
     * // State-driven: Sync state → sprite (rare, use StateDrivenSpawner instead)
     * sync: {
     *   properties: ['x', 'y'],
     *   direction: 'toSprite'
     * }
     * ```
     */
    sync?: {
        /**
         * Properties to sync (default: ['x', 'y', 'rotation', 'alpha'])
         */
        properties?: string[];
        /**
         * Sync direction (default: 'toState' for SpriteManager)
         * - 'toState': Sprite properties → State (physics-driven, host only)
         * - 'toSprite': State properties → Sprite (state-driven, rare)
         */
        direction?: 'toState' | 'toSprite';
        /**
         * Sync interval in milliseconds (default: 50ms / 20 FPS)
         */
        interval?: number;
        /**
         * Enable adaptive sync (default: false)
         * When true, skips sync for idle sprites (reduces bandwidth)
         */
        adaptive?: boolean;
        /**
         * Movement threshold for adaptive sync (default: 1 pixel/frame)
         * Only syncs if sprite moved more than this distance
         */
        adaptiveThreshold?: number;
    };
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
    /**
     * Optional: Namespace for sprite data in state (default: '_sprites')
     * Use different namespaces to prevent collisions between multiple managers
     *
     * @example
     * ```ts
     * const playerMgr = adapter.createSpriteManager({
     *   namespace: 'players',  // → state.players.*
     *   onCreate: ...
     * });
     *
     * const enemyMgr = adapter.createSpriteManager({
     *   namespace: 'enemies',  // → state.enemies.*
     *   onCreate: ...
     * });
     * ```
     */
    namespace?: string;
}
export declare class SpriteManager<TData extends SpriteData = SpriteData> {
    private sprites;
    private spriteData;
    private labels;
    private config;
    private adapter;
    private unsubscribe?;
    readonly namespace: string;
    /**
     * Track sprites created locally via add() method
     * This eliminates the need to know player IDs for filtering
     */
    private localSprites;
    /**
     * Phaser Group containing all sprites managed by this SpriteManager.
     * Use this for collision detection:
     * @example
     * ```ts
     * this.physics.add.collider(ball, playerManager.group);
     * ```
     *
     * The group automatically includes all sprites added to this manager,
     * both early-joining and late-joining, solving the "forgot to add collider
     * for new player" bug.
     */
    readonly group: Phaser.GameObjects.Group;
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
     *
     * Automatically calls update methods on attached components (arrows, health bars, etc.)
     * if they use the `_update*` naming convention and autoUpdate is disabled.
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