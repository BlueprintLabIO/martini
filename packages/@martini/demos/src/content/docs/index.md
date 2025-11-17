---
title: Martini Documentation
description: Build real-time multiplayer games with minimal code using the Martini SDK
section: home
---

# Martini SDK Documentation

**Build real-time multiplayer games with minimal code.** Martini is an engine-agnostic, host-authoritative multiplayer framework designed for rapid game development.

## Quick Start

<div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">

<div>
<h3>🚀 Installation</h3>
<p>Install Martini and set up your first project in 5 minutes.</p>
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

<div class="features">

✅ **Declarative API** - Define state and actions, not networking code
✅ **Host-authoritative** - Host runs the game, clients mirror state
✅ **Automatic sync** - Efficient diff/patch algorithm minimizes bandwidth
✅ **Engine-agnostic** - Works with Phaser, Unity, Godot, Three.js
✅ **Transport-agnostic** - P2P, WebSocket, or custom - your choice
✅ **TypeScript-first** - Full type safety and IntelliSense
✅ **Production-ready** - Battle-tested in real games
✅ **Open source** - MIT licensed, community-driven

</div>

## What is Martini?

Martini is a multiplayer game framework that handles all the networking complexity for you. Instead of writing socket handlers and sync logic, you just define your game state and actions - Martini handles the rest.

### The Traditional Way

```typescript
// Manual networking - hundreds of lines of boilerplate
socket.on('player-moved', (data) => {
  players[data.id].x = data.x;
  players[data.id].y = data.y;
});

socket.emit('move-player', { id: playerId, x: newX, y: newY });
```

### The Martini Way

```typescript
// Declarative multiplayer - just define state and actions
import { defineGame } from '@martini/core';

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

That's it! Martini automatically:
- Syncs state across all players
- Handles player join/leave
- Optimizes bandwidth with efficient diffs
- Provides type safety

## Get Started

```bash
pnpm add @martini/core @martini/phaser
```

Ready to build your first game? Head to the [Quick Start](/docs/latest/getting-started/quick-start) guide!

## Core Packages

### @martini/core
Engine-agnostic multiplayer SDK. Works with any rendering engine. [Learn more →](/docs/latest/api/core/define-game)

### @martini/phaser
High-level Phaser 3 integration with automatic sprite syncing, input management, and physics helpers. [Learn more →](/docs/latest/api/phaser/adapter)

### @martini/transport-*
Multiple transport layers: LocalTransport (testing), IframeBridge (IDE), Trystero (P2P), or build your own. [Learn more →](/docs/latest/api/transports/overview)

### @martini/devtools
State inspection, action history, and debugging tools for development. [Learn more →](/docs/latest/api/devtools/state-inspector)

## Popular Topics

- [Core Concepts](/docs/latest/concepts/architecture) - Understand Martini's architecture
- [Actions Guide](/docs/latest/concepts/actions) - Learn how to define and use actions
- [Phaser Integration](/docs/latest/guides/phaser-integration) - Deep dive into Phaser + Martini
- [Examples](/docs/latest/examples/overview) - Explore complete game examples
- [Contributing](/docs/latest/contributing/getting-started) - Help improve Martini

## Need Help?

- [Troubleshooting](/docs/latest/troubleshooting/common-issues) - Common issues and solutions
- [FAQ](/docs/latest/faq) - Frequently asked questions
- [GitHub Issues](https://github.com/your-org/martini/issues) - Report bugs or request features
- [Discord](https://discord.gg/your-server) - Join the community
