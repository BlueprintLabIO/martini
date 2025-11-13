/**
 * StateInspector - Development tool for debugging Martini games
 *
 * Features:
 * - Real-time state snapshots
 * - Action history tracking
 * - Event listeners for state changes and actions
 * - Statistics and metrics
 */
import type { GameRuntime } from '@martini/core';
export interface StateSnapshot {
    timestamp: number;
    state: any;
}
export interface ActionRecord {
    timestamp: number;
    actionName: string;
    input: any;
    playerId?: string;
    targetId?: string;
}
export interface InspectorStats {
    totalActions: number;
    totalStateChanges: number;
    actionsByName: Record<string, number>;
}
export interface StateInspectorOptions {
    maxSnapshots?: number;
    maxActions?: number;
}
type StateChangeListener = (snapshot: StateSnapshot) => void;
type ActionListener = (action: ActionRecord) => void;
export declare class StateInspector {
    private runtime;
    private snapshots;
    private actionHistory;
    private stateChangeListeners;
    private actionListeners;
    private unsubscribes;
    private totalActions;
    private totalStateChanges;
    private actionsByName;
    private readonly maxSnapshots;
    private readonly maxActions;
    constructor(options?: StateInspectorOptions);
    /**
     * Attach inspector to a GameRuntime instance
     */
    attach(runtime: GameRuntime): void;
    /**
     * Detach inspector from runtime
     */
    detach(): void;
    /**
     * Check if inspector is attached
     */
    isAttached(): boolean;
    /**
     * Get the attached runtime (or null if not attached)
     */
    getRuntime(): GameRuntime | null;
    /**
     * Get all captured state snapshots
     */
    getSnapshots(): StateSnapshot[];
    /**
     * Get action history
     */
    getActionHistory(): ActionRecord[];
    /**
     * Get statistics
     */
    getStats(): InspectorStats;
    /**
     * Listen for state changes
     */
    onStateChange(listener: StateChangeListener): () => void;
    /**
     * Listen for actions
     */
    onAction(listener: ActionListener): () => void;
    /**
     * Clear all history
     */
    clear(): void;
    private captureSnapshot;
    private trackAction;
    private notifyStateChangeListeners;
    private notifyActionListeners;
    private deepClone;
}
export {};
//# sourceMappingURL=StateInspector.d.ts.map