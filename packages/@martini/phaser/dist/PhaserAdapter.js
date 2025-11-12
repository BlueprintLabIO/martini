/**
 * PhaserAdapter - Bridge between Phaser and @martini/core
 *
 * v2: Fully automatic sprite syncing. Host runs physics, clients mirror.
 * User never has to think about networking - it just works.
 */
/**
 * Phaser Adapter - Auto-syncs sprites via GameRuntime
 *
 * Usage:
 * ```ts
 * const adapter = new PhaserAdapter(runtime, scene);
 * adapter.trackSprite(playerSprite, `player-${playerId}`);
 * // That's it! Sprite automatically syncs across network
 * ```
 */
export class PhaserAdapter {
    runtime;
    scene;
    trackedSprites = new Map();
    remoteSprites = new Map(); // Sprites created for remote players
    syncIntervalId = null;
    constructor(runtime, scene // Phaser.Scene
    ) {
        this.runtime = runtime;
        this.scene = scene;
        // Ensure state has sprites object
        this.runtime.mutateState((state) => {
            if (!state._sprites) {
                state._sprites = {};
            }
        });
        // Listen for state changes to update sprites (clients only)
        this.runtime.onChange((state) => {
            if (!this.isHost()) {
                this.updateSpritesFromState(state);
            }
        });
    }
    /**
     * Get my player ID
     */
    get myId() {
        return this.runtime.getTransport().getPlayerId();
    }
    /**
     * Check if this peer is the host
     */
    isHost() {
        return this.runtime.getTransport().isHost();
    }
    /**
     * Track a sprite - automatically syncs position/rotation/etc
     *
     * @param sprite Phaser sprite to track
     * @param key Unique key for this sprite (e.g., `player-${playerId}`)
     * @param options Tracking options
     *
     * @example
     * ```ts
     * const player = this.physics.add.sprite(100, 100, 'player');
     * adapter.trackSprite(player, `player-${adapter.myId}`);
     * ```
     */
    trackSprite(sprite, key, options = {}) {
        this.trackedSprites.set(key, { sprite, options });
        // Initialize sprite state immediately
        if (this.isHost()) {
            this.syncSpriteToState(key, sprite, options);
            // Start sync loop if not already running
            if (!this.syncIntervalId) {
                const interval = options.syncInterval || 50;
                this.syncIntervalId = setInterval(() => this.syncAllSprites(), interval);
            }
        }
    }
    /**
     * Stop tracking a sprite
     */
    untrackSprite(key) {
        this.trackedSprites.delete(key);
        // Remove from state
        this.runtime.mutateState((state) => {
            if (state._sprites && state._sprites[key]) {
                delete state._sprites[key];
            }
        });
        // Stop sync loop if no more sprites
        if (this.trackedSprites.size === 0 && this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
    /**
     * Broadcast a custom event
     */
    broadcast(eventName, payload) {
        this.runtime.broadcastEvent(eventName, payload);
    }
    /**
     * Listen for custom events
     */
    on(eventName, callback) {
        return this.runtime.onEvent(eventName, (senderId, _eventName, payload) => {
            callback(senderId, payload);
        });
    }
    /**
     * Cleanup
     */
    destroy() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        this.trackedSprites.clear();
        this.remoteSprites.clear();
    }
    // ============================================================================
    // Private methods
    // ============================================================================
    /**
     * Sync all tracked sprites to state (host only)
     */
    syncAllSprites() {
        if (!this.isHost())
            return;
        for (const [key, { sprite, options }] of this.trackedSprites.entries()) {
            this.syncSpriteToState(key, sprite, options);
        }
    }
    /**
     * Sync a single sprite to state
     */
    syncSpriteToState(key, sprite, options) {
        const properties = options.properties || ['x', 'y', 'rotation', 'alpha'];
        const updates = {};
        for (const prop of properties) {
            if (prop in sprite) {
                updates[prop] = sprite[prop];
            }
        }
        // Directly mutate state (host only)
        this.runtime.mutateState((state) => {
            if (!state._sprites) {
                state._sprites = {};
            }
            state._sprites[key] = { ...state._sprites[key], ...updates };
        });
    }
    /**
     * Update sprites from state (clients only)
     */
    updateSpritesFromState(state) {
        if (this.isHost() || !state._sprites)
            return;
        // Update tracked sprites (sprites that exist on this client)
        for (const [key, tracked] of this.trackedSprites.entries()) {
            const spriteData = state._sprites[key];
            if (spriteData) {
                this.applySpriteData(tracked.sprite, spriteData);
            }
        }
        // Update remote sprites (sprites from other players)
        // Note: For now, we just update existing sprites. Creating remote sprites
        // is left to the game code (they can listen to state changes and create sprites)
        for (const [key, spriteData] of Object.entries(state._sprites)) {
            // Skip if this is our own sprite
            if (this.trackedSprites.has(key))
                continue;
            // If we have a remote sprite for this key, update it
            const remoteSprite = this.remoteSprites.get(key);
            if (remoteSprite) {
                this.applySpriteData(remoteSprite, spriteData);
            }
        }
    }
    /**
     * Apply sprite data to a sprite
     */
    applySpriteData(sprite, data) {
        if ('x' in data)
            sprite.x = data.x;
        if ('y' in data)
            sprite.y = data.y;
        if ('rotation' in data)
            sprite.rotation = data.rotation;
        if ('alpha' in data)
            sprite.alpha = data.alpha;
        if ('scaleX' in data)
            sprite.scaleX = data.scaleX;
        if ('scaleY' in data)
            sprite.scaleY = data.scaleY;
        if ('visible' in data)
            sprite.visible = data.visible;
    }
    /**
     * Register a remote sprite (for tracking sprites from other players)
     *
     * @example
     * ```ts
     * adapter.onChange((state) => {
     *   for (const [key, data] of Object.entries(state._sprites)) {
     *     if (!this.sprites[key] && key !== `player-${adapter.myId}`) {
     *       const sprite = this.add.sprite(data.x, data.y, 'player');
     *       adapter.registerRemoteSprite(key, sprite);
     *     }
     *   }
     * });
     * ```
     */
    registerRemoteSprite(key, sprite) {
        this.remoteSprites.set(key, sprite);
    }
    /**
     * Unregister a remote sprite
     */
    unregisterRemoteSprite(key) {
        const sprite = this.remoteSprites.get(key);
        if (sprite && sprite.destroy) {
            sprite.destroy();
        }
        this.remoteSprites.delete(key);
    }
    /**
     * Listen for state changes (convenience wrapper)
     */
    onChange(callback) {
        return this.runtime.onChange(callback);
    }
}
//# sourceMappingURL=PhaserAdapter.js.map