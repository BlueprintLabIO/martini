---
title: Player Movement
description: Basic player movement mechanics for Martini games
section: recipes
subsection: player-movement
order: 1
---

# Player Movement

This guide provides a simple example of how to implement player movement in a Martini game. It covers:

- Setting up input handling
- Updating player position each tick
- Basic collision handling (optional)

## Setup

```typescript
import { defineGame } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 400, y: 300, speed: 5 }])
    )
  }),
  actions: {
    move: {
      apply: (state, context, input: { dx: number; dy: number }) => {
        const player = state.players[context.targetId];
        player.x += input.dx * player.speed;
        player.y += input.dy * player.speed;
      }
    }
  }
});
```

## Input Handling (Svelte component example)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { runtime } from '$lib/runtime';

  let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  function handleKey(e: KeyboardEvent, down: boolean) {
    if (e.key in keys) keys[e.key] = down;
  }

  onMount(() => {
    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));
    const interval = setInterval(() => {
      const dx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      const dy = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
      if (dx || dy) runtime.submitAction('move', { dx, dy });
    }, 16);
    return () => clearInterval(interval);
  });
</script>
```

## Next Steps

- Add collision detection with walls or other entities.
- Smooth acceleration/deceleration.
- Sync movement over network using the built‑in transport.

## See Also

- **[Advanced Movement](/docs/latest/guides/movement/03-advanced)** – More complex patterns.
- **[Networking](/docs/latest/guides/networking)** – Syncing movement in multiplayer.
