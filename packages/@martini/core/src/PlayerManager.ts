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

import type { GameDefinition, SetupContext } from './defineGame.js';

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
  spawnPoints?: Array<{ x: number; y: number; [key: string]: any }>;
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
  getConfig(index: number): { role?: string; spawn?: { x: number; y: number } };

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
  createHandlers<TState extends { players: Record<string, TPlayer> }>(): Pick<
    GameDefinition<TState>,
    'setup' | 'onPlayerJoin' | 'onPlayerLeave'
  >;
}

/**
 * Create a PlayerManager instance
 *
 * @param config - Configuration for player management
 * @returns PlayerManager instance
 */
export function createPlayerManager<TPlayer = any>(
  config: PlayerManagerConfig<TPlayer>
): PlayerManager<TPlayer> {
  const { factory, roles, spawnPoints } = config;

  // Track current player count for role/spawn assignment
  let playerCount = 0;

  const createPlayer = (playerId: string, index: number): TPlayer => {
    let player = factory(playerId, index);

    // Auto-assign spawn point if provided
    if (spawnPoints && spawnPoints[index]) {
      player = { ...player, ...spawnPoints[index] };
    }

    // Auto-assign role if roles are defined
    if (roles && roles[index]) {
      player = { ...player, role: roles[index] } as TPlayer;
    }

    return player;
  };

  return {
    initialize(playerIds: string[]): Record<string, TPlayer> {
      playerCount = playerIds.length;
      return Object.fromEntries(
        playerIds.map((id, index) => [id, createPlayer(id, index)])
      );
    },

    handleJoin(players: Record<string, TPlayer>, playerId: string): void {
      const currentCount = Object.keys(players).length;
      players[playerId] = createPlayer(playerId, currentCount);
      playerCount = currentCount + 1;
    },

    handleLeave(players: Record<string, TPlayer>, playerId: string): void {
      delete players[playerId];
      playerCount = Object.keys(players).length;
    },

    getConfig(index: number) {
      return {
        role: roles?.[index],
        spawn: spawnPoints?.[index]
      };
    },

    createHandlers<TState extends { players: Record<string, TPlayer> }>() {
      const manager = this;
      return {
        setup: ({ playerIds }: SetupContext) => {
          return {
            players: manager.initialize(playerIds)
          } as TState;
        },

        onPlayerJoin: (state: TState, playerId: string) => {
          manager.handleJoin(state.players, playerId);
        },

        onPlayerLeave: (state: TState, playerId: string) => {
          manager.handleLeave(state.players, playerId);
        }
      };
    }
  };
}
