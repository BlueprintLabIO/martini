/**
 * HealthBarManager - Auto-synced health bars for sprites
 *
 * Eliminates manual health bar creation, positioning, scaling, and color updates.
 * One-liner attachment like directional indicators, auto-updates from state.
 *
 * Usage:
 * ```ts
 * const healthBars = adapter.createHealthBarManager({
 *   spriteManager: this.spriteManager,
 *   healthKey: 'health',
 *   maxHealth: 100,
 *   offset: { x: 0, y: -30 },
 *   width: 50,
 *   height: 5
 * });
 *
 * // That's it! Health bars auto-create, auto-position, auto-scale, auto-color!
 * // Just call in update():
 * healthBars.update();
 * ```
 */
export class HealthBarManager {
    adapter;
    scene; // Phaser.Scene
    config;
    healthBars = new Map();
    constructor(adapter, config) {
        this.adapter = adapter;
        this.scene = adapter.getScene();
        this.config = {
            offset: { x: 0, y: -30 },
            width: 50,
            height: 5,
            colorThresholds: {
                high: { value: 50, color: 0x48bb78 }, // Green
                medium: { value: 25, color: 0xeab308 }, // Yellow
                low: { value: 0, color: 0xef4444 } // Red
            },
            depth: 100,
            showBackground: true,
            backgroundColor: 0x333333,
            ...config
        };
        // Listen for sprite additions via SpriteManager
        // We'll create health bars in update() when we detect new sprites
    }
    /**
     * Update all health bars
     * Call this in your scene's update() loop
     */
    update() {
        const state = this.adapter.getState();
        const sprites = this.config.spriteManager.getAll();
        // Create health bars for new sprites
        for (const [key, sprite] of sprites) {
            if (!this.healthBars.has(key)) {
                this.createHealthBar(key, sprite);
            }
        }
        // Update existing health bars
        for (const [key, healthBarObj] of this.healthBars.entries()) {
            const sprite = sprites.get(key);
            if (!sprite) {
                // Sprite removed, cleanup
                this.removeHealthBar(key);
                continue;
            }
            // Extract player/entity ID from sprite key
            const entityId = this.extractEntityId(key);
            const entityState = this.getEntityState(state, entityId);
            if (!entityState) {
                continue;
            }
            // Get health value
            const health = entityState[this.config.healthKey];
            if (health === undefined) {
                continue;
            }
            // Update position
            const offsetX = this.config.offset?.x ?? 0;
            const offsetY = this.config.offset?.y ?? -30;
            healthBarObj.bar.setPosition(sprite.x + offsetX, sprite.y + offsetY);
            if (healthBarObj.background) {
                healthBarObj.background.setPosition(sprite.x + offsetX, sprite.y + offsetY);
            }
            // Update scale
            const healthPercent = health / this.config.maxHealth;
            healthBarObj.bar.setScale(Math.max(0, healthPercent), 1);
            // Update color based on health
            const color = this.getColorForHealth(healthPercent * 100);
            healthBarObj.bar.setFillStyle(color);
        }
    }
    /**
     * Manually create a health bar for a sprite
     */
    createHealthBar(key, sprite) {
        const width = this.config.width ?? 50;
        const height = this.config.height ?? 5;
        const offsetX = this.config.offset?.x ?? 0;
        const offsetY = this.config.offset?.y ?? -30;
        // Create background bar (if enabled)
        let background;
        if (this.config.showBackground) {
            background = this.scene.add.rectangle(sprite.x + offsetX, sprite.y + offsetY, width, height, this.config.backgroundColor);
            background?.setDepth(this.config.depth ?? 100);
        }
        // Create foreground bar
        const bar = this.scene.add.rectangle(sprite.x + offsetX, sprite.y + offsetY, width, height, this.config.colorThresholds?.high?.color ?? 0x48bb78);
        bar.setDepth((this.config.depth ?? 100) + 1);
        bar.setOrigin(0, 0.5); // Left-aligned for scale effect
        // Adjust background origin to match
        background?.setOrigin(0, 0.5);
        this.healthBars.set(key, { bar, background });
    }
    /**
     * Remove a health bar
     */
    removeHealthBar(key) {
        const healthBarObj = this.healthBars.get(key);
        if (healthBarObj) {
            healthBarObj.bar.destroy();
            healthBarObj.background?.destroy();
            this.healthBars.delete(key);
        }
    }
    /**
     * Extract entity ID from sprite key
     * Assumes format like "player-abc123" or "enemy-xyz789"
     */
    extractEntityId(key) {
        const parts = key.split('-');
        return parts.length > 1 ? parts.slice(1).join('-') : key;
    }
    /**
     * Get entity state from game state
     * Tries common state keys: players, enemies, entities
     */
    getEntityState(state, entityId) {
        if (state.players?.[entityId]) {
            return state.players[entityId];
        }
        if (state.enemies?.[entityId]) {
            return state.enemies[entityId];
        }
        if (state.entities?.[entityId]) {
            return state.entities[entityId];
        }
        return null;
    }
    /**
     * Get color based on health percentage
     */
    getColorForHealth(healthPercent) {
        const thresholds = this.config.colorThresholds;
        if (healthPercent > (thresholds.high?.value ?? 50)) {
            return thresholds.high?.color ?? 0x48bb78;
        }
        else if (healthPercent > (thresholds.medium?.value ?? 25)) {
            return thresholds.medium?.color ?? 0xeab308;
        }
        else {
            return thresholds.low?.color ?? 0xef4444;
        }
    }
    /**
     * Cleanup all health bars
     */
    destroy() {
        for (const key of this.healthBars.keys()) {
            this.removeHealthBar(key);
        }
    }
}
//# sourceMappingURL=HealthBarManager.js.map