---
title: Team-Based Game Modes
description: Implementing team-based multiplayer games
section: recipes
subsection: game-modes
order: 1
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Team-Based Game Modes

**Use Case:** Red vs Blue, cooperative games, team deathmatch

Assign players to teams and track team scores.

## Game Definition

```typescript
import { defineGame } from '@martini-kit/core';

type Team = 'red' | 'blue';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: index % 2 === 0 ? 200 : 600,
          y: 300,
          team: (index % 2 === 0 ? 'red' : 'blue') as Team,
          score: 0,
        },
      ])
    ),
    teamScores: {
      red: 0,
      blue: 0,
    },
  }),

  actions: {
    score: {
      apply: (state, context, input: { points: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Add to individual and team score
        player.score += input.points;
        state.teamScores[player.team] += input.points;

        console.log(`Team ${player.team}: ${state.teamScores[player.team]} points`);
      },
    },
  },
});
```

## Features

- ✅ Automatic team assignment (alternating)
- ✅ Team scores
- ✅ Individual scores
- ✅ Team-based spawning

## Variations

### Custom Team Assignment

```typescript
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map((id, index) => {
      // Assign teams based on player count
      const teamSize = Math.ceil(playerIds.length / 2);
      const team = index < teamSize ? 'red' : 'blue';
      
      return [id, { team, score: 0, x: 400, y: 300 }];
    })
  ),
  teamScores: { red: 0, blue: 0 }
})
```

### Team Balancing on Join

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
    team,
    score: 0
  };
}
```

### Team-Specific Spawn Points

```typescript
const SPAWN_POINTS = {
  red: [
    { x: 100, y: 300 },
    { x: 150, y: 300 },
    { x: 100, y: 350 }
  ],
  blue: [
    { x: 700, y: 300 },
    { x: 650, y: 300 },
    { x: 700, y: 350 }
  ]
};

setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map((id, index) => {
      const team = index % 2 === 0 ? 'red' : 'blue';
      const teamIndex = Math.floor(index / 2);
      const spawn = SPAWN_POINTS[team][teamIndex % SPAWN_POINTS[team].length];
      
      return [id, { ...spawn, team, score: 0 }];
    })
  ),
  teamScores: { red: 0, blue: 0 }
})
```

## See Also

- **[Score-Based Victory →](./score-based)** - Win conditions
- **[Elimination Mode →](./elimination)** - Last team standing
- **[Player Management →](/docs/latest/concepts/player-lifecycle)** - Team balancing
