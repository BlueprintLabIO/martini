"use strict";
var martini-kit = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    StateInspector: () => StateInspector,
    default: () => browser_default
  });

  // src/StateInspector.ts
  var StateInspector = class {
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
      this.maxActions = options.maxActions ?? 1e3;
    }
    /**
     * Attach inspector to a GameRuntime instance
     */
    attach(runtime) {
      if (this.runtime) {
        throw new Error("Inspector is already attached. Call detach() first.");
      }
      this.runtime = runtime;
      this.captureSnapshot();
      const unsubState = runtime.onChange((state) => {
        this.captureSnapshot();
        this.totalStateChanges++;
        this.notifyStateChangeListeners();
      });
      this.unsubscribes.push(unsubState);
      const originalSubmitAction = runtime.submitAction.bind(runtime);
      runtime.submitAction = (actionName, input, targetId) => {
        this.trackAction(actionName, input, targetId);
        return originalSubmitAction(actionName, input, targetId);
      };
    }
    /**
     * Detach inspector from runtime
     */
    detach() {
      if (!this.runtime) return;
      this.unsubscribes.forEach((unsub) => unsub());
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
        actionsByName: { ...this.actionsByName }
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
      if (!this.runtime) return;
      const snapshot = {
        timestamp: Date.now(),
        state: this.deepClone(this.runtime.getState())
      };
      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots.shift();
      }
    }
    trackAction(actionName, input, targetId) {
      if (!this.runtime) return;
      const transport = this.runtime.getTransport();
      const playerId = transport.getPlayerId();
      const record = {
        timestamp: Date.now(),
        actionName,
        input: this.deepClone(input),
        playerId,
        targetId
      };
      this.actionHistory.push(record);
      this.totalActions++;
      if (!this.actionsByName[actionName]) {
        this.actionsByName[actionName] = 0;
      }
      this.actionsByName[actionName]++;
      if (this.actionHistory.length > this.maxActions) {
        this.actionHistory.shift();
      }
      this.notifyActionListeners(record);
    }
    notifyStateChangeListeners() {
      if (this.snapshots.length === 0) return;
      const latest = this.snapshots[this.snapshots.length - 1];
      this.stateChangeListeners.forEach((listener) => {
        try {
          listener(latest);
        } catch (error) {
          console.error("Error in state change listener:", error);
        }
      });
    }
    notifyActionListeners(record) {
      this.actionListeners.forEach((listener) => {
        try {
          listener(record);
        } catch (error) {
          console.error("Error in action listener:", error);
        }
      });
    }
    deepClone(obj) {
      if (obj === null || typeof obj !== "object") return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  };

  // browser.ts
  var browser_default = {
    StateInspector
  };
  return __toCommonJS(browser_exports);
})();
