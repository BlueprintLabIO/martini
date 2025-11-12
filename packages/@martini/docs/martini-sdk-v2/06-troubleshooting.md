# Troubleshooting Guide

Common issues and solutions when using Martini SDK v2.

---

## P2P Connection Issues

### Problem: Peers can't connect to each other

**Symptoms:**
- `onPeerJoin` never fires
- `getPeerIds()` returns empty array
- Game stays stuck on "Waiting for players..."

**Solutions:**

1. **Check room IDs match**
   ```typescript
   // Host creates room
   const roomId = 'game-123';
   const hostTransport = new TrysteroTransport({ roomId, isHost: true });

   // Client MUST use same room ID
   const clientTransport = new TrysteroTransport({ roomId: 'game-123', isHost: false });
   ```

2. **Verify app IDs match**
   ```typescript
   // Both peers must use same appId
   const transport = new TrysteroTransport({
     roomId: 'room-123',
     appId: 'my-game' // Must match!
   });
   ```

3. **Add TURN server for NAT traversal**

   STUN alone fails for ~5-10% of users behind restrictive firewalls:

   ```typescript
   const transport = new TrysteroTransport({
     roomId: 'room-123',
     rtcConfig: {
       iceServers: [
         { urls: 'stun:stun.l.google.com:19302' },
         {
           urls: 'turn:your-turn-server.com:3478',
           username: 'user',
           credential: 'password'
         }
       ]
     }
   });
   ```

   **TURN Providers:**
   - [Twilio](https://www.twilio.com/stun-turn) - $0.0004 per minute
   - [xirsys](https://xirsys.com/) - Free tier available
   - [coturn](https://github.com/coturn/coturn) - Self-hosted (free)

4. **Check browser console for WebRTC errors**

   Look for:
   - ICE connection failed
   - Peer connection timeout
   - CORS errors (if using custom signaling server)

---

## State Sync Issues

### Problem: State not syncing between peers

**Symptoms:**
- Host sees player move, client doesn't
- Client actions don't reach host
- State diverges between peers

**Solutions:**

1. **Verify isHost is set correctly**
   ```typescript
   // Host
   const runtime = new GameRuntime(game, transport, {
     isHost: true // Host MUST be true
   });

   // Client
   const runtime = new GameRuntime(game, transport, {
     isHost: false // Client MUST be false
   });
   ```

2. **Check actions are defined**
   ```typescript
   const game = defineGame({
     actions: {
       move: { // Action must exist!
         apply(state, playerId, input) {
           state.players[playerId].x = input.x;
         }
       }
     }
   });
   ```

3. **Ensure state is mutable**
   ```typescript
   // ❌ Wrong - creates new object
   state.players[id] = { ...state.players[id], x: 100 };

   // ✅ Correct - mutates existing object
   state.players[id].x = 100;
   ```

4. **Check onChange listener is registered**
   ```typescript
   runtime.onChange((state) => {
     // Update your visuals here
     updateGameObjects(state);
   });
   ```

---

## Phaser Integration Issues

### Problem: Sprites not syncing automatically

**Symptoms:**
- `trackSprite()` called but sprites don't sync
- Sprite positions don't update on remote peers
- "Cannot read property 'x' of undefined" errors

**Solutions:**

1. **Ensure sprite has physics body**
   ```typescript
   const sprite = this.add.sprite(100, 100, 'player');
   this.physics.add.existing(sprite); // Required for trackSprite!

   adapter.trackSprite(sprite, `player-${playerId}`);
   ```

2. **Use unique keys per sprite**
   ```typescript
   // ❌ Wrong - all sprites have same key
   adapter.trackSprite(sprite1, 'player');
   adapter.trackSprite(sprite2, 'player'); // Conflicts!

   // ✅ Correct - unique keys
   adapter.trackSprite(sprite1, `player-${playerId1}`);
   adapter.trackSprite(sprite2, `player-${playerId2}`);
   ```

3. **Track sprites AFTER creating them**
   ```typescript
   // ✅ Correct order
   const sprite = this.add.sprite(100, 100, 'player');
   this.physics.add.existing(sprite);
   adapter.trackSprite(sprite, `player-${id}`);

   // ❌ Wrong - sprite doesn't exist yet
   adapter.trackSprite(sprite, 'player');
   const sprite = this.add.sprite(100, 100, 'player');
   ```

4. **Check host is running physics**
   ```typescript
   // Only host needs physics
   if (adapter.isHost()) {
     const sprite = this.physics.add.sprite(100, 100, 'player');
     this.physics.add.collider(sprite, platforms);
     adapter.trackSprite(sprite, `player-${id}`);
   } else {
     // Clients just render
     const sprite = this.add.sprite(100, 100, 'player');
     adapter.registerRemoteSprite(`player-${id}`, sprite);
   }
   ```

---

## Performance Issues

### Problem: Game lags or stutters

**Symptoms:**
- High latency (>200ms)
- Choppy movement
- Dropped frames

**Solutions:**

1. **Reduce sync frequency** (default: 20 FPS)
   ```typescript
   const runtime = new GameRuntime(game, transport, {
     isHost: true,
     syncInterval: 100 // 10 FPS instead of 20
   });
   ```

2. **Optimize state structure**
   ```typescript
   // ❌ Inefficient - large state object
   state = {
     players: {
       p1: { x: 100, y: 200, sprite: {...}, inventory: [...] }
     }
   };

   // ✅ Efficient - minimal state
   state = {
     players: {
       p1: { x: 100, y: 200 } // Only sync what changes frequently
     }
   };
   ```

3. **Use events for infrequent updates**
   ```typescript
   // ❌ Don't sync in state
   state.chatMessages.push(msg);

   // ✅ Use events instead
   runtime.broadcastEvent('chat', { message: msg });
   ```

4. **Check network quality**
   ```typescript
   transport.onConnectionChange((state) => {
     if (state === 'disconnected') {
       alert('Connection lost!');
     }
   });
   ```

---

## Host Disconnection

### Problem: Game ends when host refreshes

**Symptoms:**
- "Host left the game!" message
- All clients kicked
- Game state lost

**This is by design** in the sticky host pattern!

**Workarounds:**

1. **Warn users before host closes**
   ```typescript
   if (adapter.isHost()) {
     window.addEventListener('beforeunload', (e) => {
       e.preventDefault();
       e.returnValue = 'Players will be disconnected!';
       return 'Players will be disconnected!';
     });
   }
   ```

2. **Save game state for resumption**
   ```typescript
   // Host periodically saves state
   if (adapter.isHost()) {
     setInterval(() => {
       localStorage.setItem('game-state', JSON.stringify(runtime.getState()));
     }, 5000);
   }

   // On reconnect, restore state
   const savedState = localStorage.getItem('game-state');
   if (savedState) {
     // Load into new runtime
   }
   ```

3. **Future: Use WebSocket transport** (host migration supported)
   ```typescript
   // Coming soon - WebSocket transport with host migration
   const transport = new WebSocketTransport('wss://game.com');
   ```

---

## TypeScript Errors

### Problem: Type errors with state/actions

**Solutions:**

1. **Add type annotations to game definition**
   ```typescript
   interface GameState {
     players: Record<string, { x: number; y: number }>;
   }

   const game = defineGame({
     setup: (): GameState => ({
       players: {}
     }),
     actions: {
       move: {
         apply(state: GameState, playerId: string, input: { x: number; y: number }) {
           state.players[playerId].x = input.x;
         }
       }
     }
   });
   ```

2. **Cast runtime.getState() to your type**
   ```typescript
   const state = runtime.getState() as GameState;
   ```

---

## Debugging Tips

### Enable detailed logging

```typescript
// In TrysteroTransport, logs are automatic
const transport = new TrysteroTransport({ roomId: 'test' });
// Check console for:
// [TrysteroTransport] Initialized: {...}
// [TrysteroTransport] Peer joined: peer-2
```

### Inspect runtime state

```typescript
runtime.onChange((state) => {
  console.log('State updated:', JSON.stringify(state, null, 2));
});
```

### Monitor connection state

```typescript
transport.onConnectionChange((state) => {
  console.log('Connection:', state);
  document.getElementById('status').textContent = state;
});
```

### Check peer list

```typescript
setInterval(() => {
  console.log('Connected peers:', transport.getPeerIds());
  console.log('Am I host?', transport.isHost());
}, 2000);
```

---

## Common Mistakes

### 1. Forgetting to call setup()

```typescript
// ❌ Missing setup - state is undefined
const game = defineGame({
  actions: { /* ... */ }
});

// ✅ Define initial state
const game = defineGame({
  setup: () => ({ players: {} }),
  actions: { /* ... */ }
});
```

### 2. Calling submitAction() on client for physics

```typescript
// ❌ Wrong - client submits physics
if (!adapter.isHost()) {
  runtime.submitAction('jump', {});
}

// ✅ Correct - only host runs physics
if (adapter.isHost()) {
  sprite.body.setVelocityY(-300);
}
```

### 3. Not waiting for peers to connect

```typescript
// ❌ Wrong - peers might not be connected yet
const transport = new TrysteroTransport({ roomId });
const runtime = new GameRuntime(game, transport, { isHost: true });

// ✅ Correct - wait for ready
const transport = new TrysteroTransport({ roomId });
await transport.waitForReady();
const runtime = new GameRuntime(game, transport, { isHost: transport.isHost() });
```

---

## Getting Help

If you're still stuck:

1. **Check demo code:** [packages/@martini/demo-vite](../../demo-vite)
2. **Search issues:** [GitHub Issues](https://github.com/your-org/martini/issues)
3. **Ask for help:** Create a new issue with:
   - Minimal reproduction code
   - Error messages from console
   - Browser/OS versions
   - Network setup (corporate firewall, VPN, etc.)

---

## Next Steps

- [Quick Start Guide](./quick-start.md)
- [Core Concepts](./01-core-concepts.md)
- [Platform Comparison](./platform-comparison.md)
