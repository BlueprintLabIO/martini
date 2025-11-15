/**
 * PlayerUIManager - Automatic UI synchronization for players
 *
 * Eliminates bugs caused by:
 * - Creating UI before player metadata (side, team, etc.) is synced
 * - Forgetting to update UI when player data changes
 * - Manual loops to create/update/destroy UI elements
 *
 * Features:
 * - Waits for staticProperties before creating UI (no race conditions!)
 * - Auto-repositions UI when metadata changes
 * - Auto-creates UI for late-joining players
 * - Auto-destroys UI when players leave
 *
 * Usage:
 * ```ts
 * const playerUI = adapter.createPlayerUIManager({
 *   score: {
 *     position: (player) => ({
 *       x: player.side === 'left' ? 200 : 600,
 *       y: 80
 *     }),
 *     getText: (player) => String(player.score || 0),
 *     style: { fontSize: '48px', color: '#fff' }
 *   },
 *
 *   health: {
 *     position: (player) => ({ x: player.x, y: player.y - 30 }),
 *     width: 50,
 *     height: 5,
 *     getValue: (player) => player.health / player.maxHealth,
 *     backgroundColor: 0x333333,
 *     foregroundColor: 0x00ff00
 *   }
 * });
 * ```
 */
export class PlayerUIManager {
    adapter;
    scene; // Phaser.Scene
    config;
    playerElements = new Map(); // playerId -> elementName -> UIElement
    unsubscribe;
    constructor(adapter, scene, config) {
        this.adapter = adapter;
        this.scene = scene;
        this.config = config;
        // Subscribe to state changes
        this.unsubscribe = adapter.onChange((state) => {
            this.syncFromState(state);
        });
    }
    /**
     * Get UI element for a specific player
     */
    get(playerId, elementName) {
        return this.playerElements.get(playerId)?.get(elementName)?.gameObject;
    }
    /**
     * Manually update all UI (also called automatically on state changes)
     */
    update() {
        const state = this.adapter.getRuntime().getState();
        this.syncFromState(state);
    }
    /**
     * Cleanup
     */
    destroy() {
        // Destroy all UI elements
        for (const [playerId, elements] of this.playerElements.entries()) {
            for (const [elementName, element] of elements.entries()) {
                this.destroyElement(element);
            }
        }
        this.playerElements.clear();
        // Unsubscribe from state changes
        this.unsubscribe?.();
    }
    /**
     * Sync UI from state
     */
    syncFromState(state) {
        if (!state.players)
            return;
        const existingPlayers = new Set(this.playerElements.keys());
        // Create/update UI for each player
        for (const [playerId, playerData] of Object.entries(state.players)) {
            existingPlayers.delete(playerId);
            // Get or create element map for this player
            let elements = this.playerElements.get(playerId);
            if (!elements) {
                elements = new Map();
                this.playerElements.set(playerId, elements);
            }
            // Create/update each UI element
            for (const [elementName, elementConfig] of Object.entries(this.config)) {
                const existing = elements.get(elementName);
                // Check if required metadata exists
                const requiredMetadata = elementConfig.requiredMetadata || [];
                const hasMetadata = requiredMetadata.every((key) => key in playerData);
                if (!hasMetadata) {
                    // Metadata not ready yet - skip creation
                    continue;
                }
                if (!existing) {
                    // Create new UI element
                    const element = this.createElement(elementName, elementConfig, playerId, playerData);
                    if (element) {
                        elements.set(elementName, element);
                    }
                }
                else {
                    // Update existing UI element
                    this.updateElement(existing, playerId, playerData);
                }
            }
        }
        // Remove UI for players who left
        for (const playerId of existingPlayers) {
            const elements = this.playerElements.get(playerId);
            if (elements) {
                for (const element of elements.values()) {
                    this.destroyElement(element);
                }
            }
            this.playerElements.delete(playerId);
        }
    }
    /**
     * Create a UI element
     */
    createElement(elementName, config, playerId, playerData) {
        const pos = config.position(playerData, playerId);
        if (this.isTextConfig(config)) {
            // Create text element
            const text = this.scene.add.text(pos.x, pos.y, config.getText(playerData, playerId), config.style || {});
            if (config.origin !== undefined) {
                if (typeof config.origin === 'number') {
                    text.setOrigin(config.origin);
                }
                else {
                    text.setOrigin(config.origin.x, config.origin.y);
                }
            }
            if (config.depth !== undefined) {
                text.setDepth(config.depth);
            }
            return {
                type: 'text',
                config,
                gameObject: text
            };
        }
        else {
            // Create bar element (container with two rectangles)
            const container = this.scene.add.container(pos.x, pos.y);
            const bg = this.scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor);
            const fg = this.scene.add.rectangle(0, 0, config.width * config.getValue(playerData, playerId), config.height, config.foregroundColor);
            if (config.origin !== undefined) {
                const originX = typeof config.origin === 'number' ? config.origin : config.origin.x;
                const originY = typeof config.origin === 'number' ? config.origin : config.origin.y;
                bg.setOrigin(originX, originY);
                fg.setOrigin(originX, originY);
            }
            container.add([bg, fg]);
            if (config.depth !== undefined) {
                container.setDepth(config.depth);
            }
            // Store references for updates
            container._bg = bg;
            container._fg = fg;
            return {
                type: 'bar',
                config,
                gameObject: container
            };
        }
    }
    /**
     * Update a UI element
     */
    updateElement(element, playerId, playerData) {
        const pos = element.config.position(playerData, playerId);
        if (element.type === 'text') {
            const config = element.config;
            const text = element.gameObject;
            text.setPosition(pos.x, pos.y);
            text.setText(config.getText(playerData, playerId));
        }
        else {
            const config = element.config;
            const container = element.gameObject;
            const fg = container._fg;
            container.setPosition(pos.x, pos.y);
            // Update bar width based on value
            const value = Math.max(0, Math.min(1, config.getValue(playerData, playerId)));
            fg.width = config.width * value;
        }
    }
    /**
     * Destroy a UI element
     */
    destroyElement(element) {
        if (element.gameObject && element.gameObject.destroy) {
            element.gameObject.destroy();
        }
    }
    /**
     * Type guard for TextUIConfig
     */
    isTextConfig(config) {
        return 'getText' in config;
    }
}
//# sourceMappingURL=PlayerUIManager.js.map