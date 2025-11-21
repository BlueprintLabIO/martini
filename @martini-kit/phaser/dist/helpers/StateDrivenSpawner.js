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
export class StateDrivenSpawner {
    config;
    adapter;
    trackedKeys = new Set();
    unsubscribe;
    constructor(adapter, config) {
        this.adapter = adapter;
        // PIT OF SUCCESS: Default to syncing positions from state
        if (!config.sync?.properties && !config.onUpdateSprite) {
            // Default: sync x,y from state to sprites
            config.sync = { properties: ['x', 'y'], direction: 'toSprite' };
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
    update(delta) {
        if (!this.adapter.isHost()) {
            return; // Client uses onChange subscription instead
        }
        // Update physics before syncing (so new positions are synced)
        if (delta !== undefined && this.config.physics) {
            this.updatePhysics(delta);
        }
        const state = this.adapter.getState();
        this.syncFromState(state);
    }
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
    updatePhysics(delta) {
        if (!this.adapter.isHost()) {
            return; // Only host updates physics - clients get state sync
        }
        if (!this.config.physics?.velocityFromState) {
            return; // No physics config
        }
        const state = this.adapter.getState();
        const collection = state[this.config.stateKey];
        if (!collection)
            return;
        const deltaSeconds = delta / 1000;
        const { x: velXKey, y: velYKey } = this.config.physics.velocityFromState;
        // Determine if collection is array or object
        const isArray = Array.isArray(collection);
        // Extract entries
        const entries = isArray
            ? collection.map((item) => {
                const key = this.config.keyField ? item[this.config.keyField] : item.id;
                return [String(key), item];
            })
            : Object.entries(collection);
        // Update positions from velocity
        for (const [_, data] of entries) {
            // Apply filter if provided
            if (this.config.filter && !this.config.filter(data)) {
                continue;
            }
            // Check if velocity properties exist in state
            if (velXKey in data && velYKey in data) {
                // Update position from velocity
                // Initialize position if missing
                if (!('x' in data))
                    data.x = 0;
                if (!('y' in data))
                    data.y = 0;
                data.x += data[velXKey] * deltaSeconds;
                data.y += data[velYKey] * deltaSeconds;
            }
        }
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
        // Sync properties using unified API
        const syncProperties = this.config.sync?.properties;
        if (syncProperties) {
            for (const prop of syncProperties) {
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