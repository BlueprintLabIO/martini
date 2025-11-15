---
title: Quick Start
description: Build your first multiplayer game in 5 minutes
section: getting-started
order: 2
---

# Quick Start

Build a simple multiplayer game in 5 minutes. This tutorial will guide you through creating a game where players can move sprites that sync across all connected clients.

## Step 1: Define Your Game

```typescript
// game.ts
import { defineGame } from '@martini/core';

export const gameDefinition = defineGame({
  state: {
    players: {}  // Store all player positions
  },

  actions: {
    move({ state, playerId }, { x, y }) {
      if (!state.players[playerId]) {
        state.players[playerId] = { x: 0, y: 0 };
      }
      state.players[playerId].x = x;
      state.players[playerId].y = y;
    }
  }
});
```

## Step 2: Create Phaser Scene

```typescript
// main.ts
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini/phaser';
import { LocalTransport } from '@martini/transport-local';
import { gameDefinition } from './game';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  async create() {
    // Initialize Martini
    this.martini = new PhaserAdapter(
      this,
      gameDefinition,
      new LocalTransport()
    );

    await this.martini.init();

    // Create sprite for this player
    const sprite = this.add.circle(400, 300, 20, 0x00ff00);

    // Handle input
    this.input.on('pointermove', (pointer) => {
      this.martini.dispatch('move', {
        x: pointer.x,
        y: pointer.y
      });
    });

    // Sync sprite positions
    this.martini.onStateChange((state) => {
      const myPlayer = state.players[this.martini.playerId];
      if (myPlayer) {
        sprite.x = myPlayer.x;
        sprite.y = myPlayer.y;
      }
    });
  }
}

// Launch Phaser
new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [GameScene]
});
```

## Step 3: Run Your Game

```bash
npm run dev
```

That's it! You now have a working multiplayer game. Move your mouse and watch the sprite follow in real-time.

## What's Happening?

1. **defineGame()** creates a game definition with state and actions
2. **PhaserAdapter** connects Martini to your Phaser scene
3. **LocalTransport** handles networking (simulates multiplayer locally)
4. **dispatch()** sends actions to be processed
5. **onStateChange()** receives synchronized state updates

## Next Steps

- Learn about [Core Concepts](/docs/core-concepts/host-authority)
- Explore [Phaser Integration](/docs/guides/phaser-integration)
- Choose a [Transport](/docs/api/transports) for real networking
