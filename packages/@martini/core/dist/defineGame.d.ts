/**
 * High-level API for defining multiplayer games (v2)
 *
 * Host-authoritative: the host runs the game, others mirror the state.
 */
/**
 * State schema - describes the shape of state
 */
export interface StateSchema {
    [key: string]: any;
}
/**
 * Action definition
 */
export interface ActionDefinition<TInput = any> {
    /** Input validation schema (optional) */
    input?: any;
    /** Apply function - modifies state directly */
    apply: (state: any, playerId: string, input: TInput) => void;
}
/**
 * Game definition (v2 - simplified, host-authoritative)
 */
export interface GameDefinition {
    /** Initial state factory */
    setup?: (context: {
        playerIds: string[];
    }) => any;
    /** Actions - only way to modify state (optional - sprite syncing is automatic) */
    actions?: Record<string, ActionDefinition>;
    /** Called when a player joins mid-game */
    onPlayerJoin?: (state: any, playerId: string) => void;
    /** Called when a player leaves */
    onPlayerLeave?: (state: any, playerId: string) => void;
}
/**
 * Define a multiplayer game
 *
 * @example
 * ```ts
 * const game = defineGame({
 *   setup: ({ playerIds }) => ({
 *     players: Object.fromEntries(
 *       playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
 *     )
 *   }),
 *
 *   actions: {
 *     move: {
 *       input: { x: 'number', y: 'number' },
 *       apply(state, playerId, input) {
 *         state.players[playerId].x = input.x;
 *         state.players[playerId].y = input.y;
 *       }
 *     }
 *   }
 * });
 * ```
 */
export declare function defineGame(definition: GameDefinition): GameDefinition;
//# sourceMappingURL=defineGame.d.ts.map