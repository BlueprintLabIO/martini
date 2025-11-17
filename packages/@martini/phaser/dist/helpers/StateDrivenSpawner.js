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
export class StateDrivenSpawner {
    config;
    adapter;
    trackedKeys = new Set();
    unsubscribe;
    constructor(adapter, config) {
        this.adapter = adapter;
        // PIT OF SUCCESS: Default to syncing positions from state
        // This eliminates the "forgot to sync positions" bug that affects state-driven entities.
        // Most games using StateDrivenSpawner want state-driven movement (not physics-driven).
        // Physics-based games typically don't mutate state.x/y, so this default is safe.
        // Users can opt-out with syncProperties: [] for manual control.
        if (!config.syncProperties && !config.onUpdateSprite) {
            config.syncProperties = ['x', 'y'];
        }
        this.config = config;
        // HOST: Poll state every update to spawn new entries
        // CLIENT: React to state changes via onChange
        if (adapter.isHost()) {
            // Host checks state directly (no onChange subscription needed)
            // Just need to call update() from scene
        }
        else {
            // Client subscribes to state changes
            this.unsubscribe = adapter.onChange((state) => {
                this.syncFromState(state);
            });
        }
    }
    /**
     * Call this in scene.update() (HOST ONLY)
     * Checks for new entries in the state collection and spawns sprites
     */
    update() {
        if (!this.adapter.isHost()) {
            return; // Client uses onChange subscription instead
        }
        const state = this.adapter.getState();
        this.syncFromState(state);
    }
    /**
     * Manually trigger a sync (useful for initial spawn in create())
     */
    sync() {
        const state = this.adapter.getState();
        this.syncFromState(state);
    }
    /**
     * Core sync logic - creates/removes sprites based on state
     */
    syncFromState(state) {
        const collection = state[this.config.stateKey];
        if (!collection)
            return;
        const currentKeys = new Set();
        // Determine if collection is array or object
        const isArray = Array.isArray(collection);
        // Extract entries
        const entries = isArray
            ? collection.map((item) => {
                const key = this.config.keyField ? item[this.config.keyField] : item.id;
                return [String(key), item];
            })
            : Object.entries(collection);
        // Create/update sprites for entries
        for (const [rawKey, data] of entries) {
            // Apply filter if provided
            if (this.config.filter && !this.config.filter(data)) {
                continue;
            }
            const spriteKey = this.config.keyPrefix ? `${this.config.keyPrefix}${rawKey}` : rawKey;
            currentKeys.add(spriteKey);
            // If sprite already exists, update its properties
            if (this.trackedKeys.has(spriteKey)) {
                this.updateSpriteFromState(spriteKey, data);
                continue;
            }
            // Create sprite (only on HOST - SpriteManager handles client sync)
            if (this.adapter.isHost()) {
                this.config.spriteManager.add(spriteKey, data);
                this.trackedKeys.add(spriteKey);
            }
            else {
                // On client, just track that we've seen it (SpriteManager creates it via state sync)
                this.trackedKeys.add(spriteKey);
            }
        }
        // Remove sprites that no longer exist in state
        for (const spriteKey of this.trackedKeys) {
            if (!currentKeys.has(spriteKey)) {
                this.config.spriteManager.remove(spriteKey);
                this.trackedKeys.delete(spriteKey);
            }
        }
    }
    /**
     * Update sprite properties from state data
     * Only runs on HOST (clients get updates via SpriteManager sync)
     */
    updateSpriteFromState(spriteKey, data) {
        // Only update on host - clients rely on SpriteManager's automatic sync
        if (!this.adapter.isHost()) {
            return;
        }
        const sprite = this.config.spriteManager.get(spriteKey);
        if (!sprite)
            return;
        // Custom update function takes precedence
        if (this.config.onUpdateSprite) {
            this.config.onUpdateSprite(sprite, data);
            return;
        }
        // Sync properties (opt-in only - no default!)
        if (this.config.syncProperties) {
            for (const prop of this.config.syncProperties) {
                if (prop in data && sprite[prop] !== undefined) {
                    sprite[prop] = data[prop];
                }
            }
        }
    }
    /**
     * Cleanup
     */
    destroy() {
        this.unsubscribe?.();
    }
}
//# sourceMappingURL=StateDrivenSpawner.js.map