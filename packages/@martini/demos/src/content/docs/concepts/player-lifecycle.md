---
title: Player Lifecycle
description: Managing player join, leave, and state across the game session
section: concepts
order: 6
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Player Lifecycle

Managing **when players join and leave** is crucial for robust multiplayer games. Martini provides hooks and helpers to handle player lifecycle gracefully.

## Player Lifecycle Events

Players go through three main lifecycle stages:

1. **Initial Join** - Players present when the game starts (in `setup()`)
2. **Mid-Game Join** - Players joining after the game has started (`onPlayerJoin`)
3. **Leave** - Players disconnecting or leaving (`onPlayerLeave`)

```
Setup (t=0)              Mid-Game                Leave
┌───────────┐           ┌────────────┐         ┌──────────┐
│ Player A  │           │ Player C   │         │ Player B │
│ Player B  │ ────────> │ joins      │ ─────> │ leaves   │
│           │           │            │         │          │
└───────────┘           └────────────┘         └──────────┘
   2 players               3 players             2 players
```

## Lifecycle Hooks

### `setup({ playerIds })`

Called once when the game initializes. Receives **initial player IDs**:

```typescript
import { defineGame } from '@martini/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: index * 200 + 100,
          y: 300,
          health: 100,
          score: 0
        }
      ])
    )
  })
});
```

<Callout type="info">

`setup()` runs on **both host and clients** to initialize their local state. This is why you must use `random` instead of `Math.random()` for consistency.

</Callout>

---

### onPlayerJoin(state, playerId)

Called when a new player joins **after the game has started**:

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, createPlayer(id, index)])
    )
  }),

  onPlayerJoin: (state, playerId) => {
    // Add the new player to state
    const playerCount = Object.keys(state.players).length;

    state.players[playerId] = {
      x: 400,
      y: 300,
      health: 100,
      score: 0,
      isLate: true  // Flag late-joiners if needed
    };

    console.log(`Player ${playerId} joined (total: ${playerCount + 1})`);
  }
});
```

---

### onPlayerLeave(state, playerId)

Called when a player disconnects:

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: {},
    ghosts: []  // Track disconnected players
  }),

  onPlayerLeave: (state, playerId) => {
    const player = state.players[playerId];

    if (player) {
      // Optional: Save player state as a "ghost"
      state.ghosts.push({
        id: playerId,
        ...player,
        disconnectedAt: Date.now()
      });

      // Remove from active players
      delete state.players[playerId];

      console.log(`Player ${playerId} left`);
    }
  }
});
```

<Callout type="warning" title="Host Handles Lifecycle">

Only the **host** should call `onPlayerJoin` and `onPlayerLeave`. The host then syncs the updated state to all clients automatically.

</Callout>

---

## Using PlayerManager Helper

Martini provides `createPlayerManager()` to eliminate boilerplate:

### Basic Usage

```typescript
import { createPlayerManager } from '@martini/core';

const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: index * 200 + 100,
    y: 300,
    health: 100,
    score: 0
  })
});

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    projectiles: []
  }),

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  },

  actions: {
    // ... your actions
  }
});
```

---

### With Roles

Assign roles to players automatically:

```typescript
const playerManager = createPlayerManager({
  roles: ['fire', 'ice', 'water', 'earth'],

  factory: (playerId, index) => ({
    x: 400,
    y: 300,
    health: 100,
    // Role automatically assigned based on index
  })
});

// Result:
// Player 0: { role: 'fire', ... }
// Player 1: { role: 'ice', ... }
// Player 2: { role: 'water', ... }
// Player 3: { role: 'earth', ... }
```

---

### With Spawn Points

Auto-assign spawn positions:

```typescript
const playerManager = createPlayerManager({
  spawnPoints: [
    { x: 100, y: 300 },   // Player 0
    { x: 700, y: 300 },   // Player 1
    { x: 100, y: 500 },   // Player 2
    { x: 700, y: 500 }    // Player 3
  ],

  factory: (playerId, index) => ({
    health: 100,
    score: 0
    // x, y automatically set from spawnPoints
  })
});
```

### With World Bounds (Spawn Clamping)

Prevent players from spawning outside the playable area:

```typescript
const playerManager = createPlayerManager({
  worldBounds: { width: 800, height: 600 },

  factory: (playerId, index) => ({
    x: index * 1000,  // ⚠️ Would spawn at x=0, x=1000, x=2000...
    y: 300,
    health: 100
    // ✅ PlayerManager automatically clamps x to 0-800
    // Result: x=0, x=800, x=800 (clamped)
  })
});
```

<Callout type="info">
**Why clamp spawns?** If your factory uses math like `index * largeNumber`, players might spawn off-screen or outside world boundaries. The `worldBounds` option ensures all players spawn within valid coordinates.
</Callout>

**How it works:**
- If player has `x` property → clamps to `0` to `worldBounds.width`
- If player has `y` property → clamps to `0` to `worldBounds.height`
- Does nothing if player doesn't have position properties
- Works for both initial setup and late-joining players

**Example - Deterministic spawn with safety:**
```typescript
const playerManager = createPlayerManager({
  worldBounds: { width: 800, height: 600 },

  factory: (playerId, index) => {
    // Try to space players out, but clamp if too many players
    const x = 100 + (index * 200);  // Might exceed 800
    const y = 300;

    return { x, y, health: 100 };
    // PlayerManager ensures x is clamped to 0-800
  }
});
```

---

### Using createHandlers()

Even simpler - auto-generate lifecycle hooks:

```typescript
const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  spawnPoints: [
    { x: 200, y: 400 },
    { x: 600, y: 400 }
  ],
  factory: (playerId, index) => ({
    health: 100,
    score: 0
  })
});

export const game = defineGame({
  // ✅ Auto-generates setup, onPlayerJoin, onPlayerLeave
  ...playerManager.createHandlers(),

  actions: {
    move: { ... },
    shoot: { ... }
  }
});
```

<Callout type="success" title="DRY Principle">

`PlayerManager` ensures **both initial players and late-joiners** use the same factory logic, preventing bugs from inconsistent initialization.

</Callout>

---

## Common Patterns

### Pattern 1: Late-Join Penalty

Discourage late-joining by giving players fewer resources:

```typescript
const playerManager = createPlayerManager({
  factory: (playerId, index) => {
    const isInitialPlayer = index < 2;  // First 2 players

    return {
      x: 400,
      y: 300,
      health: isInitialPlayer ? 100 : 50,   // Late-joiners get less health
      score: isInitialPlayer ? 0 : -100,    // Late-joiners start behind
      startingWeapon: isInitialPlayer ? 'rifle' : 'pistol'
    };
  }
});
```

---

### Pattern 2: Team Balancing

Assign late-joiners to the weakest team:

```typescript
onPlayerJoin: (state, playerId) => {
  // Count players per team
  const teamCounts = { red: 0, blue: 0 };
  Object.values(state.players).forEach(p => {
    teamCounts[p.team]++;
  });

  // Assign to smaller team
  const team = teamCounts.red <= teamCounts.blue ? 'red' : 'blue';

  state.players[playerId] = {
    x: 400,
    y: 300,
    health: 100,
    team
  };
}
```

---

### Pattern 3: Persistent Player Data

Save player state when they disconnect:

```typescript
interface GameState {
  players: Record<string, Player>;
  disconnectedPlayers: Record<string, { player: Player; disconnectTime: number }>;
}

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: {},
    disconnectedPlayers: {}
  }),

  onPlayerLeave: (state, playerId) => {
    const player = state.players[playerId];

    if (player) {
      // Save disconnected player
      state.disconnectedPlayers[playerId] = {
        player,
        disconnectTime: Date.now()
      };

      delete state.players[playerId];
    }
  },

  onPlayerJoin: (state, playerId) => {
    // Check if player is reconnecting
    const saved = state.disconnectedPlayers[playerId];

    if (saved) {
      // Restore saved state
      state.players[playerId] = saved.player;
      delete state.disconnectedPlayers[playerId];

      console.log(`Player ${playerId} reconnected!`);
    } else {
      // New player
      state.players[playerId] = createNewPlayer(playerId);
    }
  }
});
```

---

### Pattern 4: Max Players Limit

Reject players if game is full:

```typescript
onPlayerJoin: (state, playerId) => {
  const MAX_PLAYERS = 4;
  const currentPlayers = Object.keys(state.players).length;

  if (currentPlayers >= MAX_PLAYERS) {
    console.warn(`Game is full (${MAX_PLAYERS} players max)`);
    // Don't add the player
    // Optionally: send rejection message via transport
    return;
  }

  // Add player
  state.players[playerId] = createPlayer(playerId);
}
```

---

### Pattern 5: Role Rotation

Assign roles in rotation:

```typescript
const roles = ['tank', 'healer', 'dps', 'support'];
let nextRoleIndex = 0;

const playerManager = createPlayerManager({
  factory: (playerId, index) => {
    const role = roles[nextRoleIndex % roles.length];
    nextRoleIndex++;

    return {
      x: 400,
      y: 300,
      health: 100,
      role
    };
  }
});

// Result:
// Player 1: tank
// Player 2: healer
// Player 3: dps
// Player 4: support
// Player 5: tank (rotates back)
```

---

## Handling Disconnections

### Graceful Cleanup

```typescript
onPlayerLeave: (state, playerId) => {
  const player = state.players[playerId];

  if (!player) return;

  // Clean up player-owned entities
  state.projectiles = state.projectiles.filter(p => p.ownerId !== playerId);
  state.buildings = state.buildings.filter(b => b.ownerId !== playerId);

  // Redistribute resources
  if (player.resources > 0) {
    Object.keys(state.players).forEach(otherId => {
      if (otherId !== playerId) {
        state.players[otherId].resources += player.resources / (Object.keys(state.players).length - 1);
      }
    });
  }

  // Remove player
  delete state.players[playerId];
}
```

---

### Notify Other Players

```typescript
onPlayerLeave: (state, playerId) => {
  delete state.players[playerId];

  // Add notification to state
  if (!state.notifications) state.notifications = [];

  state.notifications.push({
    type: 'player-left',
    playerId,
    timestamp: Date.now(),
    message: `Player ${playerId} has left the game`
  });

  // Remove old notifications
  state.notifications = state.notifications.filter(
    n => Date.now() - n.timestamp < 5000  // Keep for 5 seconds
  );
}
```

---

### Auto-Kick AFK Players

```typescript
actions: {
  tick: createTickAction((state, delta, context) => {
    const AFK_TIMEOUT = 60000;  // 60 seconds
    const now = Date.now();

    Object.entries(state.players).forEach(([playerId, player]) => {
      const timeSinceAction = now - (player.lastActionTime || 0);

      if (timeSinceAction > AFK_TIMEOUT) {
        console.log(`Kicking AFK player: ${playerId}`);

        // Trigger onPlayerLeave manually
        if (gameDef.onPlayerLeave) {
          gameDef.onPlayerLeave(state, playerId);
        }
      }
    });
  })
}
```

---

## Player Count Limits

### In setup()

```typescript
setup: ({ playerIds }) => {
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 4;

  if (playerIds.length < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players to start`);
  }

  if (playerIds.length > MAX_PLAYERS) {
    throw new Error(`Maximum ${MAX_PLAYERS} players allowed`);
  }

  return {
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, createPlayer(id, index)])
    )
  };
}
```

---

### Dynamic Join Limits

```typescript
onPlayerJoin: (state, playerId) => {
  const MAX_PLAYERS = 8;

  if (Object.keys(state.players).length >= MAX_PLAYERS) {
    console.warn(`Cannot join: game is full (${MAX_PLAYERS}/${MAX_PLAYERS})`);
    return;  // Reject join
  }

  state.players[playerId] = createPlayer(playerId);
}
```

---

## Testing Player Lifecycle

### Test Initial Players

```typescript
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';

test('setup initializes all players', () => {
  const transport = new LocalTransport({ roomId: 'test', isHost: true });
  const runtime = new GameRuntime(game, transport, {
    isHost: true,
    playerIds: ['p1', 'p2', 'p3']
  });

  const state = runtime.getState();
  expect(Object.keys(state.players)).toHaveLength(3);
  expect(state.players.p1).toBeDefined();
  expect(state.players.p2).toBeDefined();
  expect(state.players.p3).toBeDefined();
});
```

---

### Test Late Join

```typescript
test('onPlayerJoin adds new player', () => {
  const runtime = new GameRuntime(game, transport, {
    isHost: true,
    playerIds: ['p1', 'p2']
  });

  // Simulate player join
  if (game.onPlayerJoin) {
    const state = runtime.getState();
    game.onPlayerJoin(state, 'p3');

    expect(Object.keys(state.players)).toHaveLength(3);
    expect(state.players.p3).toBeDefined();
  }
});
```

---

### Test Player Leave

```typescript
test('onPlayerLeave removes player', () => {
  const runtime = new GameRuntime(game, transport, {
    isHost: true,
    playerIds: ['p1', 'p2', 'p3']
  });

  // Simulate player leave
  if (game.onPlayerLeave) {
    const state = runtime.getState();
    game.onPlayerLeave(state, 'p2');

    expect(Object.keys(state.players)).toHaveLength(2);
    expect(state.players.p2).toBeUndefined();
  }
});
```

---

## Debugging Player Lifecycle

### Log All Events

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => {
    console.log('[Setup] Initial players:', playerIds);
    return {
      players: Object.fromEntries(
        playerIds.map((id, index) => [id, createPlayer(id, index)])
      )
    };
  },

  onPlayerJoin: (state, playerId) => {
    console.log('[Join] Player joined:', playerId);
    console.log('[Join] Total players:', Object.keys(state.players).length + 1);

    state.players[playerId] = createPlayer(playerId);
  },

  onPlayerLeave: (state, playerId) => {
    console.log('[Leave] Player left:', playerId);
    console.log('[Leave] Remaining players:', Object.keys(state.players).length - 1);

    delete state.players[playerId];
  }
});
```

---

### Track Player History

```typescript
interface GameState {
  players: Record<string, Player>;
  playerHistory: Array<{ event: 'join' | 'leave'; playerId: string; timestamp: number }>;
}

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, createPlayer(id, index)])
    ),
    playerHistory: playerIds.map(id => ({
      event: 'join' as const,
      playerId: id,
      timestamp: Date.now()
    }))
  }),

  onPlayerJoin: (state, playerId) => {
    state.players[playerId] = createPlayer(playerId);
    state.playerHistory.push({ event: 'join', playerId, timestamp: Date.now() });
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
    state.playerHistory.push({ event: 'leave', playerId, timestamp: Date.now() });
  }
});
```

---

## Best Practices

### ✅ Do

- Use `PlayerManager` for consistency
- Handle both initial and late-join players
- Clean up player-owned entities on leave
- Validate player count limits
- Test join/leave scenarios

### ❌ Don't

- Assume player IDs are sequential
- Forget to remove player data on leave
- Initialize players differently in setup vs onPlayerJoin
- Allow unlimited players without limits
- Ignore disconnections (handle gracefully)

---

## Next Steps

- [PlayerManager API](/docs/latest/api/core/helpers#createplayermanager) - Full API reference
- [defineGame() API](/docs/latest/api/core/define-game) - Lifecycle hooks documentation
- [Transport Layer](/docs/latest/concepts/transport-layer) - How join/leave events are triggered
- [State Management](/docs/latest/concepts/state-management) - Structuring player state
