/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import type { GameDefinition } from './defineGame.js';
import type { Transport, RuntimeConfig } from './transport.js';
type StateChangeCallback<TState> = (state: TState) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;
/**
 * Extended runtime configuration with strict mode
 */
export interface GameRuntimeConfig extends RuntimeConfig {
    /** Throw errors instead of warnings (recommended for development) */
    strict?: boolean;
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
     * Cleanup
     */
    destroy(): void;
    private setupTransport;
    private handleMessage;
    private handleStateSync;
    private handleActionFromClient;
    private handleEvent;
    private syncState;
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
}
export {};
//# sourceMappingURL=GameRuntime.d.ts.map