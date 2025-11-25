---
title: Testing
description: Testing strategies for martini-kit multiplayer games
section: guides
subsection: testing
order: 5
scope: agnostic
---

# Testing

Testing strategies for martini-kit multiplayer games, including unit tests, integration tests, and end-to-end testing patterns.

## Testing Philosophy

martini-kit's architecture makes testing straightforward:

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

## Quick Start

### Basic Action Test

```typescript
import { describe, it, expect } from 'vitest';
import { SeededRandom } from '@martini-kit/core';
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
});
```

### Integration Test with LocalTransport

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
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
    await new Promise(resolve => setTimeout(resolve, 100));

    // Client should have same state
    const hostState = hostRuntime.getState();
    const clientState = clientRuntime.getState();

    expect(clientState.players.host.x).toBe(150);
    expect(clientState.players.host.y).toBe(250);
    expect(clientState.players.host.x).toBe(hostState.players.host.x);
  });
});
```

## Best Practices

### DO ✅

- **Test business logic, not implementation** - Focus on behavior, not internal details
- **Use descriptive test names** - "should update player position" not "test 1"
- **Clean up resources** - Always destroy runtimes in `afterEach`
- **Use SeededRandom** - Ensures deterministic tests
- **Test edge cases** - Boundary conditions, empty states, invalid input

### DON'T ❌

- **Don't test implementation details** - Avoid spying on internal functions
- **Don't skip cleanup** - Memory leaks will slow down your test suite
- **Don't use Math.random()** - Use `context.random` for determinism
- **Don't write flaky tests** - If a test sometimes fails, fix it
- **Don't test framework code** - Trust that Phaser/martini-kit work

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

## See Also

- [Best Practices](/docs/latest/guides/optimization) - General development patterns
- [Core API - GameRuntime](/docs/latest/api/core/game-runtime) - GameRuntime reference
- [Transport - Local](/docs/latest/api/transports/local) - LocalTransport for testing
