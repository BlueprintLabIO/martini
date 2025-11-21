# Example Games

A collection of complete, working multiplayer games that demonstrate martini-kit's capabilities across different genres. Each example includes full source code and showcases specific features and patterns.

## Quick Reference

| Game | Genre | Players | Complexity | Key Features |
|------|-------|---------|------------|--------------|
| [Paddle Battle](#paddle-battle) | Classic Arcade | 2 | ⭐ Beginner | Basic multiplayer, score tracking |
| [Fire & Ice](#fire--ice) | Co-op Platformer | 2 | ⭐⭐ Intermediate | Roles, player manager, input system |
| [Arena Blaster](#arena-blaster) | Top-Down Shooter | 2 | ⭐⭐⭐ Advanced | Projectiles, health, collision, rotation |
| [Blob Battle](#blob-battle) | Physics Arena | 2-4 | ⭐⭐ Intermediate | Physics integration, multiple players |
| [Circuit Racer](#circuit-racer) | Racing | 2-4 | ⭐⭐⭐ Advanced | Lap tracking, checkpoints, vehicle physics |
| [Tile Matcher](#tile-matcher) | Puzzle | 2 | ⭐⭐ Intermediate | Turn-based, grid logic, matching |

---

## Paddle Battle

**Classic Multiplayer Pong**

A modern take on the classic Pong game demonstrating the fundamentals of multiplayer game development with martini-kit.

### What You'll Learn
- Basic game state structure
- Simple player controls
- Ball physics
- Score tracking
- Victory conditions

### Key Code Patterns

```typescript
import { defineGame } from '@martini-kit/core';

export const paddleBattleGame = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          y: 250,
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
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        state.inputs[context.targetId] = input;
      },
    },

    score: {
      apply: (state, context) => {
        const player = state.players[context.targetId];
        player.score += 1;

        // Reset ball
        state.ball.x = 400;
        state.ball.y = 300;
      },
    },
  },
});
```

### Features
- ✅ 2-player competitive gameplay
- ✅ Real-time physics
- ✅ Score tracking
- ✅ Ball collision detection
- ✅ Simple input handling

### Try It
- [Play Demo](/demo/paddle-battle)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/paddle-battle)

---

## Fire & Ice

**Cooperative Platformer**

A 2-player cooperative platformer where players control fire and ice characters that must work together to navigate through obstacles.

### What You'll Learn
- Player roles and team mechanics
- `createPlayerManager` helper
- Cooperative gameplay patterns
- Input buffering with `createInputAction`

### Key Code Patterns

```typescript
import { defineGame, createPlayerManager, createInputAction } from '@martini-kit/core';

const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  factory: (playerId, index) => ({
    x: index === 0 ? 200 : 600,
    y: 400,
    role: index === 0 ? 'fire' : 'ice',
  }),
});

export const fireAndIceGame = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {},
  }),

  actions: {
    move: createInputAction('inputs'),
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  },
});
```

### Features
- ✅ Role-based player assignment
- ✅ Cooperative mechanics
- ✅ Player manager utilities
- ✅ Input action helpers
- ✅ Phaser platformer integration

### Try It
- [Play Demo](/demo/fire-and-ice)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/fire-and-ice)

---

## Arena Blaster

**Top-Down Shooter**

A fast-paced multiplayer arena shooter featuring continuous 360° rotation, projectile physics, health management, and invincibility frames.

### What You'll Learn
- Projectile management
- Health and damage systems
- Invincibility frames
- Cooldown mechanics
- 360° rotation
- Respawn system
- Win conditions

### Key Code Patterns

**Player State with Health**
```typescript
setup: ({ playerIds }) => ({
  players: Object.fromEntries(
    playerIds.map((id, index) => [
      id,
      {
        x: spawnPoints[index].x,
        y: spawnPoints[index].y,
        health: 100,
        score: 0,
        rotation: 0,
        isInvulnerable: false,
        invulnerabilityTimer: 0,
      },
    ])
  ),
  bullets: [],
  shootCooldowns: {},
}),
```

**Shooting with Cooldowns**
```typescript
shoot: {
  apply: (state, context) => {
    const player = state.players[context.targetId];

    // Check cooldown
    const cooldown = state.shootCooldowns[context.targetId] || 0;
    if (cooldown > 0) return;

    // Create bullet
    state.bullets.push({
      id: state.nextBulletId++,
      x: player.x,
      y: player.y,
      velocityX: Math.cos(player.rotation) * BULLET_SPEED,
      velocityY: Math.sin(player.rotation) * BULLET_SPEED,
      ownerId: context.targetId,
      lifetime: 2000,
    });

    // Set cooldown
    state.shootCooldowns[context.targetId] = 500;
  },
},
```

**Damage with Invincibility**
```typescript
hit: {
  apply: (state, context, input) => {
    const player = state.players[context.targetId];
    if (player.isInvulnerable) return;

    player.health -= input.damage;

    if (player.health <= 0) {
      // Award point to shooter
      state.players[input.shooterId].score += 1;

      // Respawn with invincibility
      player.health = 100;
      player.isInvulnerable = true;
      player.invulnerabilityTimer = 1000;
    }
  },
},
```

### Features
- ✅ Projectile system
- ✅ Health and damage
- ✅ Invincibility frames
- ✅ Weapon cooldowns
- ✅ 360° rotation
- ✅ Respawn mechanics
- ✅ Score-based victory

### Try It
- [Play Demo](/demo/arena-blaster)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/arena-blaster)

---

## Blob Battle

**Physics-Based Arena**

A physics-driven multiplayer battle game where players control blobs that can push and knock each other around.

### What You'll Learn
- Phaser Arcade Physics integration
- Force-based movement
- Multi-player physics sync
- Bounce and collision properties
- Physics bodies in multiplayer

### Key Features
- ✅ Full physics integration
- ✅ 2-4 player support
- ✅ Push mechanics
- ✅ Arena boundaries
- ✅ Physics-based scoring

### Try It
- [Play Demo](/demo/blob-battle)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/blob-battle)

---

## Circuit Racer

**Multiplayer Racing**

A racing game with lap tracking, checkpoints, and competitive leaderboards.

### What You'll Learn
- Vehicle physics
- Lap and checkpoint systems
- Leaderboard implementation
- Race state management
- Finish line detection

### Key Features
- ✅ 2-4 player racing
- ✅ Lap tracking
- ✅ Checkpoint system
- ✅ Position rankings
- ✅ Race countdown
- ✅ Finish detection

### Try It
- [Play Demo](/demo/circuit-racer)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/circuit-racer)

---

## Tile Matcher

**Puzzle Game**

A turn-based puzzle game where players take turns matching tiles to score points.

### What You'll Learn
- Turn-based gameplay
- Grid-based game state
- Match detection algorithms
- Turn management
- Combo systems

### Key Features
- ✅ Turn-based mechanics
- ✅ Grid logic
- ✅ Match detection
- ✅ Score combos
- ✅ 2-player competitive

### Try It
- [Play Demo](/demo/tile-matcher)
- [View Source](https://github.com/yourusername/martini-kit/tree/main/packages/@martini-kit/demos/src/lib/games/tile-matcher)

---

## Running the Examples

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/martini-kit.git
   cd martini-kit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build packages**
   ```bash
   pnpm build
   ```

4. **Run demos**
   ```bash
   pnpm --filter @martini-kit/demos dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173/demo/[game-name]
   ```

### Structure

All example games are located in:
```
packages/@martini-kit/demos/src/lib/games/
├── paddle-battle/
│   ├── game.ts          # Game definition
│   ├── scene.ts         # Phaser scene
│   └── index.ts         # Exports
├── fire-and-ice/
├── arena-blaster/
├── blob-battle/
├── circuit-racer/
└── tile-matcher/
```

Each game follows the same structure:
- **game.ts** - Game definition using `defineGame`
- **scene.ts** - Phaser scene with rendering and input
- **index.ts** - Public exports

---

## Next Steps

Ready to build your own game? Check out these resources:

- **[Getting Started](/docs/getting-started/installation)** - Set up your first project
- **[Recipes](/docs/recipes/player-movement)** - Copy-paste code patterns
- **[API Reference](/docs/api/core/define-game)** - Full API documentation
- **[Phaser Integration](/docs/guides/phaser-integration)** - Deep dive into Phaser + martini-kit

## Contributing Examples

Have an awesome game to share? We'd love to include it!

1. Fork the repository
2. Create your game in `packages/@martini-kit/demos/src/lib/games/your-game`
3. Add a demo route in `packages/@martini-kit/demos/src/routes/demo/your-game`
4. Submit a pull request

See [Contributing Guide](/docs/contributing/adding-examples) for details.
