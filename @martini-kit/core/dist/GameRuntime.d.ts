/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import type { GameDefinition } from './defineGame.js';
import type { Transport, RuntimeConfig } from './transport.js';
import { type Patch } from './sync.js';
type StateChangeCallback<TState> = (state: TState) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;
/**
 * Extended runtime configuration with strict mode
 */
export interface GameRuntimeConfig extends RuntimeConfig {
    /** Throw errors instead of warnings (recommended for development) */
    strict?: boolean;
    /**
     * Validate that all playerIds are initialized in setup()
     * Throws an error if strictPlayerInit is true, warns otherwise
     * @default false
     */
    strictPlayerInit?: boolean;
    /**
     * Key in state where players are stored (for validation)
     * @default 'players'
     */
    playersKey?: string;
}
export declare class GameRuntime<TState = any> {
    private gameDef;
    private transport;
    private config;
    private state;
    private previousState;
    private _isHost;
    private syncIntervalId;
    private syncTickerId;
    private unsubscribes;
    private strict;
    private actionCounter;
    private lobbyTimeoutId;
    private lobbyReconcileIntervalId;
    private hasLobby;
    private stateChangeCallbacks;
    private eventCallbacks;
    private patchListeners;
    private lastSyncSent;
    private readonly heartbeatIntervalMs;
    constructor(gameDef: GameDefinition<TState>, transport: Transport, config: GameRuntimeConfig);
    /**
     * Get current state (read-only, typed)
     */
    getState(): TState;
    /**
     * Check if this runtime is the host
     */
    isHost(): boolean;
    /**
     * Get the current player's ID
     *
     * @returns The unique player ID for this client
     *
     * @example
     * ```ts
     * const myId = runtime.getMyPlayerId();
     * console.log('My player ID:', myId);
     * ```
     */
    getMyPlayerId(): string;
    /**
     * Get transport (for adapters to check isHost, getPlayerId, etc)
     * @internal
     */
    getTransport(): Transport;
    /**
     * Directly mutate state (for adapters only - bypasses actions)
     * Only the host should call this
     * @internal
     */
    mutateState(mutator: (state: TState) => void): void;
    /**
     * Execute an action (validates input, applies to state, broadcasts)
     * @param actionName - Name of the action to execute
     * @param input - Action payload/input data
     * @param targetId - Optional target player ID (defaults to caller's ID)
     */
    submitAction(actionName: string, input: any, targetId?: string): void;
    /**
     * Broadcast a custom event
     */
    broadcastEvent(eventName: string, payload: any): void;
    /**
     * Listen for custom events
     */
    onEvent(eventName: string, callback: EventCallback): () => void;
    /**
     * Wait until the desired number of players (including self) are present.
     * Helpful for P2P transports where peers join asynchronously.
     *
     * @deprecated Use the lobby system instead for better player coordination:
     * ```ts
     * defineGame({
     *   lobby: {
     *     minPlayers: 2,
     *     requireAllReady: true
     *   }
     * })
     * ```
     * This method is automatically skipped when lobby system is enabled.
     */
    waitForPlayers(minPlayers: number, options?: {
        timeoutMs?: number;
        includeSelf?: boolean;
    }): Promise<void>;
    /**
     * Listen for state changes (typed)
     */
    onChange(callback: StateChangeCallback<TState>): () => void;
    /**
     * Subscribe to state patches as they're generated
     * This allows DevTools to reuse the patches that GameRuntime already computed
     * instead of re-cloning and re-diffing the state
     */
    onPatch(listener: (patches: Patch[]) => void): () => void;
    /**
     * Cleanup
     */
    destroy(): void;
    private setupTransport;
    private handleMessage;
    private handleStateSync;
    private handleActionFromClient;
    private handleEvent;
    private syncState;
    /**
     * Start a jitter-resistant sync loop.
     * Prefer requestAnimationFrame with an accumulator; fall back to setInterval when rAF is unavailable.
     */
    private startSyncLoop;
    /**
     * Unified state change notification - ensures all listeners are notified consistently
     * @param patches - Optional pre-computed patches (e.g., from host sync). If not provided, generates them.
     *
     * Note: This does NOT update previousState. Only syncState() updates it (once per sync interval).
     * This ensures optimal performance - we only clone state 20 times/sec (at sync) instead of
     * on every action/mutation which could be 100+ times/sec.
     */
    private notifyStateChange;
    /**
     * Handle errors with strict mode support
     */
    private handleError;
    /**
     * Find closest string match (for typo suggestions)
     */
    private findClosestMatch;
    /**
     * Calculate Levenshtein distance for typo detection
     */
    private levenshteinDistance;
    /**
     * Validate that all playerIds are initialized in state.players
     * Emits warning or throws error based on configuration
     */
    private validatePlayerInitialization;
    /**
     * Inject lobby metadata into state
     */
    private injectLobbyState;
    /**
     * Inject built-in lobby actions
     */
    private injectLobbyActions;
    /**
     * Start lobby phase with auto-start timer
     */
    private startLobbyPhase;
    /**
     * Handle __lobbyReady action
     */
    private handleLobbyReady;
    /**
     * Handle __lobbyStart action
     */
    private handleLobbyStart;
    /**
     * Handle __lobbyEnd action
     */
    private handleLobbyEnd;
    /**
     * Transition between phases
     */
    private transitionPhase;
    /**
     * Check if lobby can transition to playing
     */
    private checkLobbyStartConditions;
    /**
     * Check if all players are ready
     */
    private allPlayersReady;
    /**
     * Handle peer join with lobby presence
     */
    private handlePeerJoinWithLobby;
    /**
     * Handle peer leave with lobby cleanup
     */
    private handlePeerLeaveWithLobby;
    /**
     * Lock room (prevent new joins)
     */
    private lockRoom;
    /**
     * Start periodic lobby-transport reconciliation (HOST ONLY)
     *
     * Defense in depth: Periodically checks transport.getPeerIds() against lobby.players
     * and removes disconnected players. This handles edge cases where:
     * - WebRTC onPeerLeave doesn't fire (page refresh, browser crash)
     * - Health check hasn't detected timeout yet
     * - Network partitions or other anomalies
     *
     * Runs every 30 seconds (conservative interval to avoid spam)
     */
    private startLobbyReconciliation;
    /**
     * Reconcile lobby players with transport peer list
     *
     * Removes players from lobby that are no longer connected according to transport.
     * This is the "source of truth" synchronization between transport layer and game layer.
     */
    private reconcileLobbyWithTransport;
}
export {};
//# sourceMappingURL=GameRuntime.d.ts.map