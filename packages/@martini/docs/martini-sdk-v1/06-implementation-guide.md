# Implementation Guide

Internal algorithms and implementation details for the Martini SDK runtime.

**Fixes Issues:** #5 (Warm Standby), #6 (Tick Drift), #7 (Array Deletion), #8 (Pause/Resume), #9 (Interpolation), #10 (Clone Performance), #11 (Bandwidth Pruning)

---

## Table of Contents

1. [Schema Proxy](#schema-proxy)
2. [Predict-Rollback Engine](#predict-rollback-engine)
3. [Action Execution Pipeline](#action-execution-pipeline)
4. [Seeded Random Generator](#seeded-random-generator)
5. [Deep Diff & Patch](#deep-diff--patch)
6. [Warm Standby Manager](#warm-standby-manager)
7. [Tick Synchronization](#tick-synchronization)
8. [Client-Side Interpolation](#client-side-interpolation)
9. [Bandwidth Monitoring](#bandwidth-monitoring)

---

## Schema Proxy

Runtime validation wrapper with auto-clamping and mutation tracking.

### Implementation

```typescript
// Proxy cache to prevent recreating proxies on every access (performance!)
const proxyCache = new WeakMap<object, any>();
const pathMap = new WeakMap<object, string[]>();

function createSchemaProxy(state: any, schema: Schema, parentPath: string[] = []): any {
  // Primitives don't need proxies
  if (typeof state !== 'object' || state === null) {
    return state;
  }

  // Return cached proxy if exists (prevents GC pressure)
  if (proxyCache.has(state)) {
    return proxyCache.get(state);
  }

  // Store path for this object
  pathMap.set(state, parentPath);

  const proxy = new Proxy(state, {
    get(target, prop) {
      if (typeof prop === 'symbol') return target[prop];

      const value = target[prop];

      // Recursively wrap nested objects with their path
      if (typeof value === 'object' && value !== null) {
        return createSchemaProxy(value, schema, [...parentPath, String(prop)]);
      }

      return value;
    },

    set(target, prop, value) {
      if (typeof prop === 'symbol') {
        target[prop] = value;
        return true;
      }

      // Construct full path: ['players', 'p1', 'score']
      const path = [...parentPath, String(prop)];
      const pathString = path.join('.');
      const schemaRule = matchSchemaPath(schema, pathString);

      if (schemaRule) {
        // Validate type
        if (typeof value !== schemaRule.type) {
          throw new Error(
            `Schema violation: ${pathString} expects ${schemaRule.type}, got ${typeof value}`
          );
        }

        // Auto-clamp or reject numbers based on strict mode
        if (schemaRule.type === 'number') {
          if (schemaRule.min !== undefined && value < schemaRule.min) {
            if (schemaRule.strict) {
              throw new Error(
                `Schema violation: ${pathString} must be >= ${schemaRule.min}, got ${value}`
              );
            }
            value = schemaRule.min;  // Clamp to min
          }
          if (schemaRule.max !== undefined && value > schemaRule.max) {
            if (schemaRule.strict) {
              throw new Error(
                `Schema violation: ${pathString} must be <= ${schemaRule.max}, got ${value}`
              );
            }
            value = schemaRule.max;  // Clamp to max
          }
        }

        // Track mutation for dev warnings
        if (isDev) {
          trackMutation(pathString, path);
        }
      }

      const previous = target[prop];
      target[prop] = value;

      // ✅ FIX ISSUE #10: Invalidate proxy cache if object was replaced
      if (typeof previous === 'object' && previous !== null) {
        proxyCache.delete(previous);
        pathMap.delete(previous);
      }

      // Clear any stale proxy for the new value before we wrap it elsewhere
      if (typeof value === 'object' && value !== null) {
        proxyCache.delete(value);
        pathMap.delete(value);
      }

      return true;
    }
  });

  proxyCache.set(state, proxy);
  return proxy;
}

// Match schema paths with wildcards
// e.g., "players.p1.score" matches "players.*.score"
function matchSchemaPath(schema: Schema, pathString: string): SchemaRule | null {
  const parts = pathString.split('.');

  for (const pattern in schema) {
    const patternParts = pattern.split('.');

    if (partsMatch(parts, patternParts)) {
      return schema[pattern];
    }
  }

  return null;
}

function partsMatch(parts: string[], pattern: string[]): boolean {
  if (parts.length !== pattern.length) return false;

  for (let i = 0; i < parts.length; i++) {
    if (pattern[i] !== '*' && pattern[i] !== parts[i]) {
      return false;
    }
  }

  return true;
}

// Track mutations for dev mode warnings
function trackMutation(pathString: string, pathArray: string[]): void {
  if (!currentActionContext) return;

  // Extract player ID from path like ['players', 'p1', 'x']
  if (pathArray[0] === 'players' && pathArray.length >= 2) {
    const mutatedPlayerId = pathArray[1];
    currentActionContext.mutatedPlayers.add(mutatedPlayerId);

    if (currentActionContext.mutatedPlayers.size > 1 &&
        !currentActionContext.warnedMultiPlayer) {
      const players = Array.from(currentActionContext.mutatedPlayers);
      console.warn(
        `⚠️  Action "${currentActionContext.actionName}" mutated ${players.length} players: ${players.join(', ')}\n` +
        `   Acting player: ${currentActionContext.actingPlayerId}\n` +
        `   This may be intentional (e.g., collision), but verify it's not a bug.`
      );
      currentActionContext.warnedMultiPlayer = true;
    }
  }
}

// Context tracking for dev mode
let currentActionContext: {
  actionName: string;
  actingPlayerId: string;
  mutatedPlayers: Set<string>;
  warnedMultiPlayer: boolean;
} | null = null;
```

---

## Predict-Rollback Engine

Client-side prediction with server reconciliation.

### Implementation

```typescript
type GameDefinition = { actions: Record<string, ActionConfig> };

class PredictRollbackEngine {
  private snapshots: StateSnapshot[] = [];
  private confirmedTick: number = 0;
  private readonly maxRollbackTicks: number;

  constructor(
    private readonly gameLogic: GameDefinition,
    private readonly actionExecutor: ActionExecutor,
    maxRollbackTicks = 64
  ) {
    this.maxRollbackTicks = maxRollbackTicks;
  }

  // Client predicts action
  predictAction(action: QueuedAction, state: any): void {
    // Save snapshot before prediction
    this.saveSnapshot(state);

    // Execute action optimistically
    this.runAction(action, state);

    // Mark as predicted
    action.predicted = true;
  }

  // Server confirms state
  reconcile(serverState: any, serverTick: number): void {
    const currentTick = this.getCurrentTick();

    // Find how far back to rollback
    const rollbackTick = serverTick;

    // Get snapshot at rollback point
    const snapshot = this.getSnapshot(rollbackTick);

    if (!snapshot) {
      // Too old, can't rollback - accept server state
      this.state = serverState;
      this.confirmedTick = serverTick;
      return;
    }

    // Check if prediction matches server
    if (deepEqual(snapshot.state, serverState)) {
      // Prediction was correct!
      this.confirmedTick = serverTick;
      this.pruneOldSnapshots(serverTick);
      return;
    }

    // Prediction was wrong - rollback
    this.state = deepClone(serverState);
    this.confirmedTick = serverTick;

    // Re-apply any predicted actions that happened after server tick
    const predictedActions = this.actionQueue.filter(
      a => a.tick > serverTick && a.predicted
    );

    for (const action of predictedActions) {
      // ✅ IMPORTANT: Actions are re-validated during rollback
      // If proximity/cooldown requirements now fail, action is rejected
      const result = this.runAction(action, this.state);

      if (result.rejected) {
        // Remove failed predicted action from queue
        this.actionQueue = this.actionQueue.filter(a => a !== action);

        if (this.devMode) {
          console.warn(
            `Rollback: predicted action "${action.name}" rejected after server correction`,
            result.reason
          );
        }
      }
    }

    // Prune old snapshots
    this.pruneOldSnapshots(serverTick);
  }

  private saveSnapshot(state: any): void {
    const snapshot: StateSnapshot = {
      tick: this.getCurrentTick(),
      revision: this.revision,
      state: deepClone(state)  // ⚠️ PERFORMANCE: Deep clone can be expensive
                               // For large states (>1000 objects), consider:
                               // 1. Structural sharing (immutable.js)
                               // 2. Copy-on-write
                               // 3. Reduce maxRollbackTicks
    };

    this.snapshots.push(snapshot);

    // Ring buffer: keep configurable history
    // Default 64 snapshots = 64 full deep clones in memory
    if (this.snapshots.length > this.maxRollbackTicks) {
      this.snapshots.shift();
    }
  }

  private getSnapshot(tick: number): StateSnapshot | null {
    return this.snapshots.find(s => s.tick === tick) || null;
  }

  private pruneOldSnapshots(beforeTick: number): void {
    const minTick = Math.max(0, beforeTick - this.maxRollbackTicks);
    this.snapshots = this.snapshots.filter(s => s.tick >= minTick);
  }

  private runAction(action: QueuedAction, state: any): ActionResult {
    const config = this.gameLogic.actions[action.name];
    if (!config) {
      return { rejected: true, reason: `Unknown action: ${action.name}` };
    }

    this.actionExecutor.setTick(action.tick);
    return this.actionExecutor.executeAction(
      action.name,
      action.payload,
      action.playerId,
      state,
      config,
      action.actionIndex
    );
  }
}
```

---

## Action Execution Pipeline

Validates and executes player actions.

### Implementation

```typescript
class ActionExecutor {
  private cooldowns: Map<string, Map<string, number>> = new Map();
  private rateLimitTracker: Map<string, Map<string, number[]>> = new Map();
  private currentTick = 0;
  private actionIndex = 0;

  constructor(private readonly tickDuration: number) {}

  setTick(tick: number): void {
    if (tick !== this.currentTick) {
      this.currentTick = tick;
      this.actionIndex = 0;  // Reset only when advancing to a new tick
    }
  }

  nextActionIndex(): number {
    return this.actionIndex++;
  }

  executeAction(
    actionName: string,
    payload: any,
    playerId: string,
    state: any,
    config: ActionConfig,
    actionIndexOverride?: number
  ): ActionResult {
    // Step 1: Validate input schema
    if (config.input) {
      const validated = this.validateInput(payload, config.input);
      if (!validated.valid) {
        return { rejected: true, reason: validated.error };
      }
      payload = validated.value;  // Use clamped/coerced values
    }

    // Step 2: Check requirements
    if (config.requires) {
      const meetsRequirements = this.checkRequirements(
        config.requires,
        playerId,
        state,
        payload,
        actionName  // ✅ FIX ISSUE #13: Added missing parameter
      );

      if (!meetsRequirements.valid) {
        return { rejected: true, reason: meetsRequirements.error };
      }
    }

    // Step 3: Execute action.apply()
    const currentActionIndex = actionIndexOverride ?? this.nextActionIndex();

    const context: ActionContext = {
      game: state,
      playerId,
      input: payload,
      random: createActionRandom(this.currentTick, currentActionIndex),
      time: this.currentTick * this.tickDuration
    };

    try {
      config.apply(context);
    } catch (error) {
      return { rejected: true, reason: (error as Error).message };
    }

    return { success: true };
  }

  private checkRequirements(
    requires: ActionRequirements,
    playerId: string,
    state: any,
    payload: any,
    actionName: string
  ): { valid: boolean; error?: string } {
    // ✅ FIX ISSUE #6: Tick-based cooldown (was timestamp-based)
    if (requires.cooldown) {
      const cooldownTicks = Math.ceil(requires.cooldown / this.tickDuration);

      if (!this.cooldowns.has(playerId)) {
        this.cooldowns.set(playerId, new Map());
      }

      const lastTick = this.cooldowns.get(playerId)!.get(actionName);

      if (lastTick !== undefined && this.currentTick - lastTick < cooldownTicks) {
        const remainingTicks = cooldownTicks - (this.currentTick - lastTick);
        return {
          valid: false,
          error: `Cooldown: ${remainingTicks} ticks (~${remainingTicks * this.tickDuration}ms) remaining`
        };
      }

      // Update cooldown tracker
      this.cooldowns.get(playerId)!.set(actionName, this.currentTick);
    }

    // Rate limit check (prevent action spam)
    if (requires.rateLimit) {
      const { max, window } = requires.rateLimit;
      const windowTicks = Math.ceil(window / this.tickDuration);

      if (!this.rateLimitTracker.has(playerId)) {
        this.rateLimitTracker.set(playerId, new Map());
      }

      const playerRates = this.rateLimitTracker.get(playerId)!;
      const actionCalls = playerRates.get(actionName) || [];

      // Remove calls outside window
      const cutoff = this.currentTick - windowTicks;
      const recentCalls = actionCalls.filter(t => t > cutoff);

      if (recentCalls.length >= max) {
        return {
          valid: false,
          error: `Rate limit: max ${max} calls per ${window}ms`
        };
      }

      // Track this call
      recentCalls.push(this.currentTick);
      playerRates.set(actionName, recentCalls);
    }

    // Proximity check
    if (requires.proximity) {
      const player = state.players[playerId];
      if (!player) {
        return {
          valid: false,
          error: 'player_not_found'
        };
      }
      const entity = requires.proximity.get({ game: state, input: payload });

      if (!entity) {
        return {
          valid: false,
          error: `Proximity target not found`
        };
      }

      const dist = Math.hypot(
        player.x - entity.x,
        player.y - entity.y
      );

      if (dist > requires.proximity.distance) {
        return {
          valid: false,
          error: `Too far: ${dist.toFixed(0)}px > ${requires.proximity.distance}px`
        };
      }
    }

    return { valid: true };
  }
}
```

**Runtime integration:**
- Call `executor.setTick(currentTick)` before processing actions for that tick (server + predicting clients). Only advance the tick when the simulation clock increments so the per-tick index doesn’t reset mid-queue.
- When enqueuing an action, grab `const idx = executor.nextActionIndex()` and assign `action.actionIndex = idx` before serializing or storing it.
- Pass the same `idx` into `executor.executeAction(..., idx)` so `createActionRandom` seeds match what you ship over the wire.

---

## Seeded Random Generator

Deterministic PRNG (Mulberry32 algorithm).

```typescript
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure seed is positive integer
    this.state = Math.abs(seed | 0) || 1;
  }

  // Returns number in [0, 1)
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Returns integer in [min, max)
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Returns random element from array
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choice from empty array');
    }
    return array[this.range(0, array.length)];
  }

  // Shuffle array in-place (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.range(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Clone with same state (for branching)
  clone(): SeededRandom {
    const copy = new SeededRandom(0);
    copy.state = this.state;
    return copy;
  }
}

// Random instance factory: unique seed per action
function createActionRandom(tick: number, actionIndex: number): SeededRandom {
  // Combine tick and action index for unique seed
  // Use large prime to avoid collisions
  const seed = tick * 999983 + actionIndex;
  return new SeededRandom(seed);
}
```

---

## Deep Diff & Patch

Efficient state diffing with ID-based array handling.

### Generate Diff

```typescript
// ✅ COMPLETE IMPLEMENTATION (not naive top-level diff)
function generateDiff(oldState: any, newState: any, path: string[] = []): Patch[] {
  const patches: Patch[] = [];

  // Handle primitives and null
  if (typeof newState !== 'object' || newState === null) {
    if (!deepEqual(oldState, newState)) {
      patches.push({ op: 'set', path, value: newState });
    }
    return patches;
  }

  // Handle arrays
  if (Array.isArray(newState)) {
    if (!Array.isArray(oldState)) {
      // Type change: replace entire array
      patches.push({ op: 'set', path, value: newState });
      return patches;
    }

    // Check if array has stable IDs
    const hasIds = newState.length > 0 && newState[0].id !== undefined;

    if (hasIds) {
      // ID-based diff (for entities like coins, enemies)
      const oldById = new Map(oldState.map((item, idx) => [item.id, { item, idx }]));
      const newById = new Map(newState.map((item, idx) => [item.id, { item, idx }]));

      // Deletions
      for (const [id, { idx }] of oldById) {
        if (!newById.has(id)) {
          patches.push({ op: 'delete', path: [...path, String(idx)], id: String(id) });
        }
      }

      // Additions and updates
      for (const [id, { item, idx }] of newById) {
        if (!oldById.has(id)) {
          patches.push({ op: 'set', path: [...path, String(idx)], value: item, id: String(id) });
        } else {
          // Recurse for updates
          const oldItem = oldById.get(id)!.item;
          patches.push(...generateDiff(oldItem, item, [...path, String(idx)]));
        }
      }
    } else {
      // Index-based diff (for simple arrays)
      const maxLen = Math.max(oldState.length, newState.length);

      for (let i = 0; i < maxLen; i++) {
        if (i >= newState.length) {
          // Deleted
          patches.push({ op: 'delete', path: [...path, String(i)] });
        } else if (i >= oldState.length) {
          // Added
          patches.push({ op: 'push', path, value: newState[i] });
        } else if (!deepEqual(oldState[i], newState[i])) {
          // Changed
          patches.push(...generateDiff(oldState[i], newState[i], [...path, String(i)]));
        }
      }
    }

    return patches;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

  for (const key of allKeys) {
    const oldVal = oldState[key];
    const newVal = newState[key];

    if (!(key in newState)) {
      // Deleted
      patches.push({ op: 'delete', path: [...path, key] });
    } else if (!(key in oldState)) {
      // Added
      patches.push({ op: 'set', path: [...path, key], value: newVal });
    } else if (!deepEqual(oldVal, newVal)) {
      // Changed - recurse
      patches.push(...generateDiff(oldVal, newVal, [...path, key]));
    }
  }

  return patches;
}
```

### Apply Patches

```typescript
function applyPatches(state: any, patches: Patch[]): void {
  for (const patch of patches) {
    applyPatch(state, patch);
  }
}

function applyPatch(state: any, patch: Patch): void {
  const { op, path, value, id } = patch;

  if (path.length === 0) {
    throw new Error('Cannot apply patch to root');
  }

  // Navigate to parent
  let current = state;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
    if (current === undefined) {
      throw new Error(`Path not found: ${path.slice(0, i + 1).join('.')}`);
    }
  }

  const lastKey = path[path.length - 1];
  const isArrayTarget = Array.isArray(current);

  switch (op) {
    case 'set': {
      if (isArrayTarget && id) {
        const idx = current.findIndex((item: any) => item?.id?.toString() === id);
        if (idx >= 0) {
          current[idx] = value;
          break;
        } else if (patch.index !== undefined) {
          current[patch.index] = value;
          break;
        } else {
          console.warn(`Set patch: ID "${id}" not found in array at ${path.join('.')}`);
          return;
        }
      }
      current[lastKey] = value;
      break;
    }

    case 'delete': {
      if (isArrayTarget) {
        if (id) {
          // ✅ FIX ISSUE #7: ID-based deletion with explicit break
          const idx = current.findIndex((item: any) => item?.id?.toString() === id);
          if (idx >= 0) {
            current.splice(idx, 1);
          } else {
            console.warn(`Delete patch: ID "${id}" not found in array at ${path.join('.')}`);
          }
          break;  // ← CRITICAL: Don't fall through!
        }
        // Index-based deletion
        current.splice(Number(lastKey), 1);
      } else {
        delete current[lastKey];
      }
      break;
    }

    case 'push': {
      if (!isArrayTarget) {
        throw new Error(`Cannot push to non-array at ${path.join('.')}`);
      }
      current.push(value);
      break;
    }

    case 'splice': {
      if (!isArrayTarget) {
        throw new Error(`Cannot splice non-array at ${path.join('.')}`);
      }

      let idx: number | undefined;

      if (id) {
        idx = current.findIndex((item: any) => item?.id?.toString() === id);
        if (idx < 0 && patch.index !== undefined) {
          idx = patch.index;
        }
      } else {
        idx = patch.index;
      }

      if (idx === undefined || idx < 0) {
        console.warn(`Splice patch could not locate target at ${path.join('.')} (id: ${id ?? 'n/a'})`);
        return;
      }

      current.splice(idx, 1, value);
      break;
    }
  }
}
```

### Utility Functions

```typescript
// Deep clone (handles circular references)
function deepClone<T>(obj: T, seen = new WeakMap()): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  // Check circular reference
  if (seen.has(obj as any)) return seen.get(obj as any);

  const clone: any = Array.isArray(obj) ? [] : {};
  seen.set(obj as any, clone);

  for (const key in obj) {
    clone[key] = deepClone(obj[key], seen);
  }

  return clone;
}

// Deep freeze for immutable getState()
function deepFreeze<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  Object.freeze(obj);

  Object.values(obj).forEach(val => {
    if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });

  return obj;
}

// Deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

// Deterministic JSON stringify (sorted keys)
function deterministicStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${deterministicStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}
```

---

## Warm Standby Manager

**✅ FIX ISSUE #5:** Complete implementation for P2P host migration.

```typescript
class WarmStandbyManager {
  private replicatedSnapshots: Map<number, WireSnapshot> = new Map();
  private replicatedActionLog: QueuedAction[] = [];
  private lastHeartbeatTick: number = 0;
  private ready: boolean = false;

  // Host: Send heartbeat with action queue tail
  broadcastHeartbeat(): void {
    const queueTail = this.actionQueue.filter(
      a => a.tick > this.lastHeartbeatTick
    );

    // ✅ FIX ISSUE #4: Compute queue checksum
    const queueChecksum = this.computeQueueChecksum(this.actionQueue);

    this.transport.send({
      type: 'heartbeat',
      tick: this.currentTick,
      revision: this.revision,
      sessionId: this.mySessionId,
      queueChecksum,
      queueTail,
      snapshotTick: this.getLatestSnapshotTick()
    });

    this.lastHeartbeatTick = this.currentTick;
  }

  // Standby: Replicate action log from heartbeat
  onHeartbeat(heartbeat: HeartbeatMessage): void {
    // Append new actions
    this.replicatedActionLog.push(...heartbeat.queueTail);

    // Verify checksum
    const checksum = this.computeQueueChecksum(this.replicatedActionLog);
    if (checksum !== heartbeat.queueChecksum) {
      console.warn('Queue checksum mismatch - requesting resync');
      this.requestResync('queue_checksum_mismatch');
      return;
    }

    // Request snapshot if we don't have latest
    if (!this.replicatedSnapshots.has(heartbeat.snapshotTick)) {
      this.requestSnapshot(heartbeat.snapshotTick);
    }

    // Keep action log trimmed to ticks newer than our freshest snapshot
    if (this.replicatedSnapshots.size > 0) {
      const snapshotTicks = [...this.replicatedSnapshots.keys()];
      const latestTick = Math.max(...snapshotTicks);
      this.replicatedActionLog = this.replicatedActionLog.filter(
        action => action.tick >= latestTick
      );
    }

    // Prune old snapshots (keep last 3)
    const ticks = [...this.replicatedSnapshots.keys()].sort((a, b) => b - a);
    ticks.slice(3).forEach(t => this.replicatedSnapshots.delete(t));

    this.ready = this.replicatedSnapshots.size > 0;
  }

  // Compute deterministic checksum of action queue
  private computeQueueChecksum(queue: QueuedAction[]): string {
    const data = queue.map(a => ({
      name: a.name,
      playerId: a.playerId,
      tick: a.tick,
      payload: a.payload
    }));
    return fnv1a(deterministicStringify(data));
  }

  // Load warm standby state for host migration
  loadWarmStandby(): { snapshot: WireSnapshot; actionQueue: QueuedAction[] } {
    if (this.replicatedSnapshots.size === 0) {
      throw new Error('Warm standby is not ready: no replicated snapshots available');
    }

    const snapshotTicks = [...this.replicatedSnapshots.keys()];
    const latestTick = Math.max(...snapshotTicks);
    const snapshot = this.replicatedSnapshots.get(latestTick)!;

    // Filter actions that happened after snapshot
    const actionQueue = this.replicatedActionLog.filter(
      a => a.tick > snapshot.tick
    );

    return { snapshot, actionQueue };
  }

  isReady(): boolean {
    return this.ready;
  }
}

// FNV-1a hash (fast, deterministic)
function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
```

---

## Tick Synchronization

**✅ FIX ISSUE #6:** Latency-based drift correction.

```typescript
class TickSynchronizer {
  private serverTick: number = 0;
  private clientTick: number = 0;
  private latencySamples: number[] = [];

  // Server: runs at fixed rate
  startServerTick(rate: number): void {
    setInterval(() => {
      this.serverTick++;
      this.runSystems();
      this.processActions();
      this.broadcastState();
    }, 1000 / rate);
  }

  // Client: receives server tick with each state update
  onServerState(message: WireDiff | WireSnapshot): void {
    const serverTick = message.tick;

    // ✅ FIX ISSUE #6: Use latency-based offset (not fixed drift)
    const latencyTicks = Math.ceil(this.getLatency() / this.tickDuration / 2);
    const expectedClientTick = serverTick + latencyTicks;

    // If client drifted >3 ticks, resync
    if (Math.abs(this.clientTick - expectedClientTick) > 3) {
      console.warn(
        `Tick drift: client=${this.clientTick}, expected=${expectedClientTick}`
      );
      this.clientTick = expectedClientTick;
    }

    // Apply state at server's tick
    this.reconcile(serverTick, message);
  }

  // Client: runs independently but stays bounded
  startClientTick(rate: number): void {
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastTime;
      const tickDuration = 1000 / rate;

      if (elapsed >= tickDuration) {
        this.clientTick++;

        // Run predicted systems (if enabled)
        if (this.predictSystems) {
          this.runSystems();
        }

        // Don't get too far ahead of server
        const ahead = this.clientTick - this.lastServerTick;
        if (ahead > this.maxPredictionFrames) {
          console.warn('Client too far ahead, waiting for server');
          this.clientTick--;
          return;
        }

        lastTime = now - (elapsed % tickDuration);
      }

      requestAnimationFrame(tick);
    };

    tick();
  }

  private getLatency(): number {
    if (this.latencySamples.length === 0) return 100;  // Default 100ms
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return sum / this.latencySamples.length;
  }
}
```

---

## Client-Side Interpolation

**✅ FIX ISSUE #9:** Proper delta time tracking.

```typescript
class InterpolationEngine {
  private previousState: any = null;
  private targetState: any = null;
  private serverTime: number = 0;
  private clientTime: number = 0;  // ✅ FIX: Store when state arrived
  private tickDuration: number;

  constructor(tickDuration: number) {
    this.tickDuration = tickDuration;
  }

  onServerState(state: any, tick: number): void {
    // ✅ FIX ISSUE #10: Reuse previous target instead of cloning
    if (this.targetState) {
      this.previousState = this.targetState;
    }

    this.targetState = deepClone(state);
    this.serverTime = tick * this.tickDuration;
    this.clientTime = performance.now();  // ✅ FIX: Capture arrival time
  }

  // Called every render frame (60fps)
  getInterpolatedState(): any {
    if (!this.previousState || !this.targetState) {
      return this.targetState;
    }

    const elapsed = performance.now() - this.clientTime;
    const alpha = Math.min(1, elapsed / this.tickDuration);

    return this.interpolate(this.previousState, this.targetState, alpha);
  }

  private interpolate(prev: any, next: any, alpha: number): any {
    if (typeof prev !== 'object' || prev === null) {
      return next;
    }

    const result: any = Array.isArray(next) ? [] : {};

    for (const key in next) {
      const prevVal = prev[key];
      const nextVal = next[key];

      if (typeof nextVal === 'number' && typeof prevVal === 'number') {
        // Interpolate numbers (positions, health bars, etc.)
        result[key] = prevVal + (nextVal - prevVal) * alpha;
      } else if (typeof nextVal === 'object') {
        // Recurse
        result[key] = this.interpolate(prevVal, nextVal, alpha);
      } else {
        // Copy as-is
        result[key] = nextVal;
      }
    }

    return result;
  }
}
```

---

## Bandwidth Monitoring

**✅ FIX ISSUE #11:** Efficient pruning strategy.

```typescript
type BandwidthSample = { timestamp: number; bytes: number };

class BandwidthMonitor {
  private bytesPerClient: Map<string, BandwidthSample[]> = new Map();
  private window: number = 1000;  // 1 second window

  trackBandwidth(playerId: string, bytes: number): void {
    const now = Date.now();

    if (!this.bytesPerClient.has(playerId)) {
      this.bytesPerClient.set(playerId, []);
    }

    const history = this.bytesPerClient.get(playerId)!;
    history.push({ timestamp: now, bytes });

    // ✅ FIX ISSUE #11: Only prune every 100 entries (not every call)
    if (history.length % 100 === 0) {
      const cutoff = now - this.window;
      this.bytesPerClient.set(
        playerId,
        history.filter(entry => entry.timestamp > cutoff)
      );
    }
  }

  getBandwidth(playerId: string): number {
    const history = this.bytesPerClient.get(playerId) || [];
    const cutoff = Date.now() - this.window;
    const recent = history.filter(entry => entry.timestamp > cutoff);
    return recent.reduce((sum, entry) => sum + entry.bytes, 0);
  }

  exceedsBudget(playerId: string, maxBandwidth: number): boolean {
    return this.getBandwidth(playerId) > maxBandwidth;
  }
}
```

### Recommended Bandwidth Budgets

| Game Type | Bandwidth Budget (per client) | Tick Rate | Actions/sec | Notes |
|-----------|-------------------------------|-----------|-------------|-------|
| **Turn-based** | 10 KB/s | 10 FPS | 5 | Board games, card games |
| **Casual** | 50 KB/s | 20 FPS | 20 | Puzzle games, casual multiplayer |
| **Action** | 100 KB/s | 30 FPS | 30 | Platformers, cooperative games |
| **Fast-paced** | 200 KB/s | 60 FPS | 60 | Competitive shooters, racing |

**Calculation example** (Action game with 4 players):
```typescript
// State size: ~2KB (4 players + 50 entities)
// Tick rate: 30 FPS
// Overhead: ~20% (metadata, checksums, etc.)

const stateSize = 2000;  // bytes
const tickRate = 30;
const overhead = 1.2;

const bandwidthPerSecond = stateSize * tickRate * overhead;
// = 2000 * 30 * 1.2 = 72,000 bytes/s ≈ 72 KB/s

// Within 100 KB/s budget ✅
```

**When to use snapshots vs diffs:**
- Diffs: ~10-20% of full state size (only changed properties)
- Full snapshots: Used when client falls behind by >32 revisions (default `maxDiffGap`)
- Recommendation: Optimize state structure to minimize diff size

---

## Next Steps

- **Need protocol details?** → See [07-networking-protocol.md](./07-networking-protocol.md)
- **Need dev tools?** → See [08-developer-tools.md](./08-developer-tools.md)
- **Want examples?** → See [09-examples.md](./09-examples.md)
