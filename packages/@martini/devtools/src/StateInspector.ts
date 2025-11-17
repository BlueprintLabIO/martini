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
import { generateDiff, applyPatch } from '@martini/core';

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

export class StateInspector {
  private runtime: GameRuntime | null = null;
  private originalSubmitAction: GameRuntime['submitAction'] | null = null;
  private snapshots: StateSnapshot[] = [];
  private actionHistory: ActionRecord[] = [];
  private stateChangeListeners: StateChangeListener[] = [];
  private actionListeners: ActionListener[] = [];
  private unsubscribes: Array<() => void> = [];

  private totalActions = 0;
  private totalStateChanges = 0;
  private actionsByName: Record<string, number> = {};
  private excludedActions = 0;

  private readonly maxSnapshots: number;
  private readonly maxActions: number;
  private readonly snapshotIntervalMs: number;
  private readonly actionAggregationWindowMs: number;
  private readonly ignoreActions: Set<string>;

  private lastSnapshotState: any = null;
  private lastSnapshotTimestamp = 0;
  private snapshotIdCounter = 0;
  private actionIdCounter = 0;
  private awaitingSnapshotActionId: number | null = null;
  private deferredSnapshotActionId: number | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: StateInspectorOptions = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.maxActions = options.maxActions ?? 1000;
    this.snapshotIntervalMs = options.snapshotIntervalMs ?? 250;
    this.actionAggregationWindowMs = options.actionAggregationWindowMs ?? 200;
    this.ignoreActions = new Set(options.ignoreActions ?? []);
  }

  /**
   * Attach inspector to a GameRuntime instance
   */
  attach(runtime: GameRuntime): void {
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
    runtime.submitAction = (actionName: string, input: any, targetId?: string) => {
      this.trackAction(actionName, input, targetId);
      return this.originalSubmitAction!.call(runtime, actionName, input, targetId);
    };
  }

  /**
   * Detach inspector from runtime
   */
  detach(): void {
    if (!this.runtime) return;

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
    return this.snapshots.map(snapshot => ({
      ...snapshot,
      state: snapshot.state ? this.deepClone(snapshot.state) : undefined,
      diff: snapshot.diff ? snapshot.diff.map(patch => ({ ...patch, path: [...patch.path] })) : undefined,
    }));
  }

  /**
   * Get action history
   */
  getActionHistory(): ActionRecord[] {
    return this.actionHistory.map(record => ({
      ...record,
      input: this.deepClone(record.input),
    }));
  }

  /**
   * Get statistics
   */
  getStats(): InspectorStats {
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
    this.excludedActions = 0;
    this.lastSnapshotState = null;
    this.lastSnapshotTimestamp = 0;
    this.snapshotIdCounter = 0;
    this.actionIdCounter = 0;
    this.awaitingSnapshotActionId = null;
    this.deferredSnapshotActionId = null;
  }

  // Private methods

  private scheduleSnapshot(linkedActionId?: number, force = false): void {
    if (!this.runtime) return;

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

    if (this.snapshotTimer) return;

    const delay = Math.max(0, this.snapshotIntervalMs - elapsed);
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      const actionId = this.deferredSnapshotActionId ?? undefined;
      this.deferredSnapshotActionId = null;
      this.captureSnapshot(actionId);
    }, delay);
  }

  private captureSnapshot(linkedActionId?: number): void {
    if (!this.runtime) return;

    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    const stateClone = this.deepClone(this.runtime.getState());
    const timestamp = Date.now();
    const snapshotId = ++this.snapshotIdCounter;

    let snapshot: StateSnapshot;

    if (!this.lastSnapshotState) {
      snapshot = {
        id: snapshotId,
        timestamp,
        state: stateClone,
        lastActionId: linkedActionId ?? undefined,
      };
    } else {
      const diff = generateDiff(this.lastSnapshotState, stateClone);
      if (diff.length === 0) {
        this.lastSnapshotState = stateClone;
        return;
      }
      snapshot = {
        id: snapshotId,
        timestamp,
        diff,
        lastActionId: linkedActionId ?? undefined,
      };
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

  private trimSnapshots(): void {
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

  private trackAction(actionName: string, input: any, targetId?: string): void {
    if (!this.runtime) return;

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
    const canAggregate =
      lastRecord &&
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

    const record: ActionRecord = {
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

  private notifyStateChangeListeners(snapshot: StateSnapshot): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener({ ...snapshot });
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  private notifyActionListeners(record: ActionRecord): void {
    this.actionListeners.forEach(listener => {
      try {
        listener({ ...record });
      } catch (error) {
        console.error('Error in action listener:', error);
      }
    });
  }

  private applyDiffs(base: any, diff?: Patch[]): any {
    if (!diff || diff.length === 0) {
      return base;
    }
    const cloned = this.deepClone(base);
    for (const patch of diff) {
      applyPatch(cloned, patch);
    }
    return cloned;
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));

    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
}
