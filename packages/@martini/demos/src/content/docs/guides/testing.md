# Testing

This guide covers testing strategies for Martini multiplayer games, including unit tests, integration tests, and end-to-end testing patterns.

## Testing Philosophy

Martini's architecture makes testing straightforward:

```
┌─────────────────────────────────────┐
│  Unit Tests                         │
│  Test actions in isolation          │
│  No network, no Phaser              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Integration Tests                  │
│  Test with LocalTransport           │
│  Multi-peer scenarios                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  E2E Tests (Optional)               │
│  Test with real transports          │
│  Full Phaser integration            │
└─────────────────────────────────────┘
```

## Setup

### Install Testing Dependencies

```bash
pnpm add -D vitest @vitest/ui happy-dom
# or
npm install --save-dev vitest @vitest/ui happy-dom
```

### Configure Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/node_modules/**']
    }
  }
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Unit Testing Actions

### Basic Action Test

```typescript
import { describe, it, expect } from 'vitest';
import { SeededRandom } from '@martini/core';
import { game } from './game';

describe('Player Movement', () => {
  it('should move player to new position', () => {
    // Setup initial state
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    // Apply action
    game.actions.move.apply(state, {
      playerId: 'p1',
      targetId: 'p1',
      tick: 0,
      emit: () => {},
      random: new SeededRandom(12345)
    }, { x: 200, y: 300 });

    // Assert state changed
    expect(state.players.p1.x).toBe(200);
    expect(state.players.p1.y).toBe(300);
  });

  it('should not move player beyond bounds', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    game.actions.move.apply(state, {
      playerId: 'p1',
      targetId: 'p1',
      tick: 0,
      emit: () => {},
      random: new SeededRandom(12345)
    }, { x: 1000, y: 1000 }); // Out of bounds

    // Should clamp to world bounds
    expect(state.players.p1.x).toBeLessThanOrEqual(800);
    expect(state.players.p1.y).toBeLessThanOrEqual(600);
  });
});
```

### Testing with Mocked Context

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Combat Actions', () => {
  it('should emit event when player takes damage', () => {
    const state = game.setup({
      playerIds: ['p1', 'p2'],
      random: new SeededRandom(12345)
    });

    const emit = vi.fn();

    game.actions.takeDamage.apply(state, {
      playerId: 'p1',
      targetId: 'p2',
      tick: 0,
      emit,
      random: new SeededRandom(12345)
    }, { amount: 25 });

    // Check state
    expect(state.players.p2.health).toBe(75);

    // Check event emitted
    expect(emit).toHaveBeenCalledWith('playerHit', {
      playerId: 'p2',
      damage: 25
    });
  });

  it('should remove player when health reaches zero', () => {
    const state = game.setup({
      playerIds: ['p1', 'p2'],
      random: new SeededRandom(12345)
    });

    state.players.p2.health = 10;

    game.actions.takeDamage.apply(state, {
      playerId: 'p1',
      targetId: 'p2',
      tick: 0,
      emit: () => {},
      random: new SeededRandom(12345)
    }, { amount: 15 });

    expect(state.players.p2).toBeUndefined();
  });
});
```

### Testing Determinism

```typescript
describe('Seeded Random', () => {
  it('should produce same results with same seed', () => {
    const state1 = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    const state2 = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    // Both should spawn at same position
    expect(state1.players.p1.x).toBe(state2.players.p1.x);
    expect(state1.players.p1.y).toBe(state2.players.p1.y);
  });

  it('should use context.random in actions', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    const random1 = new SeededRandom(99999);
    const random2 = new SeededRandom(99999);

    // Apply same action with same seed
    game.actions.spawnEnemy.apply(state, {
      playerId: 'p1',
      targetId: 'p1',
      tick: 0,
      emit: () => {},
      random: random1
    }, {});

    const enemy1 = state.enemies['enemy-0'];

    // Reset state and apply again
    const state2 = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    game.actions.spawnEnemy.apply(state2, {
      playerId: 'p1',
      targetId: 'p1',
      tick: 0,
      emit: () => {},
      random: random2
    }, {});

    const enemy2 = state2.enemies['enemy-0'];

    // Should spawn at same location
    expect(enemy1.x).toBe(enemy2.x);
    expect(enemy1.y).toBe(enemy2.y);
  });
});
```

### Testing Player Lifecycle

```typescript
describe('Player Lifecycle', () => {
  it('should add player on join', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    expect(state.players.p1).toBeDefined();
    expect(state.players.p1).toHaveProperty('x');
    expect(state.players.p1).toHaveProperty('y');
    expect(state.players.p1).toHaveProperty('health');
  });

  it('should remove player on leave', () => {
    const state = game.setup({
      playerIds: ['p1', 'p2'],
      random: new SeededRandom(12345)
    });

    game.onPlayerLeave?.(state, 'p2');

    expect(state.players.p1).toBeDefined();
    expect(state.players.p2).toBeUndefined();
  });

  it('should clean up player-specific state on leave', () => {
    const state = game.setup({
      playerIds: ['p1', 'p2'],
      random: new SeededRandom(12345)
    });

    // Create projectiles owned by p2
    state.projectiles = [
      { id: 'proj1', ownerId: 'p1', x: 100, y: 100 },
      { id: 'proj2', ownerId: 'p2', x: 200, y: 200 },
      { id: 'proj3', ownerId: 'p2', x: 300, y: 300 }
    ];

    game.onPlayerLeave?.(state, 'p2');

    // P2's projectiles should be removed
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].ownerId).toBe('p1');
  });
});
```

## Integration Testing

### Testing with LocalTransport

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
import { game } from './game';

describe('Multiplayer Integration', () => {
  let hostTransport: LocalTransport;
  let clientTransport: LocalTransport;
  let hostRuntime: GameRuntime;
  let clientRuntime: GameRuntime;

  beforeEach(() => {
    const roomId = `test-room-${Date.now()}`;

    hostTransport = new LocalTransport({
      roomId,
      isHost: true,
      playerId: 'host'
    });

    clientTransport = new LocalTransport({
      roomId,
      isHost: false,
      playerId: 'client'
    });

    hostRuntime = new GameRuntime(game, hostTransport, {
      isHost: true,
      playerIds: ['host', 'client']
    });

    clientRuntime = new GameRuntime(game, clientTransport, {
      isHost: false,
      playerIds: ['host', 'client']
    });
  });

  afterEach(() => {
    hostRuntime.destroy();
    clientRuntime.destroy();
  });

  it('should sync state from host to client', async () => {
    // Host submits action
    hostRuntime.submitAction('move', { x: 150, y: 250 }, 'host');

    // Wait for sync
    await waitForSync();

    // Client should have same state
    const hostState = hostRuntime.getState();
    const clientState = clientRuntime.getState();

    expect(clientState.players.host.x).toBe(150);
    expect(clientState.players.host.y).toBe(250);
    expect(clientState.players.host.x).toBe(hostState.players.host.x);
    expect(clientState.players.host.y).toBe(hostState.players.host.y);
  });

  it('should handle client actions', async () => {
    // Client submits action
    clientRuntime.submitAction('move', { x: 200, y: 300 }, 'client');

    await waitForSync();

    // Host should process client action
    const hostState = hostRuntime.getState();
    expect(hostState.players.client.x).toBe(200);
    expect(hostState.players.client.y).toBe(300);

    // Client should see updated state
    const clientState = clientRuntime.getState();
    expect(clientState.players.client.x).toBe(200);
  });

  it('should broadcast events to all peers', async () => {
    const hostEvents: any[] = [];
    const clientEvents: any[] = [];

    hostRuntime.onEvent('playerHit', (senderId, payload) => {
      hostEvents.push({ senderId, payload });
    });

    clientRuntime.onEvent('playerHit', (senderId, payload) => {
      clientEvents.push({ senderId, payload });
    });

    // Trigger event
    hostRuntime.submitAction('takeDamage', { amount: 25 }, 'client');

    await waitForSync();

    // Both should receive event
    expect(hostEvents.length).toBeGreaterThan(0);
    expect(clientEvents.length).toBeGreaterThan(0);
    expect(hostEvents[0].payload.damage).toBe(25);
    expect(clientEvents[0].payload.damage).toBe(25);
  });
});

// Helper function
function waitForSync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Testing Multi-Player Scenarios

```typescript
describe('Multi-Player Scenarios', () => {
  it('should handle 4 players', async () => {
    const roomId = `test-room-${Date.now()}`;

    const transports = [
      new LocalTransport({ roomId, isHost: true, playerId: 'p1' }),
      new LocalTransport({ roomId, isHost: false, playerId: 'p2' }),
      new LocalTransport({ roomId, isHost: false, playerId: 'p3' }),
      new LocalTransport({ roomId, isHost: false, playerId: 'p4' })
    ];

    const runtimes = transports.map((transport, index) =>
      new GameRuntime(game, transport, {
        isHost: index === 0,
        playerIds: ['p1', 'p2', 'p3', 'p4']
      })
    );

    // Each player moves
    runtimes[0].submitAction('move', { x: 100, y: 100 }, 'p1');
    runtimes[1].submitAction('move', { x: 200, y: 200 }, 'p2');
    runtimes[2].submitAction('move', { x: 300, y: 300 }, 'p3');
    runtimes[3].submitAction('move', { x: 400, y: 400 }, 'p4');

    await waitForSync();

    // All runtimes should have same state
    const states = runtimes.map(r => r.getState());

    for (let i = 1; i < states.length; i++) {
      expect(states[i].players.p1).toEqual(states[0].players.p1);
      expect(states[i].players.p2).toEqual(states[0].players.p2);
      expect(states[i].players.p3).toEqual(states[0].players.p3);
      expect(states[i].players.p4).toEqual(states[0].players.p4);
    }

    // Cleanup
    runtimes.forEach(r => r.destroy());
  });
});
```

### Testing Late Joiners

```typescript
it('should sync state to late joiner', async () => {
  const roomId = `test-room-${Date.now()}`;

  // Start with 2 players
  const hostTransport = new LocalTransport({
    roomId,
    isHost: true,
    playerId: 'host'
  });

  const hostRuntime = new GameRuntime(game, hostTransport, {
    isHost: true,
    playerIds: ['host']
  });

  // Host makes changes
  hostRuntime.submitAction('move', { x: 300, y: 400 }, 'host');
  hostRuntime.submitAction('shoot', { angle: Math.PI / 4 });

  await waitForSync();

  // Late joiner connects
  const lateTransport = new LocalTransport({
    roomId,
    isHost: false,
    playerId: 'late'
  });

  // Simulate player join
  hostRuntime.submitAction('__playerJoin', { playerId: 'late' });

  await waitForSync();

  const lateRuntime = new GameRuntime(game, lateTransport, {
    isHost: false,
    playerIds: ['host', 'late']
  });

  await waitForSync();

  // Late joiner should receive current state
  const lateState = lateRuntime.getState();
  const hostState = hostRuntime.getState();

  expect(lateState.players.host).toEqual(hostState.players.host);

  // Cleanup
  hostRuntime.destroy();
  lateRuntime.destroy();
});
```

## Testing Helpers

### Mock Context Builder

```typescript
import { SeededRandom } from '@martini/core';
import type { ActionContext } from '@martini/core';

export function createMockContext(
  playerId: string = 'p1',
  targetId?: string,
  seed: number = 12345
): ActionContext {
  const events: Array<{ name: string; payload: any }> = [];

  return {
    playerId,
    targetId: targetId || playerId,
    tick: 0,
    random: new SeededRandom(seed),
    emit: (name: string, payload?: any) => {
      events.push({ name, payload });
    },
    getEvents: () => events // Helper for tests
  } as any;
}

// Usage
it('should emit correct events', () => {
  const state = game.setup({ playerIds: ['p1'], random: new SeededRandom(12345) });
  const context = createMockContext('p1');

  game.actions.shoot.apply(state, context, { angle: 0 });

  const events = (context as any).getEvents();
  expect(events).toHaveLength(1);
  expect(events[0].name).toBe('projectileSpawned');
});
```

### State Snapshot Matcher

```typescript
import { expect } from 'vitest';

// Custom matcher for comparing states
expect.extend({
  toHaveSamePositions(received: any, expected: any) {
    const pass =
      Math.abs(received.x - expected.x) < 0.01 &&
      Math.abs(received.y - expected.y) < 0.01;

    return {
      pass,
      message: () =>
        pass
          ? `Expected positions not to match`
          : `Expected (${received.x}, ${received.y}) to equal (${expected.x}, ${expected.y})`
    };
  }
});

// Usage
it('should move to target position', () => {
  const state = game.setup({ playerIds: ['p1'], random: new SeededRandom(12345) });
  game.actions.move.apply(state, createMockContext('p1'), { x: 100, y: 200 });

  expect(state.players.p1).toHaveSamePositions({ x: 100, y: 200 });
});
```

## Performance Testing

### Benchmarking Actions

```typescript
import { describe, it, expect } from 'vitest';

describe('Performance', () => {
  it('should process 1000 actions under 100ms', () => {
    const state = game.setup({
      playerIds: ['p1'],
      random: new SeededRandom(12345)
    });

    const context = createMockContext('p1');
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      game.actions.move.apply(state, context, {
        x: Math.random() * 800,
        y: Math.random() * 600
      });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle large state efficiently', () => {
    const state = game.setup({
      playerIds: Array.from({ length: 100 }, (_, i) => `p${i}`),
      random: new SeededRandom(12345)
    });

    const context = createMockContext('p1');
    const start = performance.now();

    game.actions.tick.apply(state, context, { delta: 16 });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // 50ms for 100 players
  });
});
```

## Continuous Integration

### GitHub Actions Example

```text
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run coverage
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Best Practices

### 1. Test Business Logic, Not Implementation

```typescript
// BAD - Testing implementation details
it('should call movePlayer function', () => {
  const spy = vi.spyOn(game.actions.move, 'apply');
  game.actions.move.apply(state, context, { x: 100, y: 100 });
  expect(spy).toHaveBeenCalled();
});

// GOOD - Testing behavior
it('should update player position', () => {
  game.actions.move.apply(state, context, { x: 100, y: 100 });
  expect(state.players.p1.x).toBe(100);
  expect(state.players.p1.y).toBe(100);
});
```

### 2. Use Descriptive Test Names

```typescript
// BAD
it('test 1', () => { /* ... */ });
it('works', () => { /* ... */ });

// GOOD
it('should move player to target position', () => { /* ... */ });
it('should clamp player position to world bounds', () => { /* ... */ });
it('should emit event when player collects coin', () => { /* ... */ });
```

### 3. One Assertion Per Test (When Practical)

```typescript
// GOOD - Focused tests
it('should update x position', () => {
  game.actions.move.apply(state, context, { x: 100, y: 200 });
  expect(state.players.p1.x).toBe(100);
});

it('should update y position', () => {
  game.actions.move.apply(state, context, { x: 100, y: 200 });
  expect(state.players.p1.y).toBe(200);
});

// ACCEPTABLE - Related assertions
it('should update player position', () => {
  game.actions.move.apply(state, context, { x: 100, y: 200 });
  expect(state.players.p1.x).toBe(100);
  expect(state.players.p1.y).toBe(200);
});
```

### 4. Clean Up Resources

```typescript
describe('Game Runtime', () => {
  let runtime: GameRuntime;

  beforeEach(() => {
    const transport = new LocalTransport({
      roomId: 'test',
      isHost: true
    });
    runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: ['p1']
    });
  });

  afterEach(() => {
    runtime.destroy(); // Important!
  });

  it('should work', () => {
    // Test using runtime
  });
});
```

## See Also

- [Best Practices](./best-practices.md) - General development patterns
- [Core API - GameRuntime](../api/core/game-runtime.md) - GameRuntime reference
- [Transport - Local](../api/transports/local.md) - LocalTransport for testing
