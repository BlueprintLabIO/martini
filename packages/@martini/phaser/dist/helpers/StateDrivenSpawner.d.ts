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
 * - Removes sprites when entries are deleted
 * - Works on both HOST (initial + late joins) and CLIENT (state sync)
 * - Handles arrays (bullets) and objects (players)
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { SpriteManager } from './SpriteManager.js';
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
     * Properties to sync from state to sprites on every update
     * **DEFAULT: ['x', 'y']** - Positions sync automatically (PIT OF SUCCESS!)
     *
     * Most state-driven entities want state-driven movement, so we default to syncing
     * positions. This eliminates the "forgot to sync positions" bug.
     *
     * **When to override:**
     * - ✅ **Omit for default** → Positions sync automatically
     * - ✅ **Custom props:** `['x', 'y', 'rotation', 'alpha']` → Sync more properties
     * - ✅ **Opt-out:** `[]` → Physics-driven (physics body controls position)
     *
     * @example
     * ```ts
     * // State-driven entities (default)
     * // syncProperties: ['x', 'y'] is automatic!
     *
     * // Physics-driven entities (opt-out)
     * syncProperties: [] // Physics body controls position
     *
     * // Custom properties
     * syncProperties: ['x', 'y', 'rotation', 'alpha']
     * ```
     */
    syncProperties?: string[];
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
     */
    update(): void;
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