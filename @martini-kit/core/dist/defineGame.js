/**
 * High-level API for defining multiplayer games (v2)
 *
 * Host-authoritative: the host runs the game, others mirror the state.
 */
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
export function defineGame(definition) {
    // Basic validation
    if (!definition.actions) {
        definition.actions = {};
    }
    // Validate actions if they exist
    for (const [name, action] of Object.entries(definition.actions)) {
        if (typeof action.apply !== 'function') {
            throw new Error(`Action "${name}" must have an apply function`);
        }
    }
    return definition;
}
//# sourceMappingURL=defineGame.js.map