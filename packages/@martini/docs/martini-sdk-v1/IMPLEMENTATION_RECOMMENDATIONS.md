# Implementation Recommendations

**Audience:** Engineers implementing the Martini Multiplayer SDK
**Last Updated:** 2025-01-11
**Spec Version:** 1.0

This document provides critical guidance, common pitfalls, and a roadmap for implementing the SDK.

---

## Table of Contents

1. [Critical Path Issues (MUST FIX FIRST)](#critical-path-issues)
2. [Architectural Decisions](#architectural-decisions)
3. [Testing Strategy](#testing-strategy)
4. [Performance Benchmarks](#performance-benchmarks)
5. [Common Pitfalls](#common-pitfalls)
6. [Code Organization](#code-organization)
7. [Release Checklist](#release-checklist)
8. [Security Considerations](#security-considerations)
9. [Monitoring & Telemetry](#monitoring--telemetry)
10. [Known Issues from Spec Audit](#known-issues-from-spec-audit)

---

## Critical Path Issues

These issues **MUST** be fixed before implementation begins. They will cause runtime failures.

### 1. ✅ Transport Interface Method Name

**Problem:** Spec uses both `send(message, targetId?)` and `sendTo(playerId, message)`.

**Fix:** Standardize on `send(message, targetId?)` throughout.

**Locations:**
- `Transport` interface definition
- All adapter implementations (Colyseus, Nakama, P2P)
- Player join/leave handlers
- Resync request handlers

**Code:**
```typescript
// ✅ Correct:
transport.send(message, playerId);  // Unicast
transport.send(message);            // Broadcast

// ❌ Wrong:
transport.sendTo(playerId, message);
```

---

### 2. ✅ Warm Standby Replication

**Problem:** Heartbeat type defines `queueTail` and `queueChecksum`, but implementation doesn't send them.

**Fix:** Implement complete warm standby system.

**Implementation:**
```typescript
class WarmStandbyManager {
  private replicatedSnapshots: Map<number, WireSnapshot> = new Map();
  private replicatedActionLog: QueuedAction[] = [];
  private lastHeartbeatTick: number = 0;

  // Host: Send heartbeat with action queue tail
  broadcastHeartbeat(): void {
    const queueTail = this.actionQueue.filter(
      a => a.tick > this.lastHeartbeatTick
    );
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

    // Prune old snapshots (keep last 3)
    const ticks = [...this.replicatedSnapshots.keys()].sort((a, b) => b - a);
    ticks.slice(3).forEach(t => this.replicatedSnapshots.delete(t));
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
    const latestTick = Math.max(...this.replicatedSnapshots.keys());
    const snapshot = this.replicatedSnapshots.get(latestTick)!;

    // Filter actions that happened after snapshot
    const actionQueue = this.replicatedActionLog.filter(
      a => a.tick > snapshot.tick
    );

    return { snapshot, actionQueue };
  }
}
```

**Why Critical:** Without this, host migration will fail (new host has no state to restore).

---

### 3. ✅ Tick Drift Correction

**Problem:** `tickDrift` is never updated after initialization, causing incorrect sync.

**Fix:** Use latency-based offset instead of fixed drift.

**Code:**
```typescript
// ❌ Wrong:
if (Math.abs(actualDrift - this.tickDrift) > 3) {
  this.clientTick = serverTick + this.tickDrift;  // tickDrift never changes!
}

// ✅ Correct:
onServerState(message: WireDiff | WireSnapshot): void {
  const serverTick = message.tick;

  // Calculate expected client position (server + half RTT)
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
```

---

### 4. ✅ Array Deletion Patch Bug

**Problem:** ID-based deletion falls through to index-based deletion if ID not found.

**Fix:** Add explicit break after ID-based path.

**Code:**
```typescript
case 'delete': {
  if (isArrayTarget) {
    if (id) {
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
```

**Why Critical:** Deletes wrong array elements, causing desyncs.

---

## Architectural Decisions

### Use TypeScript

**Rationale:**
- Complex proxy types require strong typing
- Generic action handlers need type inference
- JSDoc is insufficient for this API surface

**Decision:** Core SDK must be TypeScript. User game logic can be JS.

### Zero Runtime Dependencies

**Allowed:**
- Dev dependencies: `@types/*`, testing libraries
- Peer dependencies: None (user provides Phaser, Colyseus, etc.)

**Forbidden:**
- Lodash, utility libs (implement yourself)
- Large libraries (bundle size must stay <50KB gzipped)

### Tree-Shakeable Exports

**Structure:**
```typescript
// ✅ Named exports (tree-shakeable)
export { createGame } from './game';
export { createRuntime } from './runtime';
export { createTransport } from './transport';

// ❌ Default export (not tree-shakeable)
export default Martini;
```

**Why:** Users may only need `createGame`, shouldn't bundle runtime/transport code.

---

## Testing Strategy

### Directory Structure

```
packages/@martini/core/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── diff.test.ts              # Deep diff algorithm
│   │   │   ├── patch.test.ts             # Patch application
│   │   │   ├── schema-proxy.test.ts      # Validation/clamping
│   │   │   ├── seeded-random.test.ts     # Determinism
│   │   │   ├── cooldown.test.ts          # Tick-based timing
│   │   │   └── deterministic-stringify.test.ts
│   │   ├── integration/
│   │   │   ├── predict-rollback.test.ts  # Full prediction cycle
│   │   │   ├── desync-recovery.test.ts   # Checksum + resync
│   │   │   ├── host-migration.test.ts    # P2P failover
│   │   │   └── action-queue.test.ts      # Ordering guarantees
│   │   └── e2e/
│   │       ├── colyseus.test.ts          # Real Colyseus server
│   │       ├── nakama.test.ts            # Real Nakama match
│   │       └── p2p.test.ts               # Real WebRTC via Trystero
```

### Unit Test Requirements

#### 1. Deep Diff Algorithm (100% coverage required)

**Test cases:**
```typescript
describe('generateDiff', () => {
  it('detects primitive changes', () => {
    const patches = generateDiff({ x: 1 }, { x: 2 });
    expect(patches).toEqual([
      { op: 'set', path: ['x'], value: 2 }
    ]);
  });

  it('detects nested object changes', () => {
    const patches = generateDiff(
      { player: { x: 1, y: 2 } },
      { player: { x: 1, y: 3 } }
    );
    expect(patches).toEqual([
      { op: 'set', path: ['player', 'y'], value: 3 }
    ]);
  });

  it('uses ID-based diff for arrays with id field', () => {
    const old = [{ id: 'a', x: 1 }, { id: 'b', x: 2 }];
    const new_ = [{ id: 'b', x: 3 }, { id: 'c', x: 4 }];
    const patches = generateDiff({ coins: old }, { coins: new_ });

    expect(patches).toContainEqual(
      { op: 'delete', path: ['coins', '0'], id: 'a' }
    );
    expect(patches).toContainEqual(
      { op: 'set', path: ['coins', '0', 'x'], value: 3 }
    );
    expect(patches).toContainEqual(
      { op: 'set', path: ['coins', '1'], value: { id: 'c', x: 4 }, id: 'c' }
    );
  });

  it('handles array reordering with IDs', () => {
    const old = [{ id: 'a', x: 1 }, { id: 'b', x: 2 }];
    const new_ = [{ id: 'b', x: 2 }, { id: 'a', x: 1 }];
    const patches = generateDiff({ items: old }, { items: new_ });

    // Should not generate patches if values unchanged (just reordered)
    expect(patches).toEqual([]);
  });

  it('uses index-based diff for arrays without id field', () => {
    const patches = generateDiff({ arr: [1, 2, 3] }, { arr: [1, 5, 3] });
    expect(patches).toEqual([
      { op: 'set', path: ['arr', '1'], value: 5 }
    ]);
  });

  it('handles empty arrays', () => {
    const patches = generateDiff({ arr: [1, 2] }, { arr: [] });
    expect(patches.length).toBe(2);
    expect(patches.every(p => p.op === 'delete')).toBe(true);
  });

  it('does not generate patches for unchanged state', () => {
    const state = { x: 1, nested: { y: 2 } };
    const patches = generateDiff(state, state);
    expect(patches).toEqual([]);
  });
});
```

#### 2. Patch Application (every edge case)

**Test cases:**
```typescript
describe('applyPatch', () => {
  it('applies set operation', () => {
    const state = { x: 1 };
    applyPatch(state, { op: 'set', path: ['x'], value: 2 });
    expect(state.x).toBe(2);
  });

  it('applies delete operation on object', () => {
    const state = { x: 1, y: 2 };
    applyPatch(state, { op: 'delete', path: ['y'] });
    expect(state).toEqual({ x: 1 });
  });

  it('applies delete operation on array by ID', () => {
    const state = { items: [{ id: 'a' }, { id: 'b' }] };
    applyPatch(state, { op: 'delete', path: ['items', '0'], id: 'b' });
    expect(state.items).toEqual([{ id: 'a' }]);
  });

  it('warns if delete by ID not found', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const state = { items: [{ id: 'a' }] };
    applyPatch(state, { op: 'delete', path: ['items', '0'], id: 'nonexistent' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(state.items).toEqual([{ id: 'a' }]);  // Unchanged
  });

  it('applies push operation', () => {
    const state = { arr: [1, 2] };
    applyPatch(state, { op: 'push', path: ['arr'], value: 3 });
    expect(state.arr).toEqual([1, 2, 3]);
  });

  it('throws on push to non-array', () => {
    const state = { obj: {} };
    expect(() => {
      applyPatch(state, { op: 'push', path: ['obj'], value: 1 });
    }).toThrow('Cannot push to non-array');
  });

  it('applies splice operation', () => {
    const state = { arr: [1, 2, 3] };
    applyPatch(state, { op: 'splice', path: ['arr'], index: 1, value: 5 });
    expect(state.arr).toEqual([1, 5, 3]);
  });

  it('applies nested patches', () => {
    const state = { player: { inventory: [{ id: 'sword', damage: 10 }] } };
    applyPatch(state, {
      op: 'set',
      path: ['player', 'inventory', '0', 'damage'],
      value: 15
    });
    expect(state.player.inventory[0].damage).toBe(15);
  });
});
```

#### 3. Seeded Random (determinism verification)

**Test cases:**
```typescript
describe('SeededRandom', () => {
  it('produces same sequence for same seed', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(43);

    const val1 = rng1.next();
    const val2 = rng2.next();

    expect(val1).not.toBe(val2);
  });

  it('produces unique values per action via createActionRandom', () => {
    // Same tick, different action indices
    const rng1 = createActionRandom(100, 0);
    const rng2 = createActionRandom(100, 1);

    expect(rng1.next()).not.toBe(rng2.next());
  });

  it('range() returns values in correct bounds', () => {
    const rng = new SeededRandom(42);

    for (let i = 0; i < 1000; i++) {
      const val = rng.range(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThan(20);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('choice() selects from array', () => {
    const rng = new SeededRandom(42);
    const arr = ['a', 'b', 'c'];

    for (let i = 0; i < 100; i++) {
      const val = rng.choice(arr);
      expect(arr).toContain(val);
    }
  });

  it('shuffle() is deterministic', () => {
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];

    new SeededRandom(42).shuffle(arr1);
    new SeededRandom(42).shuffle(arr2);

    expect(arr1).toEqual(arr2);
  });

  it('clone() preserves state', () => {
    const rng = new SeededRandom(42);
    rng.next();
    rng.next();

    const clone = rng.clone();

    expect(rng.next()).toBe(clone.next());
  });
});
```

#### 4. Concurrent Action Handling (Critical for Correctness)

**Test cases:**
```typescript
describe('Concurrent Actions', () => {
  it('handles same-tick actions deterministically', () => {
    const sim = createSimulator(gameLogic, { playerIds: ['p1', 'p2'] });

    // Both players try to collect the same coin at tick 100
    sim.dispatch('collect', { coinId: 'c1' }, 'p1', { tick: 100, timestamp: 1000 });
    sim.dispatch('collect', { coinId: 'c1' }, 'p2', { tick: 100, timestamp: 1001 });
    sim.tick();

    // p1 should win (earlier timestamp)
    expect(sim.getState().players.p1.score).toBe(10);
    expect(sim.getState().players.p2.score).toBe(0);
    expect(sim.getState().coins[0].collected).toBe(true);
  });

  it('same-tick actions execute in timestamp order', () => {
    const sim = createSimulator(gameLogic, { playerIds: ['p1', 'p2', 'p3'] });

    // Three players act at same tick with different timestamps
    sim.dispatch('increment', {}, 'p3', { tick: 100, timestamp: 1002 });
    sim.dispatch('increment', {}, 'p1', { tick: 100, timestamp: 1000 });
    sim.dispatch('increment', {}, 'p2', { tick: 100, timestamp: 1001 });
    sim.tick();

    // Execution order: p1 → p2 → p3 (timestamp sorted)
    // If increment adds timestamp to score:
    expect(sim.getState().players.p1.executionOrder).toBe(0);
    expect(sim.getState().players.p2.executionOrder).toBe(1);
    expect(sim.getState().players.p3.executionOrder).toBe(2);
  });

  it('actions from different ticks execute in tick order', () => {
    const sim = createSimulator(gameLogic, { playerIds: ['p1', 'p2'] });

    // Actions arrive out of order
    sim.dispatch('mark', { value: 'tick101' }, 'p1', { tick: 101, timestamp: 2000 });
    sim.dispatch('mark', { value: 'tick100' }, 'p2', { tick: 100, timestamp: 1000 });

    sim.tick();  // Tick 100

    // Only tick 100 actions executed
    expect(sim.getState().lastMark).toBe('tick100');

    sim.tick();  // Tick 101

    // Now tick 101 actions execute
    expect(sim.getState().lastMark).toBe('tick101');
  });

  it('handles action queue overflow gracefully', () => {
    const sim = createSimulator(gameLogic, { playerIds: ['p1'] });

    // Queue 1000 actions for future ticks
    for (let i = 0; i < 1000; i++) {
      sim.dispatch('noop', {}, 'p1', { tick: i + 100 });
    }

    // Should not crash or lose actions
    for (let i = 0; i < 1000; i++) {
      sim.tick();
    }

    expect(sim.getTick()).toBe(1000);
  });
});
```

---

## Performance Benchmarks

Run these benchmarks before merging to main. All must pass.

### 1. State Diff Performance

```typescript
describe('Performance: generateDiff', () => {
  it('diffs 1000-object state in <1ms', () => {
    const state1 = {
      entities: Array.from({ length: 1000 }, (_, i) => ({
        id: `e${i}`,
        x: Math.random() * 800,
        y: Math.random() * 600,
        health: 100
      }))
    };

    const state2 = deepClone(state1);
    state2.entities[500].x += 10;  // Change one entity

    const start = performance.now();
    const patches = generateDiff(state1, state2);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1);  // <1ms
    expect(patches.length).toBe(1);   // Only changed property
  });
});
```

### 2. Proxy Overhead

```typescript
describe('Performance: Schema Proxy', () => {
  it('proxy overhead <10% vs raw object', () => {
    const rawState = { x: 0, y: 0 };
    const proxiedState = createSchemaProxy({ x: 0, y: 0 }, {});

    // Benchmark raw access
    const rawStart = performance.now();
    for (let i = 0; i < 1_000_000; i++) {
      rawState.x = i;
      rawState.y = i;
    }
    const rawTime = performance.now() - rawStart;

    // Benchmark proxied access
    const proxyStart = performance.now();
    for (let i = 0; i < 1_000_000; i++) {
      proxiedState.x = i;
      proxiedState.y = i;
    }
    const proxyTime = performance.now() - proxyStart;

    const overhead = (proxyTime - rawTime) / rawTime;
    expect(overhead).toBeLessThan(0.1);  // <10% overhead
  });
});
```

### 3. Rollback Performance

```typescript
describe('Performance: Rollback', () => {
  it('rollback <5ms for 60-tick history', () => {
    const mockGame = { actions: {} } as ReturnType<typeof createGame>;
    const executor = new ActionExecutor(1000 / 30);
    executor.setTick(0);
    const engine = new PredictRollbackEngine(mockGame, executor, 64);

    // Simulate 60 ticks of state
    for (let i = 0; i < 60; i++) {
      engine.saveSnapshot({ tick: i, state: { x: i } });
    }

    const start = performance.now();
    engine.rewind(0);  // Rollback to tick 0
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);  // <5ms
  });
});
```

### 4. Serialization Bandwidth

```typescript
describe('Performance: Bandwidth', () => {
  it('serialization <100KB/s for 4-player game', () => {
    const state = {
      players: Object.fromEntries(
        Array.from({ length: 4 }, (_, i) => [
          `p${i}`,
          { x: Math.random() * 800, y: Math.random() * 600, health: 100 }
        ])
      ),
      entities: Array.from({ length: 50 }, (_, i) => ({
        id: `e${i}`,
        x: Math.random() * 800,
        y: Math.random() * 600
      }))
    };

    const json = JSON.stringify(state);
    const bytes = new TextEncoder().encode(json).length;

    // Assuming 30 FPS server tick rate = 30 snapshots/sec
    const bytesPerSecond = bytes * 30;

    expect(bytesPerSecond).toBeLessThan(100_000);  // <100KB/s
  });
});
```

---

## Common Pitfalls

### 1. ⚠️ Proxy WeakMap Cache Invalidation

**Problem:** Cached proxies aren't invalidated when object is replaced.

**Symptom:** Mutations to old object instances leak through after state rollback.

**Fix:**
```typescript
set(target, prop, value) {
  target[prop] = value;

  // Invalidate cache if object was replaced
  if (typeof value === 'object' && value !== null) {
    proxyCache.delete(target[prop]);  // ← Critical!
  }

  return true;
}
```

### 2. ⚠️ structuredClone() Limitations

**Problem:** `structuredClone()` doesn't work with functions, symbols, or circular references.

**Symptom:** State cloning throws `DataCloneError`.

**Fix:** Use custom deep clone with circular reference detection:
```typescript
function deepClone<T>(obj: T, seen = new WeakMap()): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  // Check circular reference
  if (seen.has(obj)) return seen.get(obj);

  const clone: any = Array.isArray(obj) ? [] : {};
  seen.set(obj, clone);

  for (const key in obj) {
    clone[key] = deepClone(obj[key], seen);
  }

  return clone;
}
```

### 3. ⚠️ setInterval() Drift

**Problem:** `setInterval()` drifts over time due to JS event loop delays.

**Symptom:** Client tick gets progressively out of sync with server.

**Fix:** Use `requestAnimationFrame()` with elapsed time:
```typescript
let lastTime = performance.now();

function tick() {
  const now = performance.now();
  const elapsed = now - lastTime;
  const tickDuration = 1000 / 60;  // 60 FPS

  if (elapsed >= tickDuration) {
    this.currentTick++;
    this.runSystems();
    lastTime = now - (elapsed % tickDuration);  // Carry over remainder
  }

  requestAnimationFrame(tick);
}
```

### 4. ⚠️ Action Ordering

**Problem:** Processing actions in arrival order instead of tick order.

**Symptom:** Desyncs when actions arrive out-of-order due to network jitter.

**Fix:** Sort by tick before processing:
```typescript
processActionQueue(): void {
  // Sort by tick, then by timestamp (for same-tick actions)
  this.actionQueue.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return a.timestamp - b.timestamp;
  });

  for (const action of this.actionQueue) {
    if (action.tick === this.currentTick) {
      this.executeAction(action);
    }
  }

  // Remove processed actions
  this.actionQueue = this.actionQueue.filter(a => a.tick > this.currentTick);
}
```

### 5. ⚠️ Floating Point Non-Determinism

**Problem:** `Math.sin()`, `Math.cos()`, and floating-point arithmetic produce slightly different results across platforms due to:
- Different CPU architectures (x86 vs ARM)
- Different JavaScript engines (V8, SpiderMonkey, JavaScriptCore)
- JIT compiler optimizations
- Floating-point rounding modes

**Symptom:** Physics desyncs on different browsers/OS, especially over long simulation times.

**Solution 1: Pre-computed Lookup Tables (Recommended for trig functions)**

```typescript
// Pre-compute sin/cos tables at startup with higher precision
const PRECISION = 10000;  // 4 decimal places
const ANGLE_STEPS = 3600;  // 0.1 degree precision

const SIN_TABLE = Array.from({ length: ANGLE_STEPS }, (_, i) =>
  Math.round(Math.sin(i * Math.PI / 1800) * PRECISION)
);

const COS_TABLE = Array.from({ length: ANGLE_STEPS }, (_, i) =>
  Math.round(Math.cos(i * Math.PI / 1800) * PRECISION)
);

function sin(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;  // Normalize to [0, 360)
  const idx = Math.floor(normalized * 10);  // 0.1 degree steps
  return SIN_TABLE[idx] / PRECISION;
}

function cos(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  const idx = Math.floor(normalized * 10);
  return COS_TABLE[idx] / PRECISION;
}

// Usage:
player.x += cos(angle) * speed;
player.y += sin(angle) * speed;
```

**Solution 2: Fixed-Point Arithmetic (Recommended for physics)**

```typescript
// Use integer arithmetic with fixed scale
const SCALE = 10000;

type FixedPoint = number;  // Actually an integer representing value * SCALE

function toFixed(value: number): FixedPoint {
  return Math.floor(value * SCALE);
}

function fromFixed(fixed: FixedPoint): number {
  return fixed / SCALE;
}

function multiplyFixed(a: FixedPoint, b: FixedPoint): FixedPoint {
  return Math.floor((a * b) / SCALE);
}

// Example: Physics with fixed-point
const GRAVITY = toFixed(0.8);
const JUMP_VELOCITY = toFixed(-12);

// In system tick:
player.vy += GRAVITY;  // Both are FixedPoint integers
player.y += player.vy;  // Integer addition

// When rendering:
sprite.y = fromFixed(player.y);  // Convert to float for display
```

**Solution 3: Deterministic Math Library (Production-ready)**

```bash
npm install fixed-math
```

```typescript
import { Fixed, Vec2 } from 'fixed-math';

// All operations are deterministic across platforms
const position = Vec2.create(100, 100);
const velocity = Vec2.create(5, 0);
const angle = Fixed.fromNumber(45);

// Deterministic trig
const dx = Fixed.mul(Fixed.cos(angle), velocity.x);
const dy = Fixed.mul(Fixed.sin(angle), velocity.y);

Vec2.add(position, Vec2.create(dx, dy));
```

**When to use each approach:**
- **Lookup tables:** Best for angles (rotation, aiming, direction)
- **Fixed-point:** Best for continuous physics (position, velocity, forces)
- **Deterministic library:** Best for complex math (matrix transforms, quaternions)
- **Avoid determinism:** Set `predict: false` on physics systems (server-only simulation)

**Testing determinism:**
```typescript
test('physics is deterministic', () => {
  const sim1 = createSimulator(game, { seed: 42, playerIds: ['p1'] });
  const sim2 = createSimulator(game, { seed: 42, playerIds: ['p1'] });

  for (let i = 0; i < 1000; i++) {
    sim1.dispatch('move', { dx: 1, dy: 0 }, 'p1');
    sim2.dispatch('move', { dx: 1, dy: 0 }, 'p1');
    sim1.tick();
    sim2.tick();
  }

  // Should be byte-for-byte identical after 1000 ticks
  expect(sim1.getState()).toEqual(sim2.getState());
});
```

---

## Code Organization

### Recommended Monorepo Structure

```
packages/
├── @martini/core/
│   ├── src/
│   │   ├── runtime.ts              # createRuntime()
│   │   ├── game.ts                 # createGame()
│   │   ├── action-executor.ts      # Validation + execution
│   │   ├── predict-rollback.ts     # Rollback engine
│   │   ├── schema-proxy.ts         # Validation proxy
│   │   ├── diff.ts                 # Deep diff + patch
│   │   ├── sync.ts                 # StateSynchronizer
│   │   ├── determinism.ts          # SeededRandom, wrappers
│   │   ├── tick-sync.ts            # Tick synchronization
│   │   ├── interpolation.ts        # Client-side interpolation
│   │   ├── bandwidth.ts            # Bandwidth monitoring
│   │   ├── utils.ts                # deepClone, deepEqual, etc.
│   │   └── index.ts                # Public exports
│   ├── package.json
│   └── tsconfig.json
│
├── @martini/testing/
│   ├── src/
│   │   ├── simulator.ts            # createSimulator()
│   │   ├── test-utils.ts           # Jest matchers
│   │   └── index.ts
│   └── package.json
│
├── @martini/colyseus-adapter/
│   ├── src/
│   │   ├── transport.ts            # ColyseusTransport
│   │   └── index.ts
│   └── package.json
│
├── @martini/nakama-adapter/
│   ├── src/
│   │   ├── transport.ts            # NakamaTransport
│   │   └── index.ts
│   └── package.json
│
└── @martini/trystero-adapter/
    ├── src/
    │   ├── transport.ts            # TrysteroTransport
    │   └── index.ts
    └── package.json
```

### Export Structure

**@martini/core:**
```typescript
// Public API (user-facing)
export { createGame } from './game';
export { createRuntime } from './runtime';
export { createTransport } from './transport';

// Types (user-facing)
export type {
  GameConfig,
  ActionConfig,
  SystemConfig,
  GameState,
  GameAPI,
  RuntimeConfig,
  Transport
} from './types';

// Utilities (advanced users)
export {
  deepClone,
  deepEqual,
  deepFreeze,
  deterministicStringify
} from './utils';

// Internal (adapter authors only)
export { createSchemaProxy } from './schema-proxy';
export { generateDiff, applyPatches } from './diff';
export { SeededRandom, createActionRandom } from './determinism';
```

**@martini/testing:**
```typescript
export { createSimulator } from './simulator';
export { expectState, expectAction } from './test-utils';
```

---

## Release Checklist

Before releasing v1.0:

### Code Quality
- [ ] All 20 audit issues fixed
- [ ] 100% TypeScript (no `any` except utility functions)
- [ ] All public APIs have JSDoc with `@example`
- [ ] Zero ESLint errors
- [ ] Zero TypeScript errors

### Testing
- [ ] Unit tests: 100% coverage for core algorithms (diff, patch, proxy, random)
- [ ] Integration tests: predict-rollback, desync-recovery, host-migration
- [ ] E2E tests: real Colyseus + Nakama + Trystero servers
- [ ] Stress test: 4 players, 1000 actions, 50% packet loss simulation
- [ ] Desync rate <0.1% over 1 hour

### Performance
- [ ] State diff <1ms for 1000-object game
- [ ] Proxy overhead <10%
- [ ] Rollback <5ms for 60-tick history
- [ ] Bundle size <50KB gzipped (core only)
- [ ] Serialization <100KB/s per client (4-player game)

### Documentation
- [ ] All doc files created and reviewed
- [ ] API docs generated from TSDoc
- [ ] Fire Boy & Water Girl example works end-to-end
- [ ] Migration guide (if upgrading from previous version)

### Security
- [ ] Rate limiting implemented
- [ ] Input validation on all actions
- [ ] Schema validation tested with malicious inputs
- [ ] No exposed admin endpoints

### Deployment
- [ ] Published to npm as `@martini/core@1.0.0`
- [ ] Adapters published separately
- [ ] GitHub release with changelog
- [ ] Demo site deployed

---

## Security Considerations

### 1. Schema Validation ≠ Sandboxing

**Warning:** Schema validation prevents invalid state, but NOT infinite loops or CPU DoS.

**Example:**
```javascript
actions: {
  bad: {
    apply: ({ game }) => {
      while (true) {}  // ⚠️ Schema can't prevent this!
    }
  }
}
```

**Mitigation:**
- Use timeout wrapper for action execution (server-side):
  ```typescript
  const timeout = setTimeout(() => {
    throw new Error('Action timeout (5s)');
  }, 5000);

  try {
    action.apply(context);
  } finally {
    clearTimeout(timeout);
  }
  ```

### 2. Rate Limiting at Transport Layer

**Warning:** Client can spam actions before cooldown kicks in if transport doesn't rate-limit.

**Mitigation:**
- Add transport-level rate limiting:
  ```typescript
  class RateLimitedTransport {
    private actionCounts: Map<string, number[]> = new Map();

    send(message: WireMessage): void {
      if (message.type === 'action') {
        const now = Date.now();
        const calls = this.actionCounts.get(message.playerId) || [];
        const recentCalls = calls.filter(t => t > now - 1000);

        if (recentCalls.length > 100) {  // Max 100 actions/sec
          console.warn(`Rate limit exceeded for ${message.playerId}`);
          return;  // Drop message
        }

        recentCalls.push(now);
        this.actionCounts.set(message.playerId, recentCalls);
      }

      this.transport.send(message);
    }
  }
  ```

### 3. Proximity Checks Can Be Cheated

**Warning:** Client can modify proximity check to always return `true`.

**Mitigation:**
- Always verify proximity on server:
  ```typescript
  requires: {
    proximity: {
      get: ({ game, input }) => game.coins.find(c => c.id === input.coinId),
      distance: 50
    }
  }
  // Server re-checks this, client prediction is just UX
  ```

### 4. Never Trust Client State

**Warning:** Client can send forged state via modified runtime.

**Mitigation:**
- Server never accepts client state, only actions:
  ```typescript
  // ❌ Dangerous:
  onMessage('state_update', (client, state) => {
    this.state = state;  // Client can cheat!
  });

  // ✅ Safe:
  onMessage('action', (client, action) => {
    this.validateAction(action);  // Server validates + executes
  });
  ```

---

## Monitoring & Telemetry

Add these hooks for production monitoring:

### API Surface

```typescript
createRuntime(game, transport, {
  telemetry: {
    onDesync: (event: DesyncEvent) => void;
    onRollback: (ticks: number) => void;
    onLatencySpike: (ms: number) => void;
    onBandwidthExceeded: (playerId: string, bytes: number) => void;
    onActionRejected: (playerId: string, action: string, reason: string) => void;
    onHostMigration: (oldHost: string, newHost: string) => void;
  }
});
```

### Example Implementation

```typescript
createRuntime(game, transport, {
  telemetry: {
    onDesync: (event) => {
      analytics.track('desync', {
        tick: event.tick,
        serverChecksum: event.serverChecksum,
        clientChecksum: event.clientChecksum,
        playerId: transport.getPlayerId()
      });

      // Alert if desync rate >1%
      if (getDesyncRate() > 0.01) {
        Sentry.captureMessage('High desync rate', {
          extra: event
        });
      }
    },

    onRollback: (ticks) => {
      analytics.increment('rollback', { ticks });

      // Alert if rollback >10 ticks (visible to user)
      if (ticks > 10) {
        console.warn(`Large rollback: ${ticks} ticks`);
      }
    },

    onLatencySpike: (ms) => {
      analytics.gauge('latency', ms);

      // Show UI warning if latency >500ms
      if (ms > 500) {
        showNetworkWarning();
      }
    },

    onBandwidthExceeded: (playerId, bytes) => {
      analytics.track('bandwidth_exceeded', { playerId, bytes });

      // Rate limit or disconnect player if >500KB/s (likely DoS)
      if (bytes > 500_000) {
        console.warn(`Player ${playerId} exceeded bandwidth: ${bytes} bytes/sec`);
        // Note: Disconnection method varies by transport layer
        // Colyseus: this.clients.find(c => c.sessionId === playerId)?.leave();
        // Nakama: dispatcher.broadcastMessageDeferred(...)
        // P2P: No direct kick (rely on peer-to-peer connections)
      }
    },

    onActionRejected: (playerId, action, reason) => {
      analytics.track('action_rejected', {
        playerId,
        action,
        reason
      });

      // Ban player if >100 rejections/minute (likely cheating)
      if (getRejectionRate(playerId) > 100) {
        transport.ban(playerId, 'cheating_suspected');
      }
    },

    onHostMigration: (oldHost, newHost) => {
      analytics.track('host_migration', { oldHost, newHost });
      console.log(`Host migrated: ${oldHost} → ${newHost}`);
    }
  }
});
```

---

## Known Issues from Spec Audit

This section documents all 20 issues found during spec review. **All must be fixed.**

### Critical (Breaks Functionality) 🔴

#### Issue #1: Transport Method Name Mismatch
**Status:** ✅ Fixed in this spec
**Locations:** Lines 1791, 2058, 2489 (old spec)
**Fix:** Changed all `sendTo()` to `send(message, targetId?)`

#### Issue #2: Missing Heartbeat Fields
**Status:** ✅ Fixed in this spec
**Locations:** Lines 61, 1817, 2203 (old spec)
**Fix:** Added `queueChecksum`, `queueTail`, `snapshotTick` to heartbeat broadcast

#### Issue #3: Missing deliver() Setup
**Status:** ✅ Documented
**Locations:** Lines 1795, 2589 (old spec)
**Fix:** Added runtime initialization section showing `onMessage()` handler registration

#### Issue #4: Missing queueChecksum Implementation
**Status:** ✅ Fixed in this spec
**Locations:** Line 2288 (old spec)
**Fix:** Added `computeQueueChecksum()` function

### Correctness (Wrong Behavior) 🟡

#### Issue #5: Warm Standby Logic Missing
**Status:** ✅ Implemented in this spec
**Locations:** Lines 61-63, 2245-2275 (old spec)
**Fix:** Complete `WarmStandbyManager` class added

#### Issue #6: Tick Drift Correction Flawed
**Status:** ✅ Fixed in this spec
**Locations:** Lines 1987-1998 (old spec)
**Fix:** Use latency-based offset instead of fixed drift

#### Issue #7: Array Deletion Fall-Through Bug
**Status:** ✅ Fixed in this spec
**Locations:** Lines 1429-1438 (old spec)
**Fix:** Added explicit `break` after ID-based deletion

#### Issue #8: Pause/Resume Not Atomic
**Status:** ✅ Fixed in this spec
**Locations:** Lines 2046, 2082, 2102, 2123 (old spec)
**Fix:** Use `finally` block consistently

### Performance (Inefficient) 🟠

#### Issue #9: Interpolation Missing Delta Time
**Status:** ✅ Fixed in this spec
**Locations:** Lines 1702-1706 (old spec)
**Fix:** Store `clientTime` in `onServerState()`

#### Issue #10: Deep Clone in Interpolation
**Status:** ✅ Fixed in this spec
**Locations:** Line 1691 (old spec)
**Fix:** Reuse previous target state instead of cloning

#### Issue #11: Bandwidth Monitor Inefficient Pruning
**Status:** ✅ Fixed in this spec
**Locations:** Lines 1619-1624 (old spec)
**Fix:** Prune every 100 entries, not every call

### API Design (Confusing) 🔵

#### Issue #12: Render API Inconsistency
**Status:** ✅ Standardized
**Locations:** Lines 1179-1244 (old spec)
**Fix:** Use consistent `RenderContext` interface

#### Issue #13: Missing checkRequirements Parameter
**Status:** ✅ Fixed
**Locations:** Line 1007 (old spec)
**Fix:** Added `actionName` to signature

#### Issue #14: onChange Incomplete Meta
**Status:** ✅ Documented
**Locations:** Lines 1935, 1953-1959 (old spec)
**Fix:** Show full `ChangeMeta` in examples

### Polish (Missing Types/Docs) 🟢

#### Issue #15: QueuedAction Undefined
**Status:** ✅ Defined in [03-data-structures.md](./03-data-structures.md)

#### Issue #16: ActionResult Undefined
**Status:** ✅ Defined in [03-data-structures.md](./03-data-structures.md)

#### Issue #17: ConnectionState Management Missing
**Status:** ✅ Documented in [04-transport-interface.md](./04-transport-interface.md)

#### Issue #18: Missing Import Statements
**Status:** ✅ Added utility exports

#### Issue #19: Dev Mode timeTravel Not Implemented
**Status:** ✅ Implemented in [08-developer-tools.md](./08-developer-tools.md)

#### Issue #20: ActionLog Type Missing
**Status:** ✅ Defined in [03-data-structures.md](./03-data-structures.md)

---

## Summary

This guide should serve as the **single source of truth** for implementers. Read this document FIRST, then refer to individual spec files for detailed API contracts.

**Next Steps:**
1. Fix all 20 issues listed above
2. Set up testing infrastructure
3. Implement core runtime (Phase 1)
4. Run performance benchmarks
5. Implement transport adapters (Phase 3)

**Questions?** Open an issue in the GitHub repo or contact the spec author.
