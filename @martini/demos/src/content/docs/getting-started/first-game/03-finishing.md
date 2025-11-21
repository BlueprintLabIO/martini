---
title: First Game - Running & Enhancements
description: Initialize the game, test multiplayer, and add enhancements
section: getting-started
order: 5
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Step 3: Initialize the Game

Create `src/main.ts`:

```typescript
import Phaser from 'phaser';
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
import { game } from './game';
import { createPaddleBattleScene } from './scene';

// LocalTransport lets you test with multiple browser tabs
const transport = new LocalTransport({
  roomId: 'paddle-battle-room',
  isHost: true,
});

const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()],
});

const PaddleBattleScene = createPaddleBattleScene(runtime, transport.isHost());

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  backgroundColor: '#1a1a2e',
  scene: PaddleBattleScene,
});
```

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paddle Battle - Multiplayer Pong</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #0a0a0a;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #game {
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
  </style>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

---

## Step 4: Test Your Game!

Start the development server:

```bash
pnpm dev
```

Open http://localhost:3000 in **two browser tabs side by side**:

1. **First tab** (Host): Controls left paddle with W/S or Arrow Up/Down
2. **Second tab** (Client): Controls right paddle

You should see both paddles and the ball in perfect sync!

---

## Troubleshooting

**Ball doesn't bounce off paddles?**
- Check that you've added colliders: `this.physics.add.collider(this.ball, paddle)`

**Paddles jittery on client?**
- Phaser: Ensure `spriteManager.update()` is called every frame
- Core: Check that state changes trigger visual updates

**Second player's paddle doesn't appear?**
- Verify `onPlayerJoin` hook is creating paddles properly

**Scores don't sync?**
- Make sure you're using `context.targetId`: `submitAction('score', undefined, playerId)`

---

## Next Steps

### Add More Features

**1. Add a Winning Condition**

In `src/game.ts`:
```typescript
score: {
  apply: (state, context) => {
    const player = state.players[context.targetId];
    if (!player) return;

    player.score += 1;

    if (player.score >= 11) {
      state.gameOver = true;
      state.winner = context.targetId;
    }

    // Reset ball...
  },
}
```

**2. Add Sound Effects**

In `src/scene.ts` create():
```typescript
this.sound.add('bounce');
this.sound.add('score');

// In the collider callback:
this.sound.play('bounce');
```

---

## Learn More

- **Core Concepts** - Read [Architecture](/docs/latest/concepts/architecture)
- **Phaser Helpers** - Check out the [Phaser Helpers API](/docs/latest/api/phaser/helpers)
- **More Examples** - Explore [Example Games](/docs/latest/examples/overview)

---

## Congratulations! 🎉

You've built a complete multiplayer game with martini-kit! You now understand:

✅ Defining game state with TypeScript
✅ Handling multiplayer actions and state sync
✅ Host-authoritative architecture
✅ Smooth client-side rendering

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

✅ Using SpriteManager for automatic sprite sync
✅ Using InputManager for simplified input handling
✅ Using createPlayerHUD for automatic HUD management

Ready to build more complex games? Check out the [Phaser helpers documentation](/docs/latest/api/phaser/helpers)!

{/snippet}

{#snippet core()}

✅ Manual sprite management and synchronization
✅ Direct input handling
✅ Custom HUD implementation

Ready for more complex games? Check out the [complete examples](/docs/latest/examples/overview) or try the Phaser helpers for faster development!

{/snippet}
</CodeTabs>
