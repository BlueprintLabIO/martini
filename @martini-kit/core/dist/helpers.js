/**
 * SDK Helper Functions
 *
 * Utilities to reduce boilerplate and prevent common mistakes
 */
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
export function createPlayers(playerIds, factory) {
    return Object.fromEntries(playerIds.map((id, index) => [id, factory(id, index)]));
}
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
export function createInputAction(stateKey = 'inputs', options) {
    return {
        apply: (state, context, input) => {
            // Validate input if validator provided
            if (options?.validate && !options.validate(input)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(`[${stateKey}] Invalid input rejected:`, input);
                }
                return;
            }
            // Initialize inputs object if needed
            if (!state[stateKey]) {
                state[stateKey] = {};
            }
            // Store input using targetId (NOT playerId!)
            state[stateKey][context.targetId] = input;
            // Call optional callback
            options?.onApply?.(state, context, input);
        }
    };
}
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
export function createTickAction(tickFn) {
    return {
        apply: (state, context, input) => {
            // Only run on host
            if (!context.isHost)
                return;
            const delta = input.delta || 0;
            tickFn(state, delta, context);
        }
    };
}
//# sourceMappingURL=helpers.js.map