/**
 * StateInspector - Development tool for debugging Martini games
 *
 * Features:
 * - Real-time state snapshots
 * - Action history tracking
 * - Event listeners for state changes and actions
 * - Statistics and metrics
 */
export class StateInspector {
    constructor(options = {}) {
        this.runtime = null;
        this.snapshots = [];
        this.actionHistory = [];
        this.stateChangeListeners = [];
        this.actionListeners = [];
        this.unsubscribes = [];
        this.totalActions = 0;
        this.totalStateChanges = 0;
        this.actionsByName = {};
        this.maxSnapshots = options.maxSnapshots ?? 100;
        this.maxActions = options.maxActions ?? 1000;
    }
    /**
     * Attach inspector to a GameRuntime instance
     */
    attach(runtime) {
        if (this.runtime) {
            throw new Error('Inspector is already attached. Call detach() first.');
        }
        this.runtime = runtime;
        // Capture initial state
        this.captureSnapshot();
        // Listen for state changes
        const unsubState = runtime.onChange((state) => {
            this.captureSnapshot();
            this.totalStateChanges++;
            this.notifyStateChangeListeners();
        });
        this.unsubscribes.push(unsubState);
        // Intercept submitAction to track actions
        // We need to wrap the submitAction method
        const originalSubmitAction = runtime.submitAction.bind(runtime);
        runtime.submitAction = (actionName, input, targetId) => {
            // Track the action before it's submitted
            this.trackAction(actionName, input, targetId);
            // Call original method
            return originalSubmitAction(actionName, input, targetId);
        };
    }
    /**
     * Detach inspector from runtime
     */
    detach() {
        if (!this.runtime)
            return;
        // Clean up all listeners
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];
        this.runtime = null;
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
        return [...this.snapshots];
    }
    /**
     * Get action history
     */
    getActionHistory() {
        return [...this.actionHistory];
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalActions: this.totalActions,
            totalStateChanges: this.totalStateChanges,
            actionsByName: { ...this.actionsByName },
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
    }
    // Private methods
    captureSnapshot() {
        if (!this.runtime)
            return;
        const snapshot = {
            timestamp: Date.now(),
            state: this.deepClone(this.runtime.getState()),
        };
        this.snapshots.push(snapshot);
        // Enforce max snapshots limit
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift(); // Remove oldest
        }
    }
    trackAction(actionName, input, targetId) {
        if (!this.runtime)
            return;
        const transport = this.runtime.getTransport();
        const playerId = transport.getPlayerId();
        const record = {
            timestamp: Date.now(),
            actionName,
            input: this.deepClone(input),
            playerId,
            targetId,
        };
        this.actionHistory.push(record);
        this.totalActions++;
        // Track action frequency
        if (!this.actionsByName[actionName]) {
            this.actionsByName[actionName] = 0;
        }
        this.actionsByName[actionName]++;
        // Enforce max actions limit
        if (this.actionHistory.length > this.maxActions) {
            this.actionHistory.shift(); // Remove oldest
        }
        // Notify listeners
        this.notifyActionListeners(record);
    }
    notifyStateChangeListeners() {
        if (this.snapshots.length === 0)
            return;
        const latest = this.snapshots[this.snapshots.length - 1];
        this.stateChangeListeners.forEach(listener => {
            try {
                listener(latest);
            }
            catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }
    notifyActionListeners(record) {
        this.actionListeners.forEach(listener => {
            try {
                listener(record);
            }
            catch (error) {
                console.error('Error in action listener:', error);
            }
        });
    }
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (obj instanceof Array)
            return obj.map(item => this.deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
}
//# sourceMappingURL=StateInspector.js.map