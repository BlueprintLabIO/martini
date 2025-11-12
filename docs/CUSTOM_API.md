# Game Platform Custom API

**Complete reference for building games on our platform**

Our platform provides a controlled runtime that manages the Phaser game instance for stability, hot reload, and multiplayer support. Your game code defines scenes and uses our `gameAPI` to interact with the game engine.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Scene System](#scene-system)
- [Scene Management API](#scene-management-api)
- [Utility API](#utility-api)
- [Multiplayer API](#multiplayer-api)
- [Advanced Access](#advanced-access)
- [Complete Examples](#complete-examples)

---

## Quick Start

### Minimal Game

```javascript
// /src/main.js
window.scenes = {
  MainScene: {
    create(scene) {
      scene.add.text(400, 300, 'Hello World!', {
        fontSize: '48px',
        color: '#ffffff'
      }).setOrigin(0.5);
    }
  }
};
```

### With Update Loop

```javascript
window.scenes = {
  GameScene: {
    create(scene) {
      // Create a player circle
      this.player = scene.add.circle(400, 300, 20, 0x00ff00);
      this.speed = 5;
    },

    update(scene, time, delta) {
      // Move player with arrow keys
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) {
        this.player.x -= this.speed;
      }
      if (cursors.right.isDown) {
        this.player.x += this.speed;
      }
    }
  }
};
```

---

## Scene System

### Defining Scenes

Scenes are defined as objects in the `window.scenes` object. Each scene has a unique key and can define three lifecycle methods:

```javascript
window.scenes = {
  SceneKey: {
    // Optional: Load assets
    preload(scene) {
      // scene.load.image('player', '/assets/player.png');
    },

    // Required: Initialize scene objects
    create(scene, data) {
      // data = optional data passed from gameAPI.switchScene()
      // this = persistent scene state object
    },

    // Optional: Game loop (runs every frame)
    update(scene, time, delta) {
      // time = total milliseconds since game started
      // delta = milliseconds since last frame
    }
  }
};
```

### Scene State

The `this` context in scene methods is a **persistent state object** that survives across scene switches:

```javascript
window.scenes = {
  GameScene: {
    create(scene) {
      // Store state on 'this'
      this.score = 0;
      this.level = 1;
      this.scoreText = scene.add.text(10, 10, 'Score: 0');
    },

    update(scene) {
      // Access state from 'this'
      if (this.enemyHit) {
        this.score += 10;
        this.scoreText.setText(`Score: ${this.score}`);
      }
    }
  }
};
```

### Starting Scene

By default, the first scene in `window.scenes` runs first. Specify a different starting scene:

```javascript
window.scenes = {
  MenuScene: { /* ... */ },
  GameScene: { /* ... */ }
};

// Start with MenuScene instead of first scene
window.startScene = 'MenuScene';
```

---

## Scene Management API

### `gameAPI.switchScene(sceneKey, data)`

Switch to a different scene.

**Parameters:**
- `sceneKey` (string): Key of the scene to switch to
- `data` (object, optional): Data to pass to the new scene's `create()` function

**Example:**

```javascript
window.scenes = {
  MenuScene: {
    create(scene) {
      const startButton = scene.add.text(400, 300, 'START', {
        fontSize: '32px'
      }).setOrigin(0.5).setInteractive();

      startButton.on('pointerdown', () => {
        gameAPI.switchScene('Level1', { lives: 3, difficulty: 'normal' });
      });
    }
  },

  Level1: {
    create(scene, data) {
      gameAPI.log(`Starting with ${data.lives} lives, ${data.difficulty} mode`);
      this.lives = data.lives;
    }
  }
};
```

### `gameAPI.getCurrentScene()`

Get the key of the currently active scene.

**Returns:** `string` - Current scene key

**Example:**

```javascript
update(scene) {
  if (gameAPI.getCurrentScene() === 'GameScene') {
    // Only update physics in GameScene
    this.updatePhysics();
  }
}
```

### `gameAPI.pauseScene()`

Pause the current scene (stops update loop).

```javascript
create(scene) {
  scene.input.keyboard.on('keydown-ESC', () => {
    gameAPI.pauseScene();
    // Show pause menu
  });
}
```

### `gameAPI.resumeScene()`

Resume the paused scene.

```javascript
// In pause menu
resumeButton.on('pointerdown', () => {
  gameAPI.resumeScene();
});
```

---

## Utility API

### `gameAPI.log(message)`

Log a message to the console panel.

```javascript
create(scene) {
  gameAPI.log('Game initialized!');
  gameAPI.log(`Player spawned at ${this.player.x}, ${this.player.y}`);
}
```


### `gameAPI.getFrame()`

Get the current frame number (increments every frame).

```javascript
update(scene) {
  // Spawn enemy every 60 frames (~ 1 second at 60 FPS)
  if (gameAPI.getFrame() % 60 === 0) {
    this.spawnEnemy(scene);
  }
}
```

---

## Multiplayer API

### Auto-Sync Players

The easiest way to add multiplayer - automatically syncs player position, velocity, and animations.
Uses a **factory function pattern** where you define how remote players are created.

#### `gameAPI.multiplayer.trackPlayer(sprite, options)`

**⚡ CRITICAL:** You MUST provide a `createRemotePlayer` function that defines how remote players look!

```javascript
// Fire Boy & Water Girl example
create(scene) {
  const myRole = gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl';
  const myColor = myRole === 'fireboy' ? 0xff3300 : 0x0033ff;

  // Create YOUR player
  this.myPlayer = scene.add.circle(100, 100, 20, myColor);
  scene.physics.add.existing(this.myPlayer);

  // ✨ Track with factory function for remote players
  gameAPI.multiplayer.trackPlayer(this.myPlayer, {
    role: myRole,
    createRemotePlayer: (scene, remoteRole, initialState) => {
      // Create remote player based on THEIR role (not yours!)
      const color = remoteRole === 'fireboy' ? 0xff3300 : 0x0033ff;
      const remote = scene.add.circle(initialState.x, initialState.y, 20, color);
      scene.physics.add.existing(remote);
      remote.body.setCollideWorldBounds(true);
      return remote;  // ✅ Must return the sprite!
    }
  });

  // Host spawns level (prevents duplicates)
  if (gameAPI.multiplayer.isHost()) {
    this.createLevel(scene);
  }
}

update(scene) {
  // Standard Phaser code - no manual sync needed!
  const cursors = scene.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) this.myPlayer.body.setVelocityX(-160);
}
```

**How it works:**
1. Each player calls `trackPlayer()` with their local player sprite
2. The runtime broadcasts position updates to other players
3. When another player joins, YOUR `createRemotePlayer` function is called with THEIR role
4. You create a sprite matching their role (fireboy = red, watergirl = blue)
5. The runtime automatically syncs their position/velocity to your created sprite

**Options:**
- `sync`: Array of properties to sync (default: `['x', 'y', 'velocityX', 'velocityY', 'frame']`)
- `updateRate`: Updates per second (default: 30). Use 10 for turn-based, 60 for racing
- `interpolate`: Smooth remote player movement (default: true)
- `role`: Custom metadata (e.g., 'fireboy', 'watergirl') - passed to createRemotePlayer
- `createRemotePlayer`: **REQUIRED** - Function `(scene, role, initialState) => sprite`

**createRemotePlayer function signature:**
- `scene`: The Phaser scene to create sprites in
- `role`: The remote player's role string (what THEY passed to trackPlayer)
- `initialState`: Object with `{x, y, velocityX, velocityY}` for initial position
- **Returns:** The created sprite/game object (must not be null!)

### Game Events

Send game events to all players (for collectibles, doors, attacks, etc.)

#### `gameAPI.multiplayer.broadcast(eventName, data)`

```javascript
// Collect coin
collectCoin(coinId) {
  this.score += 10;
  gameAPI.multiplayer.broadcast('coin-collected', {
    coinId: coinId,
    score: this.score
  });
}
```

#### `gameAPI.multiplayer.on(eventName, callback)`

```javascript
create(scene) {
  // Listen for coin collection
  gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
    const coin = this.coins.find(c => c.id === data.coinId);
    if (coin) coin.destroy();

    this.updateScoreboard(peerId, data.score);
  });
}
```

### Player Info

#### `gameAPI.multiplayer.isHost()`

Returns `true` if you're the host. **Use this to spawn enemies and collectibles** (prevents duplicates).

```javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    this.spawnEnemies();
  }
}
```

#### `gameAPI.multiplayer.getMyId()`

Get your unique player ID.

**Returns:** `string | null` - Your player ID, or `null` if multiplayer is not active

**Guarantees:**
- Returns non-null when multiplayer is active (after "Start Multiplayer" clicked)
- Returns `null` in single-player mode
- ID is stable throughout the session (doesn't change)

```javascript
const myId = gameAPI.multiplayer.getMyId();

// In multiplayer mode, myId is guaranteed to be a valid string
// In single-player mode, myId will be null
```

#### `gameAPI.multiplayer.getPlayers()`

Get list of all connected players.

```javascript
const players = gameAPI.multiplayer.getPlayers();
console.log(`${players.length} players connected`);
```

### Host-Only Spawning

**Always use host-only spawning for level generation and dynamic content.**

The host is responsible for spawning all game objects (enemies, collectibles, platforms) and broadcasting their state to all players. This ensures consistency without complex synchronization.

```javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    // Host spawns all level objects
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 800;
      const platform = scene.add.rectangle(x, 400, 100, 20, 0x8b4513);

      // Broadcast to all players
      gameAPI.multiplayer.broadcast('spawn-platform', { x, y: 400, width: 100, height: 20 });
    }
  }

  // All players listen for spawn events
  gameAPI.multiplayer.on('spawn-platform', (peerId, data) => {
    scene.add.rectangle(data.x, data.y, data.width, data.height, 0x8b4513);
  });
}
```

---

## Advanced Multiplayer SDK

For complex multiplayer games requiring **deterministic synchronization**, **action validation**, or **server-authoritative gameplay**, use the Martini Multiplayer SDK instead of the simple `gameAPI.multiplayer` API.

### When to Use Advanced SDK

Use the advanced SDK when you need:
- **Deterministic gameplay** - All clients execute the same actions in the same order
- **Rollback/replay** - Time-travel debugging and replay systems
- **Action validation** - Server-side validation of cooldowns, proximity, rate limits
- **Variable tick rates** - Physics at 30Hz, AI at 10Hz, etc.
- **Complex state management** - Schema validation, auto-clamping, diff/patch sync

For simple games (collect coins, race games, party games), stick with `gameAPI.multiplayer`.

### Basic Setup

```javascript
// Available globally in sandbox
const { PhaserMultiplayerRuntime, TrysteroTransport } = MartiniMultiplayer;

create(scene) {
  // 1. Create transport (P2P networking layer)
  const transport = new TrysteroTransport({
    roomId: 'my-game-room-123',  // Unique room ID
    appId: 'my-game'              // Your game name
  });

  // 2. Define game logic (deterministic actions + state)
  const gameLogic = {
    setup: ({ playerIds }) => ({
      players: Object.fromEntries(
        playerIds.map(id => [id, { score: 0, x: 100, y: 100 }])
      )
    }),

    actions: {
      move: {
        input: { dx: 'number', dy: 'number' },
        apply: ({ game, playerId, input }) => {
          game.players[playerId].x += input.dx;
          game.players[playerId].y += input.dy;
        }
      },

      collect: {
        input: { coinId: 'number' },
        cooldown: 100,  // Can only collect every 100ms
        apply: ({ game, playerId, input }) => {
          game.players[playerId].score += 10;
        }
      }
    },

    systems: {
      physics: {
        rate: 30,  // Run physics at 30 FPS
        tick: ({ game, dt }) => {
          // Update physics simulation
          Object.values(game.players).forEach(player => {
            player.y += 0.5;  // Apply gravity
          });
        }
      }
    }
  };

  // 3. Create runtime
  this.runtime = new PhaserMultiplayerRuntime(gameLogic, transport);

  // 4. Track local player sprite
  this.player = scene.add.circle(100, 100, 20, 0x00ff00);
  scene.physics.add.existing(this.player);

  this.runtime.trackPlayer(this.player, {
    role: 'player',
    createRemotePlayer: (scene, role, initialState) => {
      const remote = scene.add.circle(initialState.x, initialState.y, 20, 0xff0000);
      scene.physics.add.existing(remote);
      return remote;
    }
  });

  // 5. Use actions instead of direct state changes
  const api = this.runtime.getAPI();
  scene.input.on('pointerdown', () => {
    api.actions.collect({ coinId: 123 });
  });

  // 6. Listen for state changes
  api.onChange((state) => {
    this.scoreText.setText(`Score: ${state.players[this.runtime.getMyId()].score}`);
  });

  // 7. Start the runtime
  this.runtime.start();
}

update(scene) {
  // Control local player normally
  const cursors = scene.input.keyboard.createCursorKeys();
  const api = this.runtime.getAPI();

  if (cursors.left.isDown) {
    api.actions.move({ dx: -5, dy: 0 });
  }
  if (cursors.right.isDown) {
    api.actions.move({ dx: 5, dy: 0 });
  }
}
```

### Key Differences from Simple API

| Feature | Simple API (`gameAPI.multiplayer`) | Advanced SDK (`MartiniMultiplayer`) |
|---------|-----------------------------------|-------------------------------------|
| **State Management** | Manual (you broadcast changes) | Automatic (deterministic sync) |
| **Action Validation** | None | Cooldowns, proximity, rate limits |
| **Execution Order** | Best-effort (may differ) | Guaranteed same order on all clients |
| **Host Authority** | Yes (host spawns objects) | Yes (host executes actions first) |
| **Complexity** | Low (good for simple games) | Medium (good for complex games) |
| **Code Size** | 10-30 lines | 50-100 lines (schema + actions) |

### Advanced Features

**Schema Validation:**
```javascript
const gameLogic = {
  schema: {
    score: { type: 'number', min: 0, max: 9999 },
    health: { type: 'number', min: 0, max: 100, default: 100 },
    position: {
      x: { type: 'number', min: 0, max: 800 },
      y: { type: 'number', min: 0, max: 600 }
    }
  },
  // ...
};
```

**Proximity-Based Actions:**
```javascript
actions: {
  openDoor: {
    input: { doorId: 'number' },
    proximity: {
      maxDistance: 50,
      targetPosition: (game, input) => game.doors[input.doorId]
    },
    apply: ({ game, input }) => {
      game.doors[input.doorId].open = true;
    }
  }
}
```

**Deterministic Random:**
```javascript
import { createSeededRandom } from 'MartiniMultiplayer';

const rand = createSeededRandom(12345);
const x = rand.nextInt(0, 800);  // Same on all clients
```

### Migration from Simple API

If you have existing code using `gameAPI.multiplayer.trackPlayer()`, here's how to migrate:

**Before (Simple API):**
```javascript
gameAPI.multiplayer.trackPlayer(this.player, {
  role: 'player',
  createRemotePlayer: (scene, role, state) => {
    return scene.add.sprite(state.x, state.y, 'player');
  }
});
```

**After (Advanced SDK):**
```javascript
const runtime = new MartiniMultiplayer.PhaserMultiplayerRuntime(gameLogic, transport);
runtime.trackPlayer(this.player, {
  role: 'player',
  createRemotePlayer: (scene, role, state) => {
    return scene.add.sprite(state.x, state.y, 'player');
  }
});
```

The API is intentionally similar for easy migration!

---

## Advanced Access

### `gameAPI.scene` or `window.scene`

Get the current Phaser scene object (for advanced Phaser features).

```javascript
create(scene) {
  // Both are equivalent:
  const cam = gameAPI.scene.cameras.main;
  const cam2 = scene.cameras.main; // Preferred (passed as parameter)

  // Advanced: Camera shake effect
  scene.cameras.main.shake(500, 0.01);

  // Advanced: Physics groups
  const platforms = scene.physics.add.staticGroup();
}
```

### `gameAPI.game` or `window.game`

Get the Phaser game instance (read-only, for inspection).

```javascript
create(scene) {
  gameAPI.log(`Game size: ${gameAPI.game.config.width}x${gameAPI.game.config.height}`);
  gameAPI.log(`FPS: ${gameAPI.game.loop.actualFps}`);
}
```

---

## Complete Examples

### Example 1: Single Scene Game

```javascript
// /src/main.js
window.scenes = {
  Game: {
    create(scene) {
      // Create player
      this.player = scene.add.circle(400, 300, 20, 0x00ff00);
      this.speed = 5;

      // Create score display
      this.score = 0;
      this.scoreText = scene.add.text(10, 10, 'Score: 0', {
        fontSize: '24px',
        color: '#fff'
      });

      // Host spawns collectibles
      this.coins = [];
      if (gameAPI.multiplayer.isHost()) {
        for (let i = 0; i < 5; i++) {
          const x = Math.random() * 800;
          const y = Math.random() * 600;
          const coin = scene.add.circle(x, y, 10, 0xffff00);
          this.coins.push(coin);

          // Broadcast coin spawn
          gameAPI.multiplayer.broadcast('spawn-coin', { id: i, x, y });
        }
      }

      // All players listen for coin spawns
      gameAPI.multiplayer.on('spawn-coin', (peerId, data) => {
        if (!gameAPI.multiplayer.isHost()) {
          const coin = scene.add.circle(data.x, data.y, 10, 0xffff00);
          coin.coinId = data.id;
          this.coins.push(coin);
        }
      });
    },

    update(scene) {
      // Player movement
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) this.player.x -= this.speed;
      if (cursors.right.isDown) this.player.x += this.speed;
      if (cursors.up.isDown) this.player.y -= this.speed;
      if (cursors.down.isDown) this.player.y += this.speed;

      // Collision detection
      this.coins = this.coins.filter(coin => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          coin.x, coin.y
        );

        if (dist < 30) {
          coin.destroy();
          this.score += 10;
          this.scoreText.setText(`Score: ${this.score}`);
          return false;
        }
        return true;
      });
    }
  }
};
```

### Example 2: Multi-Scene Game (Menu → Game → GameOver)

```javascript
// /src/main.js
window.scenes = {
  Menu: {
    create(scene) {
      scene.add.text(400, 200, 'SPACE SHOOTER', {
        fontSize: '64px',
        color: '#fff'
      }).setOrigin(0.5);

      const startBtn = scene.add.text(400, 400, 'START GAME', {
        fontSize: '32px',
        color: '#0f0'
      }).setOrigin(0.5).setInteractive();

      startBtn.on('pointerdown', () => {
        gameAPI.switchScene('Game', { level: 1 });
      });
    }
  },

  Game: {
    create(scene, data) {
      gameAPI.log(`Starting level ${data.level}`);

      // Player setup
      this.player = scene.add.circle(400, 550, 20, 0x00ff00);
      this.speed = 5;

      // Score setup
      this.score = 0;
      this.scoreText = scene.add.text(10, 10, 'Score: 0', {
        fontSize: '24px',
        color: '#fff'
      });

      // Enemies
      this.enemies = [];
      this.spawnTimer = 0;
    },

    update(scene, time, delta) {
      // Player movement
      const cursors = scene.input.keyboard.createCursorKeys();
      if (cursors.left.isDown) this.player.x -= this.speed;
      if (cursors.right.isDown) this.player.x += this.speed;

      // Host spawns enemies
      if (gameAPI.multiplayer.isHost()) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 1000) {
          this.spawnTimer = 0;
          const x = Math.random() * 800;
          const enemy = scene.add.circle(x, -20, 15, 0xff0000);
          this.enemies.push(enemy);

          // Broadcast enemy spawn
          gameAPI.multiplayer.broadcast('spawn-enemy', { x });
        }
      }

      // All players listen for enemy spawns
      if (!this.enemyListenerAdded) {
        gameAPI.multiplayer.on('spawn-enemy', (peerId, data) => {
          if (!gameAPI.multiplayer.isHost()) {
            const enemy = scene.add.circle(data.x, -20, 15, 0xff0000);
            this.enemies.push(enemy);
          }
        });
        this.enemyListenerAdded = true;
      }

      // Move enemies
      this.enemies = this.enemies.filter(enemy => {
        enemy.y += 2;

        // Check collision with player
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );

        if (dist < 35) {
          gameAPI.switchScene('GameOver', { score: this.score });
          return false;
        }

        // Remove off-screen enemies
        if (enemy.y > 650) {
          enemy.destroy();
          this.score += 1;
          this.scoreText.setText(`Score: ${this.score}`);
          return false;
        }

        return true;
      });
    }
  },

  GameOver: {
    create(scene, data) {
      scene.add.text(400, 250, 'GAME OVER', {
        fontSize: '64px',
        color: '#f00'
      }).setOrigin(0.5);

      scene.add.text(400, 350, `Final Score: ${data.score}`, {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5);

      const retryBtn = scene.add.text(400, 450, 'TRY AGAIN', {
        fontSize: '24px',
        color: '#0f0'
      }).setOrigin(0.5).setInteractive();

      retryBtn.on('pointerdown', () => {
        gameAPI.switchScene('Menu');
      });
    }
  }
};

window.startScene = 'Menu';
```

### Example 3: Multiplayer Pong

```javascript
// /src/main.js
window.onMultiplayerData = function(peerId, data) {
  if (data.type === 'paddle-move') {
    // Update opponent paddle
    const scene = window.scenes.PongGame;
    if (scene.opponentPaddle) {
      scene.opponentPaddle.y = data.y;
    }
  }

  if (data.type === 'ball-sync' && !gameAPI.multiplayer.isHost) {
    // Only client receives ball position from host
    const scene = window.scenes.PongGame;
    if (scene.ball) {
      scene.ball.x = data.x;
      scene.ball.y = data.y;
    }
  }
};

window.scenes = {
  PongGame: {
    create(scene) {
      // Player paddle
      this.paddle = scene.add.rectangle(
        gameAPI.multiplayer.isHost ? 50 : 750,
        300,
        20,
        100,
        0x00ff00
      );

      // Opponent paddle
      this.opponentPaddle = scene.add.rectangle(
        gameAPI.multiplayer.isHost ? 750 : 50,
        300,
        20,
        100,
        0xff0000
      );

      // Ball (only host controls physics)
      this.ball = scene.add.circle(400, 300, 10, 0xffffff);
      if (gameAPI.multiplayer.isHost) {
        this.ballVelX = 3;
        this.ballVelY = 3;
      }

      // Scores
      this.myScore = 0;
      this.opponentScore = 0;
      this.scoreText = scene.add.text(400, 50, '0 - 0', {
        fontSize: '48px',
        color: '#fff'
      }).setOrigin(0.5);
    },

    update(scene) {
      // Paddle movement
      const cursors = scene.input.keyboard.createCursorKeys();
      if (cursors.up.isDown) this.paddle.y -= 5;
      if (cursors.down.isDown) this.paddle.y += 5;

      // Send paddle position to opponent
      gameAPI.multiplayer.broadcast({
        type: 'paddle-move',
        y: this.paddle.y
      });

      // Ball physics (only host)
      if (gameAPI.multiplayer.isHost) {
        this.ball.x += this.ballVelX;
        this.ball.y += this.ballVelY;

        // Bounce off walls
        if (this.ball.y < 10 || this.ball.y > 590) {
          this.ballVelY *= -1;
        }

        // Send ball position to clients
        gameAPI.multiplayer.broadcast({
          type: 'ball-sync',
          x: this.ball.x,
          y: this.ball.y
        });
      }
    }
  }
};
```

---

## Migration Guide

If you have existing Phaser code that creates its own `Phaser.Game` instance, here's how to migrate:

### Before (Old Pattern)

```javascript
// DON'T DO THIS
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    create: function() {
      this.add.text(400, 300, 'Hello');
    }
  }
};

new Phaser.Game(config); // ❌ Not allowed
```

### After (New Pattern)

```javascript
// DO THIS
window.scenes = {
  MainScene: {
    create(scene) {
      scene.add.text(400, 300, 'Hello');
    }
  }
};
```

**Benefits of new pattern:**
- ✅ Hot reload works automatically
- ✅ Multiplayer sync enabled
- ✅ Better error handling
- ✅ Simpler mental model

---

## Support

Questions? Use the AI chat in the editor - it has access to this documentation and can help you build your game!
