/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import type { GameDefinition } from './defineGame';
import type { Transport, RuntimeConfig } from './transport';
type StateChangeCallback = (state: any) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;
export declare class GameRuntime {
    private gameDef;
    private transport;
    private config;
    private state;
    private previousState;
    private isHost;
    private syncIntervalId;
    private unsubscribes;
    private stateChangeCallbacks;
    private eventCallbacks;
    constructor(gameDef: GameDefinition, transport: Transport, config: RuntimeConfig);
    /**
     * Get current state (read-only)
     */
    getState(): any;
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
    mutateState(mutator: (state: any) => void): void;
    /**
     * Execute an action (validates input, applies to state, broadcasts)
     */
    submitAction(actionName: string, input: any): void;
    /**
     * Broadcast a custom event
     */
    broadcastEvent(eventName: string, payload: any): void;
    /**
     * Listen for custom events
     */
    onEvent(eventName: string, callback: EventCallback): () => void;
    /**
     * Listen for state changes
     */
    onChange(callback: StateChangeCallback): () => void;
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
}
export {};
//# sourceMappingURL=GameRuntime.d.ts.map