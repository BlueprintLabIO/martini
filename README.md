# martini-kit

Multiplayer without networking. You write game logic; martini-kit handles sync, transports, and engine glue. Built for fast prototyping, repeatable multiplayer tests, and production-ready host-authoritative sync.

[Website](https://martini-kit.com/) • [Docs](https://martini-kit.com/docs) • [Live demos](https://martini-kit.com/preview) • [GitHub](https://github.com/BlueprintLabIO/martini)

---

## Why you should care
- State-first API: mutate state, dispatch actions; no packet plumbing.
- Host-authoritative by default: deterministic, conflict-safe, cheat-resistant.
- Swap transports in one line: local (shared memory), WebRTC, WebSocket, Colyseus bridge.
- Engine adapters: Phaser today; adapters are pluggable/DIY without touching game code.
- Single-tab multiplayer: run host + clients in one tab for tests/demos/CI, zero servers.
- Built-in observability: action timeline, state diffs, network monitor, replay-friendly data.
- Browser IDE: embeddable dual-pane playground to teach, demo, and test live.

---

## Quick start (Phaser + local transport)
```bash
pnpm add @martini-kit/core @martini-kit/phaser @martini-kit/transport-local phaser
```

```ts
import { defineGame, GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import { LocalTransport } from '@martini-kit/transport-local';

// 1) Game logic (no networking code)
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(playerIds.map(id => [id, { x: 0, y: 0, hp: 100 }]))
  }),
  actions: {
    move: (state, { playerId, dx, dy }) => {
      state.players[playerId].x += dx;
      state.players[playerId].y += dy;
    },
    hit: (state, { playerId, amount }) => {
      state.players[playerId].hp -= amount;
    }
  }
});

// 2) Transport + runtime (host-authoritative)
const transport = new LocalTransport({ roomId: 'dev-room' });
const runtime = new GameRuntime(game, transport, { isHost: true });
await runtime.start();

// 3) Engine glue (Phaser)
const adapter = new PhaserAdapter(this, runtime);
adapter.trackSprite(myId, playerSprite); // auto-sync position/rotation/velocity

// 4) Dispatch actions anywhere
runtime.dispatchAction('move', { playerId: myId, dx: 10, dy: 0 });
```

Swap transports without touching game code:
```ts
// P2P
const transport = new TrysteroTransport({ roomId: 'p2p-demo' });
// WebSocket
const transport = new WebSocketTransport({ url: 'wss://game.com/socket' });
// Colyseus bridge
const transport = new ColyseusTransport({ room: colyseusRoom });
```

---

## The model

### State-first, diffed sync
```ts
actions: {
  collectCoin: (state, { playerId, coinId }) => {
    const coin = state.coins.find(c => c.id === coinId);
    if (coin && !coin.collected) {
      coin.collected = true;
      state.players[playerId].score += 10;
    }
  }
}
```
Host applies the action → computes a minimal patch → broadcasts. Clients patch and render. No packet formats, no manual broadcasts.

### Host-authoritative core
- One peer (or server) is the host; it is the source of truth.
- Clients send inputs; host applies, resolves conflicts, sends diffs.
- Deterministic RNG available to keep simulations aligned.
- Optional server/back-end can still own matchmaking/auth/storage.

### Local multiplayer in one tab
```ts
const host = new LocalTransport({ roomId: 'test', isHost: true });
const client = new LocalTransport({ roomId: 'test', isHost: false });
```
Both sides share memory, so you can:
- Unit test multiplayer logic synchronously.
- Run CI without spinning up signaling/relay servers.
- Demo multiplayer interactions offline.

### Engine adapters (Phaser example)
```ts
const adapter = new PhaserAdapter(scene, runtime);
adapter.trackSprite(playerId, sprite); // syncs pos/vel/flip/anim hooks

// Physics stays native:
sprite.setVelocity(200, 0); // host simulates, clients mirror
```
Adapters are thin glue: your engine code stays idiomatic; martini-kit syncs state.

### Transports you can swap (one constructor)
- `@martini-kit/transport-local`: tests, CI, offline demos.
- `@martini-kit/transport-trystero` (WebRTC): P2P demos, zero server cost.
- `@martini-kit/transport-ws`: centralized relay/prod.
- `@martini-kit/transport-colyseus`: reuse Colyseus rooms/matchmaking.
- Write-your-own: any protocol that can broadcast martini messages.

### Browser IDE + devtools
- Embeddable `<MartiniIDE>` (Svelte) for docs/playgrounds.
- Dual-pane host/client, live code editing, run/reset.
- State inspector and action timeline from `@martini-kit/devtools`.

### Determinism & testing
- Seeded RNG helper for reproducible simulations.
- Host-only side effects; clients display-only by default.
- Use `LocalTransport` in tests to assert on state without network flake.

---

## Feature tour (for the curious)

### State diffing vs message passing
Traditional networking: invent N message types, serialize, order, dedupe, replay.  
martini-kit: mutate state → diff → patch. Less code, fewer edge cases.

### Host-only physics (cheat resistance)
```ts
if (runtime.isHost) {
  this.physics.add.collider(players, walls, () => {
    runtime.dispatchAction('hit', { playerId, amount: 10 });
  });
}
```
Clients never run the collision; they just receive patched state. Speed hacks and bogus collisions are ignored.

### Interpolation & smoothing (Phaser)
Adapter can lerp positions between state updates; you keep native physics. Choose how much smoothing you want per entity.

### Pluggable transports & backends
- Keep your existing backend for auth/matchmaking/metrics.
- Let martini-kit own only the game-state wire payloads.
- Move from P2P to WebSocket for scale without rewriting game logic.

### Performance + prod tips
- Diff-based patches keep bandwidth low; unchanged fields are free.
- Batch multiple mutations per tick.
- Choose transport for cost/observability: WebRTC for cheap demos; WebSocket/Colyseus for prod.
- Keep host authoritative; seed RNG for spawning; record action timelines to debug desyncs.
---

## Packages
| Package | Description |
|---------|-------------|
| `@martini-kit/core` | Runtime, actions, state diffing, host loop |
| `@martini-kit/phaser` | Phaser adapter: sprite/physics sync, interpolation |
| `@martini-kit/transport-local` | Shared-memory transport for tests/demos |
| `@martini-kit/transport-trystero` | WebRTC P2P transport |
| `@martini-kit/transport-ws` | WebSocket transport |
| `@martini-kit/transport-colyseus` | Colyseus room bridge |
| `@martini-kit/devtools` | Action/state inspector, timeline |
| `@martini-kit/ide` | Embeddable browser IDE |
---

## Dev setup
```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

---

## Links
- Docs & guides: https://martini-kit.com/docs
- Live playground: https://martini-kit.com/preview
- Issues / discussions: https://github.com/BlueprintLabIO/martini
- npm (core): https://www.npmjs.com/package/@martini-kit/core

---

## License
Apache-2.0 © Blueprint Lab
