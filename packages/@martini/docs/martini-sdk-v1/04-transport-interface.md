# Transport Interface

This document defines the transport abstraction layer that makes Martini SDK work with any networking backend.

**Fixes Issues:** #1 (send vs sendTo), #17 (ConnectionState management)

---

## Table of Contents

1. [Transport Contract](#transport-contract)
2. [Colyseus Adapter](#colyseus-adapter)
3. [Nakama Adapter](#nakama-adapter)
4. [P2P Adapter (Trystero)](#p2p-adapter-trystero)
5. [Custom Adapter Guide](#custom-adapter-guide)
6. [Helper Factory](#helper-factory)

---

## Transport Contract

All transport adapters MUST implement this interface:

```typescript
interface Transport {
  // Identity
  getPlayerId(): string;      // My player/session ID
  getPeerIds(): string[];     // All connected player IDs
  isHost(): boolean;          // Am I the authoritative host?

  // Messaging (✅ FIX ISSUE #1: Standardized on send, not sendTo)
  send(message: WireMessage, targetId?: string): void;  // Broadcast if no targetId
  onMessage(callback: (message: WireMessage, senderId: string) => void): () => void;

  // Server-side message injection (callback-based frameworks only)
  // When to provide:
  //   - REQUIRED: Nakama (runtime needs to inject messages into match loop)
  //   - NOT NEEDED: Colyseus (uses event-based onMessage, runtime registers directly)
  //   - NOT NEEDED: P2P clients (messages arrive via transport's onMessage)
  // The helper factory (createTransport) provides a default no-op implementation
  deliver?: (message: WireMessage, senderId: string) => void;

  // Lifecycle
  onPeerJoin(callback: (peerId: string) => void): () => void;
  onPeerLeave(callback: (peerId: string) => void): () => void;
  disconnect(): void;

  // Connection state (✅ FIX ISSUE #17: Connection state management)
  getConnectionState(): ConnectionState;
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;
  onError(callback: (error: Error) => void): () => void;
}

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
```

### Method Descriptions

#### `send(message, targetId?)`

**✅ CRITICAL FIX (Issue #1):** All adapters use `send()`, not `sendTo()`.

- **Broadcast:** `transport.send(message)` - Send to all peers
- **Unicast:** `transport.send(message, 'p1')` - Send to specific peer

**Example:**
```typescript
// Broadcast state diff to all clients
transport.send({
  kind: 'diff',
  tick: 100,
  revision: 42,
  baseRevision: 41,
  patches: [{ op: 'set', path: ['x'], value: 10 }]
});

// Unicast resync response to specific client
transport.send({
  type: 'resync_response',
  snapshot: fullState
}, 'player-123');
```

#### `onMessage(callback)`

Register handler for incoming messages. Returns cleanup function.

```typescript
const unsubscribe = transport.onMessage((message, senderId) => {
  if (message.type === 'action') {
    console.log(`${senderId} sent action: ${message.actionName}`);
  }
});

// Later: unsubscribe()
```

#### `deliver(message, senderId)`

**When to implement:**
- ✅ **REQUIRED:** Dedicated server implementations (Colyseus, Nakama)
- ❌ **NOT NEEDED:** P2P client implementations
- ℹ️ **AUTO-PROVIDED:** When using `createTransport()` helper factory

**Purpose:** Injects messages into runtime without network I/O. Needed when the framework (Colyseus, Nakama) delivers messages via callbacks rather than through `onMessage`.

**Use case:** Nakama/Colyseus server loops where messages arrive via framework callbacks.

```typescript
// Nakama match loop:
for (const msg of messages) {
  const wire: WireMessage = JSON.parse(msg.data);
  transport.deliver!(wire, msg.sender.userId);  // Inject into runtime
}
```

**Why optional in interface?**
- P2P clients never use this - they receive messages directly through `onMessage`
- The helper factory (`createTransport`) provides a default implementation
- Server implementations typically need to call it explicitly from framework hooks

**Implementation note:** The helper factory's default `deliver()` implementation routes messages to all registered `onMessage` handlers, which is sufficient for most use cases.

#### `getConnectionState()` / `onConnectionChange()`

**✅ FIX ISSUE #17:** Connection state machine.

```typescript
// Initial state
transport.getConnectionState();  // 'connecting'

// Subscribe to changes
transport.onConnectionChange((state) => {
  if (state === 'disconnected') {
    showReconnectUI();
  }
});

// State transitions:
// connecting → connected → reconnecting → connected
//           ↘ disconnected
```

---

## Colyseus Adapter

Colyseus provides hosted WebSocket rooms with server authority.

### Server Setup

```typescript
// server/MartiniRoom.ts
import { Room } from 'colyseus';
import { createRuntime, createTransport } from '@martini/multiplayer';
import gameLogic from './game.js';

export class MartiniRoom extends Room {
  runtime!: ReturnType<typeof createRuntime>;

  async onCreate() {
    const transport = createTransport({
      // ✅ FIX: Use send, not sendTo
      send: (message, targetId) => {
        if (targetId) {
          const client = this.clients.find(c => c.sessionId === targetId);
          client?.send('wire', message);
        } else {
          this.broadcast('wire', message);
        }
      },

      onMessage: (handler) => {
        const wrapped = (client: any, message: WireMessage) => {
          handler(message, client.sessionId);
        };
        this.onMessage('wire', wrapped);
        return () => {};  // Colyseus doesn't support removeListener easily
      },

      // Note: deliver() is not needed for Colyseus
      // The onMessage handler above is registered immediately and handles all messages
      // deliver() is only required for callback-based frameworks like Nakama
      // where the framework calls your match handler function with messages

      getPlayerId: () => this.roomId,
      getPeerIds: () => this.clients.map(c => c.sessionId),
      isHost: () => true,

      disconnect: () => this.disconnect(),

      getConnectionState: () => 'connected',
      onConnectionChange: () => () => {},
      onError: (callback) => {
        this.onError = callback;
        return () => {};
      }
    });

    this.runtime = await createRuntime(gameLogic, transport, {
      isHost: true,
      tickRate: 30
    });
  }

  onJoin(client: any) {
    console.log(`${client.sessionId} joined`);
  }

  onLeave(client: any) {
    console.log(`${client.sessionId} left`);
  }
}
```

### Client Setup

```typescript
// client.ts
import { Client } from 'colyseus.js';
import { createRuntime, createTransport } from '@martini/multiplayer';
import gameLogic from './game.js';

const client = new Client('ws://localhost:2567');
const room = await client.joinOrCreate('martini');

const transport = createTransport({
  send: (message, targetId) => {
    // Clients always send to server (ignore targetId)
    room.send('wire', message);
  },

  onMessage: (handler) => {
    const wrapped = (message: WireMessage) => {
      handler(message, room.sessionId);
    };
    room.onMessage('wire', wrapped);
    return () => {};
  },

  getPlayerId: () => room.sessionId!,
  getPeerIds: () => Array.from(room.state?.players?.keys() || []),
  isHost: () => false,

  disconnect: () => room.leave(),

  getConnectionState: () => {
    // Map Colyseus connection state
    if (!room.connection) return 'disconnected';
    if (room.connection.isOpen) return 'connected';
    return 'connecting';
  },

  onConnectionChange: (callback) => {
    room.onStateChange(() => {
      callback(transport.getConnectionState());
    });
    return () => {};
  },

  onError: (callback) => {
    room.onError = callback;
    return () => {};
  }
});

const runtime = createRuntime(gameLogic, transport, { isHost: false });
const game = runtime.getAPI();
```

---

## Nakama Adapter

Nakama uses TypeScript server-side matches with authoritative logic.

### Server Match

```typescript
// server/match.ts
import { nkruntime } from '@heroiclabs/nakama-runtime';
import { createRuntime, createTransport } from '@martini/multiplayer';
import gameLogic from './game.js';

type MatchState = {
  transport?: ReturnType<typeof createTransport>;
  runtime?: ReturnType<typeof createRuntime>;
  peerIds: Set<string>;
  presences: Map<string, nkruntime.Presence>;
};

const matchInit: nkruntime.MatchInitFunction = (ctx, logger, nk, params) => ({
  state: { peerIds: new Set<string>(), presences: new Map() } satisfies MatchState,
  tickRate: 30,
  label: 'martini-match'
});

function ensureRuntime(
  state: MatchState,
  dispatcher: nkruntime.MatchDispatcher,
  ctx: nkruntime.MatchContext
): ReturnType<typeof createRuntime> {
  if (!state.transport) {
    state.transport = createTransport({
      send: (message, targetId) => {
        const payload = JSON.stringify(message);
        if (targetId) {
          const presence = state.presences.get(targetId);
          if (presence) {
            dispatcher.broadcastMessage(1, payload, [presence]);
          }
        } else {
          dispatcher.broadcastMessage(1, payload);
        }
      },

      onMessage: () => () => {},  // matchLoop injects via deliver()

      getPlayerId: () => ctx.matchId,
      getPeerIds: () => Array.from(state.peerIds),
      isHost: () => true,

      disconnect: () => {},
      getConnectionState: () => 'connected',
      onConnectionChange: () => () => {},
      onError: () => () => {}
    });
  }

  if (!state.runtime) {
    state.runtime = createRuntime(gameLogic, state.transport, {
      isHost: true,
      tickRate: 30
    });
  }

  return state.runtime;
}

const matchLoop: nkruntime.MatchLoopFunction = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state: MatchState,
  messages
) => {
  const runtime = ensureRuntime(state, dispatcher, ctx);

  // Inject messages via deliver()
  for (const msg of messages) {
    state.peerIds.add(msg.sender.userId);
    const wire: WireMessage = JSON.parse(msg.data as string);
    state.transport!.deliver!(wire, msg.sender.userId);
  }

  runtime.tick();  // Advance authoritative simulation each loop

  return { state };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = (ctx, logger, nk, dispatcher, tick, state, presence) => {
  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  for (const presence of presences) {
    state.peerIds.add(presence.userId);
    state.presences.set(presence.userId, presence);
  }
  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  for (const presence of presences) {
    state.peerIds.delete(presence.userId);
    state.presences.delete(presence.userId);
  }
  return { state };
};
```

### Client Setup

```typescript
// client.ts
import { Client } from '@heroiclabs/nakama-js';
import { createRuntime, createTransport } from '@martini/multiplayer';
import gameLogic from './game.js';

const client = new Client();
const session = await client.authenticateDevice('device-id');
const socket = client.createSocket();
await socket.connect(session);

const match = await socket.createMatch();

const transport = createTransport({
  send: (message) => {
    socket.sendMatchState(match.match_id, 1, JSON.stringify(message));
  },

  onMessage: (handler) => {
    socket.onmatchdata = (matchData) => {
      const message = JSON.parse(matchData.data);
      handler(message, matchData.presence.user_id);
    };
    return () => {};
  },

  getPlayerId: () => session.user_id!,
  getPeerIds: () => match.presences.map(p => p.user_id),
  isHost: () => false,

  disconnect: () => socket.disconnect(),
  getConnectionState: () => socket.isConnected() ? 'connected' : 'disconnected',
  onConnectionChange: () => () => {},
  onError: () => () => {}
});

const runtime = createRuntime(gameLogic, transport, { isHost: false });
```

---

## P2P Adapter (Trystero)

Trystero provides serverless P2P via WebRTC (using MQTT or Supabase for signaling).

### Client Setup (P2P)

```typescript
// client.ts
import { joinRoom } from 'trystero/supabase';
import { createRuntime, createTransport } from '@martini/multiplayer';
import gameLogic from './game.js';

const appId = 'my-game';
const roomId = 'room-123';

const config = { appId };
const room = joinRoom(config, roomId);

const [sendWire, receiveWire] = room.makeAction<WireMessage>('wire');

// Track host session announced via heartbeat
let currentHost = room.getPeers().length === 0 ? room.selfId : null; // Updated by heartbeat/host_migration

// Heartbeat updates will be captured inside onMessage handler below

const transport = createTransport({
  send: (message, targetId) => {
    if (targetId) {
      sendWire(message, targetId);
    } else {
      sendWire(message);  // Broadcast
    }
  },

  onMessage: (handler) => {
    receiveWire((message, peerId) => {
      if (message.type === 'heartbeat' && message.sessionId !== currentHost) {
        currentHost = message.sessionId;
      }
      if (message.type === 'host_migration') {
        currentHost = message.newHost;
      }
      handler(message, peerId);
    });
    return () => {};
  },

  getPlayerId: () => room.selfId,
  getPeerIds: () => room.getPeers(),
  isHost: () => room.selfId === currentHost,

  onPeerJoin: (callback) => {
    room.onPeerJoin((peerId) => callback(peerId));
    return () => {};
  },

  onPeerLeave: (callback) => {
    room.onPeerLeave((peerId) => {
      if (peerId === currentHost) {
        currentHost = null;  // Await heartbeat from new host
      }
      callback(peerId);
    });
    return () => {};
  },

  disconnect: () => room.leave(),

  getConnectionState: () => {
    return room.getPeers().length > 0 ? 'connected' : 'connecting';
  },

  onConnectionChange: (callback) => {
    room.onPeerJoin(() => callback('connected'));
    room.onPeerLeave(() => {
      const state = room.getPeers().length > 0 ? 'connected' : 'disconnected';
      callback(state);
    });
    return () => {};
  },

  onError: () => () => {}  // Trystero doesn't expose errors directly
});

const runtime = createRuntime(gameLogic, transport, {
  isHost: room.selfId === currentHost,
  playerIds: room.selfId === currentHost ? [room.selfId] : undefined
});
```

---

## Custom Adapter Guide

To create a custom transport adapter:

### 1. Implement the Interface

```typescript
import { Transport, WireMessage, ConnectionState } from '@martini/core';

export class MyCustomTransport implements Transport {
  private mySessionId: string;
  private peers: Set<string> = new Set();
  private messageHandlers: Array<(msg: WireMessage, senderId: string) => void> = [];

  constructor(private connection: MyNetworkLib) {
    this.mySessionId = connection.getSessionId();

    // Listen for messages
    connection.onMessage((data, senderId) => {
      const message: WireMessage = JSON.parse(data);
      this.messageHandlers.forEach(h => h(message, senderId));
    });
  }

  getPlayerId(): string {
    return this.mySessionId;
  }

  getPeerIds(): string[] {
    return Array.from(this.peers);
  }

  isHost(): boolean {
    return this.connection.isServer;
  }

  send(message: WireMessage, targetId?: string): void {
    const data = JSON.stringify(message);

    if (targetId) {
      this.connection.sendTo(targetId, data);
    } else {
      this.connection.broadcast(data);
    }
  }

  onMessage(callback: (message: WireMessage, senderId: string) => void): () => void {
    this.messageHandlers.push(callback);
    return () => {
      const idx = this.messageHandlers.indexOf(callback);
      if (idx >= 0) this.messageHandlers.splice(idx, 1);
    };
  }

  onPeerJoin(callback: (peerId: string) => void): () => void {
    const handler = (peerId: string) => {
      this.peers.add(peerId);
      callback(peerId);
    };
    this.connection.onJoin(handler);
    return () => this.connection.offJoin(handler);
  }

  onPeerLeave(callback: (peerId: string) => void): () => void {
    const handler = (peerId: string) => {
      this.peers.delete(peerId);
      callback(peerId);
    };
    this.connection.onLeave(handler);
    return () => this.connection.offLeave(handler);
  }

  disconnect(): void {
    this.connection.disconnect();
  }

  getConnectionState(): ConnectionState {
    if (this.connection.isConnected()) return 'connected';
    if (this.connection.isConnecting()) return 'connecting';
    return 'disconnected';
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.connection.onStateChange(() => {
      callback(this.getConnectionState());
    });
    return () => {};
  }

  onError(callback: (error: Error) => void): () => void {
    this.connection.onError(callback);
    return () => {};
  }
}
```

### 2. Test Against Contract

```typescript
describe('MyCustomTransport', () => {
  it('implements Transport interface', () => {
    const transport = new MyCustomTransport(mockConnection);

    expect(transport.getPlayerId()).toBeDefined();
    expect(transport.getPeerIds()).toBeInstanceOf(Array);
    expect(typeof transport.isHost()).toBe('boolean');
    expect(typeof transport.send).toBe('function');
    expect(typeof transport.onMessage).toBe('function');
  });

  it('broadcasts messages correctly', (done) => {
    const transport = new MyCustomTransport(mockConnection);

    transport.onMessage((message, senderId) => {
      expect(message.type).toBe('action');
      done();
    });

    transport.send({ type: 'action', actionName: 'move', payload: {}, actionIndex: 0, tick: 0, playerId: 'p1', timestamp: Date.now() });
  });
});
```

---

## Helper Factory

Convenience factory for creating transport adapters:

```typescript
function createTransport(config: {
  send: (message: WireMessage, targetId?: string) => void;
  onMessage: (handler: (message: WireMessage, senderId: string) => void) => () => void;
  getPlayerId: () => string;
  getPeerIds: () => string[];
  isHost: () => boolean;
  disconnect?: () => void;
  onPeerJoin?: (callback: (peerId: string) => void) => () => void;
  onPeerLeave?: (callback: (peerId: string) => void) => () => void;
  getConnectionState?: () => ConnectionState;
  onConnectionChange?: (callback: (state: ConnectionState) => void) => () => void;
  onError?: (callback: (error: Error) => void) => () => void;
}): Transport {
  const handlers: ((msg: WireMessage, senderId: string) => void)[] = [];
  const unsubscribeNetwork = config.onMessage((message, senderId) => {
    handlers.forEach(h => h(message, senderId));
  });

  return {
    send: config.send,
    getPlayerId: config.getPlayerId,
    getPeerIds: config.getPeerIds,
    isHost: config.isHost,

    onMessage: (callback) => {
      handlers.push(callback);
      return () => {
        const idx = handlers.indexOf(callback);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },

    deliver: (message, senderId) => {
      handlers.forEach(h => h(message, senderId));
    },

    onPeerJoin: config.onPeerJoin ?? (() => () => {}),
    onPeerLeave: config.onPeerLeave ?? (() => () => {}),

    disconnect: () => {
      unsubscribeNetwork();
      config.disconnect?.();
    },

    getConnectionState: config.getConnectionState ?? (() => 'connected'),
    onConnectionChange: config.onConnectionChange ?? (() => () => {}),
    onError: config.onError ?? (() => () => {})
  };
}
```

**Usage:**
```typescript
const transport = createTransport({
  send: (msg, targetId) => { /* ... */ },
  onMessage: (handler) => { /* ... */ },
  getPlayerId: () => 'p1',
  getPeerIds: () => ['p2', 'p3'],
  isHost: () => true
});
```

---

## Guarantees

1. **Drop-in Compatibility:** Any transport implementing this interface works with the SDK
2. **Same Game Logic:** User code doesn't know/care which transport is used
3. **Deterministic Behavior:** Runtime behavior identical across all transports
4. **Type Safety:** TypeScript enforces interface compliance

---

## Next Steps

- **Need game API details?** → See [02-api-reference.md](./02-api-reference.md)
- **Need correctness proofs?** → See [05-correctness-guarantees.md](./05-correctness-guarantees.md)
- **Building custom adapter?** → Use the helper factory above + test against contract
