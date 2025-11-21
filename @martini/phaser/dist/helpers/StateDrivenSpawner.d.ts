/**
 * StateDrivenSpawner - Automatic sprite spawning from state collections
 *
 * Eliminates the manual "check for new players/bullets" loop in every demo.
 * Watches a state collection (e.g., state.players, state.bullets) and automatically
 * creates/removes sprites as the collection changes.
 *
 * **PIT OF SUCCESS: Positions sync from state by default!**
 * Sprites automatically follow state.x/y changes unless you opt-out.
 *
 * **NEW: Automatic physics integration!**
 * Projectiles/moving entities automatically update from velocity - no manual position updates needed!
 *
 * Usage:
 * ```ts
 * // State-driven entities (default - positions sync automatically!)
 * const blobSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'players',
 *   spriteManager: this.spriteManager,
 *   keyPrefix: 'player-'
 *   // syncProperties: ['x', 'y'] is automatic! Just mutate state and sprites follow.
 * });
 *
 * // NEW: Velocity-based movement (projectiles, moving entities)
 * const bulletSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'bullets',
 *   spriteManager: this.bulletManager,
 *   keyField: 'id',
 *   physics: {
 *     velocityFromState: { x: 'velocityX', y: 'velocityY' }
 *   }
 * });
 *
 * // In scene.update():
 * bulletSpawner.update(delta); // Automatically updates positions from velocity!
 *
 * // Physics-driven entities (opt-out of position sync)
 * const paddleSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'players',
 *   spriteManager: this.spriteManager,
 *   keyPrefix: 'player-',
 *   syncProperties: [] // Empty = physics body controls position, not state
 * });
 *
 * // Custom properties (override default)
 * const bulletSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'bullets',
 *   spriteManager: this.bulletManager,
 *   syncProperties: ['x', 'y', 'rotation', 'alpha'] // Sync more than just position
 * });
 * ```
 *
 * This automatically:
 * - Creates sprites when new entries appear in state
 * - **Syncs x,y from state to sprites by default (opt-out with syncProperties: [])**
 * - **NEW: Updates positions from velocity automatically (opt-in with physics config)**
 * - Removes sprites when entries are deleted
 * - Works on both HOST (initial + late joins) and CLIENT (state sync)
 * - Handles arrays (bullets) and objects (players)
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { SpriteManager } from './SpriteManager.js';
export interface PhysicsConfig {
    /**
     * Automatically update position from velocity in state
     *
     * @example
     * ```ts
     * velocityFromState: { x: 'velocityX', y: 'velocityY' }
     * ```
     *
     * This will automatically apply:
     * ```ts
     * data.x += data.velocityX * deltaSeconds;
     * data.y += data.velocityY * deltaSeconds;
     * ```
     */
    velocityFromState?: {
        x: string;
        y: string;
    };
}
export interface StateDrivenSpawnerConfig {
    /**
     * Path to the collection in state (e.g., 'players', 'bullets', 'powerUps')
     */
    stateKey: string;
    /**
     * The SpriteManager to spawn sprites into
     */
    spriteManager: SpriteManager;
    /**
     * Optional prefix for sprite keys (e.g., 'player-' → 'player-abc123')
     */
    keyPrefix?: string;
    /**
     * For array collections, which field to use as the unique key
     * (e.g., 'id' for bullets)
     * If not provided, assumes state collection is an object and uses its keys
     */
    keyField?: string;
    /**
     * Optional filter function - only spawn if this returns true
     * @example
     * ```ts
     * filter: (data) => data.isAlive // Only spawn living entities
     * ```
     */
    filter?: (data: any) => boolean;
    /**
     * **Unified Sync Configuration**
     *
     * Controls automatic property synchronization from state to sprites.
     * **DEFAULT: Syncs ['x', 'y'] from state to sprites** (PIT OF SUCCESS!)
     *
     * @example
     * ```ts
     * // Default: State → Sprite position sync (automatic!)
     * // sync: { properties: ['x', 'y'], direction: 'toSprite' }
     *
     * // Physics-driven: No sync (physics body controls position)
     * sync: { properties: [] }
     *
     * // Custom properties
     * sync: { properties: ['x', 'y', 'rotation', 'alpha'] }
     * ```
     */
    sync?: {
        /**
         * Properties to sync (default: ['x', 'y'])
         */
        properties?: string[];
        /**
         * Sync direction (always 'toSprite' for StateDrivenSpawner)
         */
        direction?: 'toSprite';
    };
    /**
     * Custom update function for more complex sprite syncing
     * If provided, this takes precedence over syncProperties
     *
     * @example
     * ```ts
     * onUpdateSprite: (sprite, data) => {
     *   sprite.x = data.x;
     *   sprite.y = data.y;
     *   sprite.setAlpha(data.health / 100);
     * }
     * ```
     */
    onUpdateSprite?: (sprite: any, data: any) => void;
    /**
     * **NEW: Automatic physics integration**
     *
     * Automatically update entity positions from velocity in state.
     * Eliminates manual `entity.x += entity.velocityX * deltaSeconds` boilerplate.
     *
     * **Benefits:**
     * - 80% less code for projectiles/moving entities
     * - "Pit of success" - velocity-based movement just works
     * - Consistent with PhysicsManager mental model
     *
     * @example
     * ```ts
     * // Simple projectiles
     * const bulletSpawner = adapter.createStateDrivenSpawner({
     *   stateKey: 'bullets',
     *   spriteManager: bulletManager,
     *   keyField: 'id',
     *   physics: {
     *     velocityFromState: { x: 'velocityX', y: 'velocityY' }
     *   }
     * });
     *
     * // In update loop:
     * bulletSpawner.updatePhysics(delta); // Automatically updates positions!
     * ```
     */
    physics?: PhysicsConfig;
}
export declare class StateDrivenSpawner {
    private config;
    private adapter;
    private trackedKeys;
    private unsubscribe?;
    constructor(adapter: PhaserAdapter, config: StateDrivenSpawnerConfig);
    /**
     * Call this in scene.update() (HOST ONLY)
     * Checks for new entries in the state collection and spawns sprites
     *
     * @param delta - Optional delta time in milliseconds for physics updates
     *
     * @example
     * ```ts
     * update(time: number, delta: number) {
     *   // Without physics: just sync spawning/despawning
     *   spawner.update();
     *
     *   // With physics: update positions from velocity
     *   spawner.update(delta);
     * }
     * ```
     */
    update(delta?: number): void;
    /**
     * **NEW: Automatic physics updates**
     *
     * Updates entity positions from velocity in state.
     * Call this in your scene.update() with delta time.
     *
     * **Only runs on HOST** - clients receive position updates via state sync.
     *
     * @param delta - Delta time in milliseconds
     *
     * @example
     * ```ts
     * update(time: number, delta: number) {
     *   bulletSpawner.updatePhysics(delta);
     *   bulletSpawner.update(); // Sync sprites to new positions
     * }
     * ```
     */
    updatePhysics(delta: number): void;
    /**
     * Manually trigger a sync (useful for initial spawn in create())
     */
    sync(): void;
    /**
     * Core sync logic - creates/removes sprites based on state
     */
    private syncFromState;
    /**
     * Update sprite properties from state data
     * Only runs on HOST (clients get updates via SpriteManager sync)
     */
    private updateSpriteFromState;
    /**
     * Cleanup
     */
    destroy(): void;
}
//# sourceMappingURL=StateDrivenSpawner.d.ts.map