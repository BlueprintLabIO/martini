---
title: First Game - Setup & State
description: Set up your first multiplayer Pong game and define game state
section: getting-started
order: 3
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Your First Multiplayer Game

In this tutorial, you'll build **Paddle Battle** - a complete 2-player Pong game with Martini. You'll learn how to sync game state, handle player input, and render everything smoothly across multiple clients.

## What You'll Build

A 2-player Pong game where:
- Each player controls a paddle (left or right)
- Players bounce a ball back and forth
- Score points when the ball passes the opponent
- Everything stays in perfect sync across both clients

**Time to complete:** 15-30 minutes

---

## Choosing Your Approach

Martini offers two ways to build multiplayer games:

**Phaser Helpers (Recommended)** - Use built-in helpers that automate sprite sync, input handling, and physics. ~180 lines of code, perfect for rapid development.

**Core Primitives (Advanced)** - Manual control over every aspect. ~280 lines of code, gives you deep understanding of how Martini works.

Use the SDK selector above to choose your approach, or toggle between them as you learn!

---

## Prerequisites

Make sure you've [installed Martini](/docs/latest/getting-started/installation) first.

## Project Setup

Create a new directory and initialize your project:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

```bash
mkdir paddle-battle
cd paddle-battle
pnpm init
pnpm add @martini/core @martini/phaser @martini/transport-local phaser
pnpm add -D typescript vite
```

{/snippet}

{#snippet core()}

```bash
mkdir paddle-battle
cd paddle-battle
pnpm init
pnpm add @martini/core @martini/phaser @martini/transport-local phaser
pnpm add -D typescript vite
```

{/snippet}
</CodeTabs>

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  }
});
```

---

## Step 1: Define Game State

First, let's think about what state we need to track:

- **Players**: Position, score, which side (left/right)
- **Ball**: Position, velocity
- **Inputs**: Current player controls

Create `src/game.ts`:

```typescript
import { defineGame } from '@martini/core';

interface Player {
  y: number;          // Paddle vertical position
  score: number;      // Player's score
  side: 'left' | 'right';
}

interface Ball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface GameState {
  players: Record<string, Player>;
  ball: Ball;
  inputs: Record<string, { up: boolean; down: boolean }>;
}

export const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          y: 300,
          score: 0,
          side: index === 0 ? 'left' : 'right',
        },
      ])
    ),
    ball: {
      x: 400,
      y: 300,
      velocityX: 200,
      velocityY: 150,
    },
    inputs: {},
  }),

  actions: {
    move: {
      apply: (state, context, input: { up: boolean; down: boolean }) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },

    score: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.score += 1;

        // Reset ball to center with random direction
        state.ball.x = 400;
        state.ball.y = 300;
        state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
        state.ball.velocityY = 150 * (Math.random() > 0.5 ? 1 : -1);
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      y: 300,
      score: 0,
      side: index === 0 ? 'left' : 'right',
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
```

**Key Points:**
- `GameState` defines all networked data
- `move` action stores input in state (doesn't move directly!)
- `score` action uses `context.targetId` to award points
- Player lifecycle hooks handle mid-game joins/leaves

---

## Next: Create the Phaser Scene

Now that we have our game state defined, we'll create the visual scene in Phaser.

👉 Continue to [Part 2: Gameplay Implementation](/docs/latest/getting-started/first-game/02-gameplay)
