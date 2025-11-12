# @martini/transport-trystero

Trystero P2P WebRTC transport adapter for `@martini/multiplayer`.

Enables serverless peer-to-peer multiplayer using Trystero with MQTT or Supabase signaling.

## Installation

```bash
pnpm add @martini/transport-trystero @martini/multiplayer trystero
```

## Quick Start

```typescript
import { TrysteroTransport } from '@martini/transport-trystero';
import { createMultiplayerRuntime } from '@martini/multiplayer';

// Create P2P transport
const transport = new TrysteroTransport({
  roomId: 'game-room-123',
  appId: 'my-game'
});

// Create multiplayer runtime
const runtime = createMultiplayerRuntime(gameLogic, transport, {
  isHost: transport.isHost()
});
```

## Features

- ✅ Zero server costs (fully P2P via WebRTC)
- ✅ Automatic host election (first peer becomes host)
- ✅ Host migration on disconnect
- ✅ Connection state management
- ✅ Full Transport interface compliance

## API

See [Transport Interface documentation](../multiplayer/docs/martini-sdk-v1/04-transport-interface.md) for full API details.

## Testing

```bash
pnpm test
pnpm test:coverage
```
