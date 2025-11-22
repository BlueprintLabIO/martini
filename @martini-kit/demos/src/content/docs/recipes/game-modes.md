<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Game Modes Recipes

Common game mode patterns for multiplayer games. Copy and adapt these recipes for your game.

## Table of Contents

- [Team-Based Games](#team-based-games)
- [Score-Based Victory](#score-based-victory)
- [Time-Limited Matches](#time-limited-matches)
- [Round-Based Gameplay](#round-based-gameplay)
- [Elimination Mode](#elimination-mode)
- [King of the Hill](#king-of-the-hill)

---

## Team-Based Games

**Use Case:** Red vs Blue, cooperative games

Assign players to teams and track team scores.

### Game Definition

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

### Phaser Scene (Team UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using Phaser Helpers** - Automatic reactive UI updates:

```typescript
import { createPlayerHUD } from '@martini-kit/phaser';

create() {
  // Create HUD with team info
  const hud = createPlayerHUD(this.adapter, this, {
    customStats: (state, playerId) => {
      const player = state.players[playerId];
      return `Team ${player.team.toUpperCase()} | Score: ${player.score}`;
    }
  });

  // Add team scores display
  this.add.text(400, 10, '', {
    fontSize: '24px',
    color: '#ffffff',
  }).setOrigin(0.5, 0);

  this.adapter.onChange((state) => {
    this.teamScoreText.setText(
      `RED: ${state.teamScores.red}  |  BLUE: ${state.teamScores.blue}`
    );
  });
}
```

**Benefits:**
- ✅ Automatic player info display
- ✅ Built-in reactive updates
- ✅ Less boilerplate

{/snippet}

{#snippet core()}

**Manual Text Management** - Full control over UI:

```typescript
create() {
  // Team scores
  this.redScoreText = this.add.text(10, 10, 'RED: 0', {
    fontSize: '24px',
    color: '#ff0000',
  });

  this.blueScoreText = this.add.text(700, 10, 'BLUE: 0', {
    fontSize: '24px',
    color: '#0000ff',
  }).setOrigin(1, 0);

  this.adapter.onChange((state) => {
    this.redScoreText.setText(`RED: ${state.teamScores.red}`);
    this.blueScoreText.setText(`BLUE: ${state.teamScores.blue}`);
  });
}
```

**Benefits:**
- ✅ Complete control over styling
- ✅ Custom positioning
- ✅ Direct state access

{/snippet}
</CodeTabs>

**Features:**
- ✅ Team assignment
- ✅ Team scores
- ✅ Individual scores
- ✅ Team-based spawning

---

## Score-Based Victory

**Use Case:** First to X points wins

Victory condition based on reaching a score.

### Game Definition

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

**Features:**
- ✅ Win condition
- ✅ Game over state
- ✅ Reset functionality

---

## Time-Limited Matches

**Use Case:** Timed matches

Match ends after a set duration.

### Game Definition

```typescript
const MATCH_DURATION = 120000; // 2 minutes

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 400, y: 300, score: 0 }])
    ),
    matchTimeRemaining: MATCH_DURATION, // ms
    matchStarted: false,
    matchEnded: false,
    winner: null as string | null,
  }),

  actions: {
    startMatch: {
      apply: (state) => {
        state.matchStarted = true;
        state.matchTimeRemaining = MATCH_DURATION;
        console.log('Match started!');
      },
    },

    tick: {
      apply: (state, context, input: { delta: number }) => {
        if (!state.matchStarted || state.matchEnded) return;

        state.matchTimeRemaining -= input.delta;

        if (state.matchTimeRemaining <= 0) {
          state.matchTimeRemaining = 0;
          state.matchEnded = true;

          // Determine winner by highest score
          let highestScore = -1;
          let winnerId: string | null = null;

          for (const [playerId, player] of Object.entries(state.players)) {
            if (player.score > highestScore) {
              highestScore = player.score;
              winnerId = playerId;
            }
          }

          state.winner = winnerId;
          console.log(`Match ended! Winner: ${winnerId} with ${highestScore} points`);
        }
      },
    },
  },
});
```

### Phaser Scene (Timer UI)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using Phaser Helpers** - Automatic timer formatting:

```typescript
import { createGameTimer } from '@martini-kit/phaser';

create() {
  // Create timer with automatic formatting and styling
  const timer = createGameTimer(this.adapter, this, {
    position: { x: 400, y: 10 },
    format: 'mm:ss',
    stateKey: 'matchTimeRemaining',
    warningThreshold: 10000, // Flash red at 10 seconds
    warningColor: '#ff0000',
  });
}
```

**Benefits:**
- ✅ Automatic time formatting
- ✅ Built-in warning states
- ✅ One-line setup

{/snippet}

{#snippet core()}

**Manual Timer Management** - Custom formatting:

```typescript
create() {
  this.timerText = this.add.text(400, 10, '2:00', {
    fontSize: '32px',
    color: '#ffffff',
  }).setOrigin(0.5, 0);

  this.adapter.onChange((state) => {
    const seconds = Math.ceil(state.matchTimeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    this.timerText.setText(`${minutes}:${secs.toString().padStart(2, '0')}`);

    // Flash red when time running out
    if (seconds <= 10) {
      this.timerText.setColor('#ff0000');
    }
  });
}
```

**Benefits:**
- ✅ Custom time formatting
- ✅ Fine-grained control
- ✅ Custom warning logic

{/snippet}
</CodeTabs>

**Features:**
- ✅ Match timer
- ✅ Auto-end at time limit
- ✅ Winner determination
- ✅ Visual countdown

---

## Round-Based Gameplay

**Use Case:** Best of X rounds

Multiple rounds with reset between rounds.

### Game Definition

```typescript
const ROUNDS_TO_WIN = 3;

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          x: 400,
          y: 300,
          health: 100,
          roundsWon: 0,
        },
      ])
    ),
    currentRound: 0,
    roundWinner: null as string | null,
    matchWinner: null as string | null,
  }),

  actions: {
    endRound: {
      apply: (state, context, input: { winnerId: string }) => {
        const player = state.players[input.winnerId];
        if (!player) return;

        player.roundsWon++;
        state.roundWinner = input.winnerId;

        console.log(`Round ${state.currentRound} won by ${input.winnerId}`);

        // Check match win
        if (player.roundsWon >= ROUNDS_TO_WIN) {
          state.matchWinner = input.winnerId;
          console.log(`Match won by ${input.winnerId}!`);
        }
      },
    },

    startNewRound: {
      apply: (state) => {
        state.currentRound++;
        state.roundWinner = null;

        // Reset player states
        for (const player of Object.values(state.players)) {
          player.health = 100;
          // ... reset other per-round stats ...
        }

        console.log(`Starting round ${state.currentRound}`);
      },
    },
  },
});
```

**Features:**
- ✅ Multiple rounds
- ✅ Round tracking
- ✅ Best-of-X wins
- ✅ Round reset

---

## Elimination Mode

**Use Case:** Last player standing

Battle royale style elimination.

### Game Definition

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

**Features:**
- ✅ Elimination tracking
- ✅ Last player standing
- ✅ Player count display

---

## King of the Hill

**Use Case:** Capture and hold zone

Hold a zone to earn points.

### Game Definition

```typescript
const POINTS_PER_SECOND = 10;
const ZONE_RADIUS = 100;
const ZONE_CENTER = { x: 400, y: 300 };

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 200, y: 200, score: 0 }])
    ),
    controllingPlayer: null as string | null,
  }),

  actions: {
    tick: {
      apply: (state, context, input: { delta: number }) => {
        const deltaSeconds = input.delta / 1000;

        // Find players in zone
        const playersInZone = Object.keys(state.players).filter((playerId) => {
          const player = state.players[playerId];
          const distance = Math.hypot(player.x - ZONE_CENTER.x, player.y - ZONE_CENTER.y);
          return distance <= ZONE_RADIUS;
        });

        if (playersInZone.length === 1) {
          // One player controls the zone
          const controllerId = playersInZone[0];
          state.controllingPlayer = controllerId;

          // Award points
          state.players[controllerId].score += POINTS_PER_SECOND * deltaSeconds;
        } else {
          // Contested or empty
          state.controllingPlayer = null;
        }
      },
    },
  },
});
```

### Phaser Scene (Zone Visual)

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

**Using Phaser Helpers** - Reactive zone rendering:

```typescript
import { createCaptureZone } from '@martini-kit/phaser';

create() {
  // Create capture zone with automatic state-based styling
  const zone = createCaptureZone(this.adapter, this, {
    x: 400,
    y: 300,
    radius: 100,
    controlStateKey: 'controllingPlayer',
    colors: {
      neutral: 0xaaaaaa,
      controlled: 0x00ff00,
    },
  });
}
```

**Benefits:**
- ✅ Automatic color switching
- ✅ Built-in state reactivity
- ✅ Minimal setup

{/snippet}

{#snippet core()}

**Manual Zone Rendering** - Custom visuals:

```typescript
create() {
  // Draw capture zone
  this.zone = this.add.circle(400, 300, 100, 0x00ff00, 0.2);
  this.zone.setStrokeStyle(3, 0x00ff00);

  this.adapter.onChange((state) => {
    // Change color based on control
    if (state.controllingPlayer) {
      this.zone.setFillStyle(0x00ff00, 0.3);
    } else {
      this.zone.setFillStyle(0xaaaaaa, 0.2);
    }
  });
}
```

**Benefits:**
- ✅ Custom visual effects
- ✅ Direct Phaser control
- ✅ Flexible styling

{/snippet}
</CodeTabs>

**Features:**
- ✅ Capture zone
- ✅ Control tracking
- ✅ Time-based scoring
- ✅ Contested zones

---

## Best Practices

### DO ✅

- **Track game state clearly** (matchStarted, gameOver, etc.)
- **Emit events** for major transitions (round end, victory)
- **Reset properly** between rounds/matches
- **Use timers** for timed modes
- **Display clear UI** for game state

### DON'T ❌

- **Don't forget to reset** between rounds
- **Don't allow actions when gameOver**
- **Don't forget victory conditions**
- **Don't hardcode durations** - make them configurable

---

## See Also

- [Health and Damage](/docs/latest/recipes/health-and-damage) - Elimination mechanics
- [Player Movement](/docs/recipes/player-movement) - Zone control
- [Arena Blaster Example](/docs/examples/overview#arena-blaster) - Score-based victory
- [Fire & Ice Example](/docs/examples/overview#fire--ice) - Cooperative mode
