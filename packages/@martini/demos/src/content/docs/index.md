---
title: Martini Documentation
description: Comprehensive documentation for the Martini multiplayer game framework
section: home
---

# Martini Documentation

Welcome to the Martini multiplayer SDK documentation! Martini lets you build real-time multiplayer games with minimal code.

## Quick Links

- **[Getting Started](/docs/getting-started/installation)** - Build your first multiplayer game in 15 minutes
- **[API Reference](/docs/api/core)** - Detailed API documentation

## Features

✅ **Declarative API** - Define state and actions, not networking code
✅ **Host-authoritative** - Host runs the game, clients mirror state
✅ **Automatic sync** - Efficient diff/patch algorithm
✅ **Engine-agnostic** - Works with Phaser, Unity, Godot, Three.js
✅ **Transport-agnostic** - P2P, WebSocket, UDP - your choice
✅ **TypeScript** - Full type safety

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

Ready to build your first game? Head to the [Quick Start](/docs/getting-started/quick-start) guide!
