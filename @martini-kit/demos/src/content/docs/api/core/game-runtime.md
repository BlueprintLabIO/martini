---
title: GameRuntime
description: Host-authoritative game state manager
---

# GameRuntime

`GameRuntime` is the central engine that manages game state, processes actions, and synchronizes state across all connected players. It implements a **host-authoritative** architecture where one player (the host) runs the authoritative game logic, and all other players (clients) mirror that state.

## API Reference

```typescript
class GameRuntime<TState> {
  constructor(
    game: GameDefinition<TState>,
    transport: Transport,
    config: GameRuntimeConfig
  );

  // State access
  getState(): TState;
  getMyPlayerId(): string;
  isHost(): boolean;

  // Action submission
  submitAction(name: string, input?: any, targetId?: string): void;

  // Event system
  broadcastEvent(eventName: string, payload: any): void;
  onEvent(eventName: string, callback: EventCallback): Unsubscribe;

  // State change listening
  onChange(callback: (state: TState) => void): Unsubscribe;

  // Cleanup
  destroy(): void;
}
```

### GameRuntimeConfig

```typescript
interface GameRuntimeConfig {
  isHost: boolean;              // Is this the authoritative host?
  playerIds: string[];          // Initial list of player IDs
  seed?: number;                // Random seed (optional, auto-generated)
  syncInterval?: number;        // State sync rate in ms (default: 50ms = 20 FPS)
  strict?: boolean;             // Throw errors instead of warnings (dev mode)
  strictPlayerInit?: boolean;   // Validate player initialization (dev mode)
  playersKey?: string;          // State key for players (default: 'players')
}
```

### Type Definitions

```typescript
type StateChangeCallback<TState> = (state: TState) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;
type Unsubscribe = () => void;
```

## Constructor

Creates a new game runtime instance.

```typescript
const runtime = new GameRuntime(game, transport, config);
```

**Parameters:**
- `game` - Game definition created with [defineGame](./define-game)
- `transport` - [Transport](./transport) instance for networking
- `config` - Runtime configuration

**What happens during construction:**

1. **Initialize state** - Calls `game.setup()` with initial player IDs
2. **Setup transport listeners** - Listens for messages, peer join/leave
3. **Start sync loop** - If host, starts broadcasting state updates every `syncInterval` ms
4. **Validate setup** - In dev mode, validates that all players were initialized

**Example:**
```typescript
import { defineGame, GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100 }])
    )
  })
});

const transport = new LocalTransport({
  roomId: 'my-game',
  isHost: true
});

const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: [transport.getPlayerId()],
  syncInterval: 50  // 20 FPS (default)
});
```

## Methods

### getState()

Returns the current game state (read-only, but mutable).

```typescript
getState(): TState
```

**Returns:** The current state object

:::warning[State is Mutable]
The returned state object is the **actual internal state**, not a copy. You should only read from it, not modify it. Use `submitAction()` to make changes.
:::

**Example:**
```typescript
const state = runtime.getState();
console.log('Player positions:', state.players);

// ✅ OK - reading
const myPlayer = state.players[myId];

// ❌ BAD - direct mutation (bypasses sync!)
state.players[myId].x = 200;

// ✅ GOOD - use actions
runtime.submitAction('move', { x: 200, y: 100 });
```

### getMyPlayerId()

Returns the player ID for this client.

```typescript
getMyPlayerId(): string
```

**Returns:** Unique player ID from the transport layer

**Example:**
```typescript
const myId = runtime.getMyPlayerId();
const myPlayer = runtime.getState().players[myId];

if (myPlayer) {
  console.log('My position:', myPlayer.x, myPlayer.y);
}
```

### isHost()

Checks if this runtime is the authoritative host.

```typescript
isHost(): boolean
```

**Returns:** `true` if host, `false` if client

**Example:**
```typescript
if (runtime.isHost()) {
  console.log('I am the host - running authoritative game logic');
} else {
  console.log('I am a client - mirroring state from host');
}
```

### submitAction()

Submits an action to modify game state.

```typescript
submitAction(name: string, input?: any, targetId?: string): void
```

**Parameters:**
- `name` - Action name (must exist in `game.actions`)
- `input` - Action payload (optional)
- `targetId` - Target player ID (optional, defaults to caller's ID)

**How it works:**

1. **Host:** Applies action immediately to local state, then broadcasts to clients
2. **Client:** Sends action to host, which applies it and broadcasts updated state
3. All peers eventually converge to the same state

**Example:**
```typescript
// Move my own player
runtime.submitAction('move', { x: 200, y: 300 });

// Move my own player (explicit)
runtime.submitAction('move', { x: 200, y: 300 }, runtime.getMyPlayerId());

// Affect another player (e.g., shooting player-2)
runtime.submitAction('takeDamage', { amount: 10 }, 'player-2');

// Action with no input
runtime.submitAction('jump');
```

**Error handling:**
```typescript
// ❌ Unknown action
runtime.submitAction('fly');
// Error: Action "fly" not found.
// Available actions: move, jump, shoot
// Did you mean "fly"?

// ❌ No actions defined
runtime.submitAction('move');
// Error: No actions defined in game
```

### onChange()

Listens for state changes.

```typescript
onChange(callback: (state: TState) => void): Unsubscribe
```

**Parameters:**
- `callback` - Function called whenever state changes

**Returns:** Unsubscribe function

**When callback is called:**
- After any action is applied
- After receiving state sync from host (clients only)
- After sprite data is updated (when using Phaser adapter)

**Example:**
```typescript
const unsubscribe = runtime.onChange((state) => {
  console.log('State updated:', state);
  updateUI(state);
});

// Later: stop listening
unsubscribe();
```

**Phaser integration:**
```typescript
export class GameScene extends Phaser.Scene {
  create() {
    this.runtime = new GameRuntime(game, transport, config);

    // Update sprites when state changes
    this.runtime.onChange((state) => {
      for (const [id, player] of Object.entries(state.players)) {
        const sprite = this.playerSprites.get(id);
        if (sprite) {
          sprite.x = player.x;
          sprite.y = player.y;
        }
      }
    });

    // Cleanup on scene shutdown
    this.events.once('shutdown', () => {
      this.runtime.destroy();
    });
  }
}
```

### broadcastEvent()

Broadcasts a custom event to all players.

```typescript
broadcastEvent(eventName: string, payload: any): void
```

**Use cases:**
- Chat messages
- Sound effects
- Visual effects
- Notifications
- Non-state events

:::tip[Events vs State]
Use **events** for transient things (sounds, effects) and **state** for persistent things (positions, health).
:::

**Example:**
```typescript
// Broadcast chat message
runtime.broadcastEvent('chat', {
  message: 'Hello world!',
  sender: runtime.getMyPlayerId()
});

// Broadcast sound effect trigger
runtime.broadcastEvent('playSound', {
  soundId: 'explosion',
  x: 400,
  y: 300
});
```

### onEvent()

Listens for custom events.

```typescript
onEvent(eventName: string, callback: EventCallback): Unsubscribe
```

**Parameters:**
- `eventName` - Event name to listen for
- `callback` - `(senderId, eventName, payload) => void`

**Returns:** Unsubscribe function

**Example:**
```typescript
// Listen for chat messages
const unsubscribe = runtime.onEvent('chat', (senderId, eventName, payload) => {
  console.log(`${senderId}: ${payload.message}`);
  addChatMessage(payload.message, senderId);
});

// Listen for sound effects
runtime.onEvent('playSound', (senderId, eventName, payload) => {
  this.sound.play(payload.soundId, {
    volume: 0.5
  });
});

// Later: stop listening
unsubscribe();
```

### destroy()

Cleans up the runtime and stops all background processes.

```typescript
destroy(): void
```

**What it does:**
- Stops state sync interval (host)
- Unsubscribes from transport events
- Clears all callbacks

**When to call:**
- When changing scenes (Phaser)
- When leaving a game
- When cleaning up on unmount (React/Svelte)

**Example:**
```typescript
// Phaser scene cleanup
export class GameScene extends Phaser.Scene {
  create() {
    this.runtime = new GameRuntime(game, transport, config);

    this.events.once('shutdown', () => {
      this.runtime.destroy();
    });
  }
}

// React cleanup
useEffect(() => {
  const runtime = new GameRuntime(game, transport, config);

  return () => {
    runtime.destroy();
  };
}, []);
```

## Configuration Options

### syncInterval

Controls how often the host broadcasts state updates to clients.

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncInterval: 50  // 20 FPS (default)
});
```

**Trade-offs:**

| Value | FPS | Latency | Bandwidth | Use Case |
|-------|-----|---------|-----------|----------|
| 16ms  | 60  | Low     | High      | Fast-paced action games |
| 33ms  | 30  | Medium  | Medium    | Most games (good balance) |
| 50ms  | 20  | Medium  | Low       | Default, works well |
| 100ms | 10  | High    | Very Low  | Slow-paced, turn-based |

### strict

Enables strict error handling (recommended for development).

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1'],
  strict: true  // Throw errors instead of warnings
});
```

**With strict mode:**
- Unknown actions throw errors
- Invalid state transitions throw errors
- Better DX with clear error messages

### strictPlayerInit

Validates that all initial players are initialized in `setup()`.

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1', 'p2'],
  strictPlayerInit: true
});
```

**Catches bugs like:**
```typescript
// ❌ Bug: setup() doesn't create players
const game = defineGame({
  setup: () => ({
    players: {},  // Empty! But we have 2 playerIds
    score: 0
  })
});

// With strictPlayerInit: true
// Error: Players p1, p2 not initialized in setup()
```

## Lifecycle

### Initialization Flow

1. `new GameRuntime(...)` called
2. `game.setup({ playerIds, random })` called
3. Initial state created
4. Transport listeners attached
5. Sync loop started (host only)

### Action Flow (Host)

1. `runtime.submitAction('move', input)` called
2. Action applied **immediately** to local state
3. `onChange` callbacks triggered
4. Action broadcast to all clients
5. Clients receive action message and apply to their state

### Action Flow (Client)

1. `runtime.submitAction('move', input)` called
2. Action sent to host (not applied locally yet)
3. Host receives action, applies it
4. Host broadcasts updated state
5. Client receives state update, applies patches
6. `onChange` callbacks triggered

### State Sync (Host → Clients)

Every `syncInterval` ms:

1. Host generates diff between current and previous state
2. Diff converted to minimal patches
3. Patches broadcast to all clients
4. Clients apply patches to their state
5. Clients trigger `onChange` callbacks

## Best Practices

### ✅ Do

- **Call `destroy()`** - Always clean up when done
- **Use `onChange`** - For reactive updates (UI, sprites)
- **Use `onEvent`** - For transient effects (sounds, particles)
- **Check `isHost()`** - When logic should only run on host
- **Type your state** - Use `GameRuntime<YourStateType>` for autocomplete

### ❌ Don't

- **Don't mutate state directly** - Always use `submitAction()`
- **Don't store runtime in state** - It's not serializable
- **Don't create multiple runtimes** - One per game session
- **Don't forget to call `destroy()`** - Memory leaks!

## Complete Example

```typescript
import { defineGame, GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

// 1. Define game
interface GameState {
  players: Record<string, { x: number; y: number; health: number }>;
  gameStatus: 'waiting' | 'playing' | 'ended';
}

const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 400, y: 300, health: 100 }])
    ),
    gameStatus: 'waiting'
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    },

    startGame: {
      apply(state) {
        state.gameStatus = 'playing';
      }
    }
  }
});

// 2. Create transport
const transport = new LocalTransport({
  roomId: 'demo-game',
  isHost: true
});

// 3. Create runtime
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: [transport.getPlayerId()],
  syncInterval: 50,
  strict: true
});

// 4. Listen for state changes
const unsubscribe = runtime.onChange((state) => {
  console.log('State:', state);
  updateUI(state);
});

// 5. Listen for events
runtime.onEvent('chat', (senderId, _, payload) => {
  console.log(`${senderId}: ${payload.message}`);
});

// 6. Submit actions
runtime.submitAction('startGame');
runtime.submitAction('move', { x: 200, y: 300 });

// 7. Broadcast events
runtime.broadcastEvent('chat', { message: 'Hello!' });

// 8. Cleanup
// runtime.destroy();
// unsubscribe();
```

## See Also

- [defineGame](./define-game) - Defining your game
- [Transport](./transport) - Network layer
- [State Synchronization](./sync) - How state sync works
- [SeededRandom](./seeded-random) - Deterministic randomness
- [PhaserAdapter](/docs/latest/api/phaser/adapter) - Phaser integration
