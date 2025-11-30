/**
 * Lobby System - Production-grade multiplayer lifecycle management
 *
 * Inspired by industry standards:
 * - Photon PUN: OnJoinedLobby, OnConnectedToMaster callbacks
 * - Colyseus: Room.lock(), onCreate/onJoin/onLeave lifecycle
 * - PlayFab: Ready confirmation with timeout enforcement
 *
 * @module @martini-kit/core/lobby
 */

/**
 * Game phase lifecycle
 *
 * - `lobby`: Players joining, getting ready
 * - `playing`: Active gameplay
 * - `ended`: Game finished, showing results
 */
export type GamePhase = 'lobby' | 'playing' | 'ended';

/**
 * Player presence metadata (for lobby state)
 *
 * Automatically tracked by GameRuntime when lobby system is enabled.
 */
export interface PlayerPresence {
  /** Unique player identifier */
  playerId: string;

  /** Whether player has confirmed ready */
  ready: boolean;

  /** Timestamp when player joined (ms since epoch) */
  joinedAt: number;

  /** Optional custom metadata (team, character, etc.) */
  metadata?: Record<string, any>;
}

/**
 * Lobby configuration
 *
 * Add this to your GameDefinition to enable the lobby system.
 *
 * @example
 * ```ts
 * export const game = defineGame({
 *   lobby: {
 *     minPlayers: 2,
 *     maxPlayers: 4,
 *     requireAllReady: true,
 *     autoStartTimeout: 30000 // 30 seconds
 *   },
 *   // ... rest of game definition
 * });
 * ```
 */
export interface LobbyConfig {
  /**
   * Minimum players required to start the game
   *
   * Game cannot transition to 'playing' phase until this many players have joined.
   */
  minPlayers: number;

  /**
   * Maximum players allowed in the lobby
   *
   * Additional join attempts will be rejected once this limit is reached.
   *
   * @default Infinity (no limit)
   */
  maxPlayers?: number;

  /**
   * Require all players to ready-up before starting
   *
   * If true, game only starts when ALL players call `runtime.submitAction('__lobbyReady', { ready: true })`
   * If false, host can force-start once minPlayers is met
   *
   * @default false
   */
  requireAllReady?: boolean;

  /**
   * Auto-start timeout (milliseconds)
   *
   * If set, game automatically transitions to 'playing' after this duration,
   * provided minPlayers requirement is met.
   *
   * Useful fallback if some players forget to ready-up.
   *
   * @default undefined (no auto-start)
   */
  autoStartTimeout?: number;

  /**
   * Allow players to join mid-game
   *
   * If false, room is locked when transitioning to 'playing' phase.
   * Late join attempts will be rejected.
   *
   * @default false
   */
  allowLateJoin?: boolean;
}

/**
 * Phase change context
 *
 * Provided to onPhaseChange callback with details about the transition.
 */
export interface PhaseChangeContext {
  /** Previous phase */
  from: GamePhase;

  /** New phase */
  to: GamePhase;

  /**
   * Reason for the phase change
   *
   * - `manual`: Host called __lobbyStart or __lobbyEnd
   * - `timeout`: autoStartTimeout elapsed
   * - `all_ready`: All players ready (requireAllReady mode)
   * - `player_left`: Player left, causing insufficient players
   */
  reason: 'manual' | 'timeout' | 'all_ready' | 'player_left';

  /** Timestamp of the transition (ms since epoch) */
  timestamp: number;
}

/**
 * Auto-injected lobby state (when lobby config is present)
 *
 * GameRuntime automatically injects this into your game state as `state.__lobby`
 *
 * @example
 * ```ts
 * // In your scene
 * const state = runtime.getState();
 * const lobbyState = (state as any).__lobby;
 *
 * if (lobbyState.phase === 'lobby') {
 *   // Show lobby UI
 * } else if (lobbyState.phase === 'playing') {
 *   // Show gameplay
 * }
 * ```
 */
export interface LobbyState {
  /** Current game phase */
  phase: GamePhase;

  /** Player presence tracking */
  players: Record<string, PlayerPresence>;

  /** Copy of lobby config (read-only) */
  config: LobbyConfig;

  /** Timestamp when 'playing' phase started */
  startedAt?: number;

  /** Timestamp when 'ended' phase started */
  endedAt?: number;
}

/**
 * Helper type for user state augmented with lobby
 *
 * Use this for type-safe access to __lobby
 *
 * @example
 * ```ts
 * interface MyGameState {
 *   players: Record<string, { x: number; y: number }>;
 * }
 *
 * const state = runtime.getState() as WithLobby<MyGameState>;
 * console.log(state.__lobby.phase); // ✅ Type-safe
 * ```
 */
export type WithLobby<TState> = TState & {
  __lobby: LobbyState;
};
