// ../core/dist/sync.js
function generateDiff(oldState, newState) {
  const patches = [];
  function diff(oldVal, newVal, path = []) {
    if (typeof oldVal !== typeof newVal || oldVal === null || newVal === null) {
      if (oldVal !== newVal) {
        patches.push({ op: "replace", path, value: newVal });
      }
      return;
    }
    if (Array.isArray(newVal)) {
      if (!Array.isArray(oldVal) || oldVal.length !== newVal.length) {
        patches.push({ op: "replace", path, value: newVal });
        return;
      }
      for (let i = 0; i < newVal.length; i++) {
        diff(oldVal[i], newVal[i], [...path, String(i)]);
      }
      return;
    }
    if (typeof newVal === "object") {
      const oldKeys = Object.keys(oldVal || {});
      const newKeys = Object.keys(newVal || {});
      for (const key of oldKeys) {
        if (!(key in newVal)) {
          patches.push({ op: "remove", path: [...path, key] });
        }
      }
      for (const key of newKeys) {
        if (!(key in oldVal)) {
          patches.push({ op: "add", path: [...path, key], value: newVal[key] });
        } else {
          diff(oldVal[key], newVal[key], [...path, key]);
        }
      }
      return;
    }
    if (oldVal !== newVal) {
      patches.push({ op: "replace", path, value: newVal });
    }
  }
  diff(oldState, newState);
  return patches;
}
function applyPatch(state, patch) {
  const { op, path, value } = patch;
  if (path.length === 0) {
    throw new Error("Cannot patch root - path must have at least one element");
  }
  let current = state;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  const finalKey = path[path.length - 1];
  switch (op) {
    case "add":
    case "replace":
      current[finalKey] = value;
      break;
    case "remove":
      if (Array.isArray(current)) {
        current.splice(Number(finalKey), 1);
      } else {
        delete current[finalKey];
      }
      break;
  }
}

// ../core/dist/Logger.js
var Logger = class _Logger {
  channelName;
  listeners = [];
  enabled = true;
  minLevel = "log";
  context;
  parentContext;
  includeStack = false;
  timers = /* @__PURE__ */ new Map();
  static LEVEL_PRIORITY = {
    log: 0,
    warn: 1,
    error: 2
  };
  constructor(channel = "", parentContext) {
    this.channelName = channel;
    this.parentContext = parentContext;
  }
  /**
   * Log an informational message
   */
  log(message, ...data) {
    this.writeLog("log", message, data);
  }
  /**
   * Log a warning message
   */
  warn(message, ...data) {
    this.writeLog("warn", message, data);
  }
  /**
   * Log an error message
   */
  error(message, ...data) {
    this.writeLog("error", message, data);
  }
  /**
   * Create a collapsible group in the console
   */
  group(label) {
    if (this.enabled) {
      const formatted = this.formatMessage(label);
      console.group(formatted);
    }
  }
  /**
   * End the current group
   */
  groupEnd() {
    if (this.enabled) {
      console.groupEnd();
    }
  }
  /**
   * Assert a condition, log error if false
   */
  assert(condition, message) {
    if (!condition) {
      const assertMessage = message ? `Assertion failed: ${message}` : "Assertion failed";
      this.writeLog("error", assertMessage, []);
    }
  }
  /**
   * Start a performance timer
   */
  time(label) {
    this.timers.set(label, performance.now());
  }
  /**
   * End a performance timer and log the duration
   */
  timeEnd(label) {
    const startTime = this.timers.get(label);
    if (startTime === void 0) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    if (this.enabled) {
      const formatted = this.formatMessage(`${label}: ${duration.toFixed(2)}ms`);
      console.log(formatted);
    }
  }
  /**
   * Create a child logger with a nested channel name
   */
  channel(name) {
    const childChannel = this.channelName ? `${this.channelName}:${name}` : name;
    const mergedContext = this.getMergedContext();
    const child = new _Logger(childChannel, mergedContext);
    child.enabled = this.enabled;
    child.minLevel = this.minLevel;
    child.includeStack = this.includeStack;
    return child;
  }
  /**
   * Register a listener for log entries (used by DevTools)
   */
  onLog(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  /**
   * Enable or disable console output
   * Note: Listeners are still notified when disabled (for DevTools)
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  /**
   * Set minimum log level (filters out lower priority logs)
   */
  setMinLevel(level) {
    this.minLevel = level;
  }
  /**
   * Attach context data to all log entries
   */
  setContext(context) {
    this.context = context;
  }
  /**
   * Include stack traces in all log entries
   */
  setIncludeStack(include) {
    this.includeStack = include;
  }
  /**
   * Internal: Write a log entry
   */
  writeLog(level, message, data) {
    if (!this.shouldLog(level)) {
      return;
    }
    const entry = {
      level,
      channel: this.channelName,
      message,
      data,
      timestamp: Date.now(),
      context: this.getMergedContext()
    };
    if (this.includeStack || level === "error") {
      entry.stack = this.captureStack();
    }
    this.notifyListeners(entry);
    if (this.enabled) {
      this.writeToConsole(level, message, data);
    }
  }
  /**
   * Check if a log level should be output
   */
  shouldLog(level) {
    const levelPriority = _Logger.LEVEL_PRIORITY[level];
    const minPriority = _Logger.LEVEL_PRIORITY[this.minLevel];
    return levelPriority >= minPriority;
  }
  /**
   * Format message with channel prefix
   */
  formatMessage(message) {
    if (this.channelName) {
      return `[${this.channelName}] ${message}`;
    }
    return message;
  }
  /**
   * Write to browser console
   */
  writeToConsole(level, message, data) {
    const formatted = this.formatMessage(message);
    switch (level) {
      case "log":
        console.log(formatted, ...data);
        break;
      case "warn":
        console.warn(formatted, ...data);
        break;
      case "error":
        console.error(formatted, ...data);
        break;
    }
  }
  /**
   * Notify all listeners
   */
  notifyListeners(entry) {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error("Error in log listener:", err);
      }
    }
  }
  /**
   * Merge parent and local context
   */
  getMergedContext() {
    if (!this.parentContext && !this.context) {
      return void 0;
    }
    return {
      ...this.parentContext,
      ...this.context
    };
  }
  /**
   * Capture current stack trace
   */
  captureStack() {
    const error = new Error();
    if (error.stack) {
      const lines = error.stack.split("\n");
      return lines.slice(3).join("\n");
    }
    return "";
  }
};
var logger = new Logger("martini-kit");

// src/StateInspector.ts
var StateInspector = class {
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
    this.checkpointInterval = 50;
    this.lastSnapshotState = null;
    this.lastSnapshotTimestamp = 0;
    this.snapshotIdCounter = 0;
    this.actionIdCounter = 0;
    this.awaitingSnapshotActionId = null;
    this.deferredSnapshotActionId = null;
    this.deferredPatches = null;
    this.snapshotTimer = null;
    this.paused = false;
    this.pendingStateChanges = [];
    this.pendingActions = [];
    this.notifyScheduled = false;
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.maxActions = options.maxActions ?? 1e3;
    this.snapshotIntervalMs = options.snapshotIntervalMs ?? 250;
    this.actionAggregationWindowMs = options.actionAggregationWindowMs ?? 200;
    this.ignoreActions = new Set(options.ignoreActions ?? []);
    this.maxMemoryBytes = options.maxMemoryBytes ?? 50 * 1024 * 1024;
  }
  /**
   * Attach inspector to a GameRuntime instance
   */
  attach(runtime) {
    if (this.runtime) {
      throw new Error("Inspector is already attached. Call detach() first.");
    }
    this.runtime = runtime;
    this.scheduleSnapshot(void 0, true);
    const unsubPatch = runtime.onPatch((patches) => {
      this.totalStateChanges++;
      const actionId = this.awaitingSnapshotActionId;
      this.awaitingSnapshotActionId = null;
      this.scheduleSnapshotWithPatches(patches, actionId ?? void 0);
    });
    this.unsubscribes.push(unsubPatch);
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
    if (!this.runtime) return;
    this.unsubscribes.forEach((unsub) => unsub());
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
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      if (this.snapshotTimer) {
        clearTimeout(this.snapshotTimer);
        this.snapshotTimer = null;
      }
      console.log("[Inspector] Paused - stopping captures");
    } else {
      console.log("[Inspector] Resumed - capturing snapshots");
      if (this.runtime) {
        this.scheduleSnapshot(void 0, true);
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
    return this.snapshots.map((snapshot) => ({
      ...snapshot,
      state: snapshot.state ? this.deepClone(snapshot.state) : void 0,
      diff: snapshot.diff ? snapshot.diff.map((patch) => ({ ...patch, path: [...patch.path] })) : void 0
    }));
  }
  /**
   * Get action history
   */
  getActionHistory() {
    return this.actionHistory.map((record) => ({
      ...record,
      input: this.deepClone(record.input)
    }));
  }
  /**
   * Get statistics including memory usage estimates
   */
  getStats() {
    const checkpointCount = this.snapshots.filter((s) => s.state).length;
    let estimatedMemoryBytes = 0;
    for (const snapshot of this.snapshots) {
      if (snapshot.state) {
        try {
          estimatedMemoryBytes += JSON.stringify(snapshot.state).length * 2;
        } catch (e) {
          estimatedMemoryBytes += 1e3;
        }
      }
      if (snapshot.diff) {
        estimatedMemoryBytes += snapshot.diff.length * 100;
      }
    }
    estimatedMemoryBytes += this.actionHistory.length * 200;
    return {
      totalActions: this.totalActions,
      totalStateChanges: this.totalStateChanges,
      actionsByName: { ...this.actionsByName },
      excludedActions: this.excludedActions,
      snapshotCount: this.snapshots.length,
      checkpointCount,
      estimatedMemoryBytes
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
    if (!this.runtime) return;
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
      const actionId = this.deferredSnapshotActionId ?? void 0;
      this.deferredSnapshotActionId = null;
      this.captureSnapshot(actionId);
    }, delay);
  }
  captureSnapshot(linkedActionId) {
    if (!this.runtime) return;
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    const stateClone = this.deepClone(this.runtime.getState());
    const timestamp = Date.now();
    const snapshotId = ++this.snapshotIdCounter;
    let snapshot;
    if (!this.lastSnapshotState) {
      snapshot = {
        id: snapshotId,
        timestamp,
        state: stateClone,
        lastActionId: linkedActionId ?? void 0
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
        lastActionId: linkedActionId ?? void 0
      };
    }
    this.lastSnapshotState = stateClone;
    this.lastSnapshotTimestamp = timestamp;
    this.snapshots.push(snapshot);
    this.trimSnapshots();
    if (snapshot.lastActionId) {
      const action = this.actionHistory.find((record) => record.id === snapshot.lastActionId);
      if (action) {
        action.snapshotId = snapshot.id;
        this.notifyActionListeners({ ...action });
      }
    }
    this.notifyStateChangeListeners(snapshot);
  }
  scheduleSnapshotWithPatches(patches, linkedActionId) {
    if (!this.runtime) return;
    if (this.paused) return;
    const now = Date.now();
    const elapsed = now - this.lastSnapshotTimestamp;
    if (elapsed >= this.snapshotIntervalMs) {
      this.captureSnapshotFromPatches(patches, linkedActionId);
    } else {
      this.deferredPatches = patches;
      this.deferredSnapshotActionId = linkedActionId ?? this.deferredSnapshotActionId ?? null;
      if (!this.snapshotTimer) {
        const delay = Math.max(0, this.snapshotIntervalMs - elapsed);
        this.snapshotTimer = setTimeout(() => {
          this.snapshotTimer = null;
          const actionId = this.deferredSnapshotActionId ?? void 0;
          this.deferredSnapshotActionId = null;
          if (this.deferredPatches) {
            this.captureSnapshotFromPatches(this.deferredPatches, actionId);
            this.deferredPatches = null;
          }
        }, delay);
      }
    }
  }
  captureSnapshotFromPatches(patches, linkedActionId) {
    if (!this.runtime) return;
    if (patches.length === 0) return;
    const timestamp = Date.now();
    const snapshotId = ++this.snapshotIdCounter;
    const isCheckpoint = snapshotId % this.checkpointInterval === 0;
    let snapshot;
    if (isCheckpoint) {
      const fullState = this.runtime.getState();
      snapshot = {
        id: snapshotId,
        timestamp,
        state: this.deepClone(fullState),
        lastActionId: linkedActionId
      };
    } else {
      snapshot = {
        id: snapshotId,
        timestamp,
        diff: patches.map((p) => ({ ...p, path: [...p.path] })),
        // Shallow copy patches
        lastActionId: linkedActionId
      };
    }
    this.lastSnapshotTimestamp = timestamp;
    this.snapshots.push(snapshot);
    this.trimSnapshots();
    if (snapshot.lastActionId) {
      const action = this.actionHistory.find((record) => record.id === snapshot.lastActionId);
      if (action) {
        action.snapshotId = snapshot.id;
        this.notifyActionListeners(action);
      }
    }
    this.notifyStateChangeListeners(snapshot);
  }
  trimSnapshots() {
    while (this.snapshots.length > this.maxSnapshots) {
      const removed = this.snapshots.shift();
      const next = this.snapshots[0];
      if (removed?.state && next && !next.state) {
        const isNextCheckpointSlot = next.id % this.checkpointInterval === 0;
        if (isNextCheckpointSlot) {
          const baseState = removed.state;
          const derivedState = this.applyDiffs(baseState, next.diff);
          next.state = derivedState;
          delete next.diff;
        }
      }
    }
    const stats = this.getStats();
    if (stats.estimatedMemoryBytes > this.maxMemoryBytes) {
      const overage = stats.estimatedMemoryBytes - this.maxMemoryBytes;
      const percentOver = (overage / this.maxMemoryBytes * 100).toFixed(1);
      console.warn(`[Inspector] Memory limit exceeded by ${percentOver}% (${(overage / 1024 / 1024).toFixed(2)}MB over ${(this.maxMemoryBytes / 1024 / 1024).toFixed(0)}MB limit)`);
      const toRemove = Math.max(1, Math.floor(this.snapshots.length * 0.25));
      console.warn(`[Inspector] Aggressively trimming ${toRemove} snapshots to prevent tab freeze`);
      this.snapshots.splice(0, toRemove);
      if (this.actionHistory.length > this.maxActions / 2) {
        const actionsToRemove = Math.floor(this.actionHistory.length * 0.25);
        console.warn(`[Inspector] Trimming ${actionsToRemove} old actions`);
        this.actionHistory.splice(0, actionsToRemove);
      }
    }
  }
  trackAction(actionName, input, targetId) {
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
    const canAggregate = lastRecord && lastRecord.actionName === actionName && lastRecord.playerId === playerId && lastRecord.targetId === targetId && now - lastRecord.timestamp <= this.actionAggregationWindowMs;
    if (canAggregate) {
      lastRecord.count = (lastRecord.count ?? 1) + 1;
      lastRecord.duration = now - lastRecord.timestamp;
      lastRecord.input = this.deepClone(input);
      lastRecord.excludedActionsTotal = this.excludedActions || void 0;
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
      excludedActionsTotal: this.excludedActions || void 0
    };
    this.awaitingSnapshotActionId = record.id;
    this.actionHistory.push(record);
    if (this.actionHistory.length > this.maxActions) {
      this.actionHistory.shift();
    }
    this.notifyActionListeners({ ...record });
  }
  scheduleNotify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      if (this.pendingStateChanges.length > 0) {
        const snapshots = this.pendingStateChanges.splice(0);
        this.stateChangeListeners.forEach((listener) => {
          snapshots.forEach((snapshot) => {
            try {
              listener(snapshot);
            } catch (error) {
              console.error("Error in state change listener:", error);
            }
          });
        });
      }
      if (this.pendingActions.length > 0) {
        const actions = this.pendingActions.splice(0);
        this.actionListeners.forEach((listener) => {
          actions.forEach((action) => {
            try {
              listener(action);
            } catch (error) {
              console.error("Error in action listener:", error);
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
    if (typeof structuredClone !== "undefined") {
      try {
        return structuredClone(obj);
      } catch (error) {
        console.warn("[Inspector] structuredClone failed, falling back to JSON:", error);
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch (jsonError) {
          console.error("[Inspector] JSON clone also failed:", jsonError);
          return obj;
        }
      }
    }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error("[Inspector] JSON clone failed:", error);
      return obj;
    }
  }
};

// browser.ts
var browser_default = {
  StateInspector
};
export {
  StateInspector,
  browser_default as default
};
