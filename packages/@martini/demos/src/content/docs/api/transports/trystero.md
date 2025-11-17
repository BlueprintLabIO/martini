# TrysteroTransport

**TrysteroTransport** is a peer-to-peer WebRTC transport implementation using the [Trystero](https://github.com/dmotz/trystero) library. Perfect for production multiplayer games that don't require dedicated servers.

## When to Use

✅ **Perfect for:**
- Small to medium multiplayer games (2-8 players)
- Games where 50-100ms latency is acceptable
- Projects without server infrastructure budget
- Rapid prototyping of multiplayer features
- Casual multiplayer games

❌ **Not suitable for:**
- Competitive games requiring &lt;20ms latency
- Games with 10+ simultaneous players
- Scenarios requiring guaranteed connectivity (~20% of users behind restrictive NATs)
- Enterprise/corporate networks with strict firewall rules

## Installation

```bash
pnpm add @martini/transport-trystero trystero
# or
npm install @martini/transport-trystero trystero
```

## Quick Start

### Basic Setup

```typescript
import { TrysteroTransport } from '@martini/transport-trystero';
import { GameRuntime } from '@martini/core';
import { game } from './my-game';

// Create P2P transport
const transport = new TrysteroTransport({
  roomId: 'my-game-room-123',  // Unique room ID
  appId: 'my-game'              // Prevents cross-app collisions
});

// Wait for connection and host election
await transport.waitForReady();

// Create runtime (host is auto-elected)
const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()]
});
```

### Explicit Host/Client Mode

For production games, use explicit host designation:

```typescript
// Host instance (e.g., player who created the game)
const hostTransport = new TrysteroTransport({
  roomId: 'game-123',
  isHost: true  // Explicit host
});

// Client instances (e.g., players who join)
const clientTransport = new TrysteroTransport({
  roomId: 'game-123',
  isHost: false  // Explicit client
});
```

## API Reference

### Constructor

```typescript
class TrysteroTransport implements Transport {
  constructor(options: TrysteroTransportOptions);
}

interface TrysteroTransportOptions {
  roomId: string;           // Unique room identifier
  appId?: string;           // Application ID (default: 'martini-game')
  isHost?: boolean;         // Explicit host mode (true/false/undefined)
  rtcConfig?: RTCConfiguration;  // Custom STUN/TURN servers
  relayUrls?: string[];     // Custom MQTT relay URLs
}
```

### Properties

```typescript
readonly playerId: string;  // This peer's unique ID (from Trystero selfId)
```

### Methods

All standard [Transport interface](../core/transport) methods plus:

```typescript
// Core transport methods
send(message: WireMessage, targetId?: string): void;
onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;
onPeerJoin(handler: (peerId: string) => void): () => void;
onPeerLeave(handler: (peerId: string) => void): () => void;
onHostDisconnect(handler: () => void): () => void;
getPeerIds(): string[];
getPlayerId(): string;
isHost(): boolean;
disconnect(): void;

// TrysteroTransport-specific
waitForReady(): Promise<void>;           // Wait for host election
getCurrentHost(): string | null;         // Get current host ID
getRoom(): Room;                         // Get Trystero room instance
getConnectionState(): ConnectionState;   // 'connecting' | 'connected' | 'disconnected'
onConnectionChange(callback: (state: ConnectionState) => void): () => void;
onError(callback: (error: Error) => void): () => void;
```

## Host Election

TrysteroTransport uses a **sticky host pattern** with three modes:

### 1. Automatic Election (Default)

When `isHost` is omitted, the first peer to join becomes host:

```typescript
const transport = new TrysteroTransport({ roomId: 'game-123' });
await transport.waitForReady();

if (transport.isHost()) {
  console.log('I am the host!');
} else {
  console.log('I am a client, host is:', transport.getCurrentHost());
}
```

**How it works:**
1. First peer joins → becomes host immediately
2. Subsequent peers join → discover existing host via `host_query`/`host_announce` protocol
3. If two peers join simultaneously → alphabetically lowest peer ID wins

### 2. Explicit Host Mode

Recommended for production: creator of the game is always host:

```typescript
// Player who creates game
const hostTransport = new TrysteroTransport({
  roomId: 'game-123',
  isHost: true
});

// Players who join
const clientTransport = new TrysteroTransport({
  roomId: 'game-123',
  isHost: false
});
```

### 3. Host Discovery Protocol

`waitForReady()` uses active discovery:

```typescript
const transport = new TrysteroTransport({ roomId: 'game-123' });

// Broadcasts "host_query" message
// Waits up to 3 seconds for "host_announce" response
// If no response and no peers, becomes solo host
await transport.waitForReady();

console.log('Ready! Am I host?', transport.isHost());
```

## Examples

### Two-Player Game

```typescript
import { TrysteroTransport } from '@martini/transport-trystero';
import { GameRuntime } from '@martini/core';
import { game } from './paddle-battle';

async function startGame() {
  const transport = new TrysteroTransport({
    roomId: 'paddle-battle-room',
    appId: 'paddle-battle'
  });

  // Wait for connection
  await transport.waitForReady();
  console.log('Connected! Host:', transport.getCurrentHost());

  // Handle host disconnect
  transport.onHostDisconnect(() => {
    alert('Host left the game!');
    window.location.reload();
  });

  // Create runtime
  const runtime = new GameRuntime(game, transport, {
    isHost: transport.isHost(),
    playerIds: [transport.getPlayerId()]
  });

  // Start game loop
  startGameLoop(runtime);
}

startGame();
```

### Custom STUN/TURN Servers

For better connectivity, use your own TURN servers:

```typescript
const transport = new TrysteroTransport({
  roomId: 'game-123',
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'your-username',
        credential: 'your-password'
      }
    ]
  }
});
```

**Free STUN servers:**
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

**TURN server providers:**
- [Twilio TURN](https://www.twilio.com/stun-turn)
- [Metered TURN](https://www.metered.ca/tools/openrelay/)
- [Open Relay Project](https://www.metered.ca/tools/openrelay/) (Free tier)

### Custom MQTT Relay

By default, TrysteroTransport uses HiveMQ's public broker. For production, use your own:

```typescript
const transport = new TrysteroTransport({
  roomId: 'game-123',
  relayUrls: ['wss://your-mqtt-broker.com:8884/mqtt']
});
```

**MQTT broker options:**
- [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) (Free tier)
- [EMQX Cloud](https://www.emqx.com/en/cloud) (Free tier)
- Self-hosted [Mosquitto](https://mosquitto.org/)

## Connection State

Monitor connection changes:

```typescript
const transport = new TrysteroTransport({ roomId: 'game-123' });

transport.onConnectionChange((state) => {
  console.log('Connection state:', state);
  // "connecting" → "connected" → "disconnected"
});

transport.onPeerJoin((peerId) => {
  console.log('Player joined:', peerId);
});

transport.onPeerLeave((peerId) => {
  console.log('Player left:', peerId);
});

transport.onHostDisconnect(() => {
  console.log('HOST LEFT! Game ending...');
  // Show "Host disconnected" screen
});
```

## NAT Traversal & Connectivity

### Success Rates

- **STUN only**: ~80% success rate (works for most home networks)
- **STUN + TURN**: ~95%+ success rate (required for corporate networks)

### Common Connection Issues

**Problem**: Peers can't discover each other
**Solution**: Check that both use the exact same `roomId` and `appId`

**Problem**: Connection stuck on "connecting"
**Solution**: Corporate firewall blocking WebRTC. Use TURN server.

**Problem**: Connection works at home but not at work
**Solution**: Corporate networks often block P2P. Consider server-based transport for these users.

## Performance Characteristics

- **Latency**: 20-100ms (depends on geographic distance and network)
- **Bandwidth**: Same as game data (diff/patch overhead)
- **Peer Limit**: 2-8 players recommended (WebRTC mesh scales poorly beyond 8)
- **Connection Time**: 1-5 seconds for WebRTC handshake
- **Reliability**: Ordered, reliable delivery (uses DataChannels with retransmission)

## Limitations

1. **NAT Traversal**: ~20% of users behind restrictive NATs need TURN servers
2. **Scalability**: Mesh topology (everyone connects to everyone) doesn't scale beyond ~8 peers
3. **Host Dependency**: Game ends if host disconnects (no host migration yet)
4. **Browser Only**: Trystero is web-only (no mobile/native support)
5. **Latency Variability**: P2P latency varies based on geographic distance

## Debugging

### Enable Trystero Logging

Trystero doesn't have built-in logging, but you can monitor WebRTC events:

```typescript
const transport = new TrysteroTransport({ roomId: 'test' });

transport.onPeerJoin((peerId) => console.log('[Join]', peerId));
transport.onPeerLeave((peerId) => console.log('[Leave]', peerId));
transport.onMessage((msg) => console.log('[Message]', msg));
transport.onError((error) => console.error('[Error]', error));
```

### Check Room State

```typescript
const room = transport.getRoom();
console.log('Room:', room);
console.log('Peers:', transport.getPeerIds());
console.log('Host:', transport.getCurrentHost());
```

### Common Issues

**Problem**: `isHost()` returns inconsistent results
**Solution**: Always call `await transport.waitForReady()` before checking

```typescript
// ❌ Wrong - host not elected yet
const transport = new TrysteroTransport({ roomId: 'test' });
const isHost = transport.isHost(); // May be wrong!

// ✅ Correct - wait for election
const transport = new TrysteroTransport({ roomId: 'test' });
await transport.waitForReady();
const isHost = transport.isHost(); // Reliable!
```

## Production Checklist

- [ ] Use explicit `isHost: true/false` instead of auto-election
- [ ] Configure custom TURN servers for corporate network support
- [ ] Use your own MQTT relay instead of public HiveMQ
- [ ] Implement `onHostDisconnect` handler to gracefully end game
- [ ] Add connection state UI ("Connecting...", "Connected", "Disconnected")
- [ ] Test across different network conditions (home, mobile, corporate)
- [ ] Limit to 2-8 players for best performance
- [ ] Add timeout for `waitForReady()` with user-friendly error

## See Also

- [Transports Overview](./overview)
- [LocalTransport](./local) - For testing
- [Custom Transports](./custom) - Build your own server-based transport
- [Trystero Documentation](https://github.com/dmotz/trystero)
