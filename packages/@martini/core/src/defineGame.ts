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
 */
export interface ActionContext {
  /** ID of the player who called submitAction */
  playerId: string;

  /** ID of the player being affected (defaults to playerId) */
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
export function defineGame<TState = any>(
  definition: GameDefinition<TState>
): GameDefinition<TState> {
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
