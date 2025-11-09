/**
 * Complete Custom API Documentation for AI System Prompt
 *
 * This file contains the full game platform API documentation that is
 * injected into the AI agent's system prompt. This ensures the AI always
 * has access to our custom APIs (scene management, multiplayer, utilities).
 *
 * Import: import { CUSTOM_API_DOCS } from '$lib/ai/api-docs-prompt';
 *
 * Source: Automatically synced from docs/CUSTOM_API.md
 */

export const CUSTOM_API_DOCS = `# Game Platform Custom API

**Complete reference for building games on our platform**

Our platform provides a controlled runtime that manages the Phaser game instance for stability, hot reload, and multiplayer support. Your game code defines scenes and uses our \`gameAPI\` to interact with the game engine.

---

## Quick Start

### Minimal Game

\`\`\`javascript
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
\`\`\`

### With Update Loop

\`\`\`javascript
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
\`\`\`

---

## Scene System

### Defining Scenes

Scenes are defined as objects in the \`window.scenes\` object. Each scene has a unique key and can define three lifecycle methods:

\`\`\`javascript
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
\`\`\`

### Scene State

The \`this\` context in scene methods is a **persistent state object** that survives across scene switches:

\`\`\`javascript
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
        this.scoreText.setText(\`Score: \${this.score}\`);
      }
    }
  }
};
\`\`\`

### Starting Scene

By default, the first scene in \`window.scenes\` runs first. Specify a different starting scene:

\`\`\`javascript
window.scenes = {
  MenuScene: { /* ... */ },
  GameScene: { /* ... */ }
};

// Start with MenuScene instead of first scene
window.startScene = 'MenuScene';
\`\`\`

---

## Scene Management API

### \`gameAPI.switchScene(sceneKey, data)\`

Switch to a different scene.

**Parameters:**
- \`sceneKey\` (string): Key of the scene to switch to
- \`data\` (object, optional): Data to pass to the new scene's \`create()\` function

**Example:**

\`\`\`javascript
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
      gameAPI.log(\`Starting with \${data.lives} lives, \${data.difficulty} mode\`);
      this.lives = data.lives;
    }
  }
};
\`\`\`

### \`gameAPI.getCurrentScene()\`

Get the key of the currently active scene.

**Returns:** \`string\` - Current scene key

### \`gameAPI.pauseScene()\`

Pause the current scene (stops update loop).

### \`gameAPI.resumeScene()\`

Resume the paused scene.

---

## Utility API

### \`gameAPI.log(message)\`

Log a message to the console panel.

\`\`\`javascript
create(scene) {
  gameAPI.log('Game initialized!');
  gameAPI.log(\`Player spawned at \${this.player.x}, \${this.player.y}\`);
}
\`\`\`

### \`gameAPI.random()\`

Get a seeded random number (0-1). **Use this for multiplayer games** to ensure deterministic behavior across all players.

\`\`\`javascript
create(scene) {
  // Spawn enemy at random position
  const x = gameAPI.random() * 800;
  const y = gameAPI.random() * 600;

  this.enemy = scene.add.circle(x, y, 15, 0xff0000);
}
\`\`\`

### \`gameAPI.getFrame()\`

Get the current frame number (increments every frame).

\`\`\`javascript
update(scene) {
  // Spawn enemy every 60 frames (~ 1 second at 60 FPS)
  if (gameAPI.getFrame() % 60 === 0) {
    this.spawnEnemy(scene);
  }
}
\`\`\`

---

## Multiplayer API

### Auto-Sync Players

The easiest way to add multiplayer - automatically syncs player position, velocity, and animations.

#### \`gameAPI.multiplayer.trackPlayer(sprite, options)\`

\`\`\`javascript
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
\`\`\`

**Options:**
- \`sync\`: Array of properties to sync (default: \`['x', 'y', 'velocityX', 'velocityY', 'frame']\`)
- \`updateRate\`: Updates per second (default: 30)
- \`role\`: Custom metadata (e.g., 'fireboy', 'watergirl')
- \`color\`: Tint for remote players

### Game Events

Send game events to all players (for collectibles, doors, attacks, etc.)

#### \`gameAPI.multiplayer.broadcast(eventName, data)\`

\`\`\`javascript
// Collect coin
collectCoin(coinId) {
  this.score += 10;
  gameAPI.multiplayer.broadcast('coin-collected', {
    coinId: coinId,
    score: this.score
  });
}
\`\`\`

#### \`gameAPI.multiplayer.on(eventName, callback)\`

\`\`\`javascript
create(scene) {
  // Listen for coin collection
  gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
    const coin = this.coins.find(c => c.id === data.coinId);
    if (coin) coin.destroy();

    this.updateScoreboard(peerId, data.score);
  });
}
\`\`\`

### Player Info

#### \`gameAPI.multiplayer.isHost()\`

Returns \`true\` if you're the host. **Use this to spawn enemies and collectibles** (prevents duplicates).

\`\`\`javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    this.spawnEnemies();
  }
}
\`\`\`

#### \`gameAPI.multiplayer.getMyId()\`

Get your unique player ID.

\`\`\`javascript
const myId = gameAPI.multiplayer.getMyId();
\`\`\`

#### \`gameAPI.multiplayer.getPlayers()\`

Get list of all connected players.

\`\`\`javascript
const players = gameAPI.multiplayer.getPlayers();
console.log(\`\${players.length} players connected\`);
\`\`\`

### Deterministic Random

Use \`gameAPI.random()\` instead of \`Math.random()\` to ensure all players see the same level layout.

\`\`\`javascript
if (gameAPI.multiplayer.isHost()) {
  gameAPI.random.setSeed(12345); // Same seed = same level

  for (let i = 0; i < 10; i++) {
    const x = gameAPI.random() * 800;  // Same on all clients
    scene.add.platform(x, 400);
  }
}
\`\`\`

---

## Advanced Access

### \`gameAPI.scene\` or \`window.scene\`

Get the current Phaser scene object (for advanced Phaser features).

\`\`\`javascript
create(scene) {
  // Both are equivalent:
  const cam = gameAPI.scene.cameras.main;
  const cam2 = scene.cameras.main; // Preferred (passed as parameter)

  // Advanced: Camera shake effect
  scene.cameras.main.shake(500, 0.01);

  // Advanced: Physics groups
  const platforms = scene.physics.add.staticGroup();
}
\`\`\`

### \`gameAPI.game\` or \`window.game\`

Get the Phaser game instance (read-only, for inspection).

\`\`\`javascript
create(scene) {
  gameAPI.log(\`Game size: \${gameAPI.game.config.width}x\${gameAPI.game.config.height}\`);
  gameAPI.log(\`FPS: \${gameAPI.game.loop.actualFps}\`);
}
\`\`\`

---

## 5 CRITICAL MULTIPLAYER RULES

1. ALWAYS call trackPlayer() in create() after creating player sprite
2. ALWAYS wrap enemy/collectible spawning in if (gameAPI.multiplayer.isHost())
3. ALWAYS use gameAPI.random() not Math.random() in multiplayer
4. ALWAYS broadcast() when game state changes (coins, doors, attacks)
5. ALWAYS register on() in create(), NEVER in update()

## Common Mistakes

❌ this.enemy = scene.add.sprite(400, 300, 'enemy');
✅ if (gameAPI.multiplayer.isHost()) { this.enemy = scene.add.sprite(400, 300, 'enemy'); }

❌ const x = Math.random() * 800;
✅ const x = gameAPI.random() * 800;

❌ update(scene) { gameAPI.multiplayer.on('attack', ...); }
✅ create(scene) { gameAPI.multiplayer.on('attack', ...); }
`;
