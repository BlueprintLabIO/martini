# Multiplayer API Reference

**Version:** 2.0
**Status:** Design → Implementation

---

## Quick Start

### Fire Boy & Water Girl (Co-op Platformer)

```javascript
window.scenes = {
  Game: {
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
    },

    update(scene) {
      // Standard Phaser code - no manual sync needed!
      const cursors = scene.input.keyboard.createCursorKeys();
      if (cursors.left.isDown) this.myPlayer.setVelocityX(-160);
    }
  }
};
```

### Pokemon Battle (Turn-Based RPG)

```javascript
window.scenes = {
  Battle: {
    create(scene) {
      this.myTrainer = scene.add.sprite(100, 100, 'trainer');

      // Low update rate for turn-based
      gameAPI.multiplayer.trackPlayer(this.myTrainer, {
        sync: ['x', 'y', 'frame'],
        updateRate: 10
      });

      // Event-driven gameplay
      gameAPI.multiplayer.on('attack', (peerId, data) => {
        this.playAnimation(data.move, data.target);
      });
    },

    executeMove() {
      gameAPI.multiplayer.broadcast('attack', {
        move: 'fireball',
        target: this.selectedEnemy
      });
    }
  }
};
```

---

## Core API

### `trackPlayer(sprite, options?)`

Auto-sync player sprite across all clients.

**Parameters:**
- `sprite`: Phaser.GameObjects.Sprite - The player to track
- `options` (optional):
  - `sync`: string[] - Properties to sync (default: `['x', 'y', 'velocityX', 'velocityY', 'frame']`)
  - `updateRate`: number - Updates per second (default: 30)
  - `interpolate`: boolean - Smooth remote players (default: true)
  - `color`: number - Tint for remote players (default: auto)
  - `role`: string - Metadata (e.g., 'fireboy', 'watergirl')

**Returns:** `TrackedPlayer` with methods:
- `getRemotePlayers()`: Get array of remote player sprites
- `destroy()`: Stop tracking

**Examples:**
```javascript
// Platformer (auto physics sync)
gameAPI.multiplayer.trackPlayer(this.myPlayer);

// Turn-based (position only)
gameAPI.multiplayer.trackPlayer(this.myTrainer, {
  sync: ['x', 'y', 'frame'],
  updateRate: 10
});

// Role-based game
gameAPI.multiplayer.trackPlayer(this.myPlayer, {
  role: 'fireboy',
  color: 0xff4400
});
```

---

### `broadcast(eventName, data?)`

Send game event to all players.

**Parameters:**
- `eventName`: string - Event identifier (kebab-case)
- `data`: any - Event payload (keep <500 bytes)

**Examples:**
```javascript
// Collectible picked up
gameAPI.multiplayer.broadcast('coin-collected', {
  coinId: 5,
  score: 100
});

// Attack action
gameAPI.multiplayer.broadcast('attack', {
  targetId: 'player-2',
  damage: 20
});

// Door activated
gameAPI.multiplayer.broadcast('door-opened', { doorId: 3 });
```

---

### `on(eventName, callback)`

Listen for game events from other players.

**Parameters:**
- `eventName`: string - Event to listen for
- `callback`: (peerId: string, data: any) => void

**Example:**
```javascript
create(scene) {
  gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
    const coin = this.coins.find(c => c.id === data.coinId);
    if (coin) coin.destroy();

    this.updateScoreboard(peerId, data.score);
  });
}
```

---

### `isHost()`

Check if current player is the host (authoritative).

**Returns:** boolean

**Use for:**
- Spawning enemies/collectibles (prevents duplicates)
- Running AI logic
- Validating game actions

**Example:**
```javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    this.spawnEnemies();
  }
}
```

---

### `getMyId()`

Get current player's unique ID.

**Returns:** string (UUID)

**Example:**
```javascript
const myId = gameAPI.multiplayer.getMyId();
console.log('My ID:', myId);
```

---

### `getPlayers()`

Get list of all connected players.

**Returns:** `Player[]` with properties:
- `id`: string
- `isHost`: boolean
- `role`: string (if set via trackPlayer)
- `latency`: number (ms)

**Example:**
```javascript
const players = gameAPI.multiplayer.getPlayers();
console.log(`${players.length} players connected`);
```

---

### `onPlayerJoined(callback)`

Called when a new player connects.

**Example:**
```javascript
create(scene) {
  gameAPI.multiplayer.onPlayerJoined((player) => {
    console.log('Player joined:', player.id);
  });
}
```

---

### `onPlayerLeft(callback)`

Called when a player disconnects.

**Example:**
```javascript
create(scene) {
  gameAPI.multiplayer.onPlayerLeft((player) => {
    console.log('Player left:', player.id);
    // Remote sprites auto-destroyed
  });
}
```

---

## Utilities

### `gameAPI.random.setSeed(seed)`

Set deterministic random seed (syncs across all clients).

**Use for:** Spawning same level layout on all clients.

**Example:**
```javascript
if (gameAPI.multiplayer.isHost()) {
  gameAPI.random.setSeed(12345);

  // All clients will spawn platforms at same positions
  for (let i = 0; i < 10; i++) {
    const x = gameAPI.random() * 800;
    scene.add.platform(x, 400);
  }
}
```

---

### `gameAPI.random()`

Get next deterministic random number (0-1).

**Example:**
```javascript
const x = gameAPI.random() * 800;  // Same on all clients
const y = gameAPI.random() * 600;
```

---

## Patterns by Genre

### Co-op Platformer

**Best practices:**
- Use `trackPlayer()` with default options
- Host spawns all level objects
- Use deterministic `gameAPI.random()` for obstacles
- Broadcast puzzle events (doors, switches)

**Bandwidth:** ~3KB/s per player

---

### Turn-Based RPG

**Best practices:**
- Low `updateRate: 10` for slow movement
- Use `broadcast()` + `on()` for all actions
- Host manages turn order
- Validate actions on host before broadcasting

**Bandwidth:** ~2KB/s per player

---

### Racing Game

**Best practices:**
- Higher `updateRate: 60` for smooth movement
- Sync `['x', 'y', 'angle', 'velocityX', 'velocityY']`
- Broadcast lap/checkpoint events
- Host spawns power-ups

**Bandwidth:** ~10KB/s per player

---

### Party Minigames

**Best practices:**
- Each minigame chooses own sync strategy
- Use `gameAPI.switchScene()` between games
- Broadcast scoreboard updates
- Host tracks global scores across minigames

**Bandwidth:** Varies (5-10KB/s)

---

## Architecture

### Current: P2P (Peer-to-Peer)

```
Host (Player 1)  ←→  Client (Player 2)
     ↑                     ↑
     └─────────────────────┘
       Direct WebRTC connection
       (via signaling server)
```

**Characteristics:**
- ✅ 2-8 players supported
- ✅ Low latency (50-100ms P2P)
- ✅ Free (no server compute)
- ❌ Host disconnect = game ends
- ❌ No persistence

**Limits:**
- Players: 2-8
- Bandwidth: <50KB/s per player
- Latency: 50-300ms (P2P varies)

---

## Not Supported (Yet)

### Battle Royale (20+ players)
- P2P doesn't scale (N² connections)
- Requires dedicated server
- **Workaround:** Limit to 8 players max

### MMO / Persistent Worlds
- No database/persistence
- Requires backend architecture
- **Workaround:** Session-based games only

### Competitive Fighting (Esports)
- No rollback netcode
- 100ms lag = missed parries
- **Workaround:** Casual brawlers work fine

---

## Troubleshooting

### Remote players are jittery
- **Solution:** Default interpolation should fix this
- **Check:** `interpolate: true` in `trackPlayer()`

### Players spawn duplicate enemies
- **Solution:** Only host should spawn
- **Check:** Wrap spawning in `if (gameAPI.multiplayer.isHost())`

### Lag is too high (>200ms)
- **Cause:** P2P connection quality
- **Solution:** Players need better WiFi or geographic proximity

### Random elements desync
- **Solution:** Use `gameAPI.random()` not `Math.random()`
- **Check:** Call `gameAPI.random.setSeed()` on host

---

## See Also

- [multiplayer-design.md](multiplayer-design.md) - Full architecture
- [multiplayer-genre-analysis.md](multiplayer-genre-analysis.md) - Genre compatibility
- [CUSTOM_API.md](CUSTOM_API.md) - Full gameAPI reference
