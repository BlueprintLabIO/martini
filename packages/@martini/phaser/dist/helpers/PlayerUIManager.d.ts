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
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface TextUIConfig {
    /**
     * Position function - receives FULL player data (including staticProperties!)
     * Called when UI is created AND when metadata changes
     */
    position: (player: any, playerId: string) => {
        x: number;
        y: number;
    };
    /**
     * Text content function
     */
    getText: (player: any, playerId: string) => string;
    /**
     * Phaser text style
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
    /**
     * Required static properties that must exist before creating this UI
     * Example: ['side', 'team'] - waits until these are synced
     */
    requiredMetadata?: string[];
}
export interface BarUIConfig {
    /**
     * Position function - receives FULL player data (including staticProperties!)
     */
    position: (player: any, playerId: string) => {
        x: number;
        y: number;
    };
    /**
     * Value function (0-1 range)
     */
    getValue: (player: any, playerId: string) => number;
    /**
     * Bar dimensions
     */
    width: number;
    height: number;
    /**
     * Colors
     */
    backgroundColor: number;
    foregroundColor: number;
    /**
     * Bar origin (default: 0.5 for centered)
     */
    origin?: number | {
        x: number;
        y: number;
    };
    /**
     * Z-depth for layering
     */
    depth?: number;
    /**
     * Required static properties that must exist before creating this UI
     */
    requiredMetadata?: string[];
}
export interface PlayerUIManagerConfig {
    /**
     * UI elements keyed by name
     * Each element can be text or bar type
     */
    [elementName: string]: TextUIConfig | BarUIConfig;
}
export declare class PlayerUIManager {
    private adapter;
    private scene;
    private config;
    private playerElements;
    private unsubscribe?;
    constructor(adapter: PhaserAdapter, scene: any, config: PlayerUIManagerConfig);
    /**
     * Get UI element for a specific player
     */
    get(playerId: string, elementName: string): any;
    /**
     * Manually update all UI (also called automatically on state changes)
     */
    update(): void;
    /**
     * Cleanup
     */
    destroy(): void;
    /**
     * Sync UI from state
     */
    private syncFromState;
    /**
     * Create a UI element
     */
    private createElement;
    /**
     * Update a UI element
     */
    private updateElement;
    /**
     * Destroy a UI element
     */
    private destroyElement;
    /**
     * Type guard for TextUIConfig
     */
    private isTextConfig;
}
//# sourceMappingURL=PlayerUIManager.d.ts.map