# Developer Tools

Testing utilities, dev mode features, and debugging tools.

**Fixes Issue:** #19 (Dev mode time-travel implementation)

---

## Table of Contents

1. [Deterministic Simulator](#deterministic-simulator)
2. [Dev Mode Configuration](#dev-mode-configuration)
3. [Time-Travel Debugging](#time-travel-debugging)
4. [Testing Utilities](#testing-utilities)

---

## Deterministic Simulator

Headless runtime for testing (no network required).

```typescript
import { createSimulator } from '@martini/multiplayer/testing';
import gameLogic from './logic.js';

const sim = createSimulator(gameLogic, {
  playerIds: ['p1', 'p2'],
  seed: 'unit-test',
  tickRate: 30
});

// Dispatch actions
sim.dispatch('move', { dx: 1, dy: 0 }, 'p1');

// Advance simulation
sim.tick(5);  // Run 5 ticks

// Assert state
expect(sim.getState().players.p1.x).toBe(105);

// Snapshots for determinism tests
const snapshot1 = sim.snapshot();
sim.tick(10);
sim.restore(snapshot1);
expect(sim.getState()).toEqual(snapshot1.state);

// Rewind and replay
sim.rewind(0);  // Back to tick 0
sim.tick(15);   // Same result as before
```

### API Surface

| Method | Description |
|--------|-------------|
| `dispatch(name, payload, playerId)` | Enqueue action (validates input schema) |
| `tick(count = 1)` | Advance simulation deterministically |
| `getState()` | Returns deep-frozen state for assertions |
| `snapshot()` | Capture current state + tick |
| `restore(snapshot)` | Rewind to snapshot |
| `rewind(toTick)` | Rollback to tick, replay actions |

---

## Dev Mode Configuration

```typescript
const runtime = await createRuntime(gameLogic, transport, {
  devMode: true,  // Enable all dev features

  // Or granular control:
  dev: {
    strictDeterminism: true,   // Throw on Math.random(), Date.now()
    trackMutations: true,       // Warn on cross-player mutations
    checksumInterval: 60,       // Verify state every N ticks
    logActions: true,           // Console.log every action
    logRollbacks: true,         // Console.log every rollback
    timeTravel: true,           // Enable dev.setTick()
    recordReplay: true          // Save action log
  }
});
```

### Strict Determinism

Catches non-deterministic code in development.

```typescript
function createDeterminismGuards() {
  const originalRandom = Math.random;
  const originalDateNow = Date.now;

  const randomGuard = () => {
    throw new Error(
      'Non-deterministic Math.random() called!\n' +
      'Use random() from action/system context instead.\n' +
      new Error().stack
    );
  };

  const dateGuard = () => {
    throw new Error(
      'Non-deterministic Date.now() called!\n' +
      'Use game.time instead.\n' +
      new Error().stack
    );
  };

  return {
    enter() {
      Math.random = randomGuard as unknown as () => number;
      Date.now = dateGuard;
    },
    exit() {
      Math.random = originalRandom;
      Date.now = originalDateNow;
    }
  };
}

const determinismGuards = config.dev.strictDeterminism
  ? createDeterminismGuards()
  : null;

function runUserHook<T>(hook: () => T): T {
  if (!determinismGuards) return hook();
  determinismGuards.enter();
  try {
    return hook();
  } finally {
    determinismGuards.exit();
  }
}

// Usage
runUserHook(() => action.apply(context));
runUserHook(() => systems[name].tick(ctx));
```

### Mutation Tracking

Warns when actions mutate multiple players.

```typescript
if (config.dev.trackMutations) {
  // Proxy setter tracks mutations
  function trackMutation(pathSegments: string[]) {
    if (currentPlayer && pathSegments[0] === 'players') {
      const playerId = pathSegments[1];
      mutations.add(playerId);

      if (mutations.size > 1) {
        console.warn(
          `⚠️  Action mutated ${mutations.size} players: ${Array.from(mutations).join(', ')}\n` +
          `   Intended? This action affects multiple players.`
        );
      }
    }
  }
}
```

---

## Time-Travel Debugging

**✅ FIX ISSUE #19:** Complete implementation.

```typescript
class DevAPI {
  private snapshots: Map<number, StateSnapshot> = new Map();
  private actionLog: ActionLog[] = [];

  // Rewind to specific tick
  setTick(targetTick: number): void {
    const snapshot = this.snapshots.get(targetTick);

    if (!snapshot) {
      throw new Error(`No snapshot at tick ${targetTick}`);
    }

    this.currentTick = targetTick;
    this.state = deepClone(snapshot.state);
    this.revision = snapshot.revision;

    // Clear predicted actions after target tick
    this.actionQueue = this.actionQueue.filter(a => a.tick <= targetTick);

    console.log(`⏪ Rewound to tick ${targetTick}`);
  }

  // Get historical snapshot
  getSnapshot(tick: number): GameState | null {
    const snapshot = this.snapshots.get(tick);
    return snapshot ? deepClone(snapshot.state) : null;
  }

  // Replay from tick
  replayActions(fromTick: number): void {
    const snapshot = this.snapshots.get(fromTick);
    if (!snapshot) {
      throw new Error(`No snapshot at tick ${fromTick}`);
    }

    // Reset to snapshot
    this.state = deepClone(snapshot.state);
    this.currentTick = fromTick;

    // Replay all actions after snapshot
    const actionsToReplay = this.actionLog.filter(
      log => log.tick > fromTick
    );

    for (const log of actionsToReplay) {
      this.dispatch(log.actionName, log.payload, log.playerId);
      this.tick();
    }

    console.log(`🔄 Replayed ${actionsToReplay.length} actions from tick ${fromTick}`);
  }

  // Export replay data
  exportReplay(): ActionLog[] {
    return this.actionLog.map(log => ({
      tick: log.tick,
      playerId: log.playerId,
      actionName: log.actionName,
      payload: deepClone(log.payload),
      predicted: log.predicted,
      timestamp: log.timestamp
    }));
  }

  // Get checksum history
  getChecksums(): Map<number, string> {
    const checksums = new Map<number, string>();

    for (const [tick, snapshot] of this.snapshots) {
      const checksum = this.computeChecksum(snapshot.state);
      checksums.set(tick, checksum);
    }

    return checksums;
  }
}
```

**Usage:**

```typescript
// In Phaser DevTools or browser console
game.dev.setTick(100);  // Rewind to tick 100

// Export replay for bug reports
const replay = game.dev.exportReplay();
console.log(JSON.stringify(replay));

// Verify determinism
const checksums = game.dev.getChecksums();
console.log('State checksums:', checksums);
```

---

## Testing Utilities

### Jest Matchers

```typescript
import { expectState, expectAction } from '@martini/testing';

test('player movement', () => {
  const sim = createSimulator(gameLogic, { playerIds: ['p1'] });

  sim.dispatch('move', { dx: 5, dy: 0 }, 'p1');
  sim.tick();

  expectState(sim).toMatchObject({
    players: {
      p1: { x: 105, y: 100 }
    }
  });
});

test('action validation', () => {
  const sim = createSimulator(gameLogic, { playerIds: ['p1'] });

  // Should reject invalid input
  const result = sim.dispatch('move', { dx: 1000 }, 'p1');

  expectAction(result).toBeRejected();
  expectAction(result).toHaveReason('dx must be between -10 and 10');
});
```

### Snapshot Testing

```typescript
test('determinism', () => {
  const sim1 = createSimulator(gameLogic, { playerIds: ['p1'], seed: 42 });
  const sim2 = createSimulator(gameLogic, { playerIds: ['p1'], seed: 42 });

  // Run same actions
  for (let i = 0; i < 100; i++) {
    sim1.dispatch('move', { dx: 1, dy: 0 }, 'p1');
    sim2.dispatch('move', { dx: 1, dy: 0 }, 'p1');
    sim1.tick();
    sim2.tick();
  }

  // Should be identical
  expect(sim1.getState()).toEqual(sim2.getState());
});
```

### Stress Testing

```typescript
test('1000 actions without desync', () => {
  const sim = createSimulator(gameLogic, {
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    seed: 'stress-test'
  });

  const actions = ['move', 'jump', 'shoot', 'collect'];

  for (let i = 0; i < 1000; i++) {
    const action = actions[i % actions.length];
    const playerId = `p${(i % 4) + 1}`;

    sim.dispatch(action, { dx: 1 }, playerId);
    sim.tick();
  }

  // Verify no crashes, state is valid
  const state = sim.getState();
  expect(state.players).toHaveLength(4);
});
```

---

## Debugging Workflow

### 1. Reproduce Bug

```typescript
// User reports bug at tick 543
const replay = loadReplayFromBugReport();

const sim = createSimulator(gameLogic, { playerIds: replay.playerIds });

for (const log of replay.actions) {
  sim.dispatch(log.actionName, log.payload, log.playerId);
  sim.tick();

  if (sim.getTick() === 543) {
    console.log('Bug state:', sim.getState());
    debugger;  // Inspect in DevTools
  }
}
```

### 2. Bisect to Find Cause

```typescript
// Binary search to find which action caused issue
let low = 0, high = replay.actions.length;

while (low < high) {
  const mid = Math.floor((low + high) / 2);
  const sim = createSimulator(gameLogic, { playerIds: replay.playerIds });

  for (let i = 0; i <= mid; i++) {
    const log = replay.actions[i];
    sim.dispatch(log.actionName, log.payload, log.playerId);
    sim.tick();
  }

  if (hasBug(sim.getState())) {
    high = mid;
  } else {
    low = mid + 1;
  }
}

console.log('Bug introduced at action:', replay.actions[low]);
```

### 3. Fix and Verify

```typescript
test('bug-543 regression', () => {
  const sim = createSimulator(gameLogic, { playerIds: ['p1'] });

  // Reproduce exact scenario
  sim.dispatch('move', { dx: 5 }, 'p1');
  sim.tick(10);
  sim.dispatch('collect', { coinId: 'c1' }, 'p1');

  // Verify fix
  expect(sim.getState().players.p1.score).toBe(10);
});
```

---

## Next Steps

- **Need complete example?** → See [09-examples.md](./09-examples.md)
- **Ready to implement?** → See [IMPLEMENTATION_RECOMMENDATIONS.md](./IMPLEMENTATION_RECOMMENDATIONS.md)
