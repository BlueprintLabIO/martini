# @martini/transport-colyseus

Colyseus room adapter for Martini multiplayer SDK. Use Colyseus for matchmaking, rooms, and server infrastructure while using Martini's declarative API for game logic.

## Why Use This?

**Best of Both Worlds:**
- ✅ **Colyseus** handles rooms, matchmaking, and server management
- ✅ **Martini** handles game logic with a clean, declarative API

**Perfect For:**
- Web games that need matchmaking/lobbies
- Server-authoritative multiplayer games
- Production deployments with managed infrastructure
- Teams familiar with Colyseus who want cleaner game logic code

## Installation

```bash
pnpm add @martini/core @martini/transport-colyseus colyseus.js
```

## Quick Start

### Client-Side

```typescript
import { Client } from 'colyseus.js';
import { defineGame, GameRuntime } from '@martini/core';
import { ColyseusTransport } from '@martini/transport-colyseus';

// Define your game logic with Martini
const game = defineGame({
  minPlayers: 2,
  maxPlayers: 4,
  setup: () => ({
    players: {},
    score: {}
  }),
  actions: {
    move: (state, playerId, input) => {
      state.players[playerId] = input.position;
    },
    updateScore: (state, playerId, points) => {
      state.score[playerId] = (state.score[playerId] || 0) + points;
    }
  }
});

// Connect to Colyseus
const client = new Client('ws://localhost:2567');
const room = await client.joinOrCreate('my_game_room');

// Create Martini transport from Colyseus room
const transport = new ColyseusTransport(room);

// Create game runtime
const runtime = new GameRuntime(game, transport, {
  isHost: room.sessionId === '...' // Determine host via Colyseus
});

// Use Martini's clean API
runtime.submitAction('move', { position: { x: 10, y: 20 } });
```

### Server-Side (Colyseus)

Create a Colyseus room that relays Martini messages:

```typescript
import { Room, Client } from '@colyseus/core';

export class MartiniGameRoom extends Room {
  private hostId: string | null = null;

  onCreate(options: any) {
    console.log('MartiniGameRoom created');

    // Handle Martini messages
    this.onMessage('martini', (client, message) => {
      // Relay to all clients or targeted client
      if (message.targetId) {
        const targetClient = Array.from(this.clients).find(
          c => c.sessionId === message.targetId
        );
        targetClient?.send('martini', message);
      } else {
        // Broadcast to all except sender
        this.broadcast('martini', message, { except: client });
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined');

    // Elect first player as host
    if (!this.hostId) {
      this.hostId = client.sessionId;
      this.broadcast('martini', {
        type: 'host_announce',
        hostId: this.hostId,
        senderId: 'server'
      });
    }

    // Notify all clients of new player
    this.broadcast('martini', {
      type: 'player_join',
      payload: { playerId: client.sessionId },
      senderId: 'server'
    });

    // Send current peers list to new player
    const peers = Array.from(this.clients).map(c => c.sessionId);
    client.send('martini', {
      type: 'peers_list',
      payload: { peers },
      senderId: 'server'
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left');

    // Notify remaining clients
    this.broadcast('martini', {
      type: 'player_leave',
      payload: { playerId: client.sessionId },
      senderId: 'server'
    });

    // Elect new host if needed
    if (client.sessionId === this.hostId && this.clients.length > 0) {
      this.hostId = Array.from(this.clients)[0].sessionId;
      this.broadcast('martini', {
        type: 'host_announce',
        hostId: this.hostId,
        senderId: 'server'
      });
    }
  }
}
```

## API Reference

### `new ColyseusTransport(room: Room)`

Create a Martini transport from a Colyseus room.

**Parameters:**
- `room`: A connected Colyseus room instance

**Example:**
```typescript
const room = await client.joinOrCreate('game_room');
const transport = new ColyseusTransport(room);
```

### Transport Methods

All standard Martini Transport methods are supported:

#### `send(message: WireMessage, targetId?: string): void`

Send a message through the Colyseus room.

```typescript
transport.send({
  type: 'action',
  payload: { action: 'move', x: 10, y: 20 }
});

// Send to specific player
transport.send({
  type: 'state_sync',
  payload: { state: {...} }
}, 'player-123');
```

#### `onMessage(handler: (message, senderId) => void): () => void`

Listen for messages from other players.

```typescript
const unsubscribe = transport.onMessage((message, senderId) => {
  console.log('Received message from:', senderId, message);
});

// Stop listening
unsubscribe();
```

#### `onPeerJoin(handler: (peerId: string) => void): () => void`

Listen for players joining.

```typescript
transport.onPeerJoin((peerId) => {
  console.log('Player joined:', peerId);
});
```

#### `onPeerLeave(handler: (peerId: string) => void): () => void`

Listen for players leaving.

```typescript
transport.onPeerLeave((peerId) => {
  console.log('Player left:', peerId);
});
```

#### `getPlayerId(): string`

Get your player ID (same as `room.sessionId`).

```typescript
const myId = transport.getPlayerId();
```

#### `getPeerIds(): string[]`

Get list of all connected players (excluding yourself).

```typescript
const peers = transport.getPeerIds();
console.log('Connected players:', peers);
```

#### `isHost(): boolean`

Check if you are the current host.

```typescript
if (transport.isHost()) {
  console.log('I am the host');
}
```

### Additional Methods

#### `onError(handler: (error: Error) => void): () => void`

Listen for connection errors.

```typescript
transport.onError((error) => {
  console.error('Transport error:', error);
});
```

#### `disconnect(): void`

Leave the Colyseus room and clean up.

```typescript
transport.disconnect();
```

#### `getRoom(): Room`

Get the underlying Colyseus room (for advanced use cases).

```typescript
const room = transport.getRoom();
console.log('Room ID:', room.id);
console.log('Room state:', room.state);
```

## Message Protocol

The transport uses a `'martini'` message type on the Colyseus room. All Martini messages are wrapped in this format:

```typescript
{
  type: 'action' | 'state_sync' | 'player_join' | 'player_leave' | 'host_announce' | ...,
  payload?: any,
  senderId: string,
  targetId?: string  // For targeted messages
}
```

### Control Messages

The server should send these control messages:

#### `player_join`
```typescript
{
  type: 'player_join',
  payload: { playerId: string },
  senderId: 'server'
}
```

#### `player_leave`
```typescript
{
  type: 'player_leave',
  payload: { playerId: string },
  senderId: 'server'
}
```

#### `host_announce`
```typescript
{
  type: 'host_announce',
  hostId: string,
  senderId: 'server'
}
```

#### `peers_list`
```typescript
{
  type: 'peers_list',
  payload: { peers: string[] },
  senderId: 'server'
}
```

## Complete Example

See [examples/colyseus-game](../../examples/colyseus-game) for a full working example with:
- Colyseus server setup
- Client-side game logic with Martini
- Matchmaking UI
- Host migration handling

## Comparison to Other Approaches

### Pure Colyseus
```typescript
// ❌ Imperative, verbose
room.onMessage('move', (message) => {
  const player = players.get(message.playerId);
  player.x = message.x;
  player.y = message.y;
  // Sync to other clients...
  // Handle edge cases...
  // Validate input...
});
```

### Martini + Colyseus
```typescript
// ✅ Declarative, concise
const game = defineGame({
  actions: {
    move: (state, playerId, input) => {
      state.players[playerId] = input.position;
    }
  }
});
```

## Best Practices

1. **Use Colyseus for Infrastructure**
   - Room management
   - Matchmaking
   - Persistence (via Colyseus state)
   - Authentication

2. **Use Martini for Game Logic**
   - Player actions
   - Game state updates
   - Collision detection
   - Game rules

3. **Host Election**
   - Let Colyseus determine the host
   - Send `host_announce` messages
   - Martini will handle host-authoritative logic

4. **Error Handling**
   - Listen to both Colyseus and Martini errors
   - Handle reconnection via Colyseus
   - Martini will auto-resume game state

## Troubleshooting

### "Messages not being received"
- Ensure your Colyseus server relays `'martini'` messages
- Check that `onMessage('martini', ...)` is set up on the server
- Verify the message format includes `senderId`

### "Host is always false"
- Server must send `host_announce` messages
- Check that `hostId` matches a client's `sessionId`

### "Peers list is empty"
- Server should send `player_join`/`player_leave` messages
- Or send a `peers_list` message on join

### "TypeScript errors"
- Ensure `colyseus.js` is installed
- Check that types are imported correctly: `import type { Room } from 'colyseus.js'`

## See Also

- [Martini Core Documentation](../core/README.md)
- [Colyseus Documentation](https://docs.colyseus.io/)
- [Example Projects](../../examples)
- [Migration Guide](./docs/migration.md)

## License

MIT
