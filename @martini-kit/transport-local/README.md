# @martini-kit/transport-local

**Multiplayer without networking.**

Local transport for martini-kit that enables testing and development of multiplayer games without any network infrastructure.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/BlueprintLabIO/martini/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@martini-kit/transport-local)](https://www.npmjs.com/package/@martini-kit/transport-local)

## Features

- **Zero network setup** - Test multiplayer games instantly
- **Multiple instances** - Run multiple game instances in same process/page
- **Perfect for development** - Fast iteration without server setup
- **Perfect for demos** - Show multiplayer features without deployment
- **Deterministic** - Predictable behavior for testing

## Installation

```bash
npm install @martini-kit/transport-local @martini-kit/core
```

## Quick Start

```typescript
import { defineGame, GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

const game = defineGame({
  initialState: { count: 0 },
  actions: {
    increment: (state) => { state.count++; }
  }
});

// Create two local instances
const transport1 = new LocalTransport({ roomId: 'test-room' });
const transport2 = new LocalTransport({ roomId: 'test-room' });

const runtime1 = new GameRuntime(game, transport1, { isHost: true });
const runtime2 = new GameRuntime(game, transport2, { isHost: false });

// Connect them
await transport1.connect();
await transport2.connect();

// Dispatch action from host
runtime1.dispatchAction('increment', {});

// Both runtimes see the change!
console.log(runtime1.state.count); // 1
console.log(runtime2.state.count); // 1
```

## License

Apache-2.0 © Blueprint Lab

## Links

- [GitHub Repository](https://github.com/BlueprintLabIO/martini)
- [Report Issues](https://github.com/BlueprintLabIO/martini/issues)
- [NPM Package](https://www.npmjs.com/package/@martini-kit/transport-local)
