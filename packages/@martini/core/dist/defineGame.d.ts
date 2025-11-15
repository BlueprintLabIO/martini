/**
 * High-level API for defining multiplayer games (v2)
 *
 * Host-authoritative: the host runs the game, others mirror the state.
 */
import type { SeededRandom } from './SeededRandom.js';
/**
 * Setup context - provides initial player list and deterministic random
 */
export interface SetupContext {
    /** Initial player IDs */
    playerIds: string[];
    /** Deterministic random number generator (seeded, same across all clients) */
    random: SeededRandom;
}
/**
 * Action context - provides information about who submitted the action
 *
 * ⚠️ **IMPORTANT:** Use `targetId` (not `playerId`) for state mutations!
 *
 * @example Correct usage:
 * ```ts
 * actions: {
 *   move: {
 *     apply: (state, context, input) => {
 *       // ✅ CORRECT: Use targetId to identify which player to affect
 *       state.players[context.targetId].x += input.dx;
 *     }
 *   }
 * }
 * ```
 *
 * @example Incorrect usage:
 * ```ts
 * actions: {
 *   move: {
 *     apply: (state, context, input) => {
 *       // ❌ WRONG: playerId is who pressed the key, not who to affect
 *       state.players[context.playerId].x += input.dx;
 *     }
 *   }
 * }
 * ```
 *
 * @example When they differ:
 * ```ts
 * // Player A controls Player B's character:
 * runtime.submitAction('move', { dx: 10 }, 'player-B'); // targetId = 'player-B'
 *
 * // In the action:
 * apply: (state, context, input) => {
 *   console.log(context.playerId);  // 'player-A' (who submitted)
 *   console.log(context.targetId);  // 'player-B' (who to affect)
 * }
 * ```
 */
export interface ActionContext {
    /**
     * ID of the player who called submitAction()
     *
     * ⚠️ **Rarely needed in actions!** Most actions should use `targetId` instead.
     *
     * Use this for:
     * - Logging who triggered an action
     * - Checking permissions (e.g., "can this player do this action?")
     * - Recording action history
     *
     * Do NOT use this for:
     * - Modifying player state (use `targetId` instead)
     * - Storing input data (use `targetId` instead)
     */
    playerId: string;
    /**
     * ID of the player who should be affected by this action
     *
     * ✅ **Use this for state mutations!**
     *
     * Defaults to `playerId` when no targetId is specified in submitAction().
     *
     * @example
     * ```ts
     * // Store input for the affected player
     * state.inputs[context.targetId] = input;
     *
     * // Update the affected player's position
     * state.players[context.targetId].x = input.x;
     * ```
     */
    targetId: string;
    /** Whether this action is being applied on the host */
    isHost: boolean;
    /** Deterministic random number generator (seeded per action) */
    random: SeededRandom;
}
/**
 * Action definition with typed state and input
 */
export interface ActionDefinition<TState = any, TInput = any> {
    /** Input validation schema (optional) */
    input?: any;
    /** Apply function - modifies state directly */
    apply: (state: TState, context: ActionContext, input: TInput) => void;
}
/**
 * Game definition with typed state
 */
export interface GameDefinition<TState = any> {
    /** Initial state factory */
    setup?: (context: SetupContext) => TState;
    /** Actions - only way to modify state (optional - sprite syncing is automatic) */
    actions?: Record<string, ActionDefinition<TState, any>>;
    /** Called when a player joins mid-game */
    onPlayerJoin?: (state: TState, playerId: string) => void;
    /** Called when a player leaves */
    onPlayerLeave?: (state: TState, playerId: string) => void;
}
/**
 * Define a multiplayer game with full TypeScript type safety
 *
 * @example
 * ```ts
 * interface GameState {
 *   players: Record<string, { x: number; y: number; score: number }>;
 * }
 *
 * const game = defineGame<GameState>({
 *   setup: ({ playerIds, random }) => ({
 *     players: Object.fromEntries(
 *       playerIds.map(id => [id, {
 *         x: random.range(0, 800),  // ✅ Deterministic!
 *         y: random.range(0, 600),
 *         score: 0
 *       }])
 *     )
 *   }),
 *
 *   actions: {
 *     move: {
 *       input: { x: 'number', y: 'number' },
 *       apply(state, context, input) {
 *         // ✅ Full type safety - autocomplete works!
 *         state.players[context.targetId].x = input.x;
 *         state.players[context.targetId].y = input.y;
 *       }
 *     }
 *   }
 * });
 * ```
 */
export declare function defineGame<TState = any>(definition: GameDefinition<TState>): GameDefinition<TState>;
//# sourceMappingURL=defineGame.d.ts.map