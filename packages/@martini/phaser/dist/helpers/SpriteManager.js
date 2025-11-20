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
    spriteData = new Map();
    labels = new Map();
    config;
    adapter;
    unsubscribe;
    namespace;
    /**
     * Track sprites created locally via add() method
     * This eliminates the need to know player IDs for filtering
     */
    localSprites = new Set();
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
    group;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = config;
        this.namespace = config.namespace || '_sprites';
        // Create Phaser group for collision management
        const scene = adapter.getScene();
        this.group = scene.add.group();
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
        // Track that we created this sprite locally
        this.localSprites.add(key);
        // Create sprite
        const sprite = this.config.onCreate(key, data);
        this.sprites.set(key, sprite);
        this.spriteData.set(key, data);
        this.createLabel(key, data, sprite);
        // Add to group for collision management
        this.group.add(sprite);
        // Setup physics (HOST ONLY - automatic)
        if (this.config.onCreatePhysics) {
            this.config.onCreatePhysics(sprite, key, data);
        }
        if (this.config.staticProperties?.length) {
            const staticData = {};
            for (const prop of this.config.staticProperties) {
                if (prop in data) {
                    staticData[prop] = data[prop];
                }
            }
            if (Object.keys(staticData).length > 0) {
                this.adapter.setSpriteStaticData(key, staticData, this.namespace);
            }
        }
        // Track for automatic sync (host only)
        const syncProperties = this.config.sync?.properties || ['x', 'y', 'rotation', 'alpha'];
        const syncInterval = this.config.sync?.interval;
        this.adapter.trackSprite(sprite, key, {
            properties: syncProperties,
            syncInterval: syncInterval,
            namespace: this.namespace
        });
        // Call onAdd hook (if provided)
        if (this.config.onAdd) {
            this.config.onAdd(sprite, key, data, {
                manager: this,
                allSprites: this.sprites
            });
        }
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
        const label = this.labels.get(key);
        if (label) {
            label.text.destroy();
            this.labels.delete(key);
        }
        this.spriteData.delete(key);
        // Stop tracking
        if (this.adapter.isHost()) {
            this.adapter.untrackSprite(key, this.namespace);
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
     *
     * Automatically calls update methods on attached components (arrows, health bars, etc.)
     * if they use the `_update*` naming convention and autoUpdate is disabled.
     */
    update() {
        if (!this.adapter.isHost()) {
            this.adapter.updateInterpolation();
        }
        this.updateLabels();
        // Auto-call attached component updates (fallback for manual mode)
        // Note: If attachDirectionalIndicator is using autoUpdate: true (default),
        // this is redundant but harmless. This provides backward compatibility
        // for code that set autoUpdate: false and expects manual updates.
        for (const sprite of this.sprites.values()) {
            if (typeof sprite._updateArrow === 'function') {
                sprite._updateArrow();
            }
            // Future: _updateHealthBar, _updateNameTag, etc.
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
        const spriteData = state[this.namespace];
        if (!spriteData)
            return;
        // Create/update sprites based on state
        for (const [key, data] of Object.entries(spriteData)) {
            // Skip sprites we created locally (pit of success: no player ID needed!)
            if (this.localSprites.has(key)) {
                continue;
            }
            if (!this.sprites.has(key)) {
                // FIX #1: Wait for static properties before creating sprites (pit of success!)
                // This prevents the "sprite created before metadata arrives" race condition.
                // Matches the pattern used by PlayerUIManager (lines 200-207).
                if (this.config.staticProperties?.length) {
                    const hasAllStatic = this.config.staticProperties.every(prop => prop in data);
                    if (!hasAllStatic) {
                        // Static metadata not ready yet - skip creation until next sync
                        continue;
                    }
                }
                // Create new sprite (now guaranteed to have all static properties!)
                const sprite = this.config.onCreate(key, data);
                this.sprites.set(key, sprite);
                this.spriteData.set(key, data);
                this.group.add(sprite); // Add to group on client side too
                this.adapter.registerRemoteSprite(key, sprite, this.namespace);
                this.createLabel(key, data, sprite);
                // Call onAdd hook (if provided) - runs for late-joining sprites on clients
                if (this.config.onAdd) {
                    this.config.onAdd(sprite, key, data, {
                        manager: this,
                        allSprites: this.sprites
                    });
                }
            }
            else {
                // Update existing sprite (optional)
                if (this.config.onUpdate) {
                    const sprite = this.sprites.get(key);
                    this.config.onUpdate(sprite, data);
                }
                this.spriteData.set(key, data);
            }
            this.updateLabelText(key);
            this.updateLabelPosition(key);
        }
        // Remove sprites that no longer exist in state
        for (const key of this.sprites.keys()) {
            if (!(key in spriteData)) {
                this.remove(key);
            }
        }
    }
    createLabel(key, data, sprite) {
        const labelConfig = this.config.label;
        if (!labelConfig)
            return;
        const scene = this.adapter.getScene();
        if (!scene?.add?.text)
            return;
        const textValue = labelConfig.getText(data);
        const style = labelConfig.style || { fontSize: '12px', color: '#ffffff' };
        const label = scene.add.text(sprite.x, sprite.y, textValue, style).setOrigin(0.5);
        this.labels.set(key, { text: label, offset: labelConfig.offset });
    }
    updateLabels() {
        for (const key of this.labels.keys()) {
            this.updateLabelText(key);
            this.updateLabelPosition(key);
        }
    }
    updateLabelText(key) {
        const labelConfig = this.config.label;
        if (!labelConfig)
            return;
        const labelEntry = this.labels.get(key);
        if (!labelEntry)
            return;
        const data = this.spriteData.get(key);
        if (!data)
            return;
        const next = labelConfig.getText(data);
        if (labelEntry.text.text !== next) {
            labelEntry.text.setText(next);
        }
    }
    updateLabelPosition(key) {
        const labelEntry = this.labels.get(key);
        if (!labelEntry)
            return;
        const sprite = this.sprites.get(key);
        if (!sprite)
            return;
        const offsetX = labelEntry.offset?.x ?? 0;
        const offsetY = labelEntry.offset?.y ?? -20;
        labelEntry.text.setPosition(sprite.x + offsetX, sprite.y + offsetY);
    }
}
//# sourceMappingURL=SpriteManager.js.map