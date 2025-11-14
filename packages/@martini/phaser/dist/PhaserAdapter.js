/**
 * PhaserAdapter - Bridge between Phaser and @martini/core
 *
 * v2: Fully automatic sprite syncing. Host runs physics, clients mirror.
 * User never has to think about networking - it just works.
 */
import { SpriteManager } from './helpers/SpriteManager.js';
import { InputManager } from './helpers/InputManager.js';
/**
 * Phaser Adapter - Auto-syncs sprites via GameRuntime
 *
 * Usage:
 * ```ts
 * const adapter = new PhaserAdapter(runtime, scene, {
 *   spriteNamespace: 'gameSprites', // optional, defaults to '_sprites'
 *   autoInterpolate: true,           // optional, defaults to true
 *   lerpFactor: 0.3                  // optional, defaults to 0.3
 * });
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
    spriteNamespace;
    autoInterpolate;
    lerpFactor;
    constructor(runtime, scene, // Phaser.Scene
    config = {}) {
        this.runtime = runtime;
        this.scene = scene;
        this.spriteNamespace = config.spriteNamespace || '_sprites';
        this.autoInterpolate = config.autoInterpolate !== false; // default true
        this.lerpFactor = config.lerpFactor ?? 0.3;
        // Ensure state has sprites object
        this.runtime.mutateState((state) => {
            if (!state[this.spriteNamespace]) {
                state[this.spriteNamespace] = {};
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
        // Start sync loop if not already running (host only)
        if (this.isHost() && !this.syncIntervalId) {
            const interval = options.syncInterval || 50;
            this.syncIntervalId = setInterval(() => this.syncAllSprites(), interval);
        }
        // Note: We do NOT immediately sync here to avoid infinite loops
        // when trackSprite is called inside onChange callbacks.
        // The interval-based sync will handle the first sync.
    }
    /**
     * Stop tracking a sprite
     */
    untrackSprite(key) {
        this.trackedSprites.delete(key);
        // Remove from state
        this.runtime.mutateState((state) => {
            const sprites = state[this.spriteNamespace];
            if (sprites && sprites[key]) {
                delete sprites[key];
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
            if (!state[this.spriteNamespace]) {
                state[this.spriteNamespace] = {};
            }
            const sprites = state[this.spriteNamespace];
            sprites[key] = { ...sprites[key], ...updates };
        });
    }
    /**
     * Update sprites from state (clients only)
     */
    updateSpritesFromState(state) {
        const sprites = state[this.spriteNamespace];
        if (this.isHost() || !sprites)
            return;
        // Update tracked sprites (sprites that exist on this client)
        for (const [key, tracked] of this.trackedSprites.entries()) {
            const spriteData = sprites[key];
            if (spriteData) {
                this.applySpriteData(tracked.sprite, spriteData);
            }
        }
        // Update remote sprites (sprites from other players)
        // Store target positions for interpolation
        for (const [key, spriteData] of Object.entries(sprites)) {
            // Skip if this is our own sprite
            if (this.trackedSprites.has(key))
                continue;
            // If we have a remote sprite for this key, store target position
            const remoteSprite = this.remoteSprites.get(key);
            if (remoteSprite) {
                // Store target position for smooth interpolation
                remoteSprite._targetX = spriteData.x;
                remoteSprite._targetY = spriteData.y;
                remoteSprite._targetRotation = spriteData.rotation;
                // First update - snap to position immediately
                if (remoteSprite._targetX !== undefined && remoteSprite.x === undefined) {
                    remoteSprite.x = remoteSprite._targetX;
                    remoteSprite.y = remoteSprite._targetY;
                    remoteSprite.rotation = remoteSprite._targetRotation || 0;
                }
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
     * @param key - Unique identifier for this sprite
     * @param sprite - The Phaser sprite to register
     *
     * @example
     * ```ts
     * adapter.onChange((state) => {
     *   const sprites = state._sprites || state.gameSprites; // depends on config
     *   for (const [key, data] of Object.entries(sprites)) {
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
     * Call this in your Phaser update() loop to smoothly interpolate remote sprites
     * This should be called every frame (60 FPS) for smooth movement
     *
     * Note: If autoInterpolate is enabled in config, you don't need to call this manually.
     */
    updateInterpolation() {
        if (this.isHost())
            return; // Only clients interpolate
        for (const [key, sprite] of this.remoteSprites.entries()) {
            if (sprite._targetX !== undefined) {
                // Lerp towards target position
                sprite.x += (sprite._targetX - sprite.x) * this.lerpFactor;
                sprite.y += (sprite._targetY - sprite.y) * this.lerpFactor;
                if (sprite._targetRotation !== undefined) {
                    sprite.rotation += (sprite._targetRotation - sprite.rotation) * this.lerpFactor;
                }
            }
        }
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
    /**
     * Get the current game state (typed)
     */
    getState() {
        return this.runtime.getState();
    }
    /**
     * Get the runtime (for advanced usage)
     */
    getRuntime() {
        return this.runtime;
    }
    // ============================================================================
    // Helper Factories
    // ============================================================================
    /**
     * Create a SpriteManager for automatic sprite synchronization
     *
     * @example
     * ```ts
     * const spriteManager = adapter.createSpriteManager({
     *   onCreate: (key, data) => {
     *     const sprite = this.add.sprite(data.x, data.y, 'player');
     *     if (adapter.isHost()) {
     *       this.physics.add.existing(sprite);
     *     }
     *     return sprite;
     *   }
     * });
     *
     * // Host: Add sprites
     * spriteManager.add('player-1', { x: 100, y: 100 });
     *
     * // Update loop: Enable interpolation
     * spriteManager.update();
     * ```
     */
    createSpriteManager(config) {
        return new SpriteManager(this, config);
    }
    /**
     * Create an InputManager for simplified input handling
     *
     * @example
     * ```ts
     * const input = adapter.createInputManager();
     *
     * input.bindKeys({
     *   'ArrowLeft': { action: 'move', input: { x: -1 }, mode: 'continuous' },
     *   'ArrowRight': { action: 'move', input: { x: 1 }, mode: 'continuous' },
     *   'Space': 'jump'
     * });
     *
     * // In update loop
     * input.update();
     * ```
     */
    createInputManager() {
        return new InputManager(this, this.scene);
    }
}
//# sourceMappingURL=PhaserAdapter.js.map