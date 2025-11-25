---
title: Score-Based Victory
description: First to X points wins
section: recipes
subsection: game-modes
order: 2
---

# Score-Based Victory

**Use Case:** First to X points wins, race to goal

Victory condition based on reaching a target score.

## Game Definition

```typescript
const WINNING_SCORE = 10;

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, score: 0 }])
    ),
    winner: null as string | null,
    gameOver: false,
  }),

  actions: {
    score: {
      apply: (state, context, input: { points: number }) => {
        if (state.gameOver) return;

        const player = state.players[context.targetId];
        if (!player) return;

        player.score += input.points;

        // Check win condition
        if (player.score >= WINNING_SCORE) {
          state.winner = context.targetId;
          state.gameOver = true;
          console.log(`Player ${context.targetId} wins!`);
        }
      },
    },

    reset: {
      apply: (state) => {
        for (const player of Object.values(state.players)) {
          player.score = 0;
        }
        state.winner = null;
        state.gameOver = false;
      },
    },
  },
});
```

## Features

- ✅ Win condition
- ✅ Game over state
- ✅ Reset functionality
- ✅ Winner tracking

## Variations

### Configurable Win Score

```typescript
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map((id) => [id, { score: 0 }])
  ),
  winningScore: 10, // Configurable
  winner: null,
  gameOver: false
}),

actions: {
  setWinningScore: {
    apply: (state, context, input: { score: number }) => {
      if (!state.gameOver) {
        state.winningScore = input.score;
      }
    }
  },
  
  score: {
    apply: (state, context, input: { points: number }) => {
      if (state.gameOver) return;
      
      const player = state.players[context.targetId];
      player.score += input.points;
      
      if (player.score >= state.winningScore) {
        state.winner = context.targetId;
        state.gameOver = true;
      }
    }
  }
}
```

### Negative Scoring

```typescript
actions: {
  score: {
    apply: (state, context, input: { points: number }) => {
      const player = state.players[context.targetId];
      player.score += input.points;
      
      // Clamp to minimum
      player.score = Math.max(0, player.score);
      
      // Check win condition
      if (player.score >= WINNING_SCORE) {
        state.winner = context.targetId;
        state.gameOver = true;
      }
    }
  },
  
  penalty: {
    apply: (state, context, input: { points: number }) => {
      const player = state.players[context.targetId];
      player.score = Math.max(0, player.score - input.points);
    }
  }
}
```

### Leaderboard

```typescript
function getLeaderboard(state: GameState) {
  return Object.entries(state.players)
    .map(([id, player]) => ({ id, score: player.score }))
    .sort((a, b) => b.score - a.score);
}

// In your rendering code
const leaderboard = getLeaderboard(runtime.getState());
console.log('Top 3:', leaderboard.slice(0, 3));
```

## See Also

- **[Team-Based →](./team-based)** - Team scoring
- **[Time-Limited →](./time-limited)** - Timed matches
- **[UI/HUD Guide →](/docs/latest/guides/ui-and-hud/01-basics)** - Score display
