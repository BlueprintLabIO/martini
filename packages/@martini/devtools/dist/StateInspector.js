/**
 * StateInspector - Development tool for debugging Martini games
 *
 * Features:
 * - Real-time state snapshots (diff-based, throttled)
 * - Action history tracking with aggregation
 * - Event listeners for state changes and actions
 * - Statistics and metrics
 */
import { generateDiff, applyPatch } from '@martini/core';
export class StateInspector {
    constructor(options = {}) {
        this.runtime = null;
        this.originalSubmitAction = null;
        this.snapshots = [];
        this.actionHistory = [];
        this.stateChangeListeners = [];
        this.actionListeners = [];
        this.unsubscribes = [];
        this.totalActions = 0;
        this.totalStateChanges = 0;
        this.actionsByName = {};
        this.excludedActions = 0;
        this.lastSnapshotState = null;
        this.lastSnapshotTimestamp = 0;
        this.snapshotIdCounter = 0;
        this.actionIdCounter = 0;
        this.awaitingSnapshotActionId = null;
        this.deferredSnapshotActionId = null;
        this.snapshotTimer = null;
        this.paused = false;
        this.pendingStateChanges = [];
        this.pendingActions = [];
        this.notifyScheduled = false;
        this.maxSnapshots = options.maxSnapshots ?? 100;
        this.maxActions = options.maxActions ?? 1000;
        this.snapshotIntervalMs = options.snapshotIntervalMs ?? 250;
        this.actionAggregationWindowMs = options.actionAggregationWindowMs ?? 200;
        this.ignoreActions = new Set(options.ignoreActions ?? []);
    }
    /**
     * Attach inspector to a GameRuntime instance
     */
    attach(runtime) {
        if (this.runtime) {
            throw new Error('Inspector is already attached. Call detach() first.');
        }
        this.runtime = runtime;
        // Capture initial state immediately
        this.scheduleSnapshot(undefined, true);
        // Listen for state changes
        const unsubState = runtime.onChange(() => {
            this.totalStateChanges++;
            const actionId = this.awaitingSnapshotActionId;
            this.awaitingSnapshotActionId = null;
            this.scheduleSnapshot(actionId ?? undefined);
        });
        this.unsubscribes.push(unsubState);
        // Intercept submitAction to track actions
        this.originalSubmitAction = runtime.submitAction;
        runtime.submitAction = (actionName, input, targetId) => {
            this.trackAction(actionName, input, targetId);
            return this.originalSubmitAction.call(runtime, actionName, input, targetId);
        };
    }
    /**
     * Detach inspector from runtime
     */
    detach() {
        if (!this.runtime)
            return;
        // Clean up listeners
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];
        if (this.snapshotTimer) {
            clearTimeout(this.snapshotTimer);
            this.snapshotTimer = null;
        }
        if (this.originalSubmitAction) {
            this.runtime.submitAction = this.originalSubmitAction;
            this.originalSubmitAction = null;
        }
        this.runtime = null;
        this.lastSnapshotState = null;
        this.awaitingSnapshotActionId = null;
        this.deferredSnapshotActionId = null;
    }
    /**
     * Pause/resume snapshot capturing
     */
    setPaused(paused) {
        if (this.paused === paused)
            return;
        this.paused = paused;
        if (paused) {
            // Stop capturing
            if (this.snapshotTimer) {
                clearTimeout(this.snapshotTimer);
                this.snapshotTimer = null;
            }
            console.log('[Inspector] Paused - stopping captures');
        }
        else {
            // Resume with immediate snapshot
            console.log('[Inspector] Resumed - capturing snapshots');
            if (this.runtime) {
                this.scheduleSnapshot(undefined, true);
            }
        }
    }
    /**
     * Check if inspector is attached
     */
    isAttached() {
        return this.runtime !== null;
    }
    /**
     * Get the attached runtime (or null if not attached)
     */
    getRuntime() {
        return this.runtime;
    }
    /**
     * Get all captured state snapshots
     */
    getSnapshots() {
        return this.snapshots.map(snapshot => ({
            ...snapshot,
            state: snapshot.state ? this.deepClone(snapshot.state) : undefined,
            diff: snapshot.diff ? snapshot.diff.map(patch => ({ ...patch, path: [...patch.path] })) : undefined,
        }));
    }
    /**
     * Get action history
     */
    getActionHistory() {
        return this.actionHistory.map(record => ({
            ...record,
            input: this.deepClone(record.input),
        }));
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalActions: this.totalActions,
            totalStateChanges: this.totalStateChanges,
            actionsByName: { ...this.actionsByName },
            excludedActions: this.excludedActions,
        };
    }
    /**
     * Listen for state changes
     */
    onStateChange(listener) {
        this.stateChangeListeners.push(listener);
        return () => {
            const index = this.stateChangeListeners.indexOf(listener);
            if (index !== -1) {
                this.stateChangeListeners.splice(index, 1);
            }
        };
    }
    /**
     * Listen for actions
     */
    onAction(listener) {
        this.actionListeners.push(listener);
        return () => {
            const index = this.actionListeners.indexOf(listener);
            if (index !== -1) {
                this.actionListeners.splice(index, 1);
            }
        };
    }
    /**
     * Clear all history
     */
    clear() {
        this.snapshots = [];
        this.actionHistory = [];
        this.totalActions = 0;
        this.totalStateChanges = 0;
        this.actionsByName = {};
        this.excludedActions = 0;
        this.lastSnapshotState = null;
        this.lastSnapshotTimestamp = 0;
        this.snapshotIdCounter = 0;
        this.actionIdCounter = 0;
        this.awaitingSnapshotActionId = null;
        this.deferredSnapshotActionId = null;
    }
    // Private methods
    scheduleSnapshot(linkedActionId, force = false) {
        if (!this.runtime)
            return;
        // Guard: don't schedule if paused (unless forced)
        if (this.paused && !force)
            return;
        if (force || this.snapshotIntervalMs <= 0) {
            this.captureSnapshot(linkedActionId);
            return;
        }
        const now = Date.now();
        const elapsed = now - this.lastSnapshotTimestamp;
        if (elapsed >= this.snapshotIntervalMs) {
            this.captureSnapshot(linkedActionId);
            return;
        }
        this.deferredSnapshotActionId = linkedActionId ?? this.deferredSnapshotActionId ?? null;
        if (this.snapshotTimer)
            return;
        const delay = Math.max(0, this.snapshotIntervalMs - elapsed);
        this.snapshotTimer = setTimeout(() => {
            this.snapshotTimer = null;
            const actionId = this.deferredSnapshotActionId ?? undefined;
            this.deferredSnapshotActionId = null;
            this.captureSnapshot(actionId);
        }, delay);
    }
    captureSnapshot(linkedActionId) {
        if (!this.runtime)
            return;
        if (this.snapshotTimer) {
            clearTimeout(this.snapshotTimer);
            this.snapshotTimer = null;
        }
        const t0 = performance.now();
        const stateClone = this.deepClone(this.runtime.getState());
        const t1 = performance.now();
        const timestamp = Date.now();
        const snapshotId = ++this.snapshotIdCounter;
        let snapshot;
        if (!this.lastSnapshotState) {
            snapshot = {
                id: snapshotId,
                timestamp,
                state: stateClone,
                lastActionId: linkedActionId ?? undefined,
            };
            const t2 = performance.now();
            console.log(`[Inspector] Initial snapshot: clone=${(t1 - t0).toFixed(2)}ms, total=${(t2 - t0).toFixed(2)}ms`);
        }
        else {
            const diff = generateDiff(this.lastSnapshotState, stateClone);
            const t2 = performance.now();
            if (diff.length === 0) {
                console.log(`[Inspector] No changes: clone=${(t1 - t0).toFixed(2)}ms, diff=${(t2 - t1).toFixed(2)}ms (skipped)`);
                this.lastSnapshotState = stateClone;
                return;
            }
            snapshot = {
                id: snapshotId,
                timestamp,
                diff,
                lastActionId: linkedActionId ?? undefined,
            };
            const t3 = performance.now();
            console.log(`[Inspector] Snapshot #${snapshotId}: clone=${(t1 - t0).toFixed(2)}ms, diff=${(t2 - t1).toFixed(2)}ms, patches=${diff.length}, total=${(t3 - t0).toFixed(2)}ms`);
        }
        this.lastSnapshotState = stateClone;
        this.lastSnapshotTimestamp = timestamp;
        this.snapshots.push(snapshot);
        this.trimSnapshots();
        if (snapshot.lastActionId) {
            const action = this.actionHistory.find(record => record.id === snapshot.lastActionId);
            if (action) {
                action.snapshotId = snapshot.id;
                this.notifyActionListeners({ ...action });
            }
        }
        this.notifyStateChangeListeners(snapshot);
    }
    trimSnapshots() {
        while (this.snapshots.length > this.maxSnapshots) {
            const removed = this.snapshots.shift();
            if (removed?.state && this.snapshots[0]) {
                const baseState = this.deepClone(removed.state);
                const next = this.snapshots[0];
                if (!next.state) {
                    const derivedState = this.applyDiffs(baseState, next.diff);
                    next.state = derivedState;
                }
            }
        }
    }
    trackAction(actionName, input, targetId) {
        if (!this.runtime)
            return;
        if (this.ignoreActions.has(actionName)) {
            this.excludedActions++;
            return;
        }
        const transport = this.runtime.getTransport();
        const playerId = transport.getPlayerId();
        const now = Date.now();
        this.totalActions++;
        if (!this.actionsByName[actionName]) {
            this.actionsByName[actionName] = 0;
        }
        this.actionsByName[actionName]++;
        const lastRecord = this.actionHistory[this.actionHistory.length - 1];
        const canAggregate = lastRecord &&
            lastRecord.actionName === actionName &&
            lastRecord.playerId === playerId &&
            lastRecord.targetId === targetId &&
            now - lastRecord.timestamp <= this.actionAggregationWindowMs;
        if (canAggregate) {
            lastRecord.count = (lastRecord.count ?? 1) + 1;
            lastRecord.duration = now - lastRecord.timestamp;
            lastRecord.input = this.deepClone(input);
            lastRecord.excludedActionsTotal = this.excludedActions || undefined;
            this.awaitingSnapshotActionId = lastRecord.id;
            this.notifyActionListeners({ ...lastRecord });
            return;
        }
        const record = {
            id: ++this.actionIdCounter,
            timestamp: now,
            actionName,
            input: this.deepClone(input),
            playerId,
            targetId,
            count: 1,
            duration: 0,
            excludedActionsTotal: this.excludedActions || undefined,
        };
        this.awaitingSnapshotActionId = record.id;
        this.actionHistory.push(record);
        if (this.actionHistory.length > this.maxActions) {
            this.actionHistory.shift();
        }
        this.notifyActionListeners({ ...record });
    }
    scheduleNotify() {
        if (this.notifyScheduled)
            return;
        this.notifyScheduled = true;
        queueMicrotask(() => {
            // Notify state change listeners
            if (this.pendingStateChanges.length > 0) {
                const snapshots = this.pendingStateChanges.splice(0);
                this.stateChangeListeners.forEach(listener => {
                    snapshots.forEach(snapshot => {
                        try {
                            listener(snapshot);
                        }
                        catch (error) {
                            console.error('Error in state change listener:', error);
                        }
                    });
                });
            }
            // Notify action listeners
            if (this.pendingActions.length > 0) {
                const actions = this.pendingActions.splice(0);
                this.actionListeners.forEach(listener => {
                    actions.forEach(action => {
                        try {
                            listener(action);
                        }
                        catch (error) {
                            console.error('Error in action listener:', error);
                        }
                    });
                });
            }
            this.notifyScheduled = false;
        });
    }
    notifyStateChangeListeners(snapshot) {
        this.pendingStateChanges.push(snapshot);
        this.scheduleNotify();
    }
    notifyActionListeners(record) {
        this.pendingActions.push(record);
        this.scheduleNotify();
    }
    applyDiffs(base, diff) {
        if (!diff || diff.length === 0) {
            return base;
        }
        const cloned = this.deepClone(base);
        for (const patch of diff) {
            applyPatch(cloned, patch);
        }
        return cloned;
    }
    deepClone(obj) {
        // Use native structuredClone if available (faster, handles more types)
        if (typeof structuredClone !== 'undefined') {
            try {
                return structuredClone(obj);
            }
            catch (error) {
                // Fallback to JSON clone for non-clonable objects
                console.warn('[Inspector] structuredClone failed, falling back to JSON:', error);
                try {
                    return JSON.parse(JSON.stringify(obj));
                }
                catch (jsonError) {
                    console.error('[Inspector] JSON clone also failed:', jsonError);
                    return obj; // Return as-is if all cloning fails
                }
            }
        }
        // Fallback for older environments (shouldn't happen in modern browsers)
        try {
            return JSON.parse(JSON.stringify(obj));
        }
        catch (error) {
            console.error('[Inspector] JSON clone failed:', error);
            return obj;
        }
    }
}
//# sourceMappingURL=StateInspector.js.map