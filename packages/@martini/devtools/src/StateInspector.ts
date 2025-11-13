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

export class StateInspector {
  private runtime: GameRuntime | null = null;
  private snapshots: StateSnapshot[] = [];
  private actionHistory: ActionRecord[] = [];
  private stateChangeListeners: StateChangeListener[] = [];
  private actionListeners: ActionListener[] = [];
  private unsubscribes: Array<() => void> = [];

  private totalActions = 0;
  private totalStateChanges = 0;
  private actionsByName: Record<string, number> = {};

  private readonly maxSnapshots: number;
  private readonly maxActions: number;

  constructor(options: StateInspectorOptions = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.maxActions = options.maxActions ?? 1000;
  }

  /**
   * Attach inspector to a GameRuntime instance
   */
  attach(runtime: GameRuntime): void {
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

    runtime.submitAction = (actionName: string, input: any, targetId?: string) => {
      // Track the action before it's submitted
      this.trackAction(actionName, input, targetId);

      // Call original method
      return originalSubmitAction(actionName, input, targetId);
    };
  }

  /**
   * Detach inspector from runtime
   */
  detach(): void {
    if (!this.runtime) return;

    // Clean up all listeners
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];

    this.runtime = null;
  }

  /**
   * Check if inspector is attached
   */
  isAttached(): boolean {
    return this.runtime !== null;
  }

  /**
   * Get the attached runtime (or null if not attached)
   */
  getRuntime(): GameRuntime | null {
    return this.runtime;
  }

  /**
   * Get all captured state snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get action history
   */
  getActionHistory(): ActionRecord[] {
    return [...this.actionHistory];
  }

  /**
   * Get statistics
   */
  getStats(): InspectorStats {
    return {
      totalActions: this.totalActions,
      totalStateChanges: this.totalStateChanges,
      actionsByName: { ...this.actionsByName },
    };
  }

  /**
   * Listen for state changes
   */
  onStateChange(listener: StateChangeListener): () => void {
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
  onAction(listener: ActionListener): () => void {
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
  clear(): void {
    this.snapshots = [];
    this.actionHistory = [];
    this.totalActions = 0;
    this.totalStateChanges = 0;
    this.actionsByName = {};
  }

  // Private methods

  private captureSnapshot(): void {
    if (!this.runtime) return;

    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      state: this.deepClone(this.runtime.getState()),
    };

    this.snapshots.push(snapshot);

    // Enforce max snapshots limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift(); // Remove oldest
    }
  }

  private trackAction(actionName: string, input: any, targetId?: string): void {
    if (!this.runtime) return;

    const transport = this.runtime.getTransport();
    const playerId = transport.getPlayerId();

    const record: ActionRecord = {
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

  private notifyStateChangeListeners(): void {
    if (this.snapshots.length === 0) return;

    const latest = this.snapshots[this.snapshots.length - 1];
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(latest);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  private notifyActionListeners(record: ActionRecord): void {
    this.actionListeners.forEach(listener => {
      try {
        listener(record);
      } catch (error) {
        console.error('Error in action listener:', error);
      }
    });
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
}
