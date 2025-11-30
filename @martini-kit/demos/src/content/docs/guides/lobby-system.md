# Lobby System

Production-grade multiplayer lifecycle management with player coordination, ready-up flow, and phase transitions.

## Overview

The lobby system provides a complete player coordination flow for multiplayer games, handling the transition from lobby → playing → ended with built-in UI helpers and phase-aware APIs.

**Features:**
- ✅ Automatic player presence tracking
- ✅ Ready-up coordination with visual feedback
- ✅ Min/max player enforcement
- ✅ Auto-start timeout support
- ✅ Late-join blocking
- ✅ Phase-aware scene lifecycle
- ✅ Built-in lobby UI component

## Quick Start

### 1. Enable Lobby System

Add `lobby` configuration to your game definition:

```typescript
import { defineGame } from '@martini-kit/core';

export const game = defineGame({
  lobby: {
    minPlayers: 2,
    maxPlayers: 4,
    requireAllReady: true,
    autoStartTimeout: 30000, // 30 seconds
    allowLateJoin: false
  },

  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds),
    // ...
  }),

  // Optional: React to phase changes
  onPhaseChange: (state, { from, to, reason }) => {
    console.log(`Game: ${from} → ${to} (${reason})`);
  },

  // Optional: React to ready state changes
  onPlayerReady: (state, playerId, ready) => {
    console.log(`${playerId} is ${ready ? 'ready' : 'not ready'}`);
  }
});
```

### 2. Add Lobby UI (Phaser)

```typescript
import { LobbyUI } from '@martini-kit/phaser';

export function createScene(runtime: GameRuntime) {
  return class MyScene extends Phaser.Scene {
    private lobbyUI?: LobbyUI;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Create lobby UI
      this.lobbyUI = new LobbyUI(this.adapter, this, {
        title: 'My Game',
        subtitle: 'Waiting for players...',
        position: { x: 400, y: 200 }
      });

      // Update lobby UI on state changes
      this.adapter.onChange((state: any) => {
        if (this.lobbyUI && state.__lobby) {
          this.lobbyUI.update(state.__lobby);

          if (state.__lobby.phase === 'lobby') {
            this.lobbyUI.show();
          } else {
            this.lobbyUI.hide();
          }
        }
      });
    }
  }
}
```

### 3. Use Phase-Aware Lifecycle

**✅ Pit of Success Pattern:**

```typescript
create() {
  // Static setup (always runs)
  this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

  // ✅ Game objects only created when playing starts
  this.adapter.onPlaying((state) => {
    this.player = this.add.sprite(100, 100, 'player');
    this.physics.add.existing(this.player);
    this.inputManager = this.adapter.createInputManager();
  });
}

update() {
  // ✅ Only run game logic during 'playing' phase
  if (!this.adapter.isPlaying()) return;

  this.inputManager.update();
  // ... game logic
}
```

## Configuration

### `LobbyConfig`

```typescript
interface LobbyConfig {
  /** Minimum players required to start */
  minPlayers: number;

  /** Maximum players allowed (default: Infinity) */
  maxPlayers?: number;

  /** Require all players to ready-up before starting (default: false) */
  requireAllReady?: boolean;

  /** Auto-start timeout in ms (default: undefined) */
  autoStartTimeout?: number;

  /** Allow players to join mid-game (default: false) */
  allowLateJoin?: boolean;
}
```

## Game Phases

The lobby system manages three phases:

### 1. Lobby Phase (`'lobby'`)

Players are joining and getting ready.

**What happens:**
- Players can join (up to `maxPlayers`)
- Players can toggle ready state via `__lobbyReady` action
- Game waits for `minPlayers` to be met
- Host can force-start via `__lobbyStart` action (if `requireAllReady: false`)

**Transition to playing:**
- Manual: Host calls `runtime.submitAction('__lobbyStart')`
- Auto: All players ready (if `requireAllReady: true`)
- Auto: Timeout elapsed (if `autoStartTimeout` set and `minPlayers` met)

### 2. Playing Phase (`'playing'`)

Active gameplay is happening.

**What happens:**
- Game objects are active
- Game logic runs every frame
- Room is locked if `allowLateJoin: false`

**Transition to ended:**
- Manual: Call `runtime.submitAction('__lobbyEnd')`
- Custom: Your game logic determines when game ends

### 3. Ended Phase (`'ended'`)

Game has finished, showing results.

**What happens:**
- Display scores, winners, etc.
- Optionally restart or return to lobby

## Built-in Actions

The lobby system provides these actions automatically:

### `__lobbyReady`

Toggle a player's ready state.

```typescript
// In your scene
onReadyButtonClick() {
  const myId = runtime.getMyPlayerId();
  const state = runtime.getState() as any;
  const isReady = state.__lobby.players[myId]?.ready || false;

  runtime.submitAction('__lobbyReady', { ready: !isReady });
}
```

### `__lobbyStart`

Force start the game (host only, or when all ready).

```typescript
// In your scene (host button)
onStartButtonClick() {
  runtime.submitAction('__lobbyStart');
}
```

### `__lobbyEnd`

End the game and transition to 'ended' phase.

```typescript
// When game ends
if (gameOver) {
  runtime.submitAction('__lobbyEnd');
}
```

## Accessing Lobby State

### Type-Safe Access

```typescript
import type { WithLobby } from '@martini-kit/core';

interface MyGameState {
  players: Record<string, { x: number; y: number }>;
}

const state = runtime.getState() as WithLobby<MyGameState>;
console.log(state.__lobby.phase); // ✅ Type-safe
```

### Lobby State Structure

```typescript
interface LobbyState {
  /** Current game phase */
  phase: 'lobby' | 'playing' | 'ended';

  /** Player presence tracking */
  players: Record<string, PlayerPresence>;

  /** Lobby configuration (read-only) */
  config: LobbyConfig;

  /** Timestamp when 'playing' phase started */
  startedAt?: number;

  /** Timestamp when 'ended' phase started */
  endedAt?: number;
}

interface PlayerPresence {
  playerId: string;
  ready: boolean;
  joinedAt: number;
  metadata?: Record<string, any>;
}
```

## Phase-Aware Helpers

### `adapter.onPlaying(callback)`

Runs once when transitioning to 'playing' phase.

```typescript
this.adapter.onPlaying((state) => {
  // Create game objects
  this.ball = this.add.circle(400, 300, 10, 0xff0000);
  this.physics.add.existing(this.ball);
});
```

### `adapter.whilePlaying(callback)`

Runs every state update during 'playing' phase.

```typescript
this.adapter.whilePlaying((state) => {
  // Continuous game logic
  this.updatePowerUps(state);
});
```

### `adapter.onEnded(callback)`

Runs once when transitioning to 'ended' phase.

```typescript
this.adapter.onEnded((state) => {
  this.showResults(state);
});
```

### `adapter.isPlaying()`

Check if currently in 'playing' phase.

```typescript
update() {
  if (!this.adapter.isPlaying()) return;
  // Game logic...
}
```

### `adapter.isInLobby()`

Check if currently in 'lobby' phase.

```typescript
if (this.adapter.isInLobby()) {
  // Show lobby-specific UI
}
```

## LobbyUI Component

### Configuration

```typescript
interface LobbyUIConfig {
  /** Title text */
  title?: string;

  /** Subtitle text */
  subtitle?: string;

  /** Position of the lobby UI */
  position?: { x: number; y: number };

  /** Title style */
  titleStyle?: Phaser.Types.GameObjects.Text.TextStyle;

  /** Subtitle style */
  subtitleStyle?: Phaser.Types.GameObjects.Text.TextStyle;

  /** Player list style */
  playerStyle?: Phaser.Types.GameObjects.Text.TextStyle;

  /** Button style */
  buttonStyle?: {
    fill: number;
    textColor: string;
    fontSize: string;
  };

  /** Show instructions (default: true) */
  showInstructions?: boolean;
}
```

### Methods

```typescript
// Update UI with current lobby state
lobbyUI.update(lobbyState);

// Show/hide UI
lobbyUI.show();
lobbyUI.hide();

// Check visibility
const visible = lobbyUI.isVisible();

// Cleanup
lobbyUI.destroy();
```

## Lifecycle Callbacks

### `onPhaseChange(state, context)`

Called whenever game phase changes.

```typescript
onPhaseChange: (state, { from, to, reason }) => {
  if (to === 'playing') {
    // Reset game state
    state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
  }

  if (to === 'ended') {
    // Log results
    console.log('Game ended!', state.scores);
  }
}
```

**Context:**
```typescript
interface PhaseChangeContext {
  from: GamePhase;
  to: GamePhase;
  reason: 'manual' | 'timeout' | 'all_ready' | 'player_left';
  timestamp: number;
}
```

### `onPlayerReady(state, playerId, ready)`

Called when a player's ready state changes.

```typescript
onPlayerReady: (state, playerId, ready) => {
  console.log(`${playerId} is ${ready ? 'ready' : 'not ready'}`);

  // Optional: Play sound effect
  if (ready) {
    playReadySound();
  }
}
```

## Common Patterns

### Custom Ready Logic

```typescript
// Require specific player roles to be ready
onPlayerReady: (state, playerId, ready) => {
  const player = state.players[playerId];

  if (player.role === 'captain' && ready) {
    console.log('Captain is ready!');
  }
}
```

### Team Assignment in Lobby

```typescript
lobby: {
  minPlayers: 4,
  maxPlayers: 4,
  requireAllReady: true
},

onPlayerJoin: (state, playerId) => {
  const playerCount = Object.keys(state.players).length;
  const team = playerCount % 2 === 0 ? 'red' : 'blue';

  playerManager.handleJoin(state.players, playerId);
  state.players[playerId].team = team;
}
```

### Restart After Game Ends

```typescript
this.adapter.onEnded((state) => {
  this.showResults(state);

  // Restart after 5 seconds
  setTimeout(() => {
    runtime.submitAction('__lobbyStart');
  }, 5000);
});
```

## Migration from `waitForPlayers()`

**Old (deprecated):**
```typescript
const runtime = new GameRuntime(game, transport);
await runtime.waitForPlayers(2, { timeoutMs: 10000 }); // ❌
```

**New (lobby system):**
```typescript
export const game = defineGame({
  lobby: {
    minPlayers: 2,
    requireAllReady: true
  }
}); // ✅
```

## Best Practices

### 1. Always Use Phase Guards

```typescript
update() {
  // ✅ Prevent game logic during lobby
  if (!this.adapter.isPlaying()) return;

  // Game logic...
}
```

### 2. Create Game Objects in onPlaying()

```typescript
create() {
  // ❌ DON'T create game objects here
  // this.ball = this.add.circle(...);

  // ✅ DO create them in onPlaying
  this.adapter.onPlaying((state) => {
    this.ball = this.add.circle(state.ball.x, state.ball.y, 10);
  });
}
```

### 3. Update Lobby UI on State Changes

```typescript
this.adapter.onChange((state: any) => {
  if (this.lobbyUI && state.__lobby) {
    this.lobbyUI.update(state.__lobby);
  }
});
```

### 4. Handle Phase Transitions

```typescript
onPhaseChange: (state, { to }) => {
  if (to === 'playing') {
    // Reset state for new game
    state.scores = {};
    state.round = 1;
  }
}
```

## Examples

See the [paddle-battle example](/editor/paddle-battle) for a complete implementation.

## API Reference

- [defineGame()](/docs/latest/api/core/define-game) - Game definition API
- [PhaserAdapter](/docs/latest/api/phaser/scene-integration) - Scene integration
- [Phaser API](/docs/latest/api/phaser) - Phaser integration documentation
