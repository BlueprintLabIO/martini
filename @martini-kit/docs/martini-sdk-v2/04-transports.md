# Transport Guide

`@martini-kit/core` doesn’t care how messages travel. Any module that implements the transport interface can plug into the runtime. This guide explains the built-in adapters and how to pick the right one.

---

## Interface Recap

```ts
interface Transport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;
  onPeerJoin(handler: (peerId: string) => void): () => void;
  onPeerLeave(handler: (peerId: string) => void): () => void;
  disconnect(): void;
  getPlayerId(): string;
  getPeerIds(): string[];
  isHost(): boolean;
}
```

Every built-in transport follows this shape, so swapping transports never touches your game logic.

---

## P2P Transport (WebRTC via Trystero)

```
Package: @martini-kit/transport-p2p
Ideal for: classroom demos, local testing, peer-to-peer prototypes
```

**How it works**

- Uses the Trystero library (WebRTC + MQTT signalling).
- No server required; peers discover each other using a room code.
- Lowest latency when everyone is nearby and networks allow WebRTC.

**Usage**

```ts
import { P2PTransport } from '@martini-kit/transport-p2p';
const transport = new P2PTransport('room-123');
```

**Pros / Cons**

| ✅ Pros | ⚠️ Cons |
|--------|---------|
| Zero hosting costs | NAT/firewall issues in some school networks |
| Great for fast iteration | Host must stay online |
| Works offline on LAN | No persistence/matchmaking |

---

## WebSocket Transport (Relay Server)

```
Package: @martini-kit/transport-ws (coming soon)
Ideal for: production deployments, predictable connectivity
```

**How it works**

- Connects to your WebSocket server (Node, Colyseus, Bun, etc.).
- Server acts as a relay: hosts send actions to server, server forwards to clients.
- Easy to add auth, matchmaking, or persistence on top.

**Usage**

```ts
import { WebSocketTransport } from '@martini-kit/transport-ws';
const transport = new WebSocketTransport('wss://game.example.com');
```

**Pros / Cons**

| ✅ Pros | ⚠️ Cons |
|--------|---------|
| Reliable on every network | Requires a server |
| Easy to combine with Colyseus/Nakama | Slightly higher latency vs. pure P2P |
| Central place for analytics & moderation | Need to scale servers yourself |

---

## UDP Transport (Relay / Edge Server)

```
Package: @martini-kit/transport-udp (planned)
Ideal for: custom relays, low-latency environments (Fly.io, edge nodes)
```

**Highlights**

- Minimal framing; perfect when you run your own relay.
- Works great with Fly.io, AWS edge, or bare-metal servers.
- You control reliability policies (ACK/NACK, resends).

Implementation details coming once the WebSocket transport ships.

---

## Using martini-kit with Existing Platforms

You can plug martini-kit into other ecosystems by building thin transport adapters:

- **Colyseus** – Wrap their WebSocket/Room API and let martini-kit handle logic. Server becomes a “dumb relay.”
- **Nakama** – Use Nakama’s realtime messaging to shuttle martini-kit wire messages.
- **Photon / custom engines** – As long as you can send/receive JSON/Binary, an adapter is feasible.

The `platform-comparison.md` doc has code snippets for these combos.

---

## Choosing the Right Transport

| Need | Recommendation |
|------|----------------|
| “I just want two browsers on the same network to sync.” | `P2PTransport` |
| “We’re shipping to classrooms with locked-down networks.” | WebSocket relay |
| “We already run Colyseus/Nakama.” | Build a transport adapter on top of their client SDK |
| “We want the lowest latency and can run edge servers.” | UDP relay |

Switching later is painless—declare the new transport, pass it into `PhaserAdapter.start`, and you’re done.

---

## Writing Your Own Transport

Skeleton:

```ts
export class CustomTransport implements Transport {
  constructor(endpoint) {
    this.socket = new SomeSocket(endpoint);
    this.socket.onmessage = (msg) => this.messageHandlers.forEach((cb) => cb(msg.data, msg.sender));
  }

  send(message, targetId) {
    this.socket.send({ targetId, payload: message });
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // ...implement the rest
}
```

Keep transports dumb: they shouldn’t inspect game logic or state—just deliver wire messages faithfully.

---

## Next

- Need more context on where martini-kit fits? Read [platform-comparison.md](./platform-comparison.md).
- Ready to migrate an old sandbox project? Check [migration-from-gameapi.md](./migration-from-gameapi.md).

Happy networking!

---
