---
title: Round Manager
description: Timer, announcements, and scoring for round-based games.
section: api
subsection: phaser
order: 16
---

# Round Manager

Drop-in UI + flow control for round-based games (fighters, bomber-style, sports). Handles timer display, freeze-frame announcements, and scoreboard updates.

## When to Use
- You end rounds based on time or last-player-standing.
- You want a simple scoreboard and winner/draw announcements.
- You want freeze frames between rounds without wiring tweens yourself.

## Quick Start

```ts
import { createRoundManager } from '@martini-kit/phaser';

// scene.create()
this.rounds = createRoundManager(this.adapter, this, {
  roundsToWin: 3,
  checkWinner: (state) => {
    const alive = Object.entries(state.players).filter(([, p]) => p.alive);
    if (alive.length === 1) return alive[0][0]; // winner id
    if (state.roundTimer <= 0) return null;     // draw
    return undefined;                           // keep playing
  },
  ui: {
    timer: {
      position: { x: 400, y: 40 },
      format: (ms) => `${Math.ceil(ms / 1000)}s`,
      warningAt: 30000
    },
    announcement: {
      winner: (p) => `P${p.spawnIndex + 1} WINS ROUND!`,
      draw: () => 'DRAW',
      matchWin: (p) => `P${p.spawnIndex + 1} WINS THE MATCH!`,
      freezeDuration: 3000
    },
    scoreboard: {
      position: { x: 20, y: 80 },
      format: (player, idx) => `P${idx + 1}: ${player.score} wins`
    }
  }
});
```

## Key Options
- `roundsToWin`: rounds needed to win the match.
- `checkWinner(state)`: return `winnerId`, `null` for draw, or `undefined` to continue.
- State keys (override if different): `timerStateKey='roundTimer'`, `roundStateKey='round'`, `playersKey='players'`, `gameOverKey='gameOver'`, `winnerKey='winner'`.
- UI config:
  - `timer`: `position`, `format(ms)`, `warningAt`, `style`, `warningStyle`
  - `announcement`: `winner`, `draw`, `matchWin`, `freezeDuration`, `position`, `style`
  - `scoreboard`: `position`, `format(player, index, playerId)`, `style`, `spacing`

## Behavior
- Subscribes to state changes automatically via `adapter.onChange()`.
- On host, calls `checkWinner(state)` each update; submits `endRound` when finished.
- Shows freeze-frame announcement text; unfreezes after `freezeDuration`.
- Displays timer and scoreboard text objects you can also retrieve via `getTimerText()` / `getAnnouncementText()`.

## Tips
- Keep your game state in sync: ensure `roundTimer` and `round` update in your tick.
- Use `format` to display MM:SS if your rounds are longer.
- Pair with [Player Stats Panel](./player-stats-panel) to show per-player powerups alongside the scoreboard. 
