/**
 * SDK Helper Functions
 *
 * Utilities to reduce boilerplate and prevent common mistakes
 */
import type { ActionDefinition, ActionContext } from './defineGame.js';
/**
 * Create a players record from player IDs
 *
 * Type-safe helper that ensures all players are initialized.
 *
 * @param playerIds - Array of player IDs
 * @param factory - Function to create each player's state
 * @returns Record mapping player IDs to player state
 *
 * @example
 * ```ts
 * setup: ({ playerIds }) => ({
 *   players: createPlayers(playerIds, (id, index) => ({
 *     x: index * 100,
 *     y: 400,
 *     score: 0
 *   }))
 * })
 * ```
 */
export declare function createPlayers<TPlayer>(playerIds: string[], factory: (playerId: string, index: number) => TPlayer): Record<string, TPlayer>;
/**
 * Create a multi-type collision check function
 *
 * Combines multiple collision checks and warns if only one type is specified.
 * This helps prevent the common mistake of checking only blocks and forgetting
 * about bombs, enemies, or other obstacles.
 *
 * ⚠️ PREVENTS BUG: Forgetting to check multiple collision types
 * In grid-based games, you typically need to check:
 * - Blocks (walls, obstacles)
 * - Bombs (placed by players)
 * - Enemies (NPCs, other players)
 * - Hazards (traps, environmental dangers)
 *
 * @param checks - Array of named collision check functions
 * @returns Combined collision check function
 *
 * @example
 * ```ts
 * // ❌ BAD - Only checks blocks, players can walk through bombs!
 * collisionCheck: (x, y) => hasBlock(state.blocks, x, y)
 *
 * // ✅ GOOD - Checks all obstacle types
 * collisionCheck: createMultiCollisionCheck(
 *   { name: 'hard-blocks', fn: (x, y) => hasHardBlock(state.blocks, x, y) },
 *   { name: 'soft-blocks', fn: (x, y) => hasSoftBlock(state.blocks, x, y) },
 *   { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
 * )
 * ```
 */
export declare function createMultiCollisionCheck(...checks: Array<{
    name: string;
    fn: (x: number, y: number) => boolean;
}>): (x: number, y: number) => boolean;
/**
 * Create a standard input action
 *
 * Returns an action definition that stores input in state[stateKey][context.targetId]
 *
 * @param stateKey - Key in state where inputs are stored (default: 'inputs')
 * @param options - Optional validation and callbacks
 * @returns Action definition
 *
 * @example
 * ```ts
 * actions: {
 *   move: createInputAction('inputs'),
 *
 *   shoot: createInputAction('inputs', {
 *     validate: (input) => input.angle !== undefined,
 *     onApply: (state, context, input) => {
 *       state.players[context.targetId].lastShot = Date.now();
 *     }
 *   })
 * }
 * ```
 */
export declare function createInputAction<TState = any, TInput = any>(stateKey?: string, options?: {
    /**
     * Validate input before storing
     * Return false to reject the input
     */
    validate?: (input: TInput) => boolean;
    /**
     * Called after input is stored
     * Use for side effects or additional state updates
     */
    onApply?: (state: TState, context: ActionContext, input: TInput) => void;
}): ActionDefinition<TState, TInput>;
/**
 * Create a host-only tick action
 *
 * Wraps game loop logic to only run on the host.
 * Useful for physics, AI, collision detection, etc.
 *
 * @param tickFn - Function to run each tick (host only)
 * @returns Action definition that only runs on host
 *
 * @example
 * ```ts
 * actions: {
 *   tick: createTickAction((state, delta, context) => {
 *     // This only runs on the host
 *     updatePhysics(state, delta);
 *     checkCollisions(state);
 *   })
 * }
 * ```
 */
export declare function createTickAction<TState = any, TInput = {
    delta: number;
}>(tickFn: (state: TState, delta: number, context: ActionContext) => void): ActionDefinition<TState, TInput>;
/**
 * Iterate over all player inputs in the state
 *
 * Eliminates the boilerplate `for (const [playerId, player] of Object.entries(state.players))`
 * loop and automatically handles missing inputs.
 *
 * @param state - Game state
 * @param callback - Function called for each player with input
 * @param options - Optional configuration
 *
 * @example
 * ```ts
 * tick: createTickAction((state, delta) => {
 *   forEachPlayerInput(state, (player, input, playerId) => {
 *     // Move player based on input
 *     const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
 *     const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
 *     player.x += dx * 150 * (delta / 1000);
 *     player.y += dy * 150 * (delta / 1000);
 *   });
 * })
 * ```
 *
 * @example With custom keys and filter
 * ```ts
 * forEachPlayerInput(state, (player, input) => {
 *   // Process movement for alive players only
 *   updateMovement(player, input);
 * }, {
 *   playersKey: 'characters',
 *   inputsKey: 'controls',
 *   filter: (player) => player.alive
 * });
 * ```
 */
export declare function forEachPlayerInput<TState = any, TPlayer = any, TInput = any>(state: TState, callback: (player: TPlayer, input: TInput, playerId: string) => void, options?: {
    /** Key in state where players are stored (default: 'players') */
    playersKey?: string;
    /** Key in state where inputs are stored (default: 'inputs') */
    inputsKey?: string;
    /** Optional filter function to skip certain players */
    filter?: (player: TPlayer, playerId: string) => boolean;
}): void;
//# sourceMappingURL=helpers.d.ts.map