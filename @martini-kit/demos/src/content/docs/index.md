---
title: martini-kit Documentation
description: Build real-time multiplayer games with minimal code using the martini-kit SDK
section: home
---

# martini-kit SDK Documentation

**Build real-time multiplayer games with minimal code.** martini-kit is an engine-agnostic, host-authoritative multiplayer framework designed for rapid game development.

## Quick Start

<div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">

<div>
<h3>🚀 Installation</h3>
<p>Install martini-kit and set up your first project in 5 minutes.</p>
<a href="/docs/latest/getting-started/installation">Get Started →</a>
</div>

<div>
<h3>⚡ Quick Start</h3>
<p>Build a working multiplayer game with 30 lines of code.</p>
<a href="/docs/latest/getting-started/quick-start">Quick Start →</a>
</div>

<div>
<h3>🎮 First Game</h3>
<p>Complete tutorial: build a multiplayer paddle game step-by-step.</p>
<a href="/docs/latest/getting-started/first-game">Build Now →</a>
</div>

<div>
<h3>📖 API Reference</h3>
<p>Comprehensive API documentation for all packages.</p>
<a href="/docs/latest/api/core/define-game">Read Docs →</a>
</div>

</div>

## Key Features

- **Declarative API** - Define state and actions, not networking code
- **Host-authoritative** - Host runs the game, clients mirror state
- **Automatic sync** - Efficient diff/patch algorithm minimizes bandwidth
- **Engine-agnostic** - Works with Phaser, Unity, Godot, Three.js
- **Transport-agnostic** - P2P, WebSocket, or custom - your choice
- **TypeScript-first** - Full type safety and IntelliSense
- **Production-ready** - Battle-tested in real games
- **Open source** - MIT licensed, community-driven

## What is martini-kit?

martini-kit is a multiplayer game framework that handles all the networking complexity for you. Instead of writing socket handlers and sync logic, you just define your game state and actions - martini-kit handles the rest.

### The Traditional Way

```typescript
// Manual networking - hundreds of lines of boilerplate
// Total chaos: parsing, routing, reconnection, and race conditions everywhere
socket.on('player-moved', (data) => {
  players[data.id].x = data.x;
  players[data.id].y = data.y;
});

// And you repeat this for every message type...
socket.emit('move-player', { id: playerId, x: newX, y: newY });
```

### The martini-kit Way

```typescript
// Declarative multiplayer - just define state and actions
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  actions: {
    move: {
      apply(state, context, input) {
        state.players[context.playerId].x = input.x;
        state.players[context.playerId].y = input.y;
      }
    }
  }
});
```

That's it! martini-kit automatically:
- Syncs state across all players
- Handles player join/leave
- Optimizes bandwidth with efficient diffs
- Provides type safety

## Get Started

```bash
pnpm add @martini-kit/core @martini-kit/phaser
```

Ready to build your first game? Head to the [Quick Start](/docs/latest/getting-started/quick-start) guide!

## Core Packages

### @martini-kit/core
Engine-agnostic multiplayer SDK. Works with any rendering engine. [Learn more →](/docs/latest/api/core/define-game)

### @martini-kit/phaser
High-level Phaser 3 integration with automatic sprite syncing, input management, and physics helpers. [Learn more →](/docs/latest/api/phaser/adapter)

### @martini-kit/transport-*
Multiple transport layers: LocalTransport (testing), IframeBridge (IDE), Trystero (P2P), or build your own. [Learn more →](/docs/latest/api/transports/overview)

### @martini-kit/devtools
State inspection, action history, and debugging tools for development. [Learn more →](/docs/latest/api/devtools/state-inspector)

## Popular Topics

- [Core Concepts](/docs/latest/concepts/architecture) - Understand martini-kit's architecture
- [Actions Guide](/docs/latest/concepts/actions) - Learn how to define and use actions
- [Phaser Integration Guide](/docs/latest/engine-tracks/phaser) - Deep dive into Phaser + martini-kit
- [Examples](/examples/overview) - Explore complete game examples
- [Contributing](/docs/latest/contributing/getting-started) - Help improve martini-kit

## Need Help?

- [Troubleshooting](/docs/latest/operate/troubleshooting/common-issues) - Common issues and solutions
- [FAQ](/docs/latest/operate/faq) - Frequently asked questions
- [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues) - Report bugs or request features
- [Discord](https://discord.gg/aT2mYAVVzk) - Join the community
