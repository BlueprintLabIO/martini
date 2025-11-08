# gameAPI.multiplayer - Multiplayer API Documentation

## Overview

The `gameAPI.multiplayer` API provides a simple, abstracted interface for adding multiplayer functionality to Phaser games. This API is designed to work with both P2P (peer-to-peer) connections in the MVP and future server-authoritative modes without requiring code changes.

**Key Benefits:**
- 🎮 Simple API for kids to understand
- 🔄 Future-proof: works with both P2P and official servers
- 🚀 No WebRTC knowledge required
- 🛡️ Safe and sandboxed
- 📚 Well-documented with examples

---

## Quick Start

### Host a Multiplayer Game

```javascript
// In your game code (game.js)
function create() {
  // Check if multiplayer is active
  if (gameAPI.multiplayer.isHost()) {
    console.log('I am the host!');
    console.log('Share code:', gameAPI.multiplayer.getRoomCode());
  }

  // Listen for players joining
  gameAPI.multiplayer.onPlayerJoined((playerId) => {
    console.log('Player joined:', playerId);
    // Spawn a new player sprite
  });

  // Listen for players leaving
  gameAPI.multiplayer.onPlayerLeft((playerId) => {
    console.log('Player left:', playerId);
    // Remove player sprite
  });
}

function update() {
  // Send player position to all peers
  gameAPI.multiplayer.send({
    type: 'position',
    x: player.x,
    y: player.y
  });

  // Receive data from other players
  gameAPI.multiplayer.onData((playerId, data) => {
    if (data.type === 'position') {
      updatePlayerPosition(playerId, data.x, data.y);
    }
  });
}
```

---

## API Reference

### Connection State

#### `isHost(): boolean`

Returns `true` if the current player is the host, `false` if they're a client.

```javascript
if (gameAPI.multiplayer.isHost()) {
  console.log('I created this game');
} else {
  console.log('I joined someone else\'s game');
}
```

**Use cases:**
- Determine who runs game logic (host-authoritative)
- Show different UI for host vs. clients
- Spawn different entities based on role

---

#### `getPlayerId(): string`

Returns the unique ID for the current player.

```javascript
const myId = gameAPI.multiplayer.getPlayerId();
console.log('My player ID:', myId);

// Use in data structures
this.players[myId] = { x: 100, y: 200, health: 100 };
```

**Returns:** UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)

---

#### `getRoomCode(): string`

Returns the 6-digit room code for the current game session.

```javascript
const code = gameAPI.multiplayer.getRoomCode();
console.log('Room code:', code); // "ABC123"

// Display to users
this.add.text(10, 10, `Code: ${code}`, { fontSize: '24px' });
```

**Returns:** 6-character uppercase alphanumeric string (excludes I, O, 0, 1)

---

#### `getPlayers(): string[]`

Returns an array of all connected player IDs (including yourself).

```javascript
const players = gameAPI.multiplayer.getPlayers();
console.log('Connected players:', players.length);

// Loop through all players
players.forEach(playerId => {
  if (!this.playerSprites[playerId]) {
    this.spawnPlayer(playerId);
  }
});
```

**Returns:** Array of player ID strings

---

### Sending Data

#### `send(data: any): void`

Send data to all connected peers (broadcast).

```javascript
// Send player movement
gameAPI.multiplayer.send({
  type: 'move',
  x: this.player.x,
  y: this.player.y,
  velocity: this.player.body.velocity
});

// Send game events
gameAPI.multiplayer.send({
  type: 'shoot',
  angle: this.weapon.angle,
  timestamp: Date.now()
});

// Send any serializable data
gameAPI.multiplayer.send({
  score: 100,
  powerups: ['speed', 'shield'],
  inventory: { coins: 50, gems: 10 }
});
```

**Parameters:**
- `data` (any): Any JSON-serializable object (no functions, no circular references)

**Important Notes:**
- Called ~60 times per second (once per frame) - keep data small!
- Data is sent to ALL connected peers
- Host and clients both use this same method
- Data is automatically JSON-serialized

**Best Practices:**
```javascript
// ❌ BAD - Too much data
gameAPI.multiplayer.send({
  player: this.player, // Entire Phaser sprite object
  scene: this.scene    // Don't send large objects!
});

// ✅ GOOD - Only essential data
gameAPI.multiplayer.send({
  x: this.player.x,
  y: this.player.y,
  action: 'jump'
});
```

---

### Receiving Data

#### `onData(callback: (playerId: string, data: any) => void): void`

Register a callback to receive data from other players.

```javascript
gameAPI.multiplayer.onData((playerId, data) => {
  console.log('Received from', playerId, ':', data);

  // Handle different message types
  switch (data.type) {
    case 'move':
      this.updatePlayerPosition(playerId, data.x, data.y);
      break;
    case 'shoot':
      this.createBullet(playerId, data.angle);
      break;
    case 'chat':
      this.showChatMessage(playerId, data.message);
      break;
  }
});
```

**Callback Parameters:**
- `playerId` (string): The player who sent the data
- `data` (any): The data object they sent

**Important Notes:**
- You can only register ONE callback (calling again overwrites previous)
- Callback is invoked for EVERY message received
- Use `data.type` field to distinguish message types

---

#### `onPlayerJoined(callback: (playerId: string) => void): void`

Register a callback when a new player joins the game.

```javascript
gameAPI.multiplayer.onPlayerJoined((playerId) => {
  console.log('New player joined:', playerId);

  // Create sprite for new player
  this.playerSprites[playerId] = this.add.sprite(100, 200, 'player');

  // Show notification
  this.showNotification(`Player ${playerId.substring(0, 6)} joined!`);

  // If you're the host, send them the current game state
  if (gameAPI.multiplayer.isHost()) {
    gameAPI.multiplayer.send({
      type: 'sync',
      gameState: this.serializeGameState()
    });
  }
});
```

**Callback Parameters:**
- `playerId` (string): The ID of the player who joined

**Use Cases:**
- Spawn player sprites
- Update player count UI
- Send initial state to new player (if host)

---

#### `onPlayerLeft(callback: (playerId: string) => void): void`

Register a callback when a player leaves/disconnects.

```javascript
gameAPI.multiplayer.onPlayerLeft((playerId) => {
  console.log('Player left:', playerId);

  // Remove player sprite
  if (this.playerSprites[playerId]) {
    this.playerSprites[playerId].destroy();
    delete this.playerSprites[playerId];
  }

  // Show notification
  this.showNotification(`Player ${playerId.substring(0, 6)} left`);

  // Clean up any player-specific data
  delete this.playerScores[playerId];
  delete this.playerInventories[playerId];
});
```

**Callback Parameters:**
- `playerId` (string): The ID of the player who left

**Use Cases:**
- Remove player sprites/entities
- Update player count
- Redistribute resources if host left

---

### Advanced Usage

#### `getTransport(): { type: 'p2p' | 'server', peer?: SimplePeer.Instance, socket?: Socket }`

**ADVANCED USERS ONLY:** Get direct access to the underlying transport layer.

```javascript
const transport = gameAPI.multiplayer.getTransport();

if (transport.type === 'p2p') {
  // Direct SimplePeer access
  const peer = transport.peer;

  peer.on('error', (err) => {
    console.error('Peer connection error:', err);
  });

  // Send raw binary data (advanced)
  const buffer = new Uint8Array([1, 2, 3, 4]);
  peer.send(buffer);

} else if (transport.type === 'server') {
  // Future: Direct Socket.IO access
  const socket = transport.socket;
  socket.emit('custom-event', { data: 'value' });
}
```

**Returns:**
- `type`: `'p2p'` (current MVP) or `'server'` (future)
- `peer`: SimplePeer instance (P2P mode only)
- `socket`: Socket.IO client (server mode only)

**Warning:** This is for power users who understand WebRTC/sockets. Most developers should use the high-level API (`send`, `onData`, etc.).

---

## Complete Examples

### Example 1: Simple Multiplayer Platformer

```javascript
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = {};
  }

  create() {
    // Create own player
    const myId = gameAPI.multiplayer.getPlayerId();
    this.players[myId] = this.add.sprite(100, 100, 'player');
    this.players[myId].setTint(0x00ff00); // Green for yourself

    // Listen for other players
    gameAPI.multiplayer.onPlayerJoined((playerId) => {
      this.players[playerId] = this.add.sprite(200, 100, 'player');
      this.players[playerId].setTint(0xff0000); // Red for others
    });

    gameAPI.multiplayer.onPlayerLeft((playerId) => {
      this.players[playerId].destroy();
      delete this.players[playerId];
    });

    // Receive positions
    gameAPI.multiplayer.onData((playerId, data) => {
      if (data.type === 'position' && this.players[playerId]) {
        this.players[playerId].x = data.x;
        this.players[playerId].y = data.y;
      }
    });

    // Show room code
    if (gameAPI.multiplayer.isHost()) {
      this.add.text(10, 10, `Code: ${gameAPI.multiplayer.getRoomCode()}`, {
        fontSize: '32px',
        color: '#fff'
      });
    }
  }

  update() {
    const myId = gameAPI.multiplayer.getPlayerId();
    const myPlayer = this.players[myId];

    // Move own player
    if (this.cursors.left.isDown) {
      myPlayer.x -= 5;
    }
    if (this.cursors.right.isDown) {
      myPlayer.x += 5;
    }

    // Broadcast position every frame
    gameAPI.multiplayer.send({
      type: 'position',
      x: myPlayer.x,
      y: myPlayer.y
    });
  }
}
```

---

### Example 2: Turn-Based Game (Host Authoritative)

```javascript
class TurnBasedGame extends Phaser.Scene {
  create() {
    this.currentTurn = null;

    if (gameAPI.multiplayer.isHost()) {
      // Host decides turn order
      this.turnOrder = gameAPI.multiplayer.getPlayers();
      this.currentTurnIndex = 0;
      this.currentTurn = this.turnOrder[0];

      // Broadcast initial turn
      this.broadcastTurn();
    }

    gameAPI.multiplayer.onData((playerId, data) => {
      if (data.type === 'turn_update') {
        this.currentTurn = data.currentPlayer;
        this.showTurnIndicator();
      }

      if (data.type === 'move' && this.currentTurn === playerId) {
        this.applyMove(playerId, data.move);

        if (gameAPI.multiplayer.isHost()) {
          this.nextTurn();
        }
      }
    });
  }

  makeMove(move) {
    if (this.currentTurn === gameAPI.multiplayer.getPlayerId()) {
      gameAPI.multiplayer.send({
        type: 'move',
        move: move
      });
    } else {
      console.log('Not your turn!');
    }
  }

  nextTurn() {
    // Host only
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    this.currentTurn = this.turnOrder[this.currentTurnIndex];
    this.broadcastTurn();
  }

  broadcastTurn() {
    gameAPI.multiplayer.send({
      type: 'turn_update',
      currentPlayer: this.currentTurn
    });
  }
}
```

---

### Example 3: Chat System

```javascript
class ChatSystem {
  constructor(scene) {
    this.scene = scene;
    this.messages = [];

    gameAPI.multiplayer.onData((playerId, data) => {
      if (data.type === 'chat') {
        this.addMessage(playerId, data.message);
      }
    });
  }

  sendMessage(text) {
    gameAPI.multiplayer.send({
      type: 'chat',
      message: text,
      timestamp: Date.now()
    });
  }

  addMessage(playerId, text) {
    const isMe = playerId === gameAPI.multiplayer.getPlayerId();
    const name = isMe ? 'You' : playerId.substring(0, 6);

    this.messages.push({ name, text });
    this.renderMessages();
  }

  renderMessages() {
    // Render last 5 messages
    this.messages.slice(-5).forEach((msg, i) => {
      this.scene.add.text(10, 400 + i * 30, `${msg.name}: ${msg.text}`, {
        fontSize: '16px'
      });
    });
  }
}
```

---

## Performance Best Practices

### 1. Minimize Data Sent Per Frame

```javascript
// ❌ BAD - Sending every frame even if nothing changed
update() {
  gameAPI.multiplayer.send({
    x: this.player.x,
    y: this.player.y,
    angle: this.player.angle,
    velocity: this.player.body.velocity,
    animation: this.player.anims.currentAnim.key
  });
}

// ✅ GOOD - Only send when data changes
update() {
  const currentState = {
    x: Math.round(this.player.x),
    y: Math.round(this.player.y)
  };

  if (JSON.stringify(currentState) !== JSON.stringify(this.lastState)) {
    gameAPI.multiplayer.send(currentState);
    this.lastState = currentState;
  }
}
```

### 2. Use Message Types

```javascript
// ✅ GOOD - Organized message handling
gameAPI.multiplayer.onData((playerId, data) => {
  switch (data.type) {
    case 'pos':     // Position updates (60/sec)
      this.updatePosition(playerId, data);
      break;
    case 'action':  // Player actions (rare)
      this.handleAction(playerId, data);
      break;
    case 'chat':    // Chat messages (very rare)
      this.showChat(playerId, data);
      break;
  }
});
```

### 3. Round Numbers

```javascript
// ❌ BAD - Too much precision
gameAPI.multiplayer.send({
  x: 123.456789123456,
  y: 987.654321987654
});

// ✅ GOOD - Round to 1 decimal place
gameAPI.multiplayer.send({
  x: Math.round(this.player.x * 10) / 10,
  y: Math.round(this.player.y * 10) / 10
});
```

---

## Limitations & Known Issues

### Current MVP Limitations

1. **No Persistence:** If host disconnects, game ends
2. **No Reconnect:** If client loses connection, must rejoin manually
3. **Host Authoritative:** Host has control, no anti-cheat
4. **Performance:** 4+ players may experience lag depending on connection
5. **NAT Issues:** ~20% of users behind strict firewalls may fail to connect

### Future Enhancements

- Server-authoritative mode for anti-cheat
- Automatic reconnection
- Host migration
- Voice chat
- Spectator mode

---

## Troubleshooting

### "Cannot read property 'send' of undefined"

**Cause:** Multiplayer is not initialized (game is not in multiplayer mode)

**Solution:** Check if multiplayer is active before calling APIs:
```javascript
if (gameAPI.multiplayer) {
  gameAPI.multiplayer.send(data);
}
```

### Players not seeing each other's movements

**Cause:** Not calling `send()` or `onData()` correctly

**Solution:** Ensure you call `send()` every frame in `update()`:
```javascript
update() {
  gameAPI.multiplayer.send({ x: this.x, y: this.y });

  gameAPI.multiplayer.onData((id, data) => {
    this.updatePlayer(id, data);
  });
}
```

### High latency / lag

**Causes:**
- Too many players (4+ may degrade)
- Sending too much data per frame
- Players on slow/distant connections

**Solutions:**
- Reduce update frequency
- Send less data
- Use delta compression (advanced)

---

## Migration Guide: P2P → Server Mode (Future)

When we add official servers, your code will work **without changes**:

```javascript
// This code works in BOTH P2P and server modes!
gameAPI.multiplayer.send({ x: 100, y: 200 });

gameAPI.multiplayer.onData((playerId, data) => {
  // Handle data
});
```

The only difference will be in configuration (not code):
- **P2P:** Connections are direct peer-to-peer
- **Server:** All data routes through authoritative server

Your game logic stays identical! 🎉

---

## Reference: WebRTC Under the Hood (Advanced)

For developers curious about what's happening behind the scenes:

### P2P Connection Flow

1. **Signaling:** Socket.IO server relays SDP offers/answers
2. **ICE:** STUN server helps peers discover public IPs
3. **Data Channel:** WebRTC creates direct peer-to-peer connection
4. **Send/Receive:** `gameAPI.multiplayer.send()` calls `peer.send(JSON.stringify(data))`

### Why SimplePeer?

- Industry-standard WebRTC wrapper
- Handles browser compatibility
- Automatic reconnection attempts
- 9KB minified + gzipped

---

**Last Updated:** 2025-11-08
**Version:** 1.0.0 (MVP)
