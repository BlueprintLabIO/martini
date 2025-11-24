---
title: Local Testing
description: Testing multiplayer games locally during development
section: guides
subsection: networking
order: 3
---

# Local Testing

The `LocalTransport` enables testing multiplayer functionality on a single machine without any server setup.

## Setup

```bash
pnpm add @martini-kit/transport-local
```

```typescript
import { LocalTransport } from '@martini-kit/transport-local';
import { GameRuntime } from '@martini-kit/core';
import { game } from './game';

// Create local transport
const transport = new LocalTransport({
  roomId: 'test-room',
  isHost: true // First tab is host
});

const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()]
});
```

## Multi-Tab Testing

Open your game in multiple browser tabs to simulate multiplayer:

1. **Tab 1** (Host): Opens first, becomes the host
2. **Tab 2** (Client): Opens second, connects as client
3. **Tab 3** (Client): Opens third, connects as client

All tabs share the same `roomId` and communicate via `BroadcastChannel` API.

## Room Management

```typescript
// Use URL parameter for room ID
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || 'default-room';

const transport = new LocalTransport({
  roomId,
  isHost: !params.has('room') // First to create room is host
});

// Share URL with room parameter
console.log(`Open in another tab: ${window.location.origin}?room=${roomId}`);
```

## Testing Workflow

### 1. Development Server

```bash
npm run dev
```

### 2. Open Multiple Tabs

- **Tab 1**: `http://localhost:5173` (host)
- **Tab 2**: `http://localhost:5173` (client)
- **Tab 3**: `http://localhost:5173` (client)

### 3. Test Scenarios

- Player join/leave
- State synchronization
- Action submission
- Lag simulation (optional)

## Debugging

### Enable Debug Logging

```typescript
import { Logger } from '@martini-kit/core';

Logger.setLevel('debug');

const transport = new LocalTransport({
  roomId: 'test',
  isHost: true
});

// See detailed transport logs
```

### Inspect State

```typescript
// Log state changes
runtime.onChange((state) => {
  console.log('State updated:', state);
});

// Check if host
console.log('Is host:', runtime.isHost());

// Get current state
console.log('Current state:', runtime.getState());
```

## Limitations

- ❌ Only works on same machine
- ❌ Doesn't test real network conditions
- ❌ No latency simulation
- ❌ Not for production use

## CI/CD Testing

LocalTransport is perfect for automated tests:

```typescript
// test.spec.ts
import { describe, it, expect } from 'vitest';
import { LocalTransport } from '@martini-kit/transport-local';
import { GameRuntime } from '@martini-kit/core';
import { game } from '../game';

describe('Multiplayer game', () => {
  it('should sync state between host and client', async () => {
    // Create host
    const hostTransport = new LocalTransport({
      roomId: 'test',
      isHost: true
    });
    
    const hostRuntime = new GameRuntime(game, hostTransport, {
      isHost: true,
      playerIds: ['host']
    });
    
    // Create client
    const clientTransport = new LocalTransport({
      roomId: 'test',
      isHost: false
    });
    
    const clientRuntime = new GameRuntime(game, clientTransport, {
      isHost: false,
      playerIds: ['host', 'client']
    });
    
    // Submit action on host
    hostRuntime.submitAction('move', { x: 100, y: 200 });
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify client received update
    const clientState = clientRuntime.getState();
    expect(clientState.players.host.x).toBe(100);
  });
});
```

## Next Steps

- **[Choosing a Transport →](./choosing-transport)** - Production options
- **[Production Deployment →](./production)** - Deploy your game
- **[Testing Guide →](/docs/guides/testing)** - Comprehensive testing strategies
