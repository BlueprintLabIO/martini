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
  snapshotCount: number;
  checkpointCount: number;
  estimatedMemoryBytes: number;
}

export interface StateInspectorOptions {
  maxSnapshots?: number;
  maxActions?: number;
  snapshotIntervalMs?: number;
  actionAggregationWindowMs?: number;
  ignoreActions?: string[];
  /** Maximum memory usage in bytes before aggressive trimming (default: 50MB) */
  maxMemoryBytes?: number;
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
  private readonly checkpointInterval = 50; // Full state every 50 snapshots
  private readonly maxMemoryBytes: number;

  private lastSnapshotState: any = null;
  private lastSnapshotTimestamp = 0;
  private snapshotIdCounter = 0;
  private actionIdCounter = 0;
  private awaitingSnapshotActionId: number | null = null;
  private deferredSnapshotActionId: number | null = null;
  private deferredPatches: Patch[] | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private pendingStateChanges: StateSnapshot[] = [];
  private pendingActions: ActionRecord[] = [];
  private notifyScheduled = false;

  constructor(options: StateInspectorOptions = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.maxActions = options.maxActions ?? 1000;
    this.snapshotIntervalMs = options.snapshotIntervalMs ?? 250;
    this.actionAggregationWindowMs = options.actionAggregationWindowMs ?? 200;
    this.ignoreActions = new Set(options.ignoreActions ?? []);
    this.maxMemoryBytes = options.maxMemoryBytes ?? 50 * 1024 * 1024; // 50MB default
  }

  /**
   * Attach inspector to a GameRuntime instance
   */
  attach(runtime: GameRuntime): void {
    if (this.runtime) {
      throw new Error('Inspector is already attached. Call detach() first.');
    }

    this.runtime = runtime;

    // Capture initial state immediately (still need one clone for first snapshot)
    this.scheduleSnapshot(undefined, true);

    // Subscribe to patches instead of onChange - this reuses patches already computed by GameRuntime
    const unsubPatch = runtime.onPatch((patches) => {
      this.totalStateChanges++;
      const actionId = this.awaitingSnapshotActionId;
      this.awaitingSnapshotActionId = null;
      this.scheduleSnapshotWithPatches(patches, actionId ?? undefined);
    });
    this.unsubscribes.push(unsubPatch);

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
   * Pause/resume snapshot capturing
   */
  setPaused(paused: boolean): void {
    if (this.paused === paused) return;

    this.paused = paused;

    if (paused) {
      // Stop capturing
      if (this.snapshotTimer) {
        clearTimeout(this.snapshotTimer);
        this.snapshotTimer = null;
      }
      console.log('[Inspector] Paused - stopping captures');
    } else {
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
   * Get statistics including memory usage estimates
   */
  getStats(): InspectorStats {
    // Count checkpoints (snapshots with full state)
    const checkpointCount = this.snapshots.filter(s => s.state).length;

    // Estimate memory usage (rough approximation)
    let estimatedMemoryBytes = 0;
    for (const snapshot of this.snapshots) {
      if (snapshot.state) {
        // Checkpoint: rough estimate based on JSON serialization
        try {
          estimatedMemoryBytes += JSON.stringify(snapshot.state).length * 2; // UTF-16
        } catch (e) {
          estimatedMemoryBytes += 1000; // Fallback estimate
        }
      }
      if (snapshot.diff) {
        // Diff snapshot: much smaller
        estimatedMemoryBytes += snapshot.diff.length * 100; // ~100 bytes per patch
      }
    }

    // Add action history memory
    estimatedMemoryBytes += this.actionHistory.length * 200; // ~200 bytes per action

    return {
      totalActions: this.totalActions,
      totalStateChanges: this.totalStateChanges,
      actionsByName: { ...this.actionsByName },
      excludedActions: this.excludedActions,
      snapshotCount: this.snapshots.length,
      checkpointCount,
      estimatedMemoryBytes,
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

    // Guard: don't schedule if paused (unless forced)
    if (this.paused && !force) return;

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
      // Initial snapshot captured
    } else {
      const diff = generateDiff(this.lastSnapshotState, stateClone);

      if (diff.length === 0) {
        // No changes detected, skip snapshot
        this.lastSnapshotState = stateClone;
        return;
      }

      snapshot = {
        id: snapshotId,
        timestamp,
        diff,
        lastActionId: linkedActionId ?? undefined,
      };
      // Snapshot captured with diff
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

  private scheduleSnapshotWithPatches(patches: Patch[], linkedActionId?: number): void {
    if (!this.runtime) return;
    if (this.paused) return;

    const now = Date.now();
    const elapsed = now - this.lastSnapshotTimestamp;

    if (elapsed >= this.snapshotIntervalMs) {
      this.captureSnapshotFromPatches(patches, linkedActionId);
    } else {
      // Defer snapshot but save patches
      this.deferredPatches = patches;
      this.deferredSnapshotActionId = linkedActionId ?? this.deferredSnapshotActionId ?? null;

      if (!this.snapshotTimer) {
        const delay = Math.max(0, this.snapshotIntervalMs - elapsed);
        this.snapshotTimer = setTimeout(() => {
          this.snapshotTimer = null;
          const actionId = this.deferredSnapshotActionId ?? undefined;
          this.deferredSnapshotActionId = null;
          if (this.deferredPatches) {
            this.captureSnapshotFromPatches(this.deferredPatches, actionId);
            this.deferredPatches = null;
          }
        }, delay);
      }
    }
  }

  private captureSnapshotFromPatches(patches: Patch[], linkedActionId?: number): void {
    if (!this.runtime) return;
    if (patches.length === 0) return;

    const timestamp = Date.now();
    const snapshotId = ++this.snapshotIdCounter;

    // Determine if this should be a checkpoint (stores full state for faster rehydration)
    const isCheckpoint = (snapshotId % this.checkpointInterval) === 0;

    let snapshot: StateSnapshot;

    if (isCheckpoint) {
      // Store full state at checkpoint intervals to prevent O(n) rehydration
      const fullState = this.runtime.getState();
      snapshot = {
        id: snapshotId,
        timestamp,
        state: this.deepClone(fullState),
        lastActionId: linkedActionId,
      };
      // Checkpoint: stored full state
    } else {
      // Store diff for non-checkpoint snapshots (memory efficient)
      snapshot = {
        id: snapshotId,
        timestamp,
        diff: patches.map(p => ({ ...p, path: [...p.path] })), // Shallow copy patches
        lastActionId: linkedActionId,
      };
      // Snapshot from patches
    }

    this.lastSnapshotTimestamp = timestamp;

    this.snapshots.push(snapshot);
    this.trimSnapshots();

    if (snapshot.lastActionId) {
      const action = this.actionHistory.find(record => record.id === snapshot.lastActionId);
      if (action) {
        action.snapshotId = snapshot.id;
        this.notifyActionListeners(action);
      }
    }

    this.notifyStateChangeListeners(snapshot);
  }

  private trimSnapshots(): void {
    // First, enforce max snapshots limit
    while (this.snapshots.length > this.maxSnapshots) {
      const removed = this.snapshots.shift();
      const next = this.snapshots[0];

      // If we removed a checkpoint, convert the next snapshot to a checkpoint
      if (removed?.state && next && !next.state) {
        // Only rehydrate if next is a checkpoint slot
        const isNextCheckpointSlot = (next.id % this.checkpointInterval) === 0;

        if (isNextCheckpointSlot) {
          // Rehydrate: apply diffs to get full state
          const baseState = removed.state; // Already cloned when stored
          const derivedState = this.applyDiffs(baseState, next.diff);
          next.state = derivedState;
          delete next.diff; // Convert to full checkpoint
          // Converted snapshot to checkpoint during trim
        }
      }
    }

    // Second, enforce memory limit (aggressive trimming if needed)
    const stats = this.getStats();
    if (stats.estimatedMemoryBytes > this.maxMemoryBytes) {
      const overage = stats.estimatedMemoryBytes - this.maxMemoryBytes;
      const percentOver = (overage / this.maxMemoryBytes * 100).toFixed(1);
      console.warn(`[Inspector] Memory limit exceeded by ${percentOver}% (${(overage / 1024 / 1024).toFixed(2)}MB over ${(this.maxMemoryBytes / 1024 / 1024).toFixed(0)}MB limit)`);

      // Aggressively trim: remove 25% of oldest snapshots
      const toRemove = Math.max(1, Math.floor(this.snapshots.length * 0.25));
      console.warn(`[Inspector] Aggressively trimming ${toRemove} snapshots to prevent tab freeze`);
      this.snapshots.splice(0, toRemove);

      // Also trim actions if needed
      if (this.actionHistory.length > this.maxActions / 2) {
        const actionsToRemove = Math.floor(this.actionHistory.length * 0.25);
        console.warn(`[Inspector] Trimming ${actionsToRemove} old actions`);
        this.actionHistory.splice(0, actionsToRemove);
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

  private scheduleNotify(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    queueMicrotask(() => {
      // Notify state change listeners
      if (this.pendingStateChanges.length > 0) {
        const snapshots = this.pendingStateChanges.splice(0);
        this.stateChangeListeners.forEach(listener => {
          snapshots.forEach(snapshot => {
            try {
              listener(snapshot);
            } catch (error) {
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
            } catch (error) {
              console.error('Error in action listener:', error);
            }
          });
        });
      }

      this.notifyScheduled = false;
    });
  }

  private notifyStateChangeListeners(snapshot: StateSnapshot): void {
    this.pendingStateChanges.push(snapshot);
    this.scheduleNotify();
  }

  private notifyActionListeners(record: ActionRecord): void {
    this.pendingActions.push(record);
    this.scheduleNotify();
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
    // Use native structuredClone if available (faster, handles more types)
    if (typeof structuredClone !== 'undefined') {
      try {
        return structuredClone(obj);
      } catch (error) {
        // Fallback to JSON clone for non-clonable objects
        console.warn('[Inspector] structuredClone failed, falling back to JSON:', error);
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch (jsonError) {
          console.error('[Inspector] JSON clone also failed:', jsonError);
          return obj; // Return as-is if all cloning fails
        }
      }
    }

    // Fallback for older environments (shouldn't happen in modern browsers)
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('[Inspector] JSON clone failed:', error);
      return obj;
    }
  }
}
