/**
 * SpeedDisplay - Reactive speed/velocity display helper
 *
 * Automatically updates when PhysicsManager velocity changes.
 * Separates physics logic from presentation concerns.
 *
 * ## How it works:
 *
 * - **Host:** Subscribes to `onVelocityChange` events for instant updates (no network delay)
 * - **Clients:** Subscribes to state changes, reads `state.players[id].velocity` synced from host
 *
 * This hybrid approach ensures:
 * - Host gets instant feedback (local events, no network overhead)
 * - Clients get accurate sync (velocity automatically synced via state)
 * - No manual update() calls needed - fully reactive!
 *
 * @example
 * ```ts
 * import { createSpeedDisplay } from '@martini/phaser';
 *
 * // In scene.create() - after creating PhysicsManager
 * this.speedDisplay = createSpeedDisplay(
 *   this.physicsManager,
 *   this.adapter,
 *   this,
 *   {
 *     position: { x: 400, y: 50 },
 *     format: (velocity) => `${Math.round(velocity)} mph`,
 *     style: { fontSize: '20px', color: '#4a9eff' }
 *   }
 * );
 *
 * // No update() needed - automatically reacts to velocity changes!
 *
 * // In scene shutdown/destroy:
 * this.speedDisplay.destroy();
 * ```
 */
/**
 * Create a speed display that reacts to PhysicsManager velocity changes
 *
 * @param physicsManager - PhysicsManager instance to subscribe to
 * @param adapter - PhaserAdapter instance (for getting local player ID)
 * @param scene - Phaser scene to create text in
 * @param config - Display configuration
 * @returns SpeedDisplay instance with update/destroy methods
 */
export function createSpeedDisplay(physicsManager, adapter, scene, config = {}) {
    // Default config
    const position = config.position ?? { x: 400, y: 50 };
    const format = config.format ?? ((v) => `Speed: ${Math.round(v)}`);
    const style = config.style ?? { fontSize: '20px', color: '#fff' };
    // Create text object
    const text = scene.add.text(position.x, position.y, format(0), style);
    // Set origin
    if (config.origin !== undefined) {
        if (typeof config.origin === 'number') {
            text.setOrigin(config.origin);
        }
        else {
            text.setOrigin(config.origin.x, config.origin.y);
        }
    }
    else {
        text.setOrigin(0.5); // default: centered
    }
    // Set depth
    if (config.depth !== undefined) {
        text.setDepth(config.depth);
    }
    // Subscribe to velocity changes (host only - events don't cross network)
    const unsubscribeVelocity = physicsManager.onVelocityChange((playerId, velocity) => {
        if (playerId === adapter.getLocalPlayerId()) {
            text.setText(format(velocity));
        }
    });
    // Subscribe to state changes (clients get velocity from state)
    const unsubscribeState = adapter.onChange((state) => {
        const localPlayerId = adapter.getLocalPlayerId();
        const player = state.players?.[localPlayerId];
        if (player && player.velocity !== undefined) {
            text.setText(format(player.velocity));
        }
    });
    // Manual update function
    const update = () => {
        const velocity = physicsManager.getVelocity(adapter.getLocalPlayerId());
        text.setText(format(velocity));
    };
    // Initial update
    update();
    return {
        update,
        destroy: () => {
            unsubscribeVelocity();
            unsubscribeState();
            text.destroy();
        },
        getText: () => text
    };
}
//# sourceMappingURL=SpeedDisplay.js.map