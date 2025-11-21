---
title: State Synchronization
description: Diff/patch algorithm for efficient state sync
---

# State Synchronization

martini-kit uses a **diff/patch algorithm** to efficiently synchronize game state between the host and clients. Instead of sending the full state every frame, only the **changes** (diffs) are transmitted, drastically reducing bandwidth.

## How It Works

1. **Host** modifies state (via actions)
2. **Host** generates diff between old state and new state
3. **Host** broadcasts minimal patches to all clients
4. **Clients** apply patches to their local state copy
5. **Clients** now have identical state to host

## API Reference

```typescript
// Generate diff between states
function generateDiff(oldState: any, newState: any): Patch[]

// Apply a single patch
function applyPatch(state: any, patch: Patch): void

// Deep clone utility
function deepClone<T>(obj: T): T

// Patch structure
interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];  // e.g., ['players', 'p1', 'x']
  value?: any;
}
```

## Patch Format

Patches describe **minimal changes** to state:

### Replace Operation

Updates an existing value:

```typescript
{
  op: 'replace',
  path: ['players', 'p1', 'x'],
  value: 200
}

// Equivalent to:
state.players.p1.x = 200;
```

### Add Operation

Adds a new property or array element:

```typescript
{
  op: 'add',
  path: ['players', 'p2'],
  value: { x: 100, y: 100, health: 100 }
}

// Equivalent to:
state.players.p2 = { x: 100, y: 100, health: 100 };
```

### Remove Operation

Deletes a property or array element:

```typescript
{
  op: 'remove',
  path: ['players', 'p3']
}

// Equivalent to:
delete state.players.p3;
```

## generateDiff()

Compares two states and returns minimal patches.

```typescript
function generateDiff(oldState: any, newState: any): Patch[]
```

**Parameters:**
- `oldState` - Previous state snapshot
- `newState` - Current state snapshot

**Returns:** Array of patches describing changes

**Example:**

```typescript
import { generateDiff } from '@martini-kit/core';

const oldState = {
  players: {
    p1: { x: 100, y: 200 }
  },
  score: 10
};

const newState = {
  players: {
    p1: { x: 150, y: 200 },  // x changed
    p2: { x: 50, y: 100 }     // p2 added
  },
  score: 15  // score changed
};

const patches = generateDiff(oldState, newState);
console.log(patches);
// [
//   { op: 'replace', path: ['players', 'p1', 'x'], value: 150 },
//   { op: 'add', path: ['players', 'p2'], value: { x: 50, y: 100 } },
//   { op: 'replace', path: ['score'], value: 15 }
// ]
```

**Bandwidth savings:**

Without diff (full state):
```json
{
  "players": { "p1": { "x": 150, "y": 200 }, "p2": { "x": 50, "y": 100 } },
  "score": 15
}
// ~100 bytes
```

With diff (patches only):
```json
[
  { "op": "replace", "path": ["players", "p1", "x"], "value": 150 },
  { "op": "add", "path": ["players", "p2"], "value": { "x": 50, "y": 100 } },
  { "op": "replace", "path": ["score"], "value": 15 }
]
// ~120 bytes (similar here, but much smaller for large states with few changes)
```

For a typical game state with 100s of entities but only a few changing each frame, patches are **90-99% smaller**.

## applyPatch()

Applies a single patch to state (mutates in-place).

```typescript
function applyPatch(state: any, patch: Patch): void
```

**Parameters:**
- `state` - State object to modify
- `patch` - Patch to apply

**Returns:** Nothing (mutates `state`)

**Example:**

```typescript
import { applyPatch } from '@martini-kit/core';

const state = {
  players: {
    p1: { x: 100, y: 200 }
  }
};

// Apply a replace patch
applyPatch(state, {
  op: 'replace',
  path: ['players', 'p1', 'x'],
  value: 150
});

console.log(state.players.p1.x);  // 150

// Apply an add patch
applyPatch(state, {
  op: 'add',
  path: ['players', 'p2'],
  value: { x: 50, y: 100 }
});

console.log(state.players.p2);  // { x: 50, y: 100 }

// Apply a remove patch
applyPatch(state, {
  op: 'remove',
  path: ['players', 'p2']
});

console.log(state.players.p2);  // undefined
```

### Applying Multiple Patches

```typescript
const patches = generateDiff(oldState, newState);

for (const patch of patches) {
  applyPatch(state, patch);
}
```

## deepClone()

Creates a deep copy of an object (used internally to snapshot state).

```typescript
function deepClone<T>(obj: T): T
```

**Parameters:**
- `obj` - Object to clone

**Returns:** Deep copy of the object

**Example:**

```typescript
import { deepClone } from '@martini-kit/core';

const original = {
  players: {
    p1: { x: 100, y: 200 }
  },
  projectiles: [
    { id: 'proj1', x: 50, y: 50 }
  ]
};

const copy = deepClone(original);

copy.players.p1.x = 999;
console.log(original.players.p1.x);  // 100 (unchanged)

copy.projectiles.push({ id: 'proj2', x: 10, y: 10 });
console.log(original.projectiles.length);  // 1 (unchanged)
```

**Use cases:**
- Taking state snapshots for diff generation
- Implementing undo/redo systems
- State history tracking
- Debugging state mutations

## How GameRuntime Uses Sync

The `GameRuntime` uses these functions internally:

```typescript
class GameRuntime {
  private syncState(): void {
    // 1. Generate diff
    const patches = generateDiff(this.previousState, this.state);

    if (patches.length === 0) {
      return;  // No changes, nothing to send
    }

    // 2. Broadcast patches to clients
    this.transport.send({
      type: 'state_sync',
      payload: { patches }
    });

    // 3. Update snapshot for next diff
    this.previousState = deepClone(this.state);
  }
}
```

**Client applies patches:**

```typescript
// Client receives state_sync message
handleStateSync(payload: any): void {
  if (payload.patches) {
    for (const patch of payload.patches) {
      applyPatch(this.state, patch);
    }
    this.notifyStateChange();
  }
}
```

## Performance Characteristics

### Time Complexity

- **generateDiff:** O(n) where n = number of properties in state
- **applyPatch:** O(d) where d = depth of path

### Space Complexity

- **Patches:** O(c) where c = number of changes
- **deepClone:** O(n) where n = size of state

### Bandwidth

**Example game state:**

```typescript
{
  players: {
    p1: { x: 100, y: 200, health: 75, ... },  // 50 bytes
    p2: { x: 300, y: 400, health: 100, ... }, // 50 bytes
    // ... 10 more players
  },
  projectiles: [ ... ],  // 1000 bytes
  enemies: [ ... ],      // 5000 bytes
  particles: [ ... ]     // 2000 bytes
}
// Total: ~10KB
```

**Full state sync at 20 FPS:**
- 10 KB × 20 FPS = 200 KB/s per client
- 5 clients = **1 MB/s bandwidth**

**Patch-based sync** (only 2 players moving):
- ~100 bytes of patches × 20 FPS = 2 KB/s per client
- 5 clients = **10 KB/s bandwidth**

**Savings: 99% reduction!**

## Advanced Usage

### Manual Diff/Patch

```typescript
import { generateDiff, applyPatch, deepClone } from '@martini-kit/core';

// Server
let currentState = { score: 0, players: {} };
let previousState = deepClone(currentState);

function tick() {
  // Game logic modifies state
  currentState.score += 10;

  // Generate and send diff
  const patches = generateDiff(previousState, currentState);

  if (patches.length > 0) {
    broadcastToClients({ type: 'sync', patches });
    previousState = deepClone(currentState);
  }
}

// Client
let clientState = { score: 0, players: {} };

function onMessage(msg: { type: string; patches: Patch[] }) {
  if (msg.type === 'sync') {
    for (const patch of msg.patches) {
      applyPatch(clientState, patch);
    }
    render(clientState);
  }
}
```

### State History (Time Travel Debugging)

```typescript
import { deepClone, applyPatch, generateDiff } from '@martini-kit/core';

class StateHistory {
  private snapshots: any[] = [];
  private currentIndex = 0;

  recordState(state: any) {
    // Remove future states if we've gone back in time
    this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);

    // Add current state
    this.snapshots.push(deepClone(state));
    this.currentIndex = this.snapshots.length - 1;
  }

  undo(): any | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  redo(): any | null {
    if (this.currentIndex < this.snapshots.length - 1) {
      this.currentIndex++;
      return this.snapshots[this.currentIndex];
    }
    return null;
  }
}

// Usage
const history = new StateHistory();

// Record each state change
runtime.onChange((state) => {
  history.recordState(state);
});

// Time travel
const previousState = history.undo();
if (previousState) {
  runtime.setState(previousState);
}
```

### Compression (Advanced)

For even smaller bandwidth, compress patches before sending:

```typescript
import pako from 'pako';  // gzip compression

function compressPatches(patches: Patch[]): Uint8Array {
  const json = JSON.stringify(patches);
  return pako.deflate(json);
}

function decompressPatches(compressed: Uint8Array): Patch[] {
  const json = pako.inflate(compressed, { to: 'string' });
  return JSON.parse(json);
}

// Server
const patches = generateDiff(oldState, newState);
const compressed = compressPatches(patches);
transport.send({ type: 'sync', data: compressed });

// Client
const patches = decompressPatches(msg.data);
for (const patch of patches) {
  applyPatch(state, patch);
}
```

**Typical compression ratios:** 50-70% size reduction

## Limitations

### No Ordering Guarantees

Patches must be applied in order. If the transport doesn't guarantee ordering (e.g., UDP), you need sequence numbers:

```typescript
interface SyncMessage {
  sequence: number;
  patches: Patch[];
}

// Server
let sequence = 0;
transport.send({
  type: 'sync',
  sequence: sequence++,
  patches
});

// Client
let expectedSequence = 0;
const buffer: Map<number, Patch[]> = new Map();

function onSync(msg: SyncMessage) {
  if (msg.sequence === expectedSequence) {
    // Apply immediately
    applyPatches(msg.patches);
    expectedSequence++;

    // Apply buffered patches
    while (buffer.has(expectedSequence)) {
      applyPatches(buffer.get(expectedSequence)!);
      buffer.delete(expectedSequence);
      expectedSequence++;
    }
  } else if (msg.sequence > expectedSequence) {
    // Buffer for later
    buffer.set(msg.sequence, msg.patches);
  }
  // else: duplicate or old message, ignore
}
```

### Full State Sync

When a client first joins, send the **full state** (not patches):

```typescript
// GameRuntime does this automatically
onPeerJoin(peerId) {
  transport.send({
    type: 'state_sync',
    payload: { fullState: this.state }
  }, peerId);
}
```

### Circular References

`deepClone` doesn't handle circular references:

```typescript
const obj: any = { a: 1 };
obj.self = obj;  // Circular!

deepClone(obj);  // ❌ Stack overflow
```

**Solution:** Don't store circular references in game state (which is good practice anyway).

## Best Practices

### ✅ Do

- **Let GameRuntime handle it** - It's automatic!
- **Keep state serializable** - No functions, classes, circular refs
- **Use patches for updates** - Much more efficient than full state
- **Send full state on join** - New clients need complete picture

### ❌ Don't

- **Don't manually manage patches** - Use GameRuntime's built-in sync
- **Don't assume ordering** - Use sequence numbers if needed
- **Don't store non-serializable data** - Breaks diff/patch
- **Don't sync every tick** - Use `syncInterval` to throttle (default 50ms)

## See Also

- [GameRuntime](./game-runtime) - Automatic state sync
- [Transport](./transport) - Network layer
- [State Management](/docs/concepts/state-management) - State best practices
