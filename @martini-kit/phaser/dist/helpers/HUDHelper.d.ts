/**
 * HUD Helper - Unified player HUD/UI for multiplayer games
 *
 * Eliminates the manual HUD boilerplate by automatically creating and managing
 * title, role, and control hint text based on the current player state.
 *
 * @example
 * ```ts
 * import { createPlayerHUD } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.hud = createPlayerHUD(this.adapter, this, {
 *   title: 'Fire & Ice - Cooperative Platformer',
 *
 *   roleText: (myPlayer) => {
 *     if (!myPlayer) return 'Spectator';
 *     return myPlayer.role === 'fire' ? 'Fire Player' : 'Ice Player';
 *   },
 *
 *   controlHints: (myPlayer) => {
 *     if (!myPlayer) return '';
 *     return 'Arrow Keys + SPACE to Jump';
 *   }
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface HUDLayout {
    /** Position for title text */
    title?: {
        x: number;
        y: number;
    };
    /** Position for role text */
    role?: {
        x: number;
        y: number;
    };
    /** Position for controls text */
    controls?: {
        x: number;
        y: number;
    };
}
export interface HUDTextStyle {
    fontSize?: string;
    color?: string;
    fontStyle?: string;
    backgroundColor?: string;
    padding?: {
        x: number;
        y: number;
    };
}
export interface PlayerHUDConfig<TPlayer = any, TState = any> {
    /** Title text (static) */
    title?: string;
    /** Title text style */
    titleStyle?: HUDTextStyle;
    /**
     * Generate role text from player data and optionally game state
     * @param myPlayer - Current player data or undefined if spectator
     * @param state - Full game state (optional, for turn-based games)
     * @returns Text to display
     *
     * @example
     * // Simple usage (action games)
     * roleText: (myPlayer) => {
     *   if (!myPlayer) return 'Spectator';
     *   return `Player ${myPlayer.id}`;
     * }
     *
     * @example
     * // With state (turn-based games)
     * roleText: (myPlayer, state) => {
     *   if (!myPlayer) return 'Spectator';
     *   if (state?.gameOver) return 'Game Over!';
     *   return state?.currentTurn === myPlayer.id ? 'Your Turn' : 'Waiting...';
     * }
     */
    roleText?: (myPlayer: TPlayer | undefined, state?: TState) => string;
    /** Role text style */
    roleStyle?: HUDTextStyle;
    /**
     * Generate control hints from player data and optionally game state
     * @param myPlayer - Current player data or undefined if spectator
     * @param state - Full game state (optional)
     * @returns Text to display
     */
    controlHints?: (myPlayer: TPlayer | undefined, state?: TState) => string;
    /** Control hints text style */
    controlsStyle?: HUDTextStyle;
    /** Custom layout positions */
    layout?: HUDLayout;
    /** Key in state where players are stored (default: 'players') */
    playersKey?: string;
}
export interface PlayerHUD {
    /** Update HUD (automatically called when player changes) */
    update: () => void;
    /** Destroy HUD elements */
    destroy: () => void;
    /** Get title text object */
    getTitleText: () => Phaser.GameObjects.Text | null;
    /** Get role text object */
    getRoleText: () => Phaser.GameObjects.Text | null;
    /** Get controls text object */
    getControlsText: () => Phaser.GameObjects.Text | null;
}
/**
 * Create a player HUD with automatic role/control updates
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - HUD configuration
 * @returns PlayerHUD instance
 */
export declare function createPlayerHUD<TPlayer = any>(adapter: PhaserAdapter, scene: Phaser.Scene, config: PlayerHUDConfig<TPlayer>): PlayerHUD;
//# sourceMappingURL=HUDHelper.d.ts.map