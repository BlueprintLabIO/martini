---
title: Frequently Asked Questions
description: Common questions about martini-kit SDK
---

# Frequently Asked Questions

## General Questions

### What is martini-kit SDK?

martini-kit SDK is an engine-agnostic, host-authoritative multiplayer framework for building real-time multiplayer games. It provides a declarative API where you define your game's state and actions, and martini-kit handles all the networking complexity.

### Is martini-kit SDK production-ready?

Yes! martini-kit SDK is currently in v0.1 and suitable for production use. Choose an appropriate transport for your use case:
- **P2P games**: Use `@martini-kit/transport-trystero`
- **Server-based games**: Use `@martini-kit/transport-ws` or implement a custom transport
- **Testing**: Use `@martini-kit/transport-local`

### What license is martini-kit SDK under?

martini-kit SDK is open source under the MIT license.

### Who maintains martini-kit SDK?

martini-kit SDK is maintained by the core team and community contributors. See [CONTRIBUTORS.md](https://github.com/BlueprintLabIO/martini/blob/main/CONTRIBUTORS.md) for the full list.

## Architecture Questions

### Why host-authoritative instead of deterministic lockstep?

Host-authoritative is simpler to implement and debug:
- Works with existing physics engines
- No need for perfect floating-point determinism
- Easier to test and reason about
- Less susceptible to desyncs

**Trade-offs:**
- Host has latency advantage (0ms)
- Requires good interpolation for smooth client experience
- More bandwidth than lockstep (sending state vs inputs)

### How does state synchronization work?

1. Host runs game logic and applies actions
2. Host generates a diff (patch) between old and new state
3. Host broadcasts minimal patches to all clients
4. Clients apply patches to mirror host state
5. Clients render the updated state

This diff-based approach minimizes bandwidth usage.

### Can I implement client-side prediction?

Yes, but it's not built-in. You can:
1. Apply actions optimistically on the client
2. Wait for authoritative state from host
3. Reconcile if there's a mismatch

This is an advanced technique and usually not necessary for casual games.

### What happens if the host disconnects?

Currently, the game ends. Host migration (automatic failover to a new host) is planned for a future release and is a great area for [contribution](/docs/latest/contributing/where-to-contribute)!

## Compatibility Questions

### What game engines does martini-kit support?

**Official adapters:**
- **Phaser 3** - Full integration with `@martini-kit/phaser`
- **Vanilla JavaScript** - Use `@martini-kit/core` directly

**Planned adapters:**
- Unity (WebGL)
- Godot
- Three.js

You can also [create custom adapters](/docs/latest/contributing/where-to-contribute) for any engine.

### Does martini-kit work with React/Vue/Svelte?

Yes! You can embed martini-kit games in any framework:
- Use the game canvas as a component
- Sync state to your UI framework's state
- Call `runtime.submitAction()` from UI event handlers

### What browsers are supported?

martini-kit supports all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Do I need TypeScript?

No, but it's highly recommended. TypeScript provides:
- Type safety for state and actions
- Better IDE autocomplete
- Catch errors at compile time

martini-kit is written in TypeScript and designed for TypeScript-first development.

## Development Questions

### How do I test my multiplayer game locally?

Use `@martini-kit/transport-local` for instant testing:

```typescript
const transport = new LocalTransport({
  roomId: 'test-room',
  isHost: true,
});
```

Open multiple browser tabs to simulate multiple players.

### Can I use martini-kit with Vite/Webpack/Parcel?

Yes! martini-kit works with any bundler that supports ES modules:
- **Vite** (recommended)
- Webpack 5+
- Parcel 2+
- Rollup
- esbuild

### How do I debug state sync issues?

Use the `StateInspector` from `@martini-kit/devtools`:

```typescript
import { StateInspector } from '@martini-kit/devtools';

const inspector = new StateInspector();
inspector.attach(runtime);

console.log(inspector.getSnapshots());
console.log(inspector.getActionHistory());
```

See the [Debugging Guide](/docs/latest/troubleshooting/debugging) for more details.

### What's the recommended state sync rate?

Default is 50ms (20 FPS). Adjust based on your game:
- **Slow-paced games** (turn-based, card games): 100-200ms
- **Normal games** (platformers, puzzles): 50ms
- **Fast-paced games** (shooters, racing): 33ms (30 FPS) or 16ms (60 FPS)

Lower values = smoother but more bandwidth.

## Performance Questions

### What's the maximum number of players?

This depends on your transport and game complexity:
- **LocalTransport/IframeBridge**: Development only (1-4 players)
- **P2P (Trystero)**: 2-8 players (NAT traversal limits)
- **WebSocket/Server**: 100+ players with proper architecture

For large-scale games, use a dedicated server transport.

### How much bandwidth does state sync use?

Typical games use **1-10 KB/s per client**, depending on:
- State size
- Sync rate
- Number of changing properties
- Compression (if enabled)

The diff/patch system minimizes bandwidth by only sending changes.

### Can I optimize for mobile?

Yes! Follow these best practices:
- Reduce sync rate (100ms instead of 50ms)
- Minimize state size
- Use texture atlases
- Test on actual devices
- Implement touch controls with `InputManager`

### How do I profile performance?

Use browser DevTools Performance tab:
1. Record while playing
2. Look for long-running functions
3. Check frame rate
4. Monitor memory usage

Also use `StateInspector.getStats()` to check memory usage.

## Networking Questions

### What transports are available?

**Official transports:**
- `@martini-kit/transport-local` - In-memory (testing)
- `@martini-kit/transport-iframe-bridge` - Iframe communication (IDE)
- `@martini-kit/transport-trystero` - P2P WebRTC
- `@martini-kit/transport-ws` - WebSocket (server-based)
- `@martini-kit/transport-colyseus` - Colyseus integration

See [Transport Overview](/docs/latest/api/transports/overview) for comparison.

### Can I use martini-kit without a server?

Yes! Use `@martini-kit/transport-trystero` for P2P games:
- No server costs
- WebRTC peer-to-peer
- Good for casual 2-8 player games

**Limitations:**
- NAT traversal can fail
- No anti-cheat
- Host has advantage

### How do I implement custom transports?

Implement the `Transport` interface from `@martini-kit/core`:

```typescript
interface Transport {
  send(message: WireMessage, targetId?: string): void;
  onMessage(handler: MessageHandler): Unsubscribe;
  onPeerJoin(handler: PeerHandler): Unsubscribe;
  onPeerLeave(handler: PeerHandler): Unsubscribe;
  getPeerIds(): string[];
  getPlayerId(): string;
  isHost(): boolean;
  metrics?: TransportMetrics;
}
```

See [Custom Transports](/docs/latest/api/transports/custom) for details.

### Does martini-kit support dedicated servers?

Yes! The "host" can be a dedicated server instead of a player's browser:
- Run `GameRuntime` on the server
- Use a server-compatible transport (WebSocket)
- Clients connect as non-host peers

## Feature Questions

### Can I save/load game state?

Yes! State is just a JavaScript object:

```typescript
// Save
const state = runtime.getState();
localStorage.setItem('save', JSON.stringify(state));

// Load
const saved = JSON.parse(localStorage.getItem('save'));
// Reset runtime with saved state
```

For multiplayer saves, sync with your backend.

### Does martini-kit support voice chat?

Not built-in, but you can integrate:
- Use WebRTC data channels alongside martini-kit
- Integrate services like Agora, Twilio
- Use Discord's voice API

### Can I record and replay games?

Not built-in yet, but you can implement it:
1. Record all actions with timestamps
2. Store in array or database
3. Replay by submitting recorded actions

This is a planned feature and a great [contribution opportunity](/docs/latest/contributing/where-to-contribute)!

### Does martini-kit support AI/bots?

Yes! Bots are just simulated players:
- Create a "bot" player ID
- Submit actions for the bot from game logic
- Use `context.random` for deterministic AI

Example:
```typescript
actions: {
  tick: {
    apply(state, context) {
      // Bot AI logic
      for (const [id, player] of Object.entries(state.players)) {
        if (player.isBot) {
          // Move toward target
          const dx = state.target.x - player.x;
          player.x += Math.sign(dx) * player.speed;
        }
      }
    }
  }
}
```

## Comparison Questions

### How does martini-kit compare to Colyseus?

| Feature | martini-kit | Colyseus |
|---------|---------|----------|
| Hosting | Self-hosted or P2P | Server required |
| Language | TypeScript | TypeScript |
| State sync | Diff/patch | State schema |
| Transport | Pluggable | WebSocket only |
| Engine integration | Phaser, vanilla | Framework-agnostic |
| Pricing | Free (open source) | Free (self-hosted) |

**Use martini-kit if:** You want P2P support, Phaser integration, or transport flexibility

**Use Colyseus if:** You need battle-tested server infrastructure

### How does martini-kit compare to Photon?

| Feature | martini-kit | Photon |
|---------|---------|--------|
| Hosting | Self-hosted | Photon Cloud |
| Pricing | Free | Paid (free tier) |
| Language | TypeScript | C#, JavaScript |
| Platform | Web | Web, Unity, Unreal |

**Use martini-kit if:** You want open source, no vendor lock-in, free hosting

**Use Photon if:** You need cross-platform support with hosted infrastructure

### How does martini-kit compare to Mirror (Unity)?

Mirror is Unity-specific. martini-kit is engine-agnostic (currently Phaser, Unity planned).

**Use martini-kit if:** Building web games

**Use Mirror if:** Building Unity games for native platforms

## Contributing Questions

### How can I contribute?

See the [Contributing Guide](/docs/latest/contributing/getting-started) for:
- Setting up the development environment
- Finding issues to work on
- Submitting pull requests

### What skills do I need to contribute?

Depends on what you want to contribute:
- **Code**: TypeScript, networking, game dev
- **Documentation**: Technical writing
- **Examples**: Game design, Phaser
- **Design**: UI/UX, graphics

Everyone can contribute!

### Where do I report bugs?

[Open an issue on GitHub](https://github.com/BlueprintLabIO/martini/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Minimal code example

### How do I request features?

Post in [GitHub Discussions](https://github.com/BlueprintLabIO/martini/discussions/categories/feature-requests):
- Describe the feature
- Explain the use case
- Discuss implementation ideas

## Still Have Questions?

- **Documentation**: Browse the [guides](/docs/latest/guides/phaser-integration) and [API reference](/docs/latest/api/core/game-runtime)
- **Community**: Ask in [GitHub Discussions](https://github.com/BlueprintLabIO/martini/discussions)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues)
- **Examples**: Check out the [example games](/docs/latest/examples/overview)
