# Correctness Guarantees

How Martini prevents cheating, desyncs, and invalid state.

---

## 1. Server Authority

**Guarantee:** Clients cannot fake mutations. Host always wins.

```javascript
// Client tries to cheat
game.actions.move({ dx: 1000 });  // Try to teleport

// Server validates via input schema
input: { dx: { type: 'number', min: -10, max: 10 } }

// Result: Clamped to 10, cheat prevented
```

---

## 2. Schema Validation

**Guarantee:** State never violates constraints.

```javascript
schema: {
  'players.*.score': { type: 'number', min: 0 }
}

// Action tries to set negative score
game.players[playerId].score = -100;

// Proxy auto-clamps to 0
```

---

## 3. Determinism

**Guarantee:** All clients compute identical state.

```javascript
config: { determinism: { strict: true } }

// ❌ Throws in dev mode:
if (Math.random() > 0.5) { /* ... */ }

// ✅ Use seeded random:
if (random() > 0.5) { /* ... */ }
```

---

## 4. Input Validation

**Guarantee:** `apply()` receives valid inputs.

```javascript
actions: {
  move: {
    input: {
      dx: { type: 'number', min: -10, max: 10 }
    },
    apply: ({ input }) => {
      // input.dx is guaranteed valid
    }
  }
}
```

---

## 5. Built-in Validation Helpers

**Guarantee:** Common checks enforced on **server** (clients may predict incorrectly).

```javascript
requires: {
  cooldown: 100,  // Server auto-rejects if <100ms since last call
  proximity: {
    get: ({ game, input }) => game.coins.find(c => c.id === input.coinId),
    distance: 50  // Server auto-rejects if >50px away
  },
  rateLimit: {
    max: 10,      // Server enforces max 10 calls per window
    window: 1000  // 1 second sliding window
  }
}
```

**How each works:**

- **cooldown:** Server tracks last call timestamp per player. Rejects if `now - lastCall < cooldown`.
- **proximity:** Server calculates distance between player position and target. Rejects if `distance > maxDistance`.
- **rateLimit:** Server tracks timestamps of last N calls. Rejects if 11th call within sliding window. Example: max 10/second means client can call rapidly 10 times, then must wait 1 second before next call is allowed.

**Client-Side Prediction:**
- Clients may predict actions before server validates
- If server rejects (cooldown/proximity failed), client rolls back
- This means user may briefly see action succeed, then get corrected

**Server Authority:**
- All `requires` checks run on authoritative server/host
- Clients cannot bypass these checks (server always wins)

---

## 6. Orphaned Action Handling

**Guarantee:** Actions from disconnected players are safely discarded.

When a player leaves the game, their pending actions may still be queued. The runtime handles this gracefully:

```javascript
// Server behavior:
executeAction(action: QueuedAction): ActionResult {
  // 1. Validate player still exists
  if (!this.state.players[action.playerId]) {
    return { rejected: true, reason: 'player_not_found' };
  }

  // 2. Execute action
  this.gameLogic.actions[action.name].apply({
    game: this.state,
    playerId: action.playerId,
    input: action.payload,
    random: createActionRandom(action.tick, action.actionIndex),
    time: action.tick * this.tickDuration
  });

  return { success: true };
}
```

**User code should also be defensive:**
```javascript
actions: {
  attack: {
    apply: ({ game, playerId, input }) => {
      const attacker = game.players[playerId];
      if (!attacker) return;  // ✅ Safe: player may have left

      const target = game.players[input.targetId];
      if (!target) return;  // ✅ Safe: target may have left

      target.health -= 10;
    }
  }
}
```

**Why this matters:**
- Player leaves at tick 100
- Their "attack" action queued for tick 101 is still in the queue
- Without this check, accessing `game.players[playerId]` returns `undefined`
- Attempting `undefined.health -= 10` crashes the server

---

## 8. Setup Initialization Errors

**Guarantee:** Runtime initialization can fail gracefully if `setup()` throws.

```javascript
// ❌ WRONG: Uncaught error crashes server
const gameLogic = createGame({
  setup: ({ playerIds }) => {
    if (playerIds.length < 2) {
      throw new Error('Need 2 players');  // Runtime crashes!
    }
    return { players: { ... } };
  }
});

// ✅ CORRECT: Validate before calling createRuntime
const runtime = await createRuntime(gameLogic, transport, {
  playerIds: room.clients.length >= 2 ? room.clients.map(c => c.sessionId) : undefined,
  isHost: true,
  onReady: () => {
    console.log('Game started successfully');
  },
  onError: (err) => {
    console.error('Setup failed:', err);
    room.broadcast('error', { message: 'Not enough players' });
  }
});

// ✅ ALTERNATIVE: Use dedicated server pattern (defer setup until first player)
const runtime = await createRuntime(gameLogic, transport, {
  // Omit playerIds - setup() called when first player joins
  isHost: true
});

transport.onPeerJoin((playerId) => {
  if (!runtime.state) {
    // First player - initialize state
    try {
      const initialState = gameLogic.setup({
        playerIds: [playerId],
        time: runtime.getTick() * runtime.tickDuration
      });
      runtime.state = initialState;
      console.log('Game initialized by first player');
    } catch (err) {
      console.error('Setup failed:', err);
      transport.kick(playerId, 'Game initialization failed');
    }
  }
});
```

**Common setup errors to handle:**
- Invalid player count (too few/many players)
- External resource loading failures (maps, assets)
- Network failures during initialization
- Invalid configuration (missing required fields)

**Best practices:**
1. **Pre-flight validation:** Check conditions before calling `createRuntime()`
2. **Dedicated server pattern:** Defer `setup()` until first player joins (handles dynamic player counts)
3. **Error callbacks:** Use `onError` to notify clients of initialization failures
4. **Graceful degradation:** Provide fallback state if setup fails partially

See [06-implementation-guide.md](./06-implementation-guide.md) for internals.
