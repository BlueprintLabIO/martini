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
export class SpriteManager {
    sprites = new Map();
    config;
    adapter;
    unsubscribe;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = config;
        // If client, listen for sprite data from state
        if (!adapter.isHost()) {
            this.unsubscribe = adapter.onChange((state) => {
                this.syncFromState(state);
            });
        }
    }
    /**
     * Add a sprite (call this on HOST only)
     * The sprite will automatically sync to clients
     */
    add(key, data) {
        if (!this.adapter.isHost()) {
            console.warn('[SpriteManager] add() should only be called on host. Use state sync on clients.');
            return null;
        }
        // Don't recreate if already exists
        if (this.sprites.has(key)) {
            return this.sprites.get(key);
        }
        // Create sprite
        const sprite = this.config.onCreate(key, data);
        this.sprites.set(key, sprite);
        // Setup physics (HOST ONLY - automatic)
        if (this.config.onCreatePhysics) {
            this.config.onCreatePhysics(sprite, key, data);
        }
        // Track for automatic sync (host only)
        this.adapter.trackSprite(sprite, key, {
            properties: this.config.syncProperties || ['x', 'y', 'rotation', 'alpha'],
            syncInterval: this.config.syncInterval
        });
        return sprite;
    }
    /**
     * Remove a sprite
     */
    remove(key) {
        const sprite = this.sprites.get(key);
        if (!sprite)
            return;
        // Cleanup callback
        this.config.onDestroy?.(sprite, key);
        // Destroy sprite
        if (sprite.destroy) {
            sprite.destroy();
        }
        // Stop tracking
        if (this.adapter.isHost()) {
            this.adapter.untrackSprite(key);
        }
        else {
            this.adapter.unregisterRemoteSprite(key);
        }
        this.sprites.delete(key);
    }
    /**
     * Get a sprite by key
     */
    get(key) {
        return this.sprites.get(key);
    }
    /**
     * Get all sprites
     */
    getAll() {
        return this.sprites;
    }
    /**
     * Update loop (call this in scene.update() for smooth interpolation on clients)
     */
    update() {
        if (!this.adapter.isHost()) {
            this.adapter.updateInterpolation();
        }
    }
    /**
     * Cleanup
     */
    destroy() {
        // Remove all sprites
        for (const key of this.sprites.keys()) {
            this.remove(key);
        }
        // Unsubscribe from state changes
        this.unsubscribe?.();
    }
    /**
     * CLIENT ONLY: Sync sprites from state
     */
    syncFromState(state) {
        const spriteNamespace = this.adapter.spriteNamespace || '_sprites';
        const spriteData = state[spriteNamespace];
        if (!spriteData)
            return;
        // Create/update sprites based on state
        for (const [key, data] of Object.entries(spriteData)) {
            if (!this.sprites.has(key)) {
                // Create new sprite
                const sprite = this.config.onCreate(key, data);
                this.sprites.set(key, sprite);
                this.adapter.registerRemoteSprite(key, sprite);
            }
            else {
                // Update existing sprite (optional)
                if (this.config.onUpdate) {
                    const sprite = this.sprites.get(key);
                    this.config.onUpdate(sprite, data);
                }
            }
        }
        // Remove sprites that no longer exist in state
        for (const key of this.sprites.keys()) {
            if (!(key in spriteData)) {
                this.remove(key);
            }
        }
    }
}
//# sourceMappingURL=SpriteManager.js.map