/**
 * PlayerStatsPanel - Display current player's stats/powerups overlay
 *
 * Eliminates the boilerplate of manually tracking and displaying player stats.
 * Perfect for showing equipped powerups, abilities, ammo, inventory, etc.
 *
 * Features:
 * - Auto-reactive to player stat changes
 * - Smart positioning (corners, custom coords)
 * - Icon-based display with optional tooltips
 * - Conditional visibility and highlighting
 * - Type-safe player property access
 *
 * @example
 * ```ts
 * import { createPlayerStatsPanel } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.statsPanel = createPlayerStatsPanel(this.adapter, this, {
 *   position: 'top-left',
 *   stats: {
 *     bombs: {
 *       icon: '💣',
 *       getValue: (player) => `${player.activeBombs}/${player.bombCount}`,
 *       tooltip: 'Bombs (current/max)'
 *     },
 *     speed: {
 *       icon: '⚡',
 *       getValue: (player) => `${Math.round(player.speed * 100)}%`,
 *       highlight: (player) => player.speed > 1.0
 *     }
 *   }
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
export type StatPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | {
    x: number;
    y: number;
};
export interface StatConfig<TPlayer = any> {
    /** Icon/emoji to display */
    icon: string;
    /**
     * Get the value to display next to the icon
     * @param player - Current player data
     * @returns String to display (e.g., "3/5", "120%", "✓")
     */
    getValue: (player: TPlayer) => string | number;
    /**
     * Optional tooltip text (for accessibility/clarity)
     */
    tooltip?: string;
    /**
     * Show this stat only when condition is true
     * Useful for abilities that are only visible when active
     */
    visible?: (player: TPlayer) => boolean;
    /**
     * Highlight this stat when condition is true (e.g., boosted)
     * Adds a glow/color effect
     */
    highlight?: (player: TPlayer) => boolean;
}
export interface PlayerStatsPanelConfig<TPlayer = any> {
    /**
     * Position of the stats panel
     * - 'top-left', 'top-right', 'bottom-left', 'bottom-right'
     * - Or custom {x, y} coordinates
     */
    position: StatPosition;
    /**
     * Stats to display, keyed by stat name
     */
    stats: Record<string, StatConfig<TPlayer>>;
    /**
     * Optional styling
     */
    style?: {
        /** Background color (CSS format) */
        backgroundColor?: string;
        /** Padding around content */
        padding?: number;
        /** Icon font size */
        iconSize?: number;
        /** Value text font size */
        fontSize?: string;
        /** Spacing between stat items */
        spacing?: number;
        /** Highlight color when stat.highlight() returns true */
        highlightColor?: string;
    };
    /**
     * Key in state where players are stored (default: 'players')
     */
    playersKey?: string;
}
export interface PlayerStatsPanel {
    /** Update panel (automatically called when player changes) */
    update: () => void;
    /** Destroy panel elements */
    destroy: () => void;
    /** Get container game object */
    getContainer: () => Phaser.GameObjects.Container | null;
}
/**
 * Create a player stats panel for displaying current player's stats/powerups
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Panel configuration
 * @returns PlayerStatsPanel instance
 */
export declare function createPlayerStatsPanel<TPlayer = any>(adapter: PhaserAdapter, scene: Phaser.Scene, config: PlayerStatsPanelConfig<TPlayer>): PlayerStatsPanel;
//# sourceMappingURL=PlayerStatsPanel.d.ts.map