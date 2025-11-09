# Auto-Sync Multiplayer System

## Overview

WebRTC-based peer-to-peer multiplayer with automatic sprite synchronization designed for kids. The system provides a simple one-line API (`trackPlayer()`) that handles all the complex networking automatically.

**Key Features:**
- Zero server compute cost (P2P via WebRTC)
- One-line multiplayer activation (`trackPlayer()`)
- Automatic sprite/entity synchronization
- Event-based game actions (coins, doors, attacks)
- Deterministic random for level generation
- 6-digit share codes (UPPERCASE letters/numbers, no I/O/0/1)
- Anonymous access (no auth required for MVP)

**MVP Scope:**
- ✅ Anonymous P2P connections
- ✅ SimplePeer WebRTC wrapper
- ✅ Free Google STUN servers
- ✅ Socket.IO signaling server
- ✅ Auto-sync API built into sandbox runtime
- ✅ Event broadcast/listening system
- ⏳ TURN server (future - for ~20% of strict NAT cases)
- ⏳ Host migration (future)
- ⏳ Voice chat (future)

---

## Architecture

```
Creator's Browser (HOST)                 Friend's Browser (CLIENT)
┌────────────────────────┐              ┌────────────────────────┐
│ Game Sandbox (iframe)  │              │ Game Sandbox (iframe)  │
│ ┌──────────────────┐   │              │ ┌──────────────────┐   │
│ │ gameAPI.         │   │              │ │ gameAPI.         │   │
│ │ multiplayer:     │   │              │ │ multiplayer:     │   │
│ │  trackPlayer()   │   │              │ │  (receives sync) │   │
│ │  broadcast()     │   │              │ │  on('event')     │   │
│ │  isHost()        │   │              │ │  isHost()        │   │
│ └──────────────────┘   │              │ └──────────────────┘   │
└──────────┬─────────────┘              └──────────┬─────────────┘
           │ postMessage                           │ postMessage
┌──────────▼─────────────┐              ┌─────────▼──────────────┐
│ MultiplayerManager     │              │ MultiplayerManager     │
│ (Svelte component)     │              │ (Svelte component)     │
│ - Manages SimplePeer   │◄────────────►│ - Manages SimplePeer   │
│ - Handles signaling    │    WebRTC    │ - Handles signaling    │
│ - Lobby approvals      │              │ - Join requests        │
└──────────┬─────────────┘              └─────────┬──────────────┘
           │ Socket.IO                             │ Socket.IO
           └───────────────┬───────────────────────┘
                           │
                  ┌────────▼─────────┐
                  │  Socket.io       │
                  │  Signaling       │
                  │  Server          │
                  │  (Coolify)       │
                  └──────────────────┘
```

---

## Data Flow

### Initialization (When Multiplayer Starts)

1. **Host clicks "Start Multiplayer"**
   - [MultiplayerManager.svelte:51-93](../apps/web/src/lib/multiplayer/MultiplayerManager.svelte#L51-L93) creates room
   - Generates 6-digit share code via API
   - Connects to signaling server
   - Sends `MULTIPLAYER_STATE` to sandbox iframe with:
     ```typescript
     {
       _enabled: true,
       _isHost: true,
       _myId: 'host-unique-id',
       _players: ['host-unique-id']
     }
     ```

2. **Client enters share code and joins**
   - [MultiplayerManager.svelte:98-129](../apps/web/src/lib/multiplayer/MultiplayerManager.svelte#L98-L129) joins room
   - Connects via WebRTC
   - Host approves connection
   - Sends `MULTIPLAYER_STATE` to sandbox iframe with:
     ```typescript
     {
       _enabled: true,
       _isHost: false,
       _myId: 'client-unique-id',
       _players: ['host-unique-id', 'client-unique-id']
     }
     ```

### Runtime Synchronization

**Every frame (60 FPS):**

1. **Local player updates** ([sandbox-runtime.html:231-252](../apps/web/static/sandbox-runtime.html#L231-L252))
   - Game code moves local sprite: `this.myPlayer.setVelocityX(-160)`
   - `trackPlayer()` collects changed properties (x, y, velocityX, velocityY, frame)
   - Sends to parent via `postMessage` → `MULTIPLAYER_BROADCAST` → WebRTC → all peers

2. **Remote player updates** ([sandbox-runtime.html:396-433](../apps/web/static/sandbox-runtime.html#L396-L433))
   - Receives `MULTIPLAYER_DATA` event from peer
   - Finds or creates remote sprite
   - Applies interpolation: `remotePlayer.x += (newX - remotePlayer.x) * 0.3`

**Event-based actions:**

```javascript
// Host collects coin
this.coin.destroy();
gameAPI.multiplayer.broadcast('coin-collected', { coinId: 5 });

// All clients receive event
gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
  const coin = this.coins.find(c => c.id === data.coinId);
  coin.destroy();
});
```

---

## Core API Guarantees

### `gameAPI.multiplayer.getMyId()` - Player ID

**Returns:** `string | null`

**Guarantees:**
- ✅ Always returns `null` when multiplayer is NOT active (single-player mode)
- ✅ NEVER returns `null` once multiplayer is started and `_enabled = true`
- ✅ Stable across page lifecycle (doesn't change mid-session)

**Implementation:**
```javascript
// sandbox-runtime.html
getMyId() {
  return this._myId;
}
```

**Validation at runtime:**
```javascript
// MultiplayerManager ensures _myId is set BEFORE sending MULTIPLAYER_STATE
if (!this._myId) {
  throw new Error('Cannot initialize multiplayer without player ID');
}
```

### `gameAPI.multiplayer.isHost()` - Host Detection

**Returns:** `boolean`

**Guarantees:**
- ✅ Always returns `false` when multiplayer is NOT active
- ✅ Exactly ONE player returns `true` per session
- ✅ Stable (doesn't change unless host migration implemented)

**Use case:**
```javascript
// Only host spawns enemies to prevent duplicates
if (gameAPI.multiplayer.isHost()) {
  this.spawnEnemies(scene);
}
```

### `gameAPI.multiplayer.trackPlayer()` - Auto-Sync

**Parameters:**
- `sprite`: Phaser sprite/game object to sync
- `options`: Configuration (sync properties, update rate, role, color)

**Guarantees:**
- ✅ Works in single-player (returns mock tracker)
- ✅ Automatically creates remote sprites for other players
- ✅ Handles player disconnect (removes remote sprite)
- ✅ Interpolates remote positions for smooth rendering

**Returns:** Tracker object with `getRemotePlayers()` method

### `gameAPI.multiplayer.broadcast()` - Event Sending

**Parameters:**
- `eventName`: String identifier (kebab-case recommended)
- `data`: Any JSON-serializable data

**Guarantees:**
- ✅ Silently ignores in single-player mode (no crash)
- ✅ Reliable delivery via WebRTC data channels
- ✅ Order preserved (FIFO per sender)

### `gameAPI.multiplayer.on()` - Event Listening

**Parameters:**
- `eventName`: Event to listen for
- `callback`: `(peerId: string, data: any) => void`

**Guarantees:**
- ✅ Safe to call in single-player (just won't trigger)
- ✅ Callbacks fire in registration order
- ✅ Multiple listeners allowed per event

---

## Connection Flow

### 1. Host Creates Game

```typescript
// User clicks "Start Multiplayer" button in editor
async function startAsHost() {
  // 1. Generate share code via API
  const response = await fetch(`/api/projects/${projectId}/multiplayer`, {
    method: 'POST'
  });
  const { shareCode } = await response.json(); // e.g., "ABC123"

  // 2. Create WebRTC host
  const host = new MultiplayerHost({
    shareCode,
    signalingUrl: 'ws://localhost:3001',
    stunUrls: ['stun:stun.l.google.com:19302'],
    onClientJoined: (clientId) => {
      console.log('Client joined:', clientId);
      // Send MULTIPLAYER_STATE update to sandbox
    }
  });

  await host.connect();

  // 3. Initialize multiplayer in sandbox
  iframeEl.contentWindow.postMessage({
    type: 'MULTIPLAYER_STATE',
    payload: {
      _enabled: true,
      _isHost: true,
      _myId: host.getPlayerId(),
      _players: [host.getPlayerId()]
    }
  }, '*');
}
```

### 2. Client Joins Game

```typescript
// User enters 6-digit code and clicks "Join"
async function startAsClient() {
  // 1. Create WebRTC client
  const client = new MultiplayerClient({
    shareCode: joinCode.toUpperCase(),
    signalingUrl: 'ws://localhost:3001',
    stunUrls: ['stun:stun.l.google.com:19302'],
    onConnected: () => {
      console.log('Connected to host!');
    }
  });

  await client.connect();

  // 2. Initialize multiplayer in sandbox
  iframeEl.contentWindow.postMessage({
    type: 'MULTIPLAYER_STATE',
    payload: {
      _enabled: true,
      _isHost: false,
      _myId: client.getPlayerId(),
      _players: [hostId, client.getPlayerId()]
    }
  }, '*');
}
```

### 3. Sandbox Receives State

```javascript
// sandbox-runtime.html
window.addEventListener('message', (event) => {
  if (event.data.type === 'MULTIPLAYER_STATE') {
    // Update internal state
    gameAPI.multiplayer._enabled = event.data.payload._enabled;
    gameAPI.multiplayer._isHost = event.data.payload._isHost;
    gameAPI.multiplayer._myId = event.data.payload._myId;
    gameAPI.multiplayer._players = event.data.payload._players;

    console.log('Multiplayer initialized:', {
      enabled: gameAPI.multiplayer._enabled,
      isHost: gameAPI.multiplayer._isHost,
      myId: gameAPI.multiplayer._myId
    });
  }
});
```

---

## Signaling Server

The signaling server handles initial WebRTC connection setup. Once P2P is established, the signaling server is no longer needed.

**Implementation:** Socket.IO server (see [MultiplayerHost.ts](../apps/web/src/lib/multiplayer/MultiplayerHost.ts) and [MultiplayerClient.ts](../apps/web/src/lib/multiplayer/MultiplayerClient.ts))

**Events:**
- `create-room` - Host creates room with share code
- `join-room` - Client joins with share code
- `signal` - WebRTC signaling data exchange
- `approve-join` - Host approves client connection
- `deny-join` - Host denies client connection

**Room lifecycle:**
- Created when host starts
- Destroyed when host disconnects
- Automatic cleanup after 1 hour of inactivity

---

## Share Code Generation

```typescript
// /api/projects/[projectId]/multiplayer/+server.ts
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Check for collisions (extremely rare with 34^6 = 1.54 billion combinations)
async function getUniqueShareCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateShareCode();
    const { data } = await supabase
      .from('multiplayer_sessions')
      .select('id')
      .eq('share_code', code)
      .maybeSingle();

    if (!data) return code; // Unique!
  }
  throw new Error('Failed to generate unique share code');
}
```

---

## Example: Fire Boy & Water Girl

```javascript
// /src/main.js
window.scenes = {
  Game: {
    create(scene) {
      // Each player creates their own sprite
      this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

      // ✨ ONE LINE - Auto-sync with role assignment
      gameAPI.multiplayer.trackPlayer(this.myPlayer, {
        role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
      });

      // Only host spawns level (prevents duplicates!)
      if (gameAPI.multiplayer.isHost()) {
        this.createLevel(scene);
        this.spawnCoins(scene);
      }

      // Listen for coin collection
      gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
        const coin = this.coins.find(c => c.id === data.coinId);
        if (coin) coin.destroy();
      });
    },

    update(scene) {
      // Standard Phaser code - sync happens automatically!
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) {
        this.myPlayer.setVelocityX(-160);
      } else if (cursors.right.isDown) {
        this.myPlayer.setVelocityX(160);
      } else {
        this.myPlayer.setVelocityX(0);
      }

      // Check coin collision (only for local player)
      this.coins.forEach((coin, i) => {
        if (Phaser.Math.Distance.Between(
          this.myPlayer.x, this.myPlayer.y,
          coin.x, coin.y
        ) < 30) {
          coin.destroy();
          this.coins.splice(i, 1);

          // Broadcast to other players
          gameAPI.multiplayer.broadcast('coin-collected', {
            coinId: coin.id,
            collector: gameAPI.multiplayer.getMyId()
          });
        }
      });
    }
  }
};
```

---

## Deterministic Random for Level Generation

**Problem:** Each player needs to see the same level layout.

**Solution:** Use `gameAPI.random()` with a shared seed.

```javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    // Set deterministic seed (same on all clients)
    gameAPI.random.setSeed(12345);

    // Generate platforms - same positions for everyone!
    for (let i = 0; i < 10; i++) {
      const x = gameAPI.random.next() * 800;
      const y = gameAPI.random.next() * 600;
      scene.add.platform(x, y);
    }
  }
}
```

---

## Error Handling

### Connection Failures

```typescript
// MultiplayerManager shows error UI
onError(error: Error) {
  errorMessage = error.message;
  connectionStatus = 'disconnected';

  // Show retry button
  showNotification('Connection failed. Try again?');
}
```

### Host Disconnect

**MVP Behavior:** Game pauses, show "Host disconnected" message, 30s timeout

**Future:** Host migration (promote client to new host)

```typescript
onHostDisconnect() {
  // Pause game
  gameAPI.pauseScene();

  // Show warning
  showNotification('Host disconnected. Waiting 30s to reconnect...');

  // Timeout after 30s
  setTimeout(() => {
    window.location.href = '/';
  }, 30000);
}
```

### Player Disconnect

```typescript
// Sandbox receives MULTIPLAYER_PLAYER_LEFT
window.addEventListener('message', (event) => {
  if (event.data.type === 'MULTIPLAYER_PLAYER_LEFT') {
    const { playerId } = event.data.payload;

    // Remove remote player sprite
    const tracker = gameAPI.multiplayer._trackedPlayers.get('main');
    const remotePlayer = tracker?.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      tracker.remotePlayers.delete(playerId);
    }
  }
});
```

---

## Performance Considerations

### Bandwidth Usage

**Per player at 30 updates/sec:**
- Position (x, y): 8 bytes each = 16 bytes
- Velocity (vX, vY): 8 bytes each = 16 bytes
- Frame index: 2 bytes
- **Total:** ~50 bytes × 30 fps = 1.5 KB/sec per player

**6 players:** ~9 KB/sec upload (host), ~1.5 KB/sec upload (clients)

**Optimization (future):**
- Delta compression (only send changed values)
- Adaptive update rate (slow down when idle)
- Interest management (only sync nearby players)

### Recommended Limits

- **2-4 players:** Excellent performance
- **5-6 players:** Good performance (may show warning)
- **7+ players:** Suggest dedicated server upgrade

---

## Future Enhancements

### Phase 2: Enhanced Multiplayer
- **TURN server:** Fallback for restrictive NATs (~20% of users)
- **Host migration:** Promote client to host when host leaves
- **Reconnection:** Save state, allow rejoining after disconnect
- **Spectator mode:** Watch games without playing

### Phase 3: Advanced Features
- **Voice chat:** WebRTC audio channels
- **Text chat:** In-game messaging
- **Replays:** Record and playback sessions
- **Leaderboards:** Track high scores across sessions

### Phase 4: Dedicated Servers
- **7-100 players:** Kubernetes-based game servers
- **Persistent worlds:** 24/7 availability
- **Anti-cheat:** Server-authoritative game logic
- **Pricing:** $10/month per server

---

## Testing

### Local Development

1. Open two browser windows
2. Start multiplayer in first window (host)
3. Copy share code
4. Join from second window (client)
5. Move player in each window
6. Verify both sprites sync

### Checklist

- [ ] Host can create room and get share code
- [ ] Client can join with valid share code
- [ ] Invalid share code shows error
- [ ] Players see each other's sprites
- [ ] Movement syncs smoothly (< 200ms latency)
- [ ] Events broadcast correctly (coin collection)
- [ ] Host disconnect pauses game
- [ ] Client disconnect removes sprite
- [ ] Works in single-player (no errors)
- [ ] Works across different networks (not just localhost)

---

## Monitoring

Track in analytics:

```typescript
await supabase.from('analytics').insert({
  event_type: 'multiplayer_session',
  project_id: projectId,
  metadata: {
    player_count: connectedClients.length + 1,
    duration_seconds: sessionDuration,
    connection_type: 'p2p',
    share_code: shareCode
  }
});
```

**Key Metrics:**
- Connection success rate (target: >95%)
- Average latency (target: <100ms)
- Sessions created vs. joined (virality indicator)
- Average session duration
- Host disconnect rate

---

## Security & Privacy

### MVP (Anonymous)
- No authentication required
- Share code is the only secret
- No persistent player accounts
- Sessions expire after 1 hour

### Future (Authenticated)
- JWT validation for room creation
- Player reports/blocking
- COPPA-compliant age verification
- Parent/teacher dashboard

---

## See Also

- [CUSTOM_API.md](../docs/CUSTOM_API.md) - Full API reference for game code
- [MultiplayerManager.svelte](../apps/web/src/lib/multiplayer/MultiplayerManager.svelte) - UI component
- [sandbox-runtime.html](../apps/web/static/sandbox-runtime.html) - Built-in multiplayer API
