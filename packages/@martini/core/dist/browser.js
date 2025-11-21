var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/defineGame.ts
function defineGame(definition) {
  if (!definition.actions) {
    definition.actions = {};
  }
  for (const [name, action] of Object.entries(definition.actions)) {
    if (typeof action.apply !== "function") {
      throw new Error(`Action "${name}" must have an apply function`);
    }
  }
  return definition;
}

// src/sync.ts
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
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

// src/SeededRandom.ts
var SeededRandom = class {
  /**
   * Creates a new SeededRandom instance
   *
   * @param seed - Initial seed value (any integer)
   */
  constructor(seed) {
    __publicField(this, "state");
    // LCG parameters (from Numerical Recipes)
    __publicField(this, "m", 2147483648);
    // 2^31
    __publicField(this, "a", 1103515245);
    __publicField(this, "c", 12345);
    this.state = Math.abs(Math.floor(seed)) % this.m;
    if (this.state === 0) this.state = 1;
  }
  /**
   * Generate next random number in sequence
   *
   * @returns Random float in range [0, 1)
   */
  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }
  /**
   * Generate random integer in range [min, max)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random integer in [min, max)
   *
   * @example
   * ```typescript
   * rng.range(0, 10);   // 0-9
   * rng.range(10, 20);  // 10-19
   * rng.range(-5, 5);   // -5 to 4
   * ```
   */
  range(min, max) {
    if (min === max) return min;
    return Math.floor(this.next() * (max - min)) + min;
  }
  /**
   * Generate random float in range [min, max)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float in [min, max)
   *
   * @example
   * ```typescript
   * rng.float(0, 1);      // 0.0 to 0.999...
   * rng.float(0, 100);    // 0.0 to 99.999...
   * rng.float(-1, 1);     // -1.0 to 0.999...
   * ```
   */
  float(min, max) {
    return this.next() * (max - min) + min;
  }
  /**
   * Choose random element from array
   *
   * @param array - Array to choose from
   * @returns Random element from array
   * @throws Error if array is empty
   *
   * @example
   * ```typescript
   * rng.choice(['red', 'blue', 'green']);
   * rng.choice([1, 2, 3, 4, 5]);
   * ```
   */
  choice(array) {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array");
    }
    return array[this.range(0, array.length)];
  }
  /**
   * Shuffle array (Fisher-Yates algorithm)
   * Returns a new shuffled array without modifying the original
   *
   * @param array - Array to shuffle
   * @returns New shuffled array
   *
   * @example
   * ```typescript
   * const cards = ['A', 'K', 'Q', 'J'];
   * const shuffled = rng.shuffle(cards);
   * // cards is unchanged, shuffled is randomized
   * ```
   */
  shuffle(array) {
    if (array.length <= 1) return [...array];
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.range(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  /**
   * Generate random boolean with optional probability
   *
   * @param probability - Probability of returning true (0.0 to 1.0, default 0.5)
   * @returns true or false based on probability
   *
   * @example
   * ```typescript
   * rng.boolean();      // 50% chance of true
   * rng.boolean(0.7);   // 70% chance of true
   * rng.boolean(1.0);   // Always true
   * rng.boolean(0.0);   // Always false
   * ```
   */
  boolean(probability = 0.5) {
    return this.next() < probability;
  }
};

// src/GameRuntime.ts
var GameRuntime = class {
  constructor(gameDef, transport, config) {
    this.gameDef = gameDef;
    this.transport = transport;
    this.config = config;
    __publicField(this, "state", {});
    __publicField(this, "previousState", {});
    __publicField(this, "_isHost");
    __publicField(this, "syncIntervalId", null);
    __publicField(this, "unsubscribes", []);
    __publicField(this, "strict");
    __publicField(this, "actionCounter", 1e5);
    // For seeding action random (start high to avoid LCG collisions)
    __publicField(this, "stateChangeCallbacks", []);
    __publicField(this, "eventCallbacks", /* @__PURE__ */ new Map());
    __publicField(this, "patchListeners", []);
    this._isHost = config.isHost;
    this.strict = config.strict ?? false;
    const initialPlayerIds = config.playerIds || [];
    if (gameDef.setup) {
      const setupRandom = new SeededRandom(12345);
      this.state = gameDef.setup({ playerIds: initialPlayerIds, random: setupRandom });
    }
    this.previousState = deepClone(this.state);
    if (initialPlayerIds.length > 0) {
      this.validatePlayerInitialization(initialPlayerIds);
    }
    this.setupTransport();
    if (this._isHost) {
      const syncInterval = config.syncInterval || 50;
      this.syncIntervalId = setInterval(() => this.syncState(), syncInterval);
    }
  }
  /**
   * Get current state (read-only, typed)
   */
  getState() {
    return this.state;
  }
  /**
   * Check if this runtime is the host
   */
  isHost() {
    return this._isHost;
  }
  /**
   * Get the current player's ID
   *
   * @returns The unique player ID for this client
   *
   * @example
   * ```ts
   * const myId = runtime.getMyPlayerId();
   * console.log('My player ID:', myId);
   * ```
   */
  getMyPlayerId() {
    return this.transport.getPlayerId();
  }
  /**
   * Get transport (for adapters to check isHost, getPlayerId, etc)
   * @internal
   */
  getTransport() {
    return this.transport;
  }
  /**
   * Directly mutate state (for adapters only - bypasses actions)
   * Only the host should call this
   * @internal
   */
  mutateState(mutator) {
    if (!this._isHost) {
      this.handleError("mutateState called on non-host - ignoring");
      return;
    }
    mutator(this.state);
    this.notifyStateChange();
  }
  /**
   * Execute an action (validates input, applies to state, broadcasts)
   * @param actionName - Name of the action to execute
   * @param input - Action payload/input data
   * @param targetId - Optional target player ID (defaults to caller's ID)
   */
  submitAction(actionName, input, targetId) {
    if (!this.gameDef.actions) {
      this.handleError("No actions defined in game");
      return;
    }
    const action = this.gameDef.actions[actionName];
    if (!action) {
      const availableActions = Object.keys(this.gameDef.actions);
      const suggestion = this.findClosestMatch(actionName, availableActions);
      let errorMsg = `Action "${actionName}" not found.`;
      if (availableActions.length > 0) {
        errorMsg += `

Available actions: ${availableActions.join(", ")}`;
        if (suggestion) {
          errorMsg += `

Did you mean "${suggestion}"?`;
        }
      } else {
        errorMsg += "\n\nNo actions are defined in your game.";
      }
      this.handleError(errorMsg);
      return;
    }
    const playerId = this.transport.getPlayerId();
    const actionSeed = this.actionCounter++;
    const actionRandom = new SeededRandom(actionSeed);
    const context = {
      playerId,
      // Who called submitAction
      targetId: targetId || playerId,
      // Who is affected (defaults to caller)
      isHost: this._isHost,
      random: actionRandom
    };
    if (this._isHost) {
      action.apply(this.state, context, input);
      this.notifyStateChange();
    }
    this.transport.send({
      type: "action",
      payload: { actionName, input, context, actionSeed },
      senderId: playerId
    });
  }
  /**
   * Broadcast a custom event
   */
  broadcastEvent(eventName, payload) {
    const playerId = this.transport.getPlayerId();
    this.transport.send({
      type: "event",
      payload: { eventName, payload },
      senderId: playerId
    });
  }
  /**
   * Listen for custom events
   */
  onEvent(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName).push(callback);
    return () => {
      const callbacks = this.eventCallbacks.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      }
    };
  }
  /**
   * Listen for state changes (typed)
   */
  onChange(callback) {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index !== -1) this.stateChangeCallbacks.splice(index, 1);
    };
  }
  /**
   * Subscribe to state patches as they're generated
   * This allows DevTools to reuse the patches that GameRuntime already computed
   * instead of re-cloning and re-diffing the state
   */
  onPatch(listener) {
    this.patchListeners.push(listener);
    return () => {
      const index = this.patchListeners.indexOf(listener);
      if (index !== -1) {
        this.patchListeners.splice(index, 1);
      }
    };
  }
  /**
   * Cleanup
   */
  destroy() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }
  // ============================================================================
  // Private methods
  // ============================================================================
  setupTransport() {
    this.unsubscribes.push(
      this.transport.onMessage((msg, senderId) => {
        this.handleMessage(msg, senderId);
      })
    );
    this.unsubscribes.push(
      this.transport.onPeerJoin((peerId) => {
        if (this.gameDef.onPlayerJoin) {
          this.gameDef.onPlayerJoin(this.state, peerId);
        }
        if (this._isHost) {
          this.transport.send({
            type: "state_sync",
            payload: { fullState: this.state }
          }, peerId);
        }
      })
    );
    this.unsubscribes.push(
      this.transport.onPeerLeave((peerId) => {
        if (this.gameDef.onPlayerLeave) {
          this.gameDef.onPlayerLeave(this.state, peerId);
        }
      })
    );
  }
  handleMessage(msg, senderId) {
    switch (msg.type) {
      case "state_sync":
        if (!this._isHost) {
          this.handleStateSync(msg.payload);
        }
        break;
      case "action":
        if (this._isHost && senderId !== this.transport.getPlayerId()) {
          this.handleActionFromClient(msg.payload);
        }
        break;
      case "event":
        this.handleEvent(senderId, msg.payload);
        break;
    }
  }
  handleStateSync(payload) {
    if (payload.fullState) {
      this.state = payload.fullState;
      this.notifyStateChange();
    } else if (payload.patches) {
      for (const patch of payload.patches) {
        applyPatch(this.state, patch);
      }
      this.notifyStateChange(payload.patches);
    }
  }
  handleActionFromClient(payload) {
    const { actionName, input, context, actionSeed } = payload;
    if (!this.gameDef.actions) {
      this.handleError("No actions defined");
      return;
    }
    const action = this.gameDef.actions[actionName];
    if (!action) {
      const availableActions = Object.keys(this.gameDef.actions);
      this.handleError(
        `Unknown action from client: ${actionName}. Available: ${availableActions.join(", ")}`
      );
      return;
    }
    const contextWithRandom = {
      ...context,
      random: new SeededRandom(actionSeed)
    };
    action.apply(this.state, contextWithRandom, input);
    this.notifyStateChange();
  }
  handleEvent(senderId, payload) {
    const { eventName, payload: eventPayload } = payload;
    const callbacks = this.eventCallbacks.get(eventName) || [];
    for (const callback of callbacks) {
      callback(senderId, eventName, eventPayload);
    }
  }
  syncState() {
    if (!this._isHost) return;
    const patches = generateDiff(this.previousState, this.state);
    if (patches.length > 0) {
      this.transport.send({
        type: "state_sync",
        payload: { patches }
      });
      this.notifyStateChange(patches);
    }
    this.previousState = deepClone(this.state);
  }
  /**
   * Unified state change notification - ensures all listeners are notified consistently
   * @param patches - Optional pre-computed patches (e.g., from host sync). If not provided, generates them.
   *
   * Note: This does NOT update previousState. Only syncState() updates it (once per sync interval).
   * This ensures optimal performance - we only clone state 20 times/sec (at sync) instead of
   * on every action/mutation which could be 100+ times/sec.
   */
  notifyStateChange(patches) {
    let computedPatches = null;
    if (this.patchListeners.length > 0) {
      computedPatches = patches ?? generateDiff(this.previousState, this.state);
      if (computedPatches.length > 0) {
        this.patchListeners.forEach((listener) => {
          try {
            listener(computedPatches);
          } catch (error) {
            console.error("Error in patch listener:", error);
          }
        });
      }
    }
    for (const callback of this.stateChangeCallbacks) {
      callback(this.state);
    }
  }
  /**
   * Handle errors with strict mode support
   */
  handleError(message) {
    if (this.strict) {
      throw new Error(`[Martini] ${message}`);
    } else {
      console.warn(`[Martini] ${message}`);
    }
  }
  /**
   * Find closest string match (for typo suggestions)
   */
  findClosestMatch(input, options) {
    if (options.length === 0) return null;
    let minDistance = Infinity;
    let closest = null;
    for (const option of options) {
      const distance = this.levenshteinDistance(input.toLowerCase(), option.toLowerCase());
      if (distance < minDistance && distance <= 3) {
        minDistance = distance;
        closest = option;
      }
    }
    return closest;
  }
  /**
   * Calculate Levenshtein distance for typo detection
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            // deletion
            dp[i][j - 1] + 1,
            // insertion
            dp[i - 1][j - 1] + 1
            // substitution
          );
        }
      }
    }
    return dp[m][n];
  }
  /**
   * Validate that all playerIds are initialized in state.players
   * Emits warning or throws error based on configuration
   */
  validatePlayerInitialization(playerIds) {
    const playersKey = this.config.playersKey || "players";
    const players = this.state[playersKey];
    if (!players || typeof players !== "object") {
      const message = [
        `\u26A0\uFE0F  Player initialization issue detected:`,
        ``,
        `Expected state.${playersKey} to be an object, but got: ${typeof players}`,
        ``,
        `Fix: Initialize players in setup():`,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: Object.fromEntries(`,
        `      playerIds.map(id => [id, { x: 100, y: 100 }])`,
        `    )`,
        `  })`
      ].join("\n");
      if (this.config.strictPlayerInit) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
      return;
    }
    const missingPlayers = playerIds.filter((id) => !(id in players));
    if (missingPlayers.length > 0) {
      const message = [
        `\u26A0\uFE0F  Player initialization issue detected:`,
        ``,
        `Expected ${playerIds.length} players, but ${missingPlayers.length} missing from state.${playersKey}`,
        `Missing player IDs: ${missingPlayers.join(", ")}`,
        ``,
        `Fix: Initialize all players in setup():`,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: Object.fromEntries(`,
        `      playerIds.map((id, index) => [id, {`,
        `        x: index * 100,`,
        `        y: 100,`,
        `        score: 0`,
        `      }])`,
        `    )`,
        `  })`,
        ``,
        `Or use the createPlayers helper:`,
        `  import { createPlayers } from '@martini/core';`,
        ``,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: createPlayers(playerIds, (id, index) => ({`,
        `      x: index * 100, y: 100, score: 0`,
        `    }))`,
        `  })`
      ].join("\n");
      if (this.config.strictPlayerInit) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
  }
};

// src/Logger.ts
var _Logger = class _Logger {
  constructor(channel = "", parentContext) {
    __publicField(this, "channelName");
    __publicField(this, "listeners", []);
    __publicField(this, "enabled", true);
    __publicField(this, "minLevel", "log");
    __publicField(this, "context");
    __publicField(this, "parentContext");
    __publicField(this, "includeStack", false);
    __publicField(this, "timers", /* @__PURE__ */ new Map());
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
__publicField(_Logger, "LEVEL_PRIORITY", {
  log: 0,
  warn: 1,
  error: 2
});
var Logger = _Logger;
var logger = new Logger("Martini");

// src/PlayerManager.ts
function createPlayerManager(config) {
  const { factory, roles, spawnPoints, worldBounds } = config;
  let playerCount = 0;
  const createPlayer = (playerId, index) => {
    let player = factory(playerId, index);
    if (spawnPoints && spawnPoints[index]) {
      player = { ...player, ...spawnPoints[index] };
    }
    if (roles && roles[index]) {
      player = { ...player, role: roles[index] };
    }
    if (worldBounds) {
      const clamped = player;
      if (typeof clamped.x === "number") {
        clamped.x = Math.max(0, Math.min(worldBounds.width, clamped.x));
      }
      if (typeof clamped.y === "number") {
        clamped.y = Math.max(0, Math.min(worldBounds.height, clamped.y));
      }
    }
    return player;
  };
  return {
    initialize(playerIds) {
      playerCount = playerIds.length;
      return Object.fromEntries(
        playerIds.map((id, index) => [id, createPlayer(id, index)])
      );
    },
    handleJoin(players, playerId) {
      const currentCount = Object.keys(players).length;
      players[playerId] = createPlayer(playerId, currentCount);
      playerCount = currentCount + 1;
    },
    handleLeave(players, playerId) {
      delete players[playerId];
      playerCount = Object.keys(players).length;
    },
    getConfig(index) {
      return {
        role: roles?.[index],
        spawn: spawnPoints?.[index]
      };
    },
    createHandlers() {
      const manager = this;
      return {
        setup: ({ playerIds }) => {
          return {
            players: manager.initialize(playerIds)
          };
        },
        onPlayerJoin: (state, playerId) => {
          manager.handleJoin(state.players, playerId);
        },
        onPlayerLeave: (state, playerId) => {
          manager.handleLeave(state.players, playerId);
        }
      };
    }
  };
}

// src/helpers.ts
function createPlayers(playerIds, factory) {
  return Object.fromEntries(playerIds.map((id, index) => [id, factory(id, index)]));
}
function createInputAction(stateKey = "inputs", options) {
  return {
    apply: (state, context, input) => {
      if (options?.validate && !options.validate(input)) {
        if (true) {
          console.warn(`[${stateKey}] Invalid input rejected:`, input);
        }
        return;
      }
      if (!state[stateKey]) {
        state[stateKey] = {};
      }
      state[stateKey][context.targetId] = input;
      options?.onApply?.(state, context, input);
    }
  };
}
function createTickAction(tickFn) {
  return {
    apply: (state, context, input) => {
      if (!context.isHost) return;
      const delta = input.delta || 0;
      tickFn(state, delta, context);
    }
  };
}
export {
  GameRuntime,
  Logger,
  SeededRandom,
  applyPatch,
  createInputAction,
  createPlayerManager,
  createPlayers,
  createTickAction,
  defineGame,
  generateDiff,
  logger
};
//# sourceMappingURL=browser.js.map
