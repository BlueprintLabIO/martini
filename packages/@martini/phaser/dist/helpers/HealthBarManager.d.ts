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
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { SpriteManager } from './SpriteManager.js';
export interface HealthBarConfig {
    /**
     * SpriteManager to attach health bars to
     */
    spriteManager: SpriteManager;
    /**
     * Path to health value in state (e.g., 'health', 'hp', 'lives')
     */
    healthKey: string;
    /**
     * Maximum health value for scaling
     */
    maxHealth: number;
    /**
     * Offset from sprite center
     */
    offset?: {
        x?: number;
        y?: number;
    };
    /**
     * Health bar dimensions
     */
    width?: number;
    height?: number;
    /**
     * Color thresholds for health bar
     * Default: green > 50%, yellow > 25%, red <= 25%
     */
    colorThresholds?: {
        high?: {
            value: number;
            color: number;
        };
        medium?: {
            value: number;
            color: number;
        };
        low?: {
            value: number;
            color: number;
        };
    };
    /**
     * Z-depth for layering
     */
    depth?: number;
    /**
     * Show background bar (darker shade)
     */
    showBackground?: boolean;
    /**
     * Background bar color
     */
    backgroundColor?: number;
}
export declare class HealthBarManager {
    private adapter;
    private scene;
    private config;
    private healthBars;
    constructor(adapter: PhaserAdapter, config: HealthBarConfig);
    /**
     * Update all health bars
     * Call this in your scene's update() loop
     */
    update(): void;
    /**
     * Manually create a health bar for a sprite
     */
    private createHealthBar;
    /**
     * Remove a health bar
     */
    private removeHealthBar;
    /**
     * Extract entity ID from sprite key
     * Assumes format like "player-abc123" or "enemy-xyz789"
     */
    private extractEntityId;
    /**
     * Get entity state from game state
     * Tries common state keys: players, enemies, entities
     */
    private getEntityState;
    /**
     * Get color based on health percentage
     */
    private getColorForHealth;
    /**
     * Cleanup all health bars
     */
    destroy(): void;
}
//# sourceMappingURL=HealthBarManager.d.ts.map