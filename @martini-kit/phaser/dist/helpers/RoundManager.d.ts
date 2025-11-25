/**
 * RoundManager - Complete round-based game system with timer, announcements, and scoring
 *
 * Eliminates 200+ lines of boilerplate for round-based games.
 * Perfect for fighting games, battle royales, sports games, etc.
 *
 * Features:
 * - Round timer with visual warnings
 * - Automatic round end detection
 * - Freeze frames and announcements between rounds
 * - Score tracking UI
 * - Match winner detection
 * - Customizable UI and flow
 *
 * @example
 * ```ts
 * import { createRoundManager } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.rounds = createRoundManager(this.adapter, this, {
 *   roundsToWin: 3,
 *
 *   // State keys
 *   timerStateKey: 'roundTimer',
 *   roundStateKey: 'round',
 *
 *   // Win detection
 *   checkWinner: (state) => {
 *     const alive = Object.entries(state.players).filter(([, p]) => p.alive);
 *     if (alive.length === 1) return alive[0][0];
 *     if (state.roundTimer <= 0) return null; // Draw
 *     return undefined; // Continue
 *   },
 *
 *   ui: {
 *     timer: {
 *       position: { x: 400, y: 50 },
 *       format: (ms) => `${Math.ceil(ms / 1000)}s`,
 *       warningAt: 30000
 *     }
 *   }
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface TimerUIConfig {
    /** Position of timer display */
    position: {
        x: number;
        y: number;
    };
    /**
     * Format timer value for display
     * @param milliseconds - Time remaining in milliseconds
     * @returns Formatted string (e.g., "1:23", "90s")
     */
    format: (milliseconds: number) => string;
    /**
     * Show warning color when time is below this threshold (ms)
     * Default: 30000 (30 seconds)
     */
    warningAt?: number;
    /** Style for timer text */
    style?: Phaser.Types.GameObjects.Text.TextStyle;
    /** Warning style (overrides style when warning) */
    warningStyle?: Phaser.Types.GameObjects.Text.TextStyle;
}
export interface AnnouncementUIConfig<TPlayer = any> {
    /**
     * Get announcement text when a player wins the round
     */
    winner: (player: TPlayer, winnerId: string) => string;
    /**
     * Get announcement text when round ends in a draw
     */
    draw: () => string;
    /**
     * Get announcement text when a player wins the match
     */
    matchWin: (player: TPlayer, winnerId: string) => string;
    /**
     * Duration to show announcement (ms)
     * Default: 3000
     */
    freezeDuration?: number;
    /**
     * Position of announcement
     * Default: center of screen
     */
    position?: {
        x: number;
        y: number;
    };
    /** Style for announcement text */
    style?: Phaser.Types.GameObjects.Text.TextStyle;
}
export interface ScoreboardUIConfig<TPlayer = any> {
    /** Position of scoreboard */
    position: {
        x: number;
        y: number;
    };
    /**
     * Format score display for each player
     * @param player - Player data
     * @param index - Player index
     * @param playerId - Player ID
     * @returns Formatted string
     */
    format: (player: TPlayer, index: number, playerId: string) => string;
    /** Style for score text */
    style?: Phaser.Types.GameObjects.Text.TextStyle;
    /** Spacing between score lines */
    spacing?: number;
}
export interface RoundManagerConfig<TPlayer = any, TState = any> {
    /**
     * Number of rounds to win the match
     */
    roundsToWin: number;
    /**
     * State key where round timer is stored (in milliseconds)
     * Default: 'roundTimer'
     */
    timerStateKey?: string;
    /**
     * State key where current round number is stored
     * Default: 'round'
     */
    roundStateKey?: string;
    /**
     * State key where players are stored
     * Default: 'players'
     */
    playersKey?: string;
    /**
     * State key where game over flag is stored
     * Default: 'gameOver'
     */
    gameOverKey?: string;
    /**
     * State key where winner ID is stored
     * Default: 'winner'
     */
    winnerKey?: string;
    /**
     * Check if round should end and determine winner
     * @param state - Full game state
     * @returns winnerId (string), null (draw), or undefined (continue playing)
     */
    checkWinner: (state: TState) => string | null | undefined;
    /**
     * UI configuration
     */
    ui: {
        /** Timer display config */
        timer?: TimerUIConfig;
        /** Announcement config */
        announcement?: AnnouncementUIConfig<TPlayer>;
        /** Scoreboard config */
        scoreboard?: ScoreboardUIConfig<TPlayer>;
    };
}
export interface RoundManager {
    /** Update UI (automatically called on state changes) */
    update: () => void;
    /** Destroy UI elements */
    destroy: () => void;
    /** Get timer text object */
    getTimerText: () => Phaser.GameObjects.Text | null;
    /** Get announcement text object */
    getAnnouncementText: () => Phaser.GameObjects.Text | null;
}
/**
 * Create a round manager with timer, announcements, and scoring
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Round manager configuration
 * @returns RoundManager instance
 */
export declare function createRoundManager<TPlayer = any, TState = any>(adapter: PhaserAdapter, scene: Phaser.Scene, config: RoundManagerConfig<TPlayer, TState>): RoundManager;
//# sourceMappingURL=RoundManager.d.ts.map