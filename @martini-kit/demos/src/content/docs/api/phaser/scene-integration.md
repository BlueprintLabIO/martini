---
title: Scene Integration
description: Integrating martini-kit with Phaser scenes
---

# Scene Integration

Best practices for integrating martini-kit with Phaser scenes.

## Basic Setup

```typescript
import Phaser from 'phaser';
import { GameRuntime, defineGame } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import { LocalTransport } from '@martini-kit/transport-local';

// Define game
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 400, y: 300, health: 100 }])
    )
  }),

  actions: {
    move: {
      apply(state, context, input: { x: number; y: number }) {
        const player = state.players[context.targetId];
        if (player) {
          player.x = input.x;
          player.y = input.y;
        }
      }
    }
  }
});

// Phaser scene
export class GameScene extends Phaser.Scene {
  private runtime!: GameRuntime;
  private adapter!: PhaserAdapter;
  private playerManager!: SpriteManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Create transport
    const transport = new LocalTransport({
      roomId: 'game-' + Date.now(),
      isHost: true
    });

    // Create runtime
    this.runtime = new GameRuntime(game, transport, {
      isHost: true,
      playerIds: [transport.getPlayerId()]
    });

    // Create adapter
    this.adapter = new PhaserAdapter(this.runtime, this);

    // Setup game objects
    this.createPlayers();
    this.createInput();

    // Cleanup on scene shutdown
    this.events.once('shutdown', () => {
      this.cleanup();
    });
  }

  private createPlayers() {
    this.playerManager = this.adapter.createSpriteManager({
      onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),
      onCreatePhysics: (sprite) => {
        this.physics.add.existing(sprite);
      }
    });

    // Create initial players (host only)
    if (this.adapter.isHost()) {
      this.playerManager.add(`player-${this.adapter.myId}`, {
        x: 400,
        y: 300
      });
    }
  }

  private createInput() {
    const inputManager = this.adapter.createInputManager();
    inputManager.loadProfile('platformer');
    this.inputManager = inputManager;
  }

  update() {
    // Process input
    this.inputManager?.update();

    // Game logic here
  }

  private cleanup() {
    // Destroy managers
    this.playerManager?.destroy();
    this.adapter?.destroy();
    this.runtime?.destroy();
  }
}
```

## Multi-Scene Games

### Lobby + Game Scenes

```typescript
class LobbyScene extends Phaser.Scene {
  create() {
    // Create runtime in lobby
    this.runtime = new GameRuntime(lobbyGame, transport, config);
    this.adapter = new PhaserAdapter(this.runtime, this);

    // Store in registry for other scenes
    this.registry.set('runtime', this.runtime);
    this.registry.set('adapter', this.adapter);

    // Start game button
    this.add.text(400, 300, 'Click to Start', { fontSize: '32px' })
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.start('GameScene');
      });
  }
}

class GameScene extends Phaser.Scene {
  create() {
    // Retrieve from registry
    this.runtime = this.registry.get('runtime');
    this.adapter = new PhaserAdapter(this.runtime, this);

    // Setup game
    this.createPlayers();
  }

  shutdown() {
    // Clean up adapter but keep runtime
    this.adapter.destroy();
  }
}
```

## Best Practices

### ✅ Do

- **Create runtime once** - Share across scenes via registry
- **Create new adapter per scene** - Scene-specific
- **Cleanup in shutdown** - Call `destroy()` methods
- **Use scene events** - For lifecycle management
- **Store in instance variables** - Not global

### ❌ Don't

- **Don't create multiple runtimes** - One per game session
- **Don't forget cleanup** - Memory leaks
- **Don't share adapters** - Scene-specific
- **Don't use global variables** - Use scene registry

## See Also

- [PhaserAdapter](./adapter) - Main adapter API
- [GameRuntime](../core/game-runtime) - Runtime API
- [Quick Start Guide](/docs/getting-started/quick-start) - Setup tutorial
