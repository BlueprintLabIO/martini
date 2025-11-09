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

### `gameAPI.random()`

Get a seeded random number (0-1). **Use this for multiplayer games** to ensure deterministic behavior across all players.

```javascript
create(scene) {
  // Spawn enemy at random position
  const x = gameAPI.random() * 800;
  const y = gameAPI.random() * 600;

  this.enemy = scene.add.circle(x, y, 15, 0xff0000);
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

#### `gameAPI.multiplayer.trackPlayer(sprite, options)`

```javascript
// Fire Boy & Water Girl example
create(scene) {
  this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

  // ✨ One line enables multiplayer
  gameAPI.multiplayer.trackPlayer(this.myPlayer, {
    role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
  });

  // Host spawns level (prevents duplicates)
  if (gameAPI.multiplayer.isHost()) {
    this.createLevel(scene);
  }
}

update(scene) {
  // Standard Phaser code - no manual sync needed!
  const cursors = scene.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) this.myPlayer.setVelocityX(-160);
}
```

**Options:**
- `sync`: Array of properties to sync (default: `['x', 'y', 'velocityX', 'velocityY', 'frame']`)
- `updateRate`: Updates per second (default: 30)
- `role`: Custom metadata (e.g., 'fireboy', 'watergirl')
- `color`: Tint for remote players

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

### Deterministic Random

Use `gameAPI.random()` instead of `Math.random()` to ensure all players see the same level layout.

```javascript
if (gameAPI.multiplayer.isHost()) {
  gameAPI.random.setSeed(12345); // Same seed = same level

  for (let i = 0; i < 10; i++) {
    const x = gameAPI.random() * 800;  // Same on all clients
    scene.add.platform(x, 400);
  }
}
```

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

      // Create collectibles
      this.score = 0;
      this.scoreText = scene.add.text(10, 10, 'Score: 0', {
        fontSize: '24px',
        color: '#fff'
      });

      this.coins = [];
      for (let i = 0; i < 5; i++) {
        const x = gameAPI.random() * 800;
        const y = gameAPI.random() * 600;
        this.coins.push(scene.add.circle(x, y, 10, 0xffff00));
      }
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

      // Spawn enemies
      this.spawnTimer += delta;
      if (this.spawnTimer > 1000) {
        this.spawnTimer = 0;
        const x = gameAPI.random() * 800;
        const enemy = scene.add.circle(x, -20, 15, 0xff0000);
        this.enemies.push(enemy);
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
