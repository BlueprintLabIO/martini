/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import type { GameDefinition } from '../src/defineGame.js';
import type { Transport, RuntimeConfig } from '../src/transport.js';
import { type Patch } from '../src/sync.js';
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
    private unsubscribes;
    private strict;
    private actionCounter;
    private stateChangeCallbacks;
    private eventCallbacks;
    private patchListeners;
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
}
export {};
//# sourceMappingURL=GameRuntime.d.ts.map