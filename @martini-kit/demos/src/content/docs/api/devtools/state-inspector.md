# StateInspector

The `StateInspector` is a powerful development tool for debugging martini-kit multiplayer games. It provides real-time monitoring of game state changes, action history tracking, and performance statistics.

## Features

- **Real-time State Snapshots** - Capture game state at regular intervals with diff-based optimization
- **Action History Tracking** - Record all player actions with aggregation for repeated actions
- **Event Listeners** - React to state changes and actions in real-time
- **Performance Metrics** - Track statistics about state changes and action frequency
- **Pause/Resume** - Control when to capture snapshots
- **Memory Management** - Automatic trimming of old snapshots and actions

## Installation

```bash
pnpm add -D @martini-kit/devtools
# or
npm install --save-dev @martini-kit/devtools
```

## Basic Usage

```typescript
import { StateInspector } from '@martini-kit/devtools';
import { GameRuntime } from '@martini-kit/core';

// Create inspector
const inspector = new StateInspector({
  maxSnapshots: 100,
  maxActions: 1000,
  snapshotIntervalMs: 250,
  actionAggregationWindowMs: 200,
  ignoreActions: ['tick'] // Ignore high-frequency actions
});

// Attach to runtime
inspector.attach(runtime);

// Listen for state changes
inspector.onStateChange((snapshot) => {
  console.log('State changed:', snapshot);
});

// Listen for actions
inspector.onAction((action) => {
  console.log('Action submitted:', action);
});

// Get current stats
const stats = inspector.getStats();
console.log('Stats:', stats);

// Cleanup when done
inspector.detach();
```

## API Reference

### Constructor

```typescript
new StateInspector(options?: StateInspectorOptions)
```

Creates a new StateInspector instance.

#### Options

```typescript
interface StateInspectorOptions {
  // Maximum number of snapshots to keep in memory
  // Default: 100
  maxSnapshots?: number;

  // Maximum number of actions to keep in history
  // Default: 1000
  maxActions?: number;

  // Minimum time between snapshots in milliseconds
  // Default: 250ms
  snapshotIntervalMs?: number;

  // Time window for aggregating repeated actions in milliseconds
  // Default: 200ms
  actionAggregationWindowMs?: number;

  // Array of action names to ignore/exclude from tracking
  // Default: []
  ignoreActions?: string[];
}
```

### Methods

#### `attach(runtime: GameRuntime): void`

Attaches the inspector to a GameRuntime instance. This begins capturing state snapshots and action history.

**Example:**
```typescript
inspector.attach(runtime);
```

**Note:** Can only attach to one runtime at a time. Call `detach()` first if switching runtimes.

---

#### `detach(): void`

Detaches the inspector from the current runtime and stops all capturing.

**Example:**
```typescript
inspector.detach();
```

---

#### `setPaused(paused: boolean): void`

Pauses or resumes snapshot capturing. Action tracking continues even when paused.

**Example:**
```typescript
// Pause capturing
inspector.setPaused(true);

// Resume capturing
inspector.setPaused(false);
```

---

#### `isAttached(): boolean`

Returns whether the inspector is currently attached to a runtime.

**Example:**
```typescript
if (inspector.isAttached()) {
  console.log('Inspector is active');
}
```

---

#### `getRuntime(): GameRuntime | null`

Returns the currently attached runtime, or `null` if not attached.

**Example:**
```typescript
const runtime = inspector.getRuntime();
if (runtime) {
  console.log('Attached to runtime');
}
```

---

#### `getSnapshots(): StateSnapshot[]`

Returns all captured state snapshots.

**Example:**
```typescript
const snapshots = inspector.getSnapshots();
console.log(`Captured ${snapshots.length} snapshots`);
```

**Returns:**
```typescript
interface StateSnapshot {
  id: number;                    // Unique snapshot ID
  timestamp: number;              // When snapshot was taken (ms)
  state?: any;                   // Full state (only for first snapshot)
  diff?: Patch[];                // State diff (for subsequent snapshots)
  lastActionId?: number;         // ID of action that triggered this snapshot
}
```

---

#### `getActionHistory(): ActionRecord[]`

Returns the complete action history.

**Example:**
```typescript
const actions = inspector.getActionHistory();
console.log(`Tracked ${actions.length} actions`);
```

**Returns:**
```typescript
interface ActionRecord {
  id: number;                     // Unique action ID
  timestamp: number;               // When action was submitted (ms)
  actionName: string;              // Name of the action
  input: any;                      // Action input data
  playerId?: string;               // Who submitted the action
  targetId?: string;               // Who the action affects
  count?: number;                  // Number of times aggregated (if repeated)
  duration?: number;               // Duration of aggregation window (ms)
  snapshotId?: number;            // ID of snapshot this action is linked to
  excludedActionsTotal?: number;  // Total excluded actions at this point
}
```

---

#### `getStats(): InspectorStats`

Returns statistics about captured data.

**Example:**
```typescript
const stats = inspector.getStats();
console.log('Total actions:', stats.totalActions);
console.log('Actions by name:', stats.actionsByName);
```

**Returns:**
```typescript
interface InspectorStats {
  totalActions: number;                  // Total actions submitted
  totalStateChanges: number;             // Total state changes detected
  actionsByName: Record<string, number>; // Count per action type
  excludedActions: number;               // Total ignored actions
}
```

---

#### `onStateChange(listener: (snapshot: StateSnapshot) => void): () => void`

Subscribes to state change events. Returns an unsubscribe function.

**Example:**
```typescript
const unsubscribe = inspector.onStateChange((snapshot) => {
  console.log('State changed at', snapshot.timestamp);
  if (snapshot.diff) {
    console.log('Patches:', snapshot.diff.length);
  }
});

// Later: unsubscribe
unsubscribe();
```

---

#### `onAction(listener: (action: ActionRecord) => void): () => void`

Subscribes to action events. Returns an unsubscribe function.

**Example:**
```typescript
const unsubscribe = inspector.onAction((action) => {
  console.log(`${action.actionName} by ${action.playerId}`);
  if (action.count && action.count > 1) {
    console.log(`Repeated ${action.count} times`);
  }
});

// Later: unsubscribe
unsubscribe();
```

---

#### `clear(): void`

Clears all captured snapshots and action history, and resets statistics.

**Example:**
```typescript
inspector.clear();
console.log('Inspector cleared');
```

---

## Understanding Snapshots

The StateInspector uses an efficient diff-based approach to minimize memory usage:

### First Snapshot
The first snapshot captures the **full state**:
```typescript
{
  id: 1,
  timestamp: 1234567890,
  state: {
    players: { p1: { x: 100, y: 200 } },
    projectiles: []
  }
}
```

### Subsequent Snapshots
Subsequent snapshots only store **diffs** (patches):
```typescript
{
  id: 2,
  timestamp: 1234567890 + 250,
  diff: [
    { op: 'replace', path: ['players', 'p1', 'x'], value: 150 }
  ],
  lastActionId: 5
}
```

### Reconstructing State
To get the full state at any snapshot, apply all diffs from the first snapshot:
```typescript
const snapshots = inspector.getSnapshots();
let state = snapshots[0].state;

for (let i = 1; i < snapshots.length; i++) {
  if (snapshots[i].diff) {
    state = applyPatches(state, snapshots[i].diff);
  }
}
```

## Action Aggregation

To reduce noise from repeated actions (like movement), the inspector aggregates consecutive identical actions:

```typescript
// Without aggregation: 10 separate "move" actions in 100ms
// With aggregation: 1 "move" action with count=10, duration=100ms

const inspector = new StateInspector({
  actionAggregationWindowMs: 200 // Aggregate within 200ms window
});
```

**Example aggregated action:**
```typescript
{
  id: 15,
  actionName: 'move',
  playerId: 'p1',
  targetId: 'p1',
  input: { x: 150, y: 200 },  // Latest input
  count: 10,                   // Repeated 10 times
  duration: 100,               // Over 100ms
  timestamp: 1234567890        // First occurrence
}
```

## Filtering Actions

Exclude high-frequency actions (like physics ticks) to reduce overhead:

```typescript
const inspector = new StateInspector({
  ignoreActions: ['tick', 'physicsStep', 'interpolate']
});
```

Excluded actions are counted in `excludedActions` stat but not tracked in history.

## Performance Considerations

### Memory Usage
- Each snapshot stores either full state or patches
- Older snapshots are automatically trimmed when `maxSnapshots` is exceeded
- When trimming, the first snapshot is converted from full state to diff if possible

### CPU Usage
- Snapshots use `structuredClone()` for fast, accurate state cloning
- Diffs are computed using martini-kit's built-in `generateDiff()` algorithm
- Snapshot throttling prevents excessive capturing (default: 250ms interval)

### Best Practices
1. **Use snapshot intervals wisely** - 250ms is good for most games
2. **Ignore high-frequency actions** - Exclude physics/render loops
3. **Limit history size** - Adjust `maxSnapshots` and `maxActions` based on memory constraints
4. **Pause when not needed** - Use `setPaused(true)` during gameplay, unpause for debugging

## Integration with DevTools Panel

The StateInspector is designed to work with custom DevTools panels:

```typescript
import { StateInspector } from '@martini-kit/devtools';

// Create inspector
const inspector = new StateInspector({
  maxSnapshots: 50,
  snapshotIntervalMs: 500
});

inspector.attach(runtime);

// Send data to DevTools panel
inspector.onStateChange((snapshot) => {
  // Send to panel via postMessage or custom protocol
  devToolsPanel.updateState(snapshot);
});

inspector.onAction((action) => {
  devToolsPanel.addAction(action);
});
```

## Example: Time-Travel Debugging

Reconstruct state at any point in time:

```typescript
const inspector = new StateInspector();
inspector.attach(runtime);

// Later: travel back to a specific snapshot
function travelToSnapshot(snapshotId: number) {
  const snapshots = inspector.getSnapshots();
  const targetIndex = snapshots.findIndex(s => s.id === snapshotId);

  if (targetIndex === -1) {
    console.error('Snapshot not found');
    return null;
  }

  // Start with first full state
  let state = snapshots[0].state;

  // Apply diffs up to target snapshot
  for (let i = 1; i <= targetIndex; i++) {
    if (snapshots[i].diff) {
      for (const patch of snapshots[i].diff) {
        applyPatch(state, patch);
      }
    }
  }

  return state;
}

// Get state at snapshot #10
const historicalState = travelToSnapshot(10);
console.log('State at snapshot 10:', historicalState);
```

## Example: Action Replay

Replay all actions from history:

```typescript
const inspector = new StateInspector();
inspector.attach(runtime);

// Later: replay actions
function replayActions() {
  const actions = inspector.getActionHistory();

  // Detach inspector to avoid interfering
  inspector.detach();

  // Reset game to initial state
  runtime.destroy();
  const newRuntime = new GameRuntime(game, transport, config);

  // Replay actions in order
  for (const action of actions) {
    setTimeout(() => {
      newRuntime.submitAction(
        action.actionName,
        action.input,
        action.targetId
      );
    }, action.timestamp - actions[0].timestamp);
  }
}
```

## Example: Performance Monitoring

Track action frequency and performance:

```typescript
const inspector = new StateInspector({
  maxActions: 5000,
  ignoreActions: []  // Track everything
});

inspector.attach(runtime);

// Monitor every 5 seconds
setInterval(() => {
  const stats = inspector.getStats();

  console.log('=== Performance Stats ===');
  console.log('Total actions:', stats.totalActions);
  console.log('State changes:', stats.totalStateChanges);
  console.log('Actions by type:');

  Object.entries(stats.actionsByName)
    .sort((a, b) => b[1] - a[1])  // Sort by frequency
    .forEach(([name, count]) => {
      const percentage = (count / stats.totalActions * 100).toFixed(1);
      console.log(`  ${name}: ${count} (${percentage}%)`);
    });
}, 5000);
```

## Troubleshooting

### High Memory Usage

**Symptoms:** Memory usage growing rapidly

**Solutions:**
- Reduce `maxSnapshots` and `maxActions`
- Increase `snapshotIntervalMs` to capture less frequently
- Add more actions to `ignoreActions` list
- Use `clear()` periodically to reset history

### Missing Snapshots

**Symptoms:** Snapshots array is empty or missing recent changes

**Possible Causes:**
- Inspector is paused (`setPaused(true)`)
- Inspector not attached (`attach()` not called)
- State not actually changing (diffs are empty)

**Solutions:**
```typescript
// Check if attached
if (!inspector.isAttached()) {
  inspector.attach(runtime);
}

// Check if paused
inspector.setPaused(false);

// Force immediate snapshot
inspector.clear();
inspector.attach(runtime);  // Captures initial snapshot
```

### Actions Not Appearing

**Symptoms:** Action history is empty or missing actions

**Possible Causes:**
- Actions are in `ignoreActions` list
- Actions aggregated into previous entry

**Solutions:**
```typescript
// Check if action is ignored
const stats = inspector.getStats();
console.log('Excluded actions:', stats.excludedActions);

// Check aggregation - look for count > 1
const actions = inspector.getActionHistory();
actions.forEach(action => {
  if (action.count && action.count > 1) {
    console.log(`${action.actionName} aggregated ${action.count} times`);
  }
});
```

## See Also

- [Core API - GameRuntime](../core/game-runtime) - The runtime that StateInspector attaches to
- [Core API - Sync](../core/sync) - Understanding diffs and patches
- [Guides - Testing](../../guides/testing) - Using StateInspector for debugging tests
- [Guides - Optimization](../../guides/optimization) - Performance monitoring techniques
