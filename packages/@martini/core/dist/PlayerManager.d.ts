/**
 * PlayerManager - Unified player lifecycle management
 *
 * Prevents bugs by ensuring both initial players (in setup) and
 * late-joining players use the same factory logic.
 *
 * @example
 * ```ts
 * const playerManager = createPlayerManager({
 *   roles: ['fire', 'ice'],
 *   factory: (playerId, index) => ({
 *     x: index === 0 ? 200 : 600,
 *     y: 400,
 *     role: index === 0 ? 'fire' : 'ice',
 *   })
 * });
 *
 * export const game = defineGame({
 *   setup: ({ playerIds }) => ({
 *     players: playerManager.initialize(playerIds),
 *     inputs: {}
 *   }),
 *
 *   onPlayerJoin: (state, playerId) => {
 *     playerManager.handleJoin(state.players, playerId);
 *   },
 *
 *   onPlayerLeave: (state, playerId) => {
 *     playerManager.handleLeave(state.players, playerId);
 *   }
 * });
 * ```
 */
import type { GameDefinition } from './defineGame.js';
export interface PlayerFactory<TPlayer = any> {
    /**
     * Creates a player's initial state
     *
     * @param playerId - Unique player identifier
     * @param index - Player index (0 for first player, 1 for second, etc.)
     * @returns Player state object
     */
    (playerId: string, index: number): TPlayer;
}
export interface PlayerManagerConfig<TPlayer = any> {
    /**
     * Factory function to create player state
     */
    factory: PlayerFactory<TPlayer>;
    /**
     * Optional: Role names for type-safe role assignment
     * If provided, ensures roles are assigned in order
     */
    roles?: readonly string[];
    /**
     * Optional: Spawn points for each player index
     * If provided, automatically sets x/y coordinates
     */
    spawnPoints?: Array<{
        x: number;
        y: number;
        [key: string]: any;
    }>;
    /**
     * Optional: World bounds for spawn clamping
     * Prevents players from spawning outside the playable area
     * Automatically clamps x/y coordinates returned by factory
     *
     * @example
     * ```ts
     * createPlayerManager({
     *   worldBounds: { width: 800, height: 600 },
     *   factory: (playerId, index) => ({
     *     x: index * 1000, // Would spawn off-screen
     *     y: 300
     *   })
     *   // Result: x is automatically clamped to 0-800
     * });
     * ```
     */
    worldBounds?: {
        width: number;
        height: number;
    };
}
export interface PlayerManager<TPlayer = any> {
    /**
     * Initialize all players for setup()
     *
     * @param playerIds - Array of player IDs from setup context
     * @returns Record of player ID to player state
     */
    initialize(playerIds: string[]): Record<string, TPlayer>;
    /**
     * Handle a player joining mid-game
     *
     * @param players - Current players record from state
     * @param playerId - ID of joining player
     */
    handleJoin(players: Record<string, TPlayer>, playerId: string): void;
    /**
     * Handle a player leaving
     *
     * @param players - Current players record from state
     * @param playerId - ID of leaving player
     */
    handleLeave(players: Record<string, TPlayer>, playerId: string): void;
    /**
     * Get the configuration for a specific player index
     * Useful for determining roles, spawn points, etc.
     *
     * @param index - Player index
     */
    getConfig(index: number): {
        role?: string;
        spawn?: {
            x: number;
            y: number;
        };
    };
    /**
     * Create game definition handlers (setup, onPlayerJoin, onPlayerLeave)
     *
     * @returns Partial game definition with lifecycle handlers
     *
     * @example
     * ```ts
     * export const game = defineGame({
     *   ...playerManager.createHandlers(),
     *   actions: { ... }
     * });
     * ```
     */
    createHandlers<TState extends {
        players: Record<string, TPlayer>;
    }>(): Pick<GameDefinition<TState>, 'setup' | 'onPlayerJoin' | 'onPlayerLeave'>;
}
/**
 * Create a PlayerManager instance
 *
 * @param config - Configuration for player management
 * @returns PlayerManager instance
 */
export declare function createPlayerManager<TPlayer = any>(config: PlayerManagerConfig<TPlayer>): PlayerManager<TPlayer>;
//# sourceMappingURL=PlayerManager.d.ts.map