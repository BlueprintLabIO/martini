# @martini/core API Reference

Complete API documentation for the `@martini/core` package.

---

## Table of Contents

- [defineGame](#definegame)
- [GameRuntime](#gameruntime)
- [Diff/Patch Utilities](#diffpatch-utilities)
- [Type Definitions](#type-definitions)

---

## defineGame

Defines a multiplayer game with host-authoritative state synchronization.

### Signature

```typescript
function defineGame(definition: GameDefinition): GameDefinition
```

### Parameters

#### `definition: GameDefinition`

```typescript
interface GameDefinition {
  /** Initial state factory (optional) */
  setup?: (context: { playerIds: string[] }) => any;

  /** Actions - only way to modify state */
  actions?: Record<string, ActionDefinition>;

  /** Called when a player joins mid-game */
  onPlayerJoin?: (state: any, playerId: string) => void;

  /** Called when a player leaves */
  onPlayerLeave?: (state: any, playerId: string) => void;
}
```

### Return Value

Returns the validated game definition.

### Example

```typescript
import { defineGame } from '@martini/core';

const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    ),
    gameState: 'waiting'
  }),

  actions: {
    move: {
      input: { x: 'number', y: 'number' },
      apply(state, playerId, input) {
        if (state.players[playerId]) {
          state.players[playerId].x = input.x;
          state.players[playerId].y = input.y;
        }
      }
    },

    score: {
      apply(state, playerId) {
        if (state.players[playerId]) {
          state.players[playerId].score += 1;
        }
      }
    }
  },

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100, score: 0 };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});
```

### setup(context)

Optional function to initialize the game state.

**Parameters:**
- `context.playerIds`: Array of initial player IDs

**Returns:** Initial state object

**Example:**
```typescript
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map(id => [id, { x: 100, y: 100 }])
  )
})
```

### actions

Dictionary of actions that can modify the game state.

**Action Definition:**
```typescript
interface ActionDefinition<TInput = any> {
  /** Input validation schema (optional, for documentation) */
  input?: any;

  /** Apply function - modifies state directly */
  apply: (state: any, playerId: string, input: TInput) => void;
}
```

**Key Points:**
- Actions are the ONLY way to modify state (besides host using `mutateState`)
- The `apply` function receives `(state, playerId, input)`
- State is mutated directly (no immutability required)
- Host applies actions immediately, clients send to host

**Example:**
```typescript
actions: {
  move: {
    input: { x: 'number', y: 'number' },
    apply(state, playerId, input) {
      state.players[playerId].x = input.x;
      state.players[playerId].y = input.y;
    }
  }
}
```

### onPlayerJoin(state, playerId)

Optional lifecycle hook called when a player joins mid-game.

**Parameters:**
- `state`: Current game state
- `playerId`: ID of the joining player

**Example:**
```typescript
onPlayerJoin(state, playerId) {
  state.players[playerId] = { x: 100, y: 100, score: 0 };
}
```

### onPlayerLeave(state, playerId)

Optional lifecycle hook called when a player disconnects.

**Parameters:**
- `state`: Current game state
- `playerId`: ID of the leaving player

**Example:**
```typescript
onPlayerLeave(state, playerId) {
  delete state.players[playerId];
}
```

---

## GameRuntime

The runtime that manages game state, actions, and synchronization.

### Constructor

```typescript
new GameRuntime(
  gameDef: GameDefinition,
  transport: Transport,
  config: RuntimeConfig
)
```

**Parameters:**
- `gameDef`: Game definition from `defineGame()`
- `transport`: Transport implementation (e.g., `TrysteroTransport`)
- `config`: Runtime configuration

**RuntimeConfig:**
```typescript
interface RuntimeConfig {
  /** Is this instance the host (runs authoritative simulation) */
  isHost: boolean;

  /** Initial player IDs (optional, can be added dynamically) */
  playerIds?: string[];

  /** How often to sync state in ms - default 50ms (20 FPS) */
  syncInterval?: number;
}
```

**Example:**
```typescript
import { GameRuntime } from '@martini/core';
import { TrysteroTransport } from '@martini/transport-trystero';

const transport = new TrysteroTransport({ roomId: 'room-123', isHost: true });

const runtime = new GameRuntime(gameLogic, transport, {
  isHost: true,
  playerIds: ['p1'],
  syncInterval: 50 // 20 FPS sync
});
```

### Methods

#### `getState(): any`

Returns the current game state.

**Returns:** Current state object (read-only, do not mutate directly)

**Example:**
```typescript
const state = runtime.getState();
console.log(state.players.p1.x); // Read state
```

#### `submitAction(actionName: string, input: any): void`

Execute an action.

- **Host:** Applies immediately and broadcasts to clients
- **Client:** Sends to host (does not apply locally)

**Parameters:**
- `actionName`: Name of the action (defined in `actions`)
- `input`: Action input data

**Example:**
```typescript
// Player moves
runtime.submitAction('move', { x: 150, y: 200 });

// Player scores
runtime.submitAction('score', {});
```

#### `mutateState(mutator: (state: any) => void): void`

Directly mutate state (host only). Used by adapters for automatic sprite syncing.

**⚠️ Host Only:** Clients cannot use this method

**Parameters:**
- `mutator`: Function that mutates the state

**Example:**
```typescript
// Used internally by PhaserAdapter
runtime.mutateState((state) => {
  state._sprites['player-p1'] = { x: 100, y: 200 };
});
```

#### `broadcastEvent(eventName: string, payload: any): void`

Broadcast a custom event to all peers.

**Parameters:**
- `eventName`: Custom event name
- `payload`: Event data

**Example:**
```typescript
runtime.broadcastEvent('explosion', { x: 100, y: 200, damage: 50 });
```

#### `onEvent(eventName: string, callback: EventCallback): () => void`

Listen for custom events.

**Parameters:**
- `eventName`: Event name to listen for
- `callback`: `(senderId: string, eventName: string, payload: any) => void`

**Returns:** Cleanup function

**Example:**
```typescript
const unsubscribe = runtime.onEvent('explosion', (senderId, eventName, payload) => {
  console.log(`${senderId} caused explosion at`, payload.x, payload.y);
});

// Later: cleanup
unsubscribe();
```

#### `onChange(callback: StateChangeCallback): () => void`

Listen for state changes.

**Parameters:**
- `callback`: `(state: any) => void`

**Returns:** Cleanup function

**Example:**
```typescript
const unsubscribe = runtime.onChange((state) => {
  console.log('State updated:', state);
});

// Later: cleanup
unsubscribe();
```

#### `getTransport(): Transport`

Get the underlying transport (for adapters).

**Returns:** Transport instance

**Example:**
```typescript
const transport = runtime.getTransport();
const isHost = transport.isHost();
const myId = transport.getPlayerId();
```

#### `destroy(): void`

Cleanup runtime (stops sync loop, removes listeners).

**Example:**
```typescript
runtime.destroy();
```

---

## Diff/Patch Utilities

Low-level utilities for state synchronization (used internally by GameRuntime).

### generateDiff

Generate minimal diff between two states.

```typescript
function generateDiff(oldState: any, newState: any): Patch[]
```

**Parameters:**
- `oldState`: Previous state
- `newState`: New state

**Returns:** Array of patches

**Example:**
```typescript
import { generateDiff } from '@martini/core';

const patches = generateDiff(
  { x: 10, y: 20 },
  { x: 15, y: 20, z: 30 }
);

// Result:
// [
//   { op: 'replace', path: ['x'], value: 15 },
//   { op: 'add', path: ['z'], value: 30 }
// ]
```

### applyPatch

Apply a patch to state (mutates state).

```typescript
function applyPatch(state: any, patch: Patch): void
```

**Parameters:**
- `state`: State to patch (mutated in place)
- `patch`: Patch to apply

**Example:**
```typescript
import { applyPatch } from '@martini/core';

const state = { x: 10, y: 20 };

applyPatch(state, { op: 'replace', path: ['x'], value: 100 });

console.log(state); // { x: 100, y: 20 }
```

### deepClone

Deep clone an object.

```typescript
function deepClone<T>(obj: T): T
```

**Parameters:**
- `obj`: Object to clone

**Returns:** Deep copy

**Example:**
```typescript
import { deepClone } from '@martini/core';

const original = { players: { p1: { x: 100 } } };
const copy = deepClone(original);

copy.players.p1.x = 200;

console.log(original.players.p1.x); // Still 100
```

---

## Type Definitions

### Patch

Describes a state change operation.

```typescript
interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: any;
}
```

**Operations:**
- `replace`: Update existing value
- `add`: Add new property
- `remove`: Delete property

**Example:**
```typescript
const patch: Patch = {
  op: 'replace',
  path: ['players', 'p1', 'x'],
  value: 150
};
```

### Transport

Interface for network communication (implemented by transport packages).

```typescript
interface Transport {
  /** Send message to specific peer or broadcast */
  send(message: WireMessage, targetId?: string): void;

  /** Listen for incoming messages */
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;

  /** Listen for peer joining */
  onPeerJoin(handler: (peerId: string) => void): () => void;

  /** Listen for peer leaving */
  onPeerLeave(handler: (peerId: string) => void): () => void;

  /** Get current peer ID */
  getPlayerId(): string;

  /** Get all connected peer IDs */
  getPeerIds(): string[];

  /** Is this peer the host */
  isHost(): boolean;
}
```

See [@martini/transport-trystero](./api-reference-transport.md) for implementation details.

### WireMessage

Network message format.

```typescript
interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | ...;
  payload?: any;
  senderId?: string;
  timestamp?: number;
  [key: string]: any;
}
```

**Common Message Types:**
- `state_sync`: State patches from host
- `action`: Player action
- `event`: Custom event
- `player_join` / `player_leave`: Lifecycle events

---

## Best Practices

### State Design

**DO:**
- Use plain objects and arrays
- Keep state serializable (JSON-compatible)
- Structure state for easy querying

```typescript
// ✅ Good
{
  players: {
    p1: { x: 100, y: 100 },
    p2: { x: 200, y: 200 }
  }
}
```

**DON'T:**
- Store functions in state
- Use class instances
- Store non-serializable data

```typescript
// ❌ Bad
{
  players: [
    new Player(100, 100), // Class instance
    new Player(200, 200)
  ],
  callback: () => {} // Function
}
```

### Action Design

**DO:**
- Keep actions small and focused
- Validate input in the apply function
- Use player ID for player-specific logic

```typescript
actions: {
  move: {
    apply(state, playerId, input) {
      const player = state.players[playerId];
      if (!player) return; // Validate

      player.x = Math.max(0, Math.min(800, input.x)); // Clamp
      player.y = Math.max(0, Math.min(600, input.y));
    }
  }
}
```

**DON'T:**
- Perform side effects (network calls, DOM manipulation)
- Depend on external state
- Use non-deterministic operations (random, Date.now)

### Performance

**Sync Interval:**
- Default: 50ms (20 FPS) - good balance
- Fast-paced games: 33ms (30 FPS)
- Turn-based games: 100ms (10 FPS)

```typescript
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  syncInterval: 33 // 30 FPS for action game
});
```

**State Size:**
- Keep state minimal
- Avoid storing derived data
- Use efficient data structures

---

## See Also

- [Phaser Adapter API](./api-reference-phaser.md)
- [Transport Interface](./api-reference-transport.md)
- [Quick Start Guide](./quick-start.md)
