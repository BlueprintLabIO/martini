# Multiplayer P2P System

## Overview

P2P multiplayer via **Trystero** (Nostr strategy). No signaling server needed - uses decentralized Nostr relays for WebRTC peer discovery.

**Stack:**
- Trystero (WebRTC + Nostr relays)
- 6-digit share codes
- Lobby approval system
- Auto-sync API in sandbox

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│ Host Browser        │         │ Client Browser      │
│ ┌─────────────────┐ │         │ ┌─────────────────┐ │
│ │ Game Sandbox    │ │         │ │ Game Sandbox    │ │
│ │ gameAPI.multi.. │ │         │ │ gameAPI.multi.. │ │
│ └────────┬────────┘ │         │ └────────┬────────┘ │
│          │          │         │          │          │
│ ┌────────▼────────┐ │         │ ┌────────▼────────┐ │
│ │ Multiplayer-    │◄├─────────┤►│ Multiplayer-    │ │
│ │ Manager.svelte  │ │ WebRTC  │ │ Manager.svelte  │ │
│ │ - Approval flow │ │ (P2P)   │ │ - Join requests │ │
│ │ - Trystero      │ │         │ │ - Trystero      │ │
│ └─────────────────┘ │         │ └─────────────────┘ │
└─────────────────────┘         └─────────────────────┘
           │                               │
           └───────────┬───────────────────┘
                       │ Signaling via
                 ┌─────▼──────┐
                 │   Nostr    │
                 │   Relays   │
                 │ (Public)   │
                 └────────────┘
```

---

## Key Classes

### [Multiplayer.ts](../apps/web/src/lib/multiplayer/Multiplayer.ts)

Simple wrapper around Trystero. Just connects to room.

```typescript
const mp = new Multiplayer({
  appId: 'martini-game-platform-v1',
  roomId: 'ABC123' // 6-digit share code
});

// Access Trystero room
mp.room.makeAction('my-action');
mp.room.onPeerJoin(peerId => {});
mp.room.onPeerLeave(peerId => {});

// Self ID
mp.selfId; // unique peer ID
```

### [MultiplayerManager.svelte](../apps/web/src/lib/multiplayer/MultiplayerManager.svelte)

Manages approval flow and sandbox communication.

**Actions:**
- `join-req` - Client sends join request to host
- `approval` - Host sends approval/denial to client
- `game-data` - Bidirectional game state sync

**Flow:**
1. Host creates room, listens for join requests
2. Client joins, sends join request
3. Host approves/denies via UI
4. On approval, game data syncs begin

---

## Connection Flow

### Host
```typescript
// 1. Generate share code via API
const { shareCode } = await fetch(`/api/projects/${id}/multiplayer`, {
  method: 'POST'
}).then(r => r.json());

// 2. Create multiplayer instance
const mp = new Multiplayer({ appId, roomId: shareCode });

// 3. Set up approval flow
const [sendJoinReq, getJoinReq] = mp.room.makeAction('join-req');
const [sendApproval, getApproval] = mp.room.makeAction('approval');

getJoinReq((data, peerId) => {
  // Show approval UI for peerId
});

// 4. When approved, add to connected clients
sendApproval({ approved: true }, clientId);
```

### Client
```typescript
// 1. Join room with share code
const mp = new Multiplayer({ appId, roomId: userEnteredCode });

// 2. Send join request when host peer appears
mp.room.onPeerJoin(hostPeerId => {
  sendJoinReq({ clientId: mp.selfId });
});

// 3. Wait for approval
getApproval((data, peerId) => {
  if (data.approved) {
    // Connected! Start game
  }
});
```

---

## Sandbox API

Game code uses `gameAPI.multiplayer` (injected via `postMessage`):

```javascript
// Track player sprite (auto-sync)
gameAPI.multiplayer.trackPlayer(this.myPlayer, {
  role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
});

// Send custom events
gameAPI.multiplayer.broadcast('coin-collected', { coinId: 5 });

// Listen for events
gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
  this.coins[data.coinId].destroy();
});

// Utilities
gameAPI.multiplayer.getMyId();    // string | null
gameAPI.multiplayer.isHost();     // boolean
```

**Implementation:** [sandbox-runtime.html](../apps/web/static/sandbox-runtime.html)

---

## Share Code Generation

```typescript
// /api/projects/[projectId]/multiplayer/+server.ts
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1
let code = '';
for (let i = 0; i < 6; i++) {
  code += chars[Math.floor(Math.random() * chars.length)];
}
// ~1.5 billion combinations (34^6)
```

---

## Example: Co-op Game

```javascript
// /src/main.js
window.scenes = {
  Game: {
    create(scene) {
      // Create local player
      this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

      // Auto-sync
      gameAPI.multiplayer.trackPlayer(this.myPlayer);

      // Only host spawns level (prevents duplicates)
      if (gameAPI.multiplayer.isHost()) {
        this.spawnCoins(scene);
      }

      // Listen for coin events
      gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
        this.coins[data.id].destroy();
      });
    },

    update(scene) {
      // Move player (sync is automatic)
      const cursors = scene.input.keyboard.createCursorKeys();
      if (cursors.left.isDown) {
        this.myPlayer.setVelocityX(-160);
      }

      // Check local collision only
      this.coins.forEach((coin, i) => {
        if (this.checkCollision(this.myPlayer, coin)) {
          coin.destroy();
          gameAPI.multiplayer.broadcast('coin-collected', { id: i });
        }
      });
    }
  }
};
```

---

## Performance

**Bandwidth (30 fps sync):**
- Per player: ~1.5 KB/sec
- 4 players: ~6 KB/sec (host), ~1.5 KB/sec (clients)

**Limits:**
- 2-4 players: Excellent
- 5-6 players: Good
- 7+ players: Suggest dedicated server

---

## Testing

1. Open two browser windows
2. Start multiplayer in window 1 (host)
3. Copy share code
4. Join from window 2 (client)
5. Host approves connection in UI
6. Verify both sprites sync

---

## Future

- TURN server (for strict NAT)
- Host migration
- Voice chat
- Dedicated servers (7-100 players)
