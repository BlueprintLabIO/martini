---
title: Frequently Asked Questions
description: Common questions about martini-kit SDK
section: operate
---

# Frequently Asked Questions

Quick answers to common questions. For detailed guides, see the [Getting Started](/docs/latest/getting-started/installation) section.

## General

### What is martini-kit SDK?

martini-kit SDK is an engine-agnostic, host-authoritative multiplayer framework for building real-time multiplayer games. See [Architecture](/docs/latest/concepts/architecture) for details.

### Is martini-kit production-ready?

martini-kit SDK is currently in v0.1 (alpha). It's suitable for prototypes and small-scale games. For production use, choose an appropriate [transport](/docs/latest/api/transports/overview) for your needs.

### What license is it under?

MIT license - free and open source.

## Architecture

### Why host-authoritative instead of deterministic lockstep?

See the [Architecture guide](/docs/latest/concepts/architecture) for a detailed comparison. TL;DR: Host-authoritative is simpler to implement and works with existing physics engines, but the host has a latency advantage.

### How does state synchronization work?

See [State Management](/docs/latest/concepts/state-management) for the full explanation of the diff/patch system.

### What happens if the host disconnects?

Currently, the game ends. Host migration is planned for a future release and is a great [contribution opportunity](/docs/latest/contributing/where-to-contribute)!

## Compatibility

### What game engines does martini-kit support?

- **Phaser 3** - Full integration with `@martini-kit/phaser`
- **Vanilla JavaScript** - Use `@martini-kit/core` directly

Planned: Unity (WebGL), Godot, Three.js. You can also [create custom adapters](/docs/latest/contributing/where-to-contribute).

### Does it work with React/Vue/Svelte?

Yes! Embed the game canvas as a component and sync state to your UI framework. See [UI & HUD guide](/docs/latest/guides/ui-and-hud/01-basics).

### What browsers are supported?

All modern browsers: Chrome/Edge (recommended), Firefox, Safari, and mobile browsers.

### Do I need TypeScript?

No, but it's highly recommended for type safety and better IDE support.

## Development

### How do I test locally?

Use `@martini-kit/transport-local` - see [Testing guide](/docs/latest/guides/testing).

### How do I debug state sync issues?

Use `StateInspector` from `@martini-kit/devtools` - see [Troubleshooting](/docs/latest/troubleshooting/debugging).

### What's the recommended state sync rate?

- **Slow-paced** (turn-based): 100-200ms
- **Normal** (platformers): 50ms (default)
- **Fast-paced** (shooters): 33ms or 16ms

See [Performance guide](/docs/latest/guides/performance-guide) for optimization tips.

## Performance

### What's the maximum number of players?

- **P2P (Trystero)**: 2-8 players
- **WebSocket/Server**: 100+ players with proper architecture

See [Deployment guide](/docs/latest/guides/deployment) for scaling strategies.

### How much bandwidth does it use?

Typically **1-10 KB/s per client**. The diff/patch system minimizes bandwidth by only sending changes.

### Can I optimize for mobile?

Yes! See the [Performance guide](/docs/latest/guides/performance-guide) for mobile-specific optimizations.

## Networking

### What transports are available?

See [Transport Overview](/docs/latest/api/transports/overview) for a full comparison of available transports.

### Can I use it without a server?

Yes! Use `@martini-kit/transport-trystero` for P2P games (2-8 players). See [Deployment guide](/docs/latest/guides/deployment).

### How do I implement custom transports?

See [Custom Transports](/docs/latest/api/transports/custom) guide.

## Features

### Can I save/load game state?

Yes! State is just a JavaScript object - serialize it to JSON and save to localStorage or your backend.

### Does it support voice chat?

Not built-in. Integrate third-party services like Agora, Twilio, or Discord.

### Can I record and replay games?

Not built-in yet, but you can implement it by recording actions with timestamps. Great [contribution opportunity](/docs/latest/contributing/where-to-contribute)!

### Does it support AI/bots?

Yes! Bots are simulated players - create a bot player ID and submit actions for them. Use `context.random` for deterministic AI.

## Comparisons

### How does it compare to Colyseus?

| Feature | martini-kit | Colyseus |
|---------|---------|----------|
| Hosting | Self-hosted or P2P | Server required |
| Transport | Pluggable | WebSocket only |
| Engine | Phaser, vanilla | Framework-agnostic |
| Pricing | Free (MIT) | Free (self-hosted) |

**Use martini-kit if:** You want P2P support, Phaser integration, or transport flexibility.

**Use Colyseus if:** You need battle-tested server infrastructure.

### How does it compare to Photon?

| Feature | martini-kit | Photon |
|---------|---------|--------|
| Hosting | Self-hosted | Photon Cloud |
| Pricing | Free | Paid (free tier) |
| Platform | Web | Web, Unity, Unreal |

**Use martini-kit if:** You want open source, no vendor lock-in, free hosting.

**Use Photon if:** You need cross-platform support with hosted infrastructure.

## Contributing

### How can I contribute?

See the [Contributing Guide](/docs/latest/contributing/getting-started) for setup instructions and finding issues to work on.

### Where do I report bugs?

[Open an issue on GitHub](https://github.com/BlueprintLabIO/martini) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Minimal code example

### How do I request features?

Post in [GitHub Discussions](https://github.com/BlueprintLabIO/martini) with your use case and implementation ideas.

## Still Have Questions?

- **Documentation**: Browse the [guides](/docs/latest/guides/movement/01-top-down) and [API reference](/docs/latest/api/core/game-runtime)
- **Community**: Ask in [GitHub Discussions](https://github.com/BlueprintLabIO/martini)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/BlueprintLabIO/martini)
- **Examples**: Check out the [example games](/docs/latest/examples/overview)
