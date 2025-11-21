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
 * import { createSpeedDisplay } from '@martini-kit/phaser';
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
import type { PhysicsManager } from './PhysicsManager.js';
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';
export interface SpeedDisplayConfig {
    /**
     * Position of the speed display text
     * Default: { x: 400, y: 50 }
     */
    position?: {
        x: number;
        y: number;
    };
    /**
     * Format function to convert velocity to display string
     * Default: (velocity) => `Speed: ${Math.round(velocity)}`
     */
    format?: (velocity: number) => string;
    /**
     * Phaser text style
     * Default: { fontSize: '20px', color: '#fff' }
     */
    style?: Phaser.Types.GameObjects.Text.TextStyle;
    /**
     * Text origin (default: 0.5 for centered)
     */
    origin?: number | {
        x: number;
        y: number;
    };
    /**
     * Z-depth for layering
     */
    depth?: number;
}
export interface SpeedDisplay {
    /**
     * Manually update the display (rarely needed - auto-updates via events)
     */
    update: () => void;
    /**
     * Destroy the display and cleanup listeners
     */
    destroy: () => void;
    /**
     * Get the underlying Phaser text object
     */
    getText: () => Phaser.GameObjects.Text;
}
/**
 * Create a speed display that reacts to PhysicsManager velocity changes
 *
 * @param physicsManager - PhysicsManager instance to subscribe to
 * @param adapter - PhaserAdapter instance (for getting local player ID)
 * @param scene - Phaser scene to create text in
 * @param config - Display configuration
 * @returns SpeedDisplay instance with update/destroy methods
 */
export declare function createSpeedDisplay(physicsManager: PhysicsManager, adapter: PhaserAdapter, scene: Phaser.Scene, config?: SpeedDisplayConfig): SpeedDisplay;
//# sourceMappingURL=SpeedDisplay.d.ts.map