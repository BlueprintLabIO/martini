# @martini-kit/devtools

Development tools for martini-kit multiplayer SDK - debug your multiplayer games with ease.

## Features

- **Real-time State Inspection** - Diff-based snapshots with automatic throttling
- **Action History Tracking** - Aggregated timelines that avoid spammy actions
- **Statistics & Metrics** - Track action frequency and state changes
- **Event Listeners** - React to state changes and actions programmatically
- **Memory-Efficient** - Configurable limits for history size

## Installation

```bash
pnpm add -D @martini-kit/devtools
```

## Quick Start

```typescript
import { StateInspector } from '@martini-kit/devtools';
import { GameRuntime } from '@martini-kit/core';

// Create your game runtime
const runtime = new GameRuntime(myGame, transport, config);

// Attach the inspector
const inspector = new StateInspector();
inspector.attach(runtime);

// View state snapshots
console.log(inspector.getSnapshots());

// View action history
console.log(inspector.getActionHistory());

// View statistics
console.log(inspector.getStats());

// Listen for changes
inspector.onStateChange((snapshot) => {
  console.log('State changed:', snapshot.state);
});

inspector.onAction((action) => {
  console.log('Action submitted:', action.actionName, action.input);
});

// Clean up when done
inspector.detach();
```

## API Reference

### Constructor

```typescript
new StateInspector(options?: StateInspectorOptions)
```

Options:
- `maxSnapshots` (default: 100) - Maximum number of state snapshots to keep
- `maxActions` (default: 1000) - Maximum number of actions to keep in history
- `snapshotIntervalMs` (default: 250) - Minimum time between automatic snapshots
- `actionAggregationWindowMs` (default: 200) - Time window for grouping identical actions
- `ignoreActions` (default: []) - Array of action names to drop entirely (e.g. `['tick']`)

### Methods

#### `attach(runtime: GameRuntime): void`

Attach the inspector to a GameRuntime instance. Only one runtime can be attached at a time.

```typescript
inspector.attach(runtime);
```

#### `detach(): void`

Detach the inspector from the current runtime and stop tracking.

```typescript
inspector.detach();
```

#### `isAttached(): boolean`

Check if the inspector is currently attached to a runtime.

```typescript
if (inspector.isAttached()) {
  console.log('Inspector is active');
}
```

#### `getRuntime(): GameRuntime | null`

Get the currently attached runtime, or null if not attached.

```typescript
const runtime = inspector.getRuntime();
```

#### `getSnapshots(): StateSnapshot[]`

Get all captured state snapshots.

```typescript
const snapshots = inspector.getSnapshots();
snapshots.forEach(snapshot => {
  console.log(snapshot.timestamp, snapshot.state);
});
```

Returns an array of:
```typescript
interface StateSnapshot {
  id: number;           // Incrementing identifier
  timestamp: number;    // Unix timestamp in milliseconds
  state?: any;          // Deep clone of game state (only stored for baseline snapshots)
  diff?: Patch[];       // Diffs relative to previous snapshot
  lastActionId?: number;// Action id responsible for this snapshot
}
```

#### `getActionHistory(): ActionRecord[]`

Get all tracked actions.

```typescript
const history = inspector.getActionHistory();
history.forEach(action => {
  console.log(action.actionName, action.input);
});
```

Returns an array of:
```typescript
interface ActionRecord {
  id: number;              // Incrementing identifier
  timestamp: number;      // Unix timestamp in milliseconds
  actionName: string;     // Name of the action
  input: any;            // Action payload
  playerId?: string;     // Who submitted the action
  targetId?: string;     // Who was targeted
  count?: number;         // Number of aggregated occurrences
  duration?: number;      // Duration of aggregated burst in ms
  snapshotId?: number;    // Linked snapshot id
  excludedActionsTotal?: number; // Total ignored actions so far
}
```

#### `getStats(): InspectorStats`

Get statistics about tracked actions and state changes.

```typescript
const stats = inspector.getStats();
console.log(`Total actions: ${stats.totalActions}`);
console.log(`Total state changes: ${stats.totalStateChanges}`);
console.log(`Increment action called ${stats.actionsByName.increment} times`);
```

Returns:
```typescript
interface InspectorStats {
  totalActions: number;                   // Total actions submitted
  totalStateChanges: number;             // Total state updates
  actionsByName: Record<string, number>; // Action frequency map
  excludedActions: number;               // Actions filtered via ignoreActions
}
```

#### `onStateChange(listener: (snapshot: StateSnapshot) => void): () => void`

Listen for state changes. Returns an unsubscribe function.

```typescript
const unsubscribe = inspector.onStateChange((snapshot) => {
  console.log('New state:', snapshot.state);
});

// Later: stop listening
unsubscribe();
```

#### `onAction(listener: (action: ActionRecord) => void): () => void`

Listen for actions. Returns an unsubscribe function.

```typescript
const unsubscribe = inspector.onAction((action) => {
  console.log(`${action.actionName} submitted by ${action.playerId}`);
});

// Later: stop listening
unsubscribe();
```

#### `clear(): void`

Clear all snapshots, action history, and statistics.

```typescript
inspector.clear();
```

## Use Cases

### Debug State Issues

```typescript
const inspector = new StateInspector();
inspector.attach(runtime);

// Submit some actions
runtime.submitAction('move', { x: 100, y: 200 });
runtime.submitAction('attack', { targetId: 'enemy1' });

// View state evolution
const snapshots = inspector.getSnapshots();
console.log('Initial state:', snapshots[0].state);
console.log('Final state:', snapshots[snapshots.length - 1].state);
```

### Track Performance

```typescript
const inspector = new StateInspector();
inspector.attach(runtime);

let actionCount = 0;
inspector.onAction(() => {
  actionCount++;
  if (actionCount % 100 === 0) {
    const stats = inspector.getStats();
    console.log(`Actions per second: ${actionCount / ((Date.now() - startTime) / 1000)}`);
  }
});
```

### Build Custom DevTools UI

```typescript
const inspector = new StateInspector({ maxSnapshots: 50 });
inspector.attach(runtime);

// React component example
function DevToolsPanel() {
  const [snapshots, setSnapshots] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const unsubState = inspector.onStateChange((snapshot) => {
      setSnapshots(prev => [...prev, snapshot]);
    });

    const unsubAction = inspector.onAction((action) => {
      setActions(prev => [...prev, action]);
    });

    return () => {
      unsubState();
      unsubAction();
    };
  }, []);

  return (
    <div>
      <StateViewer snapshots={snapshots} />
      <ActionHistory actions={actions} />
      <Statistics stats={inspector.getStats()} />
    </div>
  );
}
```

### Monitor Multiplayer Sync

```typescript
const inspector = new StateInspector();
inspector.attach(runtime);

inspector.onAction((action) => {
  console.log(`[${action.timestamp}] ${action.playerId} -> ${action.actionName}`);
});

inspector.onStateChange((snapshot) => {
  // Check for state anomalies
  if (snapshot.state.players[myId]?.health < 0) {
    console.warn('Invalid state detected:', snapshot);
  }
});
```

## Testing with StateInspector

```typescript
import { describe, it, expect } from 'vitest';
import { StateInspector } from '@martini-kit/devtools';

describe('MyGame', () => {
  it('should increment counter on action', () => {
    const inspector = new StateInspector();
    inspector.attach(runtime);

    const initialState = inspector.getSnapshots()[0].state;
    expect(initialState.count).toBe(0);

    runtime.submitAction('increment', {});

    const finalSnapshots = inspector.getSnapshots();
    const finalState = finalSnapshots[finalSnapshots.length - 1].state;
    expect(finalState.count).toBe(1);

    inspector.detach();
  });
});
```

## Best Practices

1. **Use in Development Only** - Don't ship StateInspector to production (it's a devDependency)
2. **Set Limits** - Configure `maxSnapshots` and `maxActions` to prevent memory issues
3. **Detach When Done** - Always call `detach()` to clean up listeners
4. **Deep Clone Awareness** - Snapshots are deep clones, so large states may impact performance

## Next Steps

- See [martini-kit SDK Documentation](https://martini-kit.com/docs/latest/api/devtools/state-inspector)
- Check out the [demos](../demos) for working examples
- Read about [Best Practices](https://martini-kit.com/docs/latest/guides/optimization)

## License

MIT
