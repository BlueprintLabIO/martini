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

/**
 * Scene architecture deep dive - explains the `this` context confusion
 */
export const SCENE_ARCHITECTURE_DOCS = `
## 🏗️ Scene Architecture Deep Dive

### Understanding the Scene State Pattern

Our platform uses a unique pattern where \`this\` in scene methods refers to a
**persistent state object**, not the scene definition object. This is often
confusing for developers coming from traditional OOP.

### How It Works

\`\`\`javascript
// The scene definition object
window.scenes = {
  GameScene: {  // ← This is the definition object
    create(scene) {
      // Inside here, \`this\` is NOT the GameScene object above
      // Instead, \`this\` is a persistent state object that survives scene switches
      this.score = 0;  // ✅ Stored on state object
      this.player = scene.add.sprite(100, 100);  // ✅ Accessible in update()
    }
  }
}
\`\`\`

### Why This Pattern?

This design provides:
1. **Persistent state** - Data survives across scene restarts
2. **Hot reload friendly** - State persists when code changes
3. **Simplified state management** - No manual save/load needed

### The "Helper Method" Problem

\`\`\`javascript
// ❌ THIS WILL NOT WORK
window.scenes = {
  Game: {
    create(scene) {
      this.createPlatforms(scene);  // ❌ ERROR!
    },

    createPlatforms(scene) {
      // This method is on the definition object,
      // NOT on the state object (\`this\`)
    }
  }
}
\`\`\`

**Why it fails:** When you call \`this.createPlatforms()\`, JavaScript looks for
\`createPlatforms\` on the state object (the current value of \`this\`), not on
the scene definition object.

### Solutions

#### Solution 1: Local Functions (Recommended for Setup)

\`\`\`javascript
window.scenes = {
  Game: {
    create(scene) {
      // Define helper as local function
      const createPlatforms = (scene) => {
        const platforms = [
          { x: 400, y: 550, width: 600, height: 20 },
          { x: 200, y: 450, width: 200, height: 20 }
        ];
        platforms.forEach(p => {
          scene.add.rectangle(p.x, p.y, p.width, p.height, 0x8b4513);
        });
      };

      createPlatforms(scene);  // ✅ Works!

      // Other local helpers
      const createEnemies = (scene) => { /* ... */ };
      const createUI = (scene) => { /* ... */ };

      createEnemies(scene);
      createUI(scene);
    }
  }
}
\`\`\`

**Use when:**
- Helper is only used once in \`create()\`
- Logic is specific to scene setup
- You don't need to access it from \`update()\`

#### Solution 2: Store on State Object (Recommended for Shared Logic)

\`\`\`javascript
window.scenes = {
  Game: {
    create(scene) {
      // Store method on state object
      this.checkCollision = (obj1, obj2) => {
        return Phaser.Math.Distance.Between(
          obj1.x, obj1.y,
          obj2.x, obj2.y
        ) < 30;
      };

      this.resetPlayer = (scene) => {
        this.player.x = 100;
        this.player.y = 100;
        this.lives -= 1;
      };

      // Now these work!
      this.player = scene.add.sprite(100, 100);
      this.enemy = scene.add.sprite(300, 100);
    },

    update(scene) {
      // Can call methods stored on \`this\`
      if (this.checkCollision(this.player, this.enemy)) {
        this.resetPlayer(scene);  // ✅ Works!
      }
    }
  }
}
\`\`\`

**Use when:**
- Method is shared between \`create()\` and \`update()\`
- Logic accesses scene state (\`this.score\`, \`this.player\`, etc.)
- You need the method to persist across scene restarts

### Decision Guide

\`\`\`
┌─────────────────────────────────────────────┐
│ Need a helper function?                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ Will it be used in update() or other methods?│
└──────────────┬────────────────┬──────────────┘
               │                │
            NO │                │ YES
               ▼                ▼
    ┌──────────────────┐  ┌────────────────────┐
    │ Local Function   │  │ Store on \`this\`    │
    │                  │  │                    │
    │ const helper =   │  │ this.helper =      │
    │   () => {}       │  │   () => {}         │
    └──────────────────┘  └────────────────────┘
\`\`\`

### Common Patterns

#### Pattern 1: Setup Helpers (Local Functions)

\`\`\`javascript
create(scene) {
  const createLevel = (levelNum) => {
    // Generate platforms, enemies, collectibles
  };

  const setupPhysics = () => {
    scene.physics.world.setBounds(0, 0, 800, 600);
  };

  const loadAssets = () => {
    // Any runtime asset loading
  };

  createLevel(1);
  setupPhysics();
  loadAssets();
}
\`\`\`

#### Pattern 2: Game Logic Methods (On \`this\`)

\`\`\`javascript
create(scene) {
  // Store game logic methods
  this.spawnEnemy = (x, y) => {
    const enemy = scene.add.sprite(x, y, 'enemy');
    this.enemies.push(enemy);
    return enemy;
  };

  this.collectCoin = (coin) => {
    coin.destroy();
    this.score += 10;
    this.scoreText.setText(\`Score: \${this.score}\`);
  };

  // Initialize state
  this.score = 0;
  this.enemies = [];
  this.scoreText = scene.add.text(10, 10, 'Score: 0');
}

update(scene) {
  // Can call methods defined in create()
  if (gameAPI.getFrame() % 120 === 0) {
    this.spawnEnemy(700, 100);
  }
}
\`\`\`

#### Pattern 3: Extracting to Separate Files (Advanced)

\`\`\`javascript
// /src/utils/levelBuilder.js
export function createPlatforms(scene, platformData) {
  platformData.forEach(p => {
    scene.add.rectangle(p.x, p.y, p.width, p.height, 0x8b4513);
  });
}

// /src/main.js
import { createPlatforms } from '/src/utils/levelBuilder.js';

window.scenes = {
  Game: {
    create(scene) {
      const platforms = [
        { x: 400, y: 550, width: 600, height: 20 }
      ];
      createPlatforms(scene, platforms);  // ✅ Works!
    }
  }
}
\`\`\`

**Use when:**
- Logic is reusable across multiple scenes
- File is getting large (> 500 lines)
- Helper is complex and deserves its own file
`;

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

${SCENE_ARCHITECTURE_DOCS}

---

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



**For multiplayer games, use the Martini SDK v2 instead of single-player scene patterns.**

The Martini SDK provides a declarative, host-authoritative multiplayer framework that works with Phaser. Instead of \`gameAPI.multiplayer.*\`, you use:
- \`defineGame()\` to define game logic
- \`GameRuntime\` to manage state
- \`PhaserAdapter\` to integrate with Phaser
- \`TrysteroTransport\` for P2P networking

### Architecture Overview

\`\`\`
┌─────────────────────────────────────┐
│           HOST                      │
│  • Runs game logic                  │
│  • Applies actions                  │
│  • Syncs state to clients (20 FPS)  │
└─────────────────┬───────────────────┘
                  │
         state patches (diff)
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌─────────────────┐ ┌─────────────────┐
│    CLIENT 1     │ │    CLIENT 2     │
│  • Sends actions│ │  • Sends actions│
│  • Mirrors state│ │  • Mirrors state│
└─────────────────┘ └─────────────────┘
\`\`\`

**Key Points:**
- Host runs physics, clients just render
- Automatic state synchronization
- No manual networking code needed

---

### Quick Start Example

**Fire Boy & Water Girl Multiplayer:**

\`\`\`javascript
import { defineGame, GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import { TrysteroTransport } from '@martini/transport-trystero';

// 1. Define game logic (declarative)
const gameLogic = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, role: null }])
    )
  }),

  actions: {
    setRole: {
      apply(state, playerId, input) {
        state.players[playerId].role = input.role;
      }
    }
  },

  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100, role: null };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});

// 2. Setup transport (P2P)
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room');
const isHost = !roomId; // No room param = host

const transport = new TrysteroTransport({
  roomId: isHost ? 'room-' + Math.random().toString(36).substr(2, 6) : roomId,
  isHost: isHost
});

// 3. Create runtime
const runtime = new GameRuntime(gameLogic, transport, {
  isHost: isHost,
  playerIds: [transport.getPlayerId()]
});

// 4. Create Phaser game with adapter
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: { default: 'arcade' },
  scene: {
    create: function() {
      // Create adapter
      const adapter = new PhaserAdapter(runtime, this);

      if (adapter.isHost()) {
        // Host: Create physics-enabled player
        this.player = this.physics.add.sprite(100, 100, 'player');
        adapter.trackSprite(this.player, \`player-\${adapter.myId}\`);

        // Host spawns level
        const platform = this.add.rectangle(400, 550, 600, 20, 0x888888);
        this.physics.add.existing(platform, true);
        this.physics.add.collider(this.player, platform);
      } else {
        // Client: Visual-only sprites
        this.player = this.add.sprite(100, 100, 'player');
        adapter.registerRemoteSprite(\`player-\${adapter.myId}\`, this.player);

        // Listen for state updates
        adapter.onChange((state) => {
          const myData = state.players[adapter.myId];
          if (myData) {
            this.player.x = myData.x;
            this.player.y = myData.y;
          }
        });
      }
    },

    update: function() {
      if (this.adapter.isHost()) {
        // Host runs physics
        const cursors = this.input.keyboard.createCursorKeys();
        if (cursors.left.isDown) {
          this.player.body.setVelocityX(-200);
        }
        // Adapter automatically syncs sprite position to state
      }
    }
  }
};

const game = new Phaser.Game(config);
\`\`\`

---

### Core Concepts

#### 1. Game Definition (\`defineGame\`)

Declare your game state and actions:

\`\`\`javascript
const game = defineGame({
  // Initial state factory
  setup: ({ playerIds }) => ({
    players: {},
    score: 0,
    gameState: 'waiting'
  }),

  // Actions (only way to modify state)
  actions: {
    move: {
      apply(state, playerId, input) {
        state.players[playerId].x = input.x;
        state.players[playerId].y = input.y;
      }
    },

    collectCoin: {
      apply(state, playerId, input) {
        state.coins = state.coins.filter(c => c.id !== input.coinId);
        state.players[playerId].score += 10;
      }
    }
  },

  // Lifecycle hooks
  onPlayerJoin(state, playerId) {
    state.players[playerId] = { x: 100, y: 100, score: 0 };
  },

  onPlayerLeave(state, playerId) {
    delete state.players[playerId];
  }
});
\`\`\`

**State Rules:**
- Must be JSON-serializable (no functions, no class instances)
- Mutated directly (not immutable like Redux)
- Only modified via actions on host

#### 2. Transport Setup

**P2P (Serverless):**

\`\`\`javascript
import { TrysteroTransport } from '@martini/transport-trystero';

// Host
const transport = new TrysteroTransport({
  roomId: 'my-game-' + Math.random().toString(36).substr(2, 6),
  isHost: true
});

// Share join URL
const joinUrl = \`\${window.location.origin}?room=\${roomId}\`;

// Client
const roomId = new URLSearchParams(window.location.search).get('room');
const transport = new TrysteroTransport({
  roomId: roomId,
  isHost: false
});
\`\`\`

**Benefits:** Zero server costs
**Limitations:** 5-10% of users may fail to connect (firewall/NAT issues)

#### 3. Runtime Creation

\`\`\`javascript
import { GameRuntime } from '@martini/core';

const runtime = new GameRuntime(gameLogic, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()],
  syncInterval: 50 // 20 FPS (default)
});
\`\`\`

#### 4. Phaser Adapter

Automatically syncs Phaser sprites with multiplayer state:

\`\`\`javascript
import { PhaserAdapter } from '@martini/phaser';

class GameScene extends Phaser.Scene {
  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create player sprite
    if (this.adapter.isHost()) {
      // Host: Full physics
      this.player = this.physics.add.sprite(100, 100, 'player');

      // Auto-sync sprite to state
      this.adapter.trackSprite(this.player, \`player-\${this.adapter.myId}\`);
    } else {
      // Client: Visual only
      this.player = this.add.sprite(100, 100, 'player');
      this.adapter.registerRemoteSprite(\`player-\${this.adapter.myId}\`, this.player);
    }
  }

  update() {
    if (this.adapter.isHost()) {
      // Host runs physics
      if (this.cursors.left.isDown) {
        this.player.body.setVelocityX(-200);
      }
      // Position auto-syncs!
    }
    // Clients: sprites auto-update from state
  }
}
\`\`\`

---

### PhaserAdapter API

#### \`adapter.isHost()\`

Returns \`true\` if this player is the authoritative host.

\`\`\`javascript
if (adapter.isHost()) {
  // Spawn enemies, run physics
} else {
  // Just render
}
\`\`\`

#### \`adapter.myId\`

Get your unique player ID (string).

\`\`\`javascript
const myId = adapter.myId;
adapter.trackSprite(sprite, \`player-\${myId}\`);
\`\`\`

#### \`adapter.trackSprite(sprite, key, options?)\`

**Host only** - Auto-sync sprite position/velocity to state.

\`\`\`javascript
// Host creates sprite with physics
const player = this.physics.add.sprite(100, 100, 'player');

// Track it (auto-syncs x, y, velocityX, velocityY)
adapter.trackSprite(player, 'player-p1');

// That's it! Position syncs automatically.
\`\`\`

**Options:**
- \`metadata\`: Custom data (e.g., \`{ role: 'fireboy' }\`)

**What it syncs:**
- \`x\`, \`y\`
- \`velocityX\`, \`velocityY\` (if sprite.body exists)
- \`active\`, \`visible\`
- Custom metadata

#### \`adapter.registerRemoteSprite(key, sprite)\`

**Client only** - Register sprite to receive state updates.

\`\`\`javascript
// Client creates visual-only sprite
const remotePlayer = this.add.sprite(100, 100, 'player');

// Register to receive updates
adapter.registerRemoteSprite('player-p1', remotePlayer);

// Sprite auto-updates when state changes!
\`\`\`

#### \`adapter.onChange(callback)\`

Listen for state changes.

\`\`\`javascript
adapter.onChange((state) => {
  console.log('Players:', Object.keys(state.players).length);

  // Update UI
  this.scoreText.setText(\`Score: \${state.score}\`);
});
\`\`\`

#### \`adapter.broadcast(eventName, payload)\`

Send custom event to all players.

\`\`\`javascript
// Host broadcasts explosion
adapter.broadcast('explosion', { x: 100, y: 200 });
\`\`\`

#### \`adapter.on(eventName, callback)\`

Listen for custom events.

\`\`\`javascript
adapter.on('explosion', (senderId, eventName, payload) => {
  this.particles.emitAt(payload.x, payload.y);
  this.sound.play('explosion');
});
\`\`\`

---

### Common Patterns

#### Pattern 1: Character Selection

\`\`\`javascript
const game = defineGame({
  setup: () => ({
    players: {},
    selectedRoles: {}
  }),

  actions: {
    selectRole: {
      apply(state, playerId, input) {
        // Validate role is available
        const taken = Object.values(state.selectedRoles);
        if (!taken.includes(input.role)) {
          state.selectedRoles[playerId] = input.role;
        }
      }
    }
  }
});

// In Phaser scene
create() {
  // Show role buttons
  ['fireboy', 'watergirl'].forEach((role, i) => {
    const btn = this.add.text(100 + i * 200, 300, role.toUpperCase());
    btn.setInteractive();
    btn.on('pointerdown', () => {
      runtime.submitAction('selectRole', { role });
    });
  });

  // Listen for role selection
  adapter.onChange((state) => {
    const myRole = state.selectedRoles[adapter.myId];
    if (myRole) {
      gameAPI.switchScene('GameScene', { role: myRole });
    }
  });
}
\`\`\`

#### Pattern 2: Host-Only Spawning

\`\`\`javascript
create() {
  if (adapter.isHost()) {
    // Host spawns enemies
    for (let i = 0; i < 5; i++) {
      const enemy = this.physics.add.sprite(
        100 + i * 150,
        200,
        'enemy'
      );
      this.enemies.push(enemy);
      adapter.trackSprite(enemy, \`enemy-\${i}\`);
    }
  } else {
    // Client listens for enemy state
    adapter.onChange((state) => {
      if (state._sprites) {
        Object.entries(state._sprites).forEach(([key, data]) => {
          if (key.startsWith('enemy-') && !this.enemies[key]) {
            const enemy = this.add.sprite(data.x, data.y, 'enemy');
            this.enemies[key] = enemy;
            adapter.registerRemoteSprite(key, enemy);
          }
        });
      }
    });
  }
}
\`\`\`

#### Pattern 3: Collectibles

\`\`\`javascript
const game = defineGame({
  setup: () => ({
    coins: [
      { id: 'c1', x: 100, y: 200, collected: false },
      { id: 'c2', x: 300, y: 200, collected: false }
    ]
  }),

  actions: {
    collectCoin: {
      apply(state, playerId, input) {
        const coin = state.coins.find(c => c.id === input.coinId);
        if (coin && !coin.collected) {
          coin.collected = true;
          state.players[playerId].score += 10;
        }
      }
    }
  }
});

// In Phaser
create() {
  this.coinSprites = {};

  if (adapter.isHost()) {
    // Host spawns coins
    runtime.getState().coins.forEach(coinData => {
      const coin = this.add.circle(coinData.x, coinData.y, 10, 0xffff00);
      this.coinSprites[coinData.id] = coin;

      // Collision detection (host only)
      this.physics.add.overlap(this.player, coin, () => {
        runtime.submitAction('collectCoin', { coinId: coinData.id });
      });
    });
  }

  // All players listen for collection
  adapter.onChange((state) => {
    state.coins.forEach(coinData => {
      if (coinData.collected && this.coinSprites[coinData.id]) {
        this.coinSprites[coinData.id].destroy();
        delete this.coinSprites[coinData.id];
      }
    });
  });
}
\`\`\`

---

### URL-Based Host Selection

**Recommended pattern (Jackbox-style):**

\`\`\`javascript
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room');
const isHost = !roomId; // No room param = host

if (isHost) {
  // Generate room ID
  const newRoomId = 'room-' + Math.random().toString(36).substr(2, 6);

  // Show join URL
  alert(\`Share this URL: \${window.location.origin}?room=\${newRoomId}\`);

  // Create transport as host
  const transport = new TrysteroTransport({
    roomId: newRoomId,
    isHost: true
  });
} else {
  // Join existing room
  const transport = new TrysteroTransport({
    roomId: roomId,
    isHost: false
  });
}
\`\`\`

**Benefits:**
- Predictable (no race conditions)
- User knows who's host
- Works like Jackbox, Among Us

---

### 5 Critical Multiplayer Rules

1. **ALWAYS use \`defineGame()\` for multiplayer** - Don't mix with \`window.scenes\` pattern
2. **ONLY host runs physics** - Clients just render sprites
3. **ALWAYS wrap spawning in \`adapter.isHost()\`** - Prevents duplicates
4. **ALWAYS use actions to modify state** - Never mutate directly except in actions
5. **NEVER forget \`createRemotePlayer\`** - Clients need to know how to create sprites

---

### Common Mistakes

❌ **Mixing v1 and v2 APIs**
\`\`\`javascript
// ❌ Wrong - don't mix!
window.scenes = { /* ... */ };
const runtime = new GameRuntime(gameLogic, transport);
\`\`\`

✅ **Use v2 SDK only**
\`\`\`javascript
// ✅ Correct
const game = defineGame({ /* ... */ });
const runtime = new GameRuntime(game, transport, { isHost });
\`\`\`

❌ **Everyone runs physics**
\`\`\`javascript
// ❌ Wrong - duplicates!
create() {
  this.player = this.physics.add.sprite(100, 100, 'player');
}
\`\`\`

✅ **Host runs physics, clients render**
\`\`\`javascript
// ✅ Correct
create() {
  if (adapter.isHost()) {
    this.player = this.physics.add.sprite(100, 100, 'player');
    adapter.trackSprite(this.player, 'player-' + adapter.myId);
  } else {
    this.player = this.add.sprite(100, 100, 'player');
    adapter.registerRemoteSprite('player-' + adapter.myId, this.player);
  }
}
\`\`\`

❌ **Mutating state directly**
\`\`\`javascript
// ❌ Wrong - breaks sync!
adapter.onChange((state) => {
  state.score += 10; // Don't mutate directly!
});
\`\`\`

✅ **Use actions**
\`\`\`javascript
// ✅ Correct
actions: {
  addScore: {
    apply(state, playerId, input) {
      state.score += input.amount;
    }
  }
}

// Then
runtime.submitAction('addScore', { amount: 10 });
\`\`\`

---

### Migration from v1

If you have existing \`gameAPI.multiplayer\` code:

**v1 Pattern:**
\`\`\`javascript
gameAPI.multiplayer.trackPlayer(this.player, {
  role: 'fireboy',
  createRemotePlayer: (scene, role, state) => { /* ... */ }
});

gameAPI.multiplayer.broadcast('event', data);
gameAPI.multiplayer.on('event', callback);
\`\`\`

**v2 Pattern:**
\`\`\`javascript
// Define game logic
const game = defineGame({
  setup: () => ({ players: {} }),
  actions: { /* ... */ }
});

// Create runtime + adapter
const runtime = new GameRuntime(game, transport, { isHost });
const adapter = new PhaserAdapter(runtime, scene);

// Track sprites
adapter.trackSprite(sprite, key);

// Events
adapter.broadcast('event', data);
adapter.on('event', callback);
\`\`\`

See [Migration Guide](packages/@martini/docs/martini-sdk-v2/08-migration-from-gameapi.md) for full details.

---

### When to Use Multiplayer SDK

**Use v2 SDK when:**
- Game has 2+ players
- Need P2P networking
- Want automatic state sync
- Building cooperative/competitive games

**Use single-player pattern when:**
- Solo game only
- No networking needed
- Simpler \`window.scenes\` pattern works fine

**Can mix both:**
- Use \`gameAPI.log()\`, \`gameAPI.switchScene()\` utilities in both
- Use \`defineGame()\` + \`GameRuntime\` for multiplayer scenes
- Use \`window.scenes\` for single-player menus/levels

---

### Complete Example: Fire Boy & Water Girl

See [Demo](packages/@martini/demo-vite) for full working example with:
- URL-based host selection
- Role selection screen
- Phaser physics integration
- P2P networking
- Automatic sprite sync

Run it:
\`\`\`bash
cd packages/@martini/demo-vite
pnpm dev
\`\`\`

---

### Further Reading

- [Quick Start](packages/@martini/docs/martini-sdk-v2/01-quick-start.md)
- [Core Concepts](packages/@martini/docs/martini-sdk-v2/02-core-concepts.md)
- [Phaser Adapter](packages/@martini/docs/martini-sdk-v2/03-phaser-adapter.md)
- [Best Practices](packages/@martini/docs/martini-sdk-v2/05-best-practices.md)
- [Troubleshooting](packages/@martini/docs/martini-sdk-v2/06-troubleshooting.md)
- [API Reference](packages/@martini/docs/martini-sdk-v2/07-api-reference-core.md)
`;

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

`;
