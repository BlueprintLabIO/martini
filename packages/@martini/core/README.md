# @martini/multiplayer

Deterministic multiplayer game engine with client-side prediction and server authority.

## Features

- ✅ Client-side prediction (0ms input lag)
- ✅ Server authority (cheat-proof)
- ✅ Automatic rollback on misprediction
- ✅ Deterministic simulation
- ✅ Transport-agnostic (works with any network layer)
- ✅ Built-in desync detection
- ✅ Schema validation with auto-clamping

## Installation

```bash
pnpm add @martini/multiplayer
```

## Quick Start

```typescript
import { createGameLogic, createMultiplayerRuntime } from '@martini/multiplayer';

// 1. Define game logic
const gameLogic = createGameLogic({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      input: { dx: 'number', dy: 'number' },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;
        player.x += input.dx;
        player.y += input.dy;
      },
      predict: true  // Instant local feedback
    }
  }
});

// 2. Create runtime
const runtime = await createMultiplayerRuntime(gameLogic, transport, {
  isHost: true,
  playerIds: ['p1', 'p2']
});

// 3. Dispatch actions
runtime.actions.move({ dx: 5, dy: 0 });

// 4. Listen to state changes
runtime.onChange((state, meta) => {
  console.log('State updated:', state);
  console.log('Was predicted?', meta.predicted);
});
```

## Documentation

See [/docs/martini-sdk-v1](../../docs/martini-sdk-v1/README.md) for complete specification.

## Development

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Build
pnpm build
```

## Testing Philosophy

This package follows TDD (Test-Driven Development):
- Write tests first
- Implement to make tests pass
- Refactor with confidence

Target: 100% coverage for core algorithms (diff, patch, random, validation).

## License

Private - Martini Platform
