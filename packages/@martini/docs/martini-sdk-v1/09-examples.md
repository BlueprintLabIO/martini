# Examples

Complete game implementations using the Martini SDK.

---

## Fire Boy & Water Girl

Full cooperative platformer with physics, collision, and win condition.

### Game Logic (game.js)

```javascript
import { createGame } from '@martini/multiplayer';

export default createGame({
  setup: (playerIds) => {
    const [fireboy, watergirl] = playerIds;

    return {
      players: {
        [fireboy]: {
          type: 'fire',
          x: 100,
          y: 400,
          vx: 0,
          vy: 0,
          onGround: false,
          alive: true
        },
        [watergirl]: {
          type: 'water',
          x: 200,
          y: 400,
          vx: 0,
          vy: 0,
          onGround: false,
          alive: true
        }
      },
      doors: {
        fire: { x: 700, y: 450, open: false },
        water: { x: 700, y: 350, open: false }
      },
      buttons: [
        { id: 1, x: 300, y: 480, pressed: false, opens: 'fire' },
        { id: 2, x: 500, y: 480, pressed: false, opens: 'water' }
      ],
      pools: [
        { type: 'water', x: 150, y: 470, width: 100, height: 30 },
        { type: 'lava', x: 400, y: 470, width: 100, height: 30 }
      ],
      platforms: [
        { x: 0, y: 500, width: 800, height: 20 },
        { x: 250, y: 400, width: 150, height: 20 },
        { x: 450, y: 300, width: 150, height: 20 }
      ],
      won: false
    };
  },

  schema: {
    'players.*.x': { type: 'number', min: 0, max: 800 },
    'players.*.y': { type: 'number', min: 0, max: 600 },
    'players.*.vx': { type: 'number', min: -5, max: 5 },
    'players.*.vy': { type: 'number', min: -15, max: 15 }
  },

  actions: {
    move: {
      input: {
        direction: { type: 'string', enum: ['left', 'right', 'jump', 'stop'] }
      },

      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left
        if (!player.alive) return;

        if (input.direction === 'left') {
          player.vx = -3;
        } else if (input.direction === 'right') {
          player.vx = 3;
        } else if (input.direction === 'stop') {
          player.vx = 0;
        } else if (input.direction === 'jump' && player.onGround) {
          player.vy = -12;
          player.onGround = false;
        }
      },

      predict: true  // Instant input response
    },

    pressButton: {
      input: { buttonId: 'number' },

      requires: {
        proximity: {
          get: ({ game, input }) => game.buttons.find(b => b.id === input.buttonId),
          distance: 30
        }
      },

      apply: ({ game, input }) => {
        const button = game.buttons.find(b => b.id === input.buttonId);
        if (button && !button.pressed) {
          button.pressed = true;

          // Open corresponding door
          const door = game.doors[button.opens];
          if (door) door.open = true;
        }
      },

      predict: false  // Wait for server confirmation
    }
  },

  systems: {
    physics: {
      rate: 60,
      predict: false,  // ✅ Server-only physics (recommended for floating-point math)
                       // This example uses floating-point arithmetic which is NOT
                       // deterministic across different browsers/platforms.
                       // Setting predict: false ensures physics runs only on server.
                       //
                       // For client-side prediction (predict: true), you MUST use:
                       // 1. Fixed-point arithmetic (multiply by 10000, use integers)
                       // 2. Deterministic physics library (npm install fixed-math)
                       // See IMPLEMENTATION_RECOMMENDATIONS.md Section 5 for details

      tick: ({ game, dt }) => {
        // Physics runs on server only (predict: false)
        // Clients receive state updates via network and interpolate smoothly

        for (const player of Object.values(game.players)) {
          if (!player.alive) continue;

          // Gravity (using floating-point - safe because predict: false)
          player.vy += 0.8 * dt;

          // Integrate velocity
          player.x += player.vx * dt;
          player.y += player.vy * dt;

          // Platform collision
          player.onGround = false;
          for (const platform of game.platforms) {
            if (
              player.x > platform.x &&
              player.x < platform.x + platform.width &&
              player.y > platform.y - 20 &&
              player.y < platform.y &&
              player.vy > 0
            ) {
              player.y = platform.y;
              player.vy = 0;
              player.onGround = true;
            }
          }

          // Pool collision (death)
          for (const pool of game.pools) {
            if (
              player.x > pool.x &&
              player.x < pool.x + pool.width &&
              player.y > pool.y &&
              player.y < pool.y + pool.height
            ) {
              // Fireboy dies in water, Watergirl dies in lava
              if (
                (player.type === 'fire' && pool.type === 'water') ||
                (player.type === 'water' && pool.type === 'lava')
              ) {
                player.alive = false;
              }
            }
          }
        }

        // Win condition
        const [fireboy, watergirl] = Object.values(game.players);
        const fireDoor = game.doors.fire;
        const waterDoor = game.doors.water;

        if (
          fireDoor.open &&
          waterDoor.open &&
          Math.abs(fireboy.x - fireDoor.x) < 30 &&
          Math.abs(fireboy.y - fireDoor.y) < 30 &&
          Math.abs(watergirl.x - waterDoor.x) < 30 &&
          Math.abs(watergirl.y - waterDoor.y) < 30
        ) {
          game.won = true;
        }
      }
    }
  },

  config: {
    minPlayers: 2,
    maxPlayers: 2,
    determinism: {
      strict: true,
      autoWrap: true
    }
  }
});
```

### Client Integration (Phaser)

```javascript
// client.js
import game from './game.js';

class GameScene extends Phaser.Scene {
  create() {
    this.sprites = {};

    // Create player sprites
    for (const [id, player] of Object.entries(game.getState().players)) {
      const color = player.type === 'fire' ? 0xff4444 : 0x4444ff;
      this.sprites[id] = this.add.circle(player.x, player.y, 15, color);
    }

    // Create platforms
    this.platforms = game.getState().platforms.map(p =>
      this.add.rectangle(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width,
        p.height,
        0x888888
      )
    );

    // Create pools
    this.pools = game.getState().pools.map(p => {
      const color = p.type === 'water' ? 0x0088ff : 0xff8800;
      return this.add.rectangle(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width,
        p.height,
        color
      );
    });

    // Subscribe to state changes
    game.onChange((state, meta) => {
      // Update player positions
      for (const [id, player] of Object.entries(state.players)) {
        const sprite = this.sprites[id];

        if (!meta.predicted) {
          // Smooth server updates
          this.tweens.add({
            targets: sprite,
            x: player.x,
            y: player.y,
            alpha: player.alive ? 1 : 0.3,
            duration: 16,
            ease: 'Linear'
          });
        } else {
          // Instant predicted updates
          sprite.setPosition(player.x, player.y);
        }
      }

      // Show win screen
      if (state.won && !this.winText) {
        this.winText = this.add.text(
          400, 300,
          'YOU WIN!',
          { fontSize: '64px', color: '#fff' }
        ).setOrigin(0.5);
      }
    });
  }

  update() {
    const cursors = this.input.keyboard.createCursorKeys();

    // Send move actions
    if (cursors.left.isDown) {
      game.actions.move({ direction: 'left' });
    } else if (cursors.right.isDown) {
      game.actions.move({ direction: 'right' });
    } else if (cursors.up.justDown) {
      game.actions.move({ direction: 'jump' });
    } else {
      game.actions.move({ direction: 'stop' });
    }

    // Press buttons
    if (cursors.space.justDown) {
      const myPlayer = game.getState().players[game.myId];

      for (const button of game.getState().buttons) {
        const dist = Phaser.Math.Distance.Between(
          myPlayer.x,
          myPlayer.y,
          button.x,
          button.y
        );

        if (dist < 30) {
          game.actions.pressButton({ buttonId: button.id });
          break;
        }
      }
    }
  }
}
```

---

## Simple Coin Collector

Minimal example for learning.

```javascript
import { createGame } from '@martini/multiplayer';

export default createGame({
  setup: (playerIds) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0 }])
    ),
    coins: [
      { id: 1, x: 200, y: 300, collected: false },
      { id: 2, x: 400, y: 200, collected: false }
    ]
  }),

  actions: {
    move: {
      input: {
        dx: { type: 'number', min: -10, max: 10 },
        dy: { type: 'number', min: -10, max: 10 }
      },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left

        player.x += input.dx;
        player.y += input.dy;
      },
      predict: true
    },

    collect: {
      input: { coinId: 'number' },
      requires: {
        proximity: {
          get: ({ game, input }) => game.coins.find(c => c.id === input.coinId),
          distance: 50
        }
      },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left

        const coin = game.coins.find(c => c.id === input.coinId);
        if (!coin || coin.collected) return;

        coin.collected = true;
        player.score += 10;
      },
      predict: true
    }
  }
});
```

---

## Cooldown Example

Shows how to prevent action spam using built-in cooldown.

```javascript
import { createGame } from '@martini/multiplayer';

export default createGame({
  setup: (playerIds) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, {
        x: 100,
        y: 100,
        facing: 'right',
        energy: 100
      }])
    )
  }),

  actions: {
    dash: {
      input: {},

      requires: {
        cooldown: 2000  // 2 second cooldown between dashes
      },

      apply: ({ game, playerId }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left

        // Dash forward
        player.x += player.facing === 'right' ? 50 : -50;

        // Cost energy
        player.energy -= 20;
      },

      predict: true  // Instant feedback, but server validates cooldown
    },

    move: {
      input: { direction: { type: 'string', enum: ['left', 'right'] } },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;  // Player may have left

        player.facing = input.direction;
        player.x += input.direction === 'right' ? 5 : -5;
      },
      predict: true
    }
  }
});
```

**Client behavior if user spams dash key:**
```
t=0ms:    First dash → ✅ succeeds instantly (predicted)
t=500ms:  Second dash → ✅ predicted locally, ❌ server rejects (cooldown), rolled back
t=2100ms: Third dash → ✅ succeeds (cooldown elapsed)
```

**Why this matters:** Without cooldown, a hacked client could dash 100 times per second. Server cooldown enforcement prevents this.

---

## Late Join Example

Shows how to handle players joining mid-game using the `onPlayerJoin` hook.

```javascript
import { createGame } from '@martini/multiplayer';

export default createGame({
  setup: (playerIds) => ({
    players: Object.fromEntries(
      playerIds.map(id => [id, { x: 100, y: 100, score: 0, level: 1 }])
    ),
    gameStartTime: 0,  // Will be set when first player joins
    round: 1
  }),

  // Called whenever a player joins (including mid-game)
  onPlayerJoin: ({ game, playerId, random, time }) => {
    const player = game.players[playerId];

    // If game already started, spawn at a safe location
    if (game.gameStartTime > 0) {
      // ✅ CORRECT: Use deterministic random for spawn position
      player.x = 500 + random.range(0, 100);
      player.y = 300;
      player.level = Math.floor(game.round / 2);  // Catch-up mechanic
      console.log(`Player ${playerId} joined mid-game at round ${game.round}`);
    } else {
      // First player - initialize game
      game.gameStartTime = time;  // ✅ Use deterministic time from context
      console.log(`Game started by player ${playerId} at time ${time}ms`);
    }
  },

  actions: {
    move: {
      input: { dx: 'number', dy: 'number' },
      apply: ({ game, playerId, input }) => {
        const player = game.players[playerId];
        if (!player) return;

        player.x += input.dx;
        player.y += input.dy;
      },
      predict: true
    }
  }
});
```

**Key points:**
- `onPlayerJoin` is called for every player, including the first one
- Check `game.gameStartTime` or other state to detect if game is in progress
- Late joiners can be given catch-up mechanics (extra level, better spawn, etc.)
- Game continues running without pause when new players join

---

## Key Takeaways

1. **Zero networking code** - Same logic works with any transport
2. **Client prediction** - `predict: true` for instant feedback
3. **Built-in validation** - `input` and `requires` prevent cheating
4. **Deterministic systems** - Physics runs identically on all clients
5. **Type safety** - Schema catches bugs at runtime

---

## Next Steps

- **Ready to implement?** → See [IMPLEMENTATION_RECOMMENDATIONS.md](./IMPLEMENTATION_RECOMMENDATIONS.md)
- **Need API reference?** → See [02-api-reference.md](./02-api-reference.md)
