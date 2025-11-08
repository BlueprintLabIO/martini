# Multiplayer Quick Start Guide

**Goal:** Get multiplayer working in 5 minutes

---

## Prerequisites

- Signaling server built (`apps/signaling/`)
- Web app built (`apps/web/`)
- Database migration applied (share_code column)

---

## Step 1: Start Services (2 terminals)

### Terminal 1: Signaling Server

```bash
cd apps/signaling
pnpm dev

# Should see:
# ╔════════════════════════════════════════════════════════════╗
# ║  🎮 Signaling Server Running                              ║
# ║  Port:           3001                                     ║
# ╚════════════════════════════════════════════════════════════╝
```

### Terminal 2: Web App

```bash
cd apps/web
pnpm dev

# Should see:
# VITE ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

---

## Step 2: Test Multiplayer (2 browser windows)

### Window 1: Host

1. Navigate to `http://localhost:5173/editor/[your-project-id]`
2. Look for **"Start Multiplayer"** button in Game Preview panel
3. Click it
4. You'll see a **6-digit code** (e.g., "ABC123")
5. Copy the code
6. **Keep this window open!**

### Window 2: Client

1. Open **new browser window** (not tab - separate window side-by-side)
2. Navigate to same URL: `http://localhost:5173/editor/[your-project-id]`
3. In Game Preview panel, see **"Join"** input
4. Paste the 6-digit code
5. Click **"Join"**
6. You'll see: **"Waiting for host approval..."**

### Window 1: Approve

1. See notification: **"Pending Players"**
2. See client ID
3. Click **✓ (Approve)** button
4. Client connects!

---

## Step 3: Test Data Transfer

### In Game Code (sandbox)

Add this to your game's `create()` function:

```javascript
// Test if multiplayer is active
if (gameAPI.multiplayer) {
  console.log('Multiplayer active!');
  console.log('Am I host?', gameAPI.multiplayer.isHost());
  console.log('My player ID:', gameAPI.multiplayer.getPlayerId());
  console.log('Room code:', gameAPI.multiplayer.getRoomCode());

  // Send test message
  gameAPI.multiplayer.send({ message: 'Hello from ' + gameAPI.multiplayer.getPlayerId() });

  // Receive messages
  gameAPI.multiplayer.onData((playerId, data) => {
    console.log('Received from', playerId, ':', data);
  });
}
```

### Expected Console Output

**Host Console:**
```
Multiplayer active!
Am I host? true
My player ID: [socket-id-1]
Room code: ABC123
Received from [socket-id-2] : { message: 'Hello from [socket-id-2]' }
```

**Client Console:**
```
Multiplayer active!
Am I host? false
My player ID: [socket-id-2]
Room code: ABC123
Received from [socket-id-1] : { message: 'Hello from [socket-id-1]' }
```

---

## Step 4: Build a Simple Multiplayer Game

### Example: Shared Cursor Positions

```javascript
function create() {
  // Store player cursors
  this.cursors = {};

  // Setup multiplayer
  if (gameAPI.multiplayer) {
    const myId = gameAPI.multiplayer.getPlayerId();

    // Create my cursor
    this.cursors[myId] = this.add.circle(0, 0, 10, 0x00ff00);

    // Create cursors for other players
    gameAPI.multiplayer.onPlayerJoined((playerId) => {
      this.cursors[playerId] = this.add.circle(0, 0, 10, 0xff0000);
    });

    // Remove cursor when player leaves
    gameAPI.multiplayer.onPlayerLeft((playerId) => {
      if (this.cursors[playerId]) {
        this.cursors[playerId].destroy();
        delete this.cursors[playerId];
      }
    });

    // Receive cursor positions
    gameAPI.multiplayer.onData((playerId, data) => {
      if (data.type === 'cursor' && this.cursors[playerId]) {
        this.cursors[playerId].setPosition(data.x, data.y);
      }
    });
  }
}

function update() {
  if (gameAPI.multiplayer) {
    const myId = gameAPI.multiplayer.getPlayerId();

    // Update my cursor based on pointer
    if (this.input.activePointer) {
      const x = this.input.activePointer.x;
      const y = this.input.activePointer.y;

      this.cursors[myId].setPosition(x, y);

      // Broadcast my position
      gameAPI.multiplayer.send({
        type: 'cursor',
        x: x,
        y: y
      });
    }
  }
}
```

**Result:** See other players' cursors move in real-time!

---

## Troubleshooting

### "Failed to generate share code"

**Problem:** Database migration not applied

**Solution:**
```bash
cd apps/web
pnpm db:push
# Or manually: psql $SECRET_DATABASE_URL < drizzle/0002_remarkable_doctor_octopus.sql
```

### "Connection timeout" / Can't connect

**Problem:** Signaling server not running

**Solution:**
```bash
# Check if signaling server is running
curl http://localhost:3001/health

# Should return: {"status":"ok",...}
```

### "Room not found"

**Problem:** Code expired (15 minutes) or typo

**Solution:**
- Generate new code (host clicks "Start Multiplayer" again)
- Check code carefully (no I/O/0/1)

### "Waiting for host approval..." forever

**Problem:** Host didn't see/approve the request

**Solution:**
- Check host window for "Pending Players" notification
- Host must click ✓ button
- If nothing shows, try rejoining

### SimplePeer errors in console

**Problem:** NAT/firewall blocking WebRTC

**Solution:**
- Usually fixes itself after a few seconds (ICE gathering)
- Try on same local network
- In production, would need TURN server

### gameAPI.multiplayer is undefined

**Problem:** Multiplayer not started, or code ran before injection

**Solution:**
```javascript
// Always check first!
if (gameAPI.multiplayer) {
  // Safe to use
} else {
  console.log('Single player mode');
}
```

---

## Testing Checklist

- [ ] Signaling server starts without errors
- [ ] Web app connects to signaling server
- [ ] Host can generate share code
- [ ] Client can request to join
- [ ] Host receives join request notification
- [ ] Host can approve client
- [ ] Client connects after approval
- [ ] Data transfer works (send/receive)
- [ ] Player join/leave events fire
- [ ] Multiple clients can connect (test with 3+ windows)
- [ ] Host disconnect closes room for all clients
- [ ] Client disconnect removes them from host's view

---

## Next Steps

Once basic multiplayer works:

1. **Build a real game**
   - Platformer with multiple players
   - Top-down shooter
   - Multiplayer pong

2. **Test edge cases**
   - What happens when host leaves mid-game?
   - What if client connection is slow?
   - How many players before performance degrades?

3. **Add features**
   - Player names (not just IDs)
   - Chat system
   - Game lobby (pick teams, settings)
   - Spectator mode

4. **Production deployment**
   - Deploy signaling server to Coolify
   - Update `PUBLIC_SIGNALING_URL` env var
   - Test from different networks

---

## Common Patterns

### Synchronizing Player Movement

```javascript
// Host updates physics, broadcasts state
if (gameAPI.multiplayer.isHost()) {
  // Update game logic
  player.update();

  // Broadcast state
  gameAPI.multiplayer.send({
    type: 'state',
    players: this.getAllPlayerStates()
  });
}

// Client receives state, renders
gameAPI.multiplayer.onData((playerId, data) => {
  if (data.type === 'state') {
    this.renderState(data.players);
  }
});
```

### Client-Side Prediction (Advanced)

```javascript
// Client predicts movement locally (feels responsive)
// But trusts server state when received

let predictedX = player.x;

// Predict
if (cursors.left.isDown) {
  predictedX -= 5;
  player.x = predictedX;
}

// Reconcile with server state
gameAPI.multiplayer.onData((playerId, data) => {
  if (data.type === 'correction') {
    player.x = data.x; // Trust server
    predictedX = data.x;
  }
});
```

---

**You're ready to build multiplayer games!** 🎮
