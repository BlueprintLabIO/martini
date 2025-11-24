---
title: Elimination Mode
description: Last player standing wins
section: recipes
subsection: game-modes
order: 3
---

# Elimination Mode

**Use Case:** Battle royale, last player standing, survival

Players are eliminated until one remains.

## Game Definition

```typescript
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          health: 100,
          isAlive: true,
        },
      ])
    ),
    alivePlayers: playerIds.length,
    winner: null as string | null,
  }),

  actions: {
    eliminate: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player || !player.isAlive) return;

        player.isAlive = false;
        player.health = 0;
        state.alivePlayers--;

        console.log(`Player eliminated. ${state.alivePlayers} remaining`);

        // Check for winner
        if (state.alivePlayers === 1) {
          const survivors = Object.entries(state.players).filter(([_, p]) => p.isAlive);
          if (survivors.length === 1) {
            state.winner = survivors[0][0];
            console.log(`Victory! Winner: ${state.winner}`);
          }
        }
      },
    },
  },
});
```

## Features

- ✅ Elimination tracking
- ✅ Last player standing
- ✅ Player count display
- ✅ Winner determination

## Variations

### Respawn System

```typescript
interface GameState {
  players: Record<string, {
    isAlive: boolean;
    respawnTime: number;
    lives: number;
  }>;
}

actions: {
  eliminate: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player || !player.isAlive) return;
      
      player.isAlive = false;
      player.lives--;
      
      if (player.lives > 0) {
        // Schedule respawn
        player.respawnTime = 5000; // 5 seconds
      } else {
        // Permanently eliminated
        state.alivePlayers--;
      }
    }
  },
  
  tick: createTickAction((state, delta) => {
    Object.values(state.players).forEach(player => {
      if (!player.isAlive && player.respawnTime > 0) {
        player.respawnTime -= delta;
        
        if (player.respawnTime <= 0) {
          player.isAlive = true;
          player.health = 100;
        }
      }
    });
  })
}
```

### Spectator Mode

```typescript
interface Player {
  isAlive: boolean;
  isSpectating: boolean;
}

actions: {
  eliminate: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player || !player.isAlive) return;
      
      player.isAlive = false;
      player.isSpectating = true;
      state.alivePlayers--;
      
      console.log(`${context.targetId} is now spectating`);
    }
  }
}
```

### Placement Tracking

```typescript
interface GameState {
  players: Record<string, Player>;
  placements: string[]; // Ordered by elimination (last = winner)
}

actions: {
  eliminate: {
    apply: (state, context) => {
      const player = state.players[context.targetId];
      if (!player || !player.isAlive) return;
      
      player.isAlive = false;
      state.alivePlayers--;
      
      // Track placement (first eliminated = last place)
      state.placements.unshift(context.targetId);
      
      if (state.alivePlayers === 1) {
        // Add winner to placements
        const winner = Object.keys(state.players).find(
          id => state.players[id].isAlive
        );
        if (winner) {
          state.placements.push(winner);
          state.winner = winner;
        }
      }
    }
  }
}

// Get placement
function getPlacement(state: GameState, playerId: string): number {
  const index = state.placements.indexOf(playerId);
  return state.placements.length - index;
}
```

## See Also

- **[Team-Based →](./team-based)** - Team elimination
- **[Health and Damage →](/docs/latest/recipes/combat/health-and-damage)** - Damage system
- **[Player Lifecycle →](/docs/latest/concepts/player-lifecycle)** - Player management
