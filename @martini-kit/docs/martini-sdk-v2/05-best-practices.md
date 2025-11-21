# Best Practices

Guidelines for building robust multiplayer games with martini-kit SDK v2.

---

## Architecture Patterns

### 1. Host-Authoritative Design

**The host is the source of truth.** Clients mirror the host's state.

```typescript
// ✅ Good - Host runs physics, clients render
if (adapter.isHost()) {
  // Host: Full physics simulation
  sprite.body.setVelocityX(200);
  this.physics.add.collider(sprite, platforms);
} else {
  // Client: Just render what host tells us
  adapter.onChange((state) => {
    sprite.x = state.players[myId].x;
    sprite.y = state.players[myId].y;
  });
}
```

**Why this matters:**
- ✅ Simple to implement
- ✅ Works with existing Phaser/Unity physics
- ✅ AI can generate code easily
- ⚠️ Clients see ~50-100ms input latency

---

### 2. Separation of State and Simulation

**State** = What exists (positions, scores)
**Simulation** = How it changes (physics, AI)

```typescript
// ✅ Good - Minimal state
const game = defineGame({
  setup: () => ({
    players: {
      p1: { x: 100, y: 200, vx: 0, vy: 0 }
    }
  })
});

// Host runs simulation
if (adapter.isHost()) {
  update() {
    // Physics runs in Phaser
    sprite.body.setVelocityX(200);

    // Adapter auto-syncs sprite.x/y to state
    adapter.trackSprite(sprite, 'player-p1');
  }
}
```

**Don't store derived/computed data in state:**

```typescript
// ❌ Bad - computed in state
state.players[id].speed = Math.sqrt(vx*vx + vy*vy);

// ✅ Good - compute on demand
function getSpeed(player) {
  return Math.sqrt(player.vx**2 + player.vy**2);
}
```

---

### 3. Progressive Enhancement

Start simple, add complexity only when needed:

**Level 1: Basic sync**
```typescript
const game = defineGame({
  actions: {
    move: {
      apply(state, id, input) {
        state.players[id].x = input.x;
      }
    }
  }
});
```

**Level 2: Add validation**
```typescript
actions: {
  move: {
    apply(state, id, input) {
      // Validate input
      if (input.x < 0 || input.x > 800) return;

      state.players[id].x = input.x;
    }
  }
}
```

**Level 3: Add events**
```typescript
actions: {
  shoot: {
    apply(state, id, input) {
      state.bullets.push({...});

      // Broadcast sound effect
      runtime.broadcastEvent('gunshot', { x: input.x, y: input.y });
    }
  }
}
```

---

## State Management

### Keep State Minimal

Only sync data that changes frequently and is needed by all peers.

```typescript
// ❌ Bad - bloated state
state = {
  players: {
    p1: {
      sprite: { /* entire Phaser sprite object */ },
      inventory: [ /* 100 items */ ],
      achievements: [ /* ... */ ],
      settings: { /* ... */ }
    }
  }
};

// ✅ Good - minimal state
state = {
  players: {
    p1: { x: 100, y: 200, health: 100 }
  }
};
```

**Store rarely-changing data elsewhere:**
- Inventory → Local storage or separate API
- Achievements → Database
- Settings → URL params or cookies

---

### State Mutation Guidelines

State must be **mutable** (not immutable like Redux).

```typescript
// ✅ Correct - direct mutation
state.players[id].x = 100;
state.players[id].score += 10;

// ❌ Wrong - creates new object (sync breaks)
state.players[id] = { ...state.players[id], x: 100 };
```

**Why?** The diff/patch algorithm tracks mutations. Creating new objects breaks reference equality.

---

### Handling Player Join/Leave

```typescript
const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    )
  }),

  onPlayerJoin(state, playerId) {
    // Add new player to state
    state.players[playerId] = { x: 100, y: 100, score: 0 };

    // Host spawns sprite
    if (adapter.isHost()) {
      const sprite = this.physics.add.sprite(100, 100, 'player');
      adapter.trackSprite(sprite, `player-${playerId}`);
    }
  },

  onPlayerLeave(state, playerId) {
    // Remove player from state
    delete state.players[playerId];

    // Destroy sprite
    const sprite = sprites[playerId];
    if (sprite) {
      sprite.destroy();
      delete sprites[playerId];
    }
  }
});
```

---

## Action Design

### Make Actions Idempotent (When Possible)

Actions should produce the same result if called twice with same input.

```typescript
// ✅ Good - idempotent
actions: {
  setPosition: {
    apply(state, id, input) {
      state.players[id].x = input.x; // Same result every time
    }
  }
}

// ⚠️ Not idempotent (but okay for certain use cases)
actions: {
  jump: {
    apply(state, id) {
      state.players[id].vy -= 10; // Different result each time
    }
  }
}
```

**Why?** Idempotent actions are easier to reason about and debug.

---

### Validate Input

Don't trust client input. Validate on host.

```typescript
actions: {
  move: {
    apply(state, id, input) {
      // ✅ Validate bounds
      const x = Math.max(0, Math.min(800, input.x));
      const y = Math.max(0, Math.min(600, input.y));

      state.players[id].x = x;
      state.players[id].y = y;
    }
  },

  givePoints: {
    apply(state, id, input) {
      // ✅ Validate amount
      if (input.amount < 0 || input.amount > 100) {
        console.warn('Invalid points amount');
        return;
      }

      state.players[id].score += input.amount;
    }
  }
}
```

---

### Use Events for Side Effects

Actions modify state. Events trigger side effects (sounds, particles, etc.).

```typescript
actions: {
  collectCoin: {
    apply(state, id, input) {
      // Modify state
      state.coins = state.coins.filter(c => c.id !== input.coinId);
      state.players[id].score += 10;

      // Broadcast event for sound/particles
      runtime.broadcastEvent('coin-collected', {
        coinId: input.coinId,
        x: input.x,
        y: input.y
      });
    }
  }
}

// In Phaser scene
runtime.onEvent('coin-collected', (senderId, eventName, payload) => {
  this.sound.play('coin-pickup');
  this.particles.emitAt(payload.x, payload.y);
});
```

---

## P2P Networking

### URL-Based Host Selection (Recommended)

Use URL params to determine host/client (Jackbox-style).

```typescript
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room');
const isHost = !roomId; // No room param = host

if (isHost) {
  // Generate room ID
  const newRoomId = 'room-' + Math.random().toString(36).substring(2, 8);

  // Show join link
  const joinUrl = `${window.location.origin}?room=${newRoomId}`;
  alert(`Share this link: ${joinUrl}`);

  // Create transport
  const transport = new TrysteroTransport({ roomId: newRoomId, isHost: true });
} else {
  // Join existing room
  const transport = new TrysteroTransport({ roomId, isHost: false });
}
```

**Benefits:**
- ✅ Predictable (no race conditions)
- ✅ User knows who's host
- ✅ Works like Jackbox, Among Us, etc.

---

### Handle Host Disconnection

In sticky host pattern, game ends when host leaves.

```typescript
transport.onHostDisconnect(() => {
  // Game over - host left
  alert('Host disconnected. Returning to menu...');
  window.location.href = '/menu';
});

// Host: Warn before closing
if (transport.isHost()) {
  window.addEventListener('beforeunload', (e) => {
    if (transport.getPeerIds().length > 0) {
      e.preventDefault();
      e.returnValue = 'Other players will be disconnected!';
      return 'Other players will be disconnected!';
    }
  });
}
```

---

### Use TURN for Reliability

STUN alone fails for ~5-10% of users. Add TURN for 99%+ success rate.

```typescript
const transport = new TrysteroTransport({
  roomId: 'room-123',
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-server.com:3478',
        username: 'user',
        credential: 'password'
      }
    ]
  }
});
```

**Free/cheap TURN options:**
- Twilio (~$0.0004/min)
- xirsys (free tier)
- Self-hosted coturn (free)

---

## Phaser Integration

### Only Host Needs Physics

Clients just render sprites from state.

```typescript
create() {
  if (adapter.isHost()) {
    // Host: Full physics
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.physics.add.collider(this.player, platforms);
    adapter.trackSprite(this.player, `player-${adapter.myId}`);
  } else {
    // Client: Visual only
    this.player = this.add.sprite(100, 100, 'player');
    adapter.registerRemoteSprite(`player-${adapter.myId}`, this.player);
  }
}

update() {
  if (adapter.isHost()) {
    // Host: Run physics
    if (cursors.left.isDown) {
      this.player.body.setVelocityX(-200);
    }
  }
  // Client: Sprites auto-update from state
}
```

---

### Interpolate for Smooth Movement

Clients can interpolate between state updates for smoother motion.

```typescript
// Client-side interpolation
adapter.onChange((state) => {
  const targetX = state.players[myId].x;
  const targetY = state.players[myId].y;

  // Smooth lerp instead of snap
  sprite.x += (targetX - sprite.x) * 0.2;
  sprite.y += (targetY - sprite.y) * 0.2;
});
```

---

### Track Sprites Efficiently

```typescript
// ✅ Good - track once per sprite
const sprite = this.physics.add.sprite(100, 100, 'player');
adapter.trackSprite(sprite, `player-${id}`);

// ❌ Bad - don't re-track every frame
update() {
  adapter.trackSprite(sprite, `player-${id}`); // Wasteful!
}
```

The adapter automatically watches sprite properties. No need to call `trackSprite()` repeatedly.

---

## Testing

### Test in Incognito Windows

Open host and client in separate incognito windows to simulate real P2P.

```bash
# Host
http://localhost:3000

# Client (separate incognito window)
http://localhost:3000?room=ABC123
```

---

### Mock Transport for Unit Tests

```typescript
class MockTransport implements Transport {
  private handlers: Array<(msg: WireMessage, sender: string) => void> = [];

  send(msg: WireMessage) {
    // Simulate receiving own message
    this.handlers.forEach(h => h(msg, this.getPlayerId()));
  }

  onMessage(handler) {
    this.handlers.push(handler);
    return () => {};
  }

  getPlayerId() { return 'test-player'; }
  getPeerIds() { return []; }
  isHost() { return true; }
  // ... implement other methods
}

// Use in tests
const transport = new MockTransport();
const runtime = new GameRuntime(game, transport, { isHost: true });
```

---

## Performance

### Optimize Sync Frequency

Default: 20 FPS (50ms). Adjust based on game type.

```typescript
// Slow-paced turn-based game
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  syncInterval: 200 // 5 FPS
});

// Fast-paced action game
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  syncInterval: 33 // 30 FPS
});
```

---

### Minimize State Size

Smaller state = less bandwidth = lower latency.

```typescript
// ❌ Bad - 500 bytes per sync
state = {
  players: {
    p1: {
      position: { x: 100, y: 200 },
      velocity: { x: 50, y: -20 },
      rotation: 1.57,
      scale: 1.0,
      alpha: 1.0
    }
  }
};

// ✅ Good - 50 bytes per sync
state = {
  players: {
    p1: { x: 100, y: 200 } // Only sync what's needed
  }
};
```

---

### Use Object Pools

Reuse objects instead of creating new ones.

```typescript
// ❌ Bad - creates garbage
actions: {
  shoot: {
    apply(state, id) {
      state.bullets.push({ x: 100, y: 200, vx: 10, vy: 0 });
    }
  }
}

// ✅ Good - reuse pooled bullets
const bulletPool = [];

actions: {
  shoot: {
    apply(state, id) {
      let bullet = bulletPool.find(b => !b.active);
      if (!bullet) {
        bullet = { x: 0, y: 0, vx: 0, vy: 0, active: false };
        bulletPool.push(bullet);
      }

      bullet.x = 100;
      bullet.y = 200;
      bullet.vx = 10;
      bullet.vy = 0;
      bullet.active = true;

      state.bullets.push(bullet);
    }
  }
}
```

---

## Security

### Don't Trust Client Input

Always validate on host.

```typescript
actions: {
  teleport: {
    apply(state, id, input) {
      // ❌ Bad - client can cheat
      state.players[id].x = input.x;
      state.players[id].y = input.y;

      // ✅ Good - validate range
      const maxDist = 50;
      const dx = input.x - state.players[id].x;
      const dy = input.y - state.players[id].y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist <= maxDist) {
        state.players[id].x = input.x;
        state.players[id].y = input.y;
      } else {
        console.warn('Teleport distance too far:', id, dist);
      }
    }
  }
}
```

---

### Rate Limit Actions

Prevent spam/DoS.

```typescript
const actionTimestamps = new Map();

actions: {
  jump: {
    apply(state, id) {
      const now = Date.now();
      const last = actionTimestamps.get(id) || 0;

      // Rate limit: 1 jump per 500ms
      if (now - last < 500) {
        console.warn('Jump rate limit exceeded:', id);
        return;
      }

      actionTimestamps.set(id, now);
      state.players[id].vy = -300;
    }
  }
}
```

---

## Debugging

### Log State Changes

```typescript
runtime.onChange((state) => {
  console.log('[State Update]', {
    players: Object.keys(state.players).length,
    bullets: state.bullets?.length || 0
  });
});
```

---

### Monitor Connection Quality

```typescript
let lastSyncTime = Date.now();

runtime.onChange(() => {
  const now = Date.now();
  const delta = now - lastSyncTime;
  lastSyncTime = now;

  if (delta > 200) {
    console.warn('Slow sync detected:', delta + 'ms');
  }
});
```

---

### Visualize Host/Client State

```typescript
// Show role on screen
const roleText = this.add.text(10, 10,
  adapter.isHost() ? 'HOST' : 'CLIENT',
  { color: adapter.isHost() ? '#00ff00' : '#ffff00' }
);

// Show peer count
setInterval(() => {
  const peers = transport.getPeerIds();
  roleText.setText(`${adapter.isHost() ? 'HOST' : 'CLIENT'} | Peers: ${peers.length}`);
}, 1000);
```

---

## Next Steps

- [Quick Start Guide](./quick-start.md)
- [Troubleshooting](./troubleshooting.md)
- [API Reference](./api-reference-core.md)
