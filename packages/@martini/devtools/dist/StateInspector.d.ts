/**
 * StateInspector - Development tool for debugging Martini games
 *
 * Features:
 * - Real-time state snapshots (diff-based, throttled)
 * - Action history tracking with aggregation
 * - Event listeners for state changes and actions
 * - Statistics and metrics
 */
import type { GameRuntime, Patch } from '@martini/core';
export interface StateSnapshot {
    id: number;
    timestamp: number;
    state?: any;
    diff?: Patch[];
    lastActionId?: number;
}
export interface ActionRecord {
    id: number;
    timestamp: number;
    actionName: string;
    input: any;
    playerId?: string;
    targetId?: string;
    count?: number;
    duration?: number;
    snapshotId?: number;
    excludedActionsTotal?: number;
}
export interface InspectorStats {
    totalActions: number;
    totalStateChanges: number;
    actionsByName: Record<string, number>;
    excludedActions: number;
}
export interface StateInspectorOptions {
    maxSnapshots?: number;
    maxActions?: number;
    snapshotIntervalMs?: number;
    actionAggregationWindowMs?: number;
    ignoreActions?: string[];
}
type StateChangeListener = (snapshot: StateSnapshot) => void;
type ActionListener = (action: ActionRecord) => void;
export declare class StateInspector {
    private runtime;
    private originalSubmitAction;
    private snapshots;
    private actionHistory;
    private stateChangeListeners;
    private actionListeners;
    private unsubscribes;
    private totalActions;
    private totalStateChanges;
    private actionsByName;
    private excludedActions;
    private readonly maxSnapshots;
    private readonly maxActions;
    private readonly snapshotIntervalMs;
    private readonly actionAggregationWindowMs;
    private readonly ignoreActions;
    private lastSnapshotState;
    private lastSnapshotTimestamp;
    private snapshotIdCounter;
    private actionIdCounter;
    private awaitingSnapshotActionId;
    private deferredSnapshotActionId;
    private snapshotTimer;
    private paused;
    private pendingStateChanges;
    private pendingActions;
    private notifyScheduled;
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
     * Pause/resume snapshot capturing
     */
    setPaused(paused: boolean): void;
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
    private scheduleSnapshot;
    private captureSnapshot;
    private trimSnapshots;
    private trackAction;
    private scheduleNotify;
    private notifyStateChangeListeners;
    private notifyActionListeners;
    private applyDiffs;
    private deepClone;
}
export {};
//# sourceMappingURL=StateInspector.d.ts.map