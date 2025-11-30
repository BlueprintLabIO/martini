# Lobby System Implementation Plan
## Building Gold-Standard Multiplayer Lifecycle into Martini Kit Core

**Status:** Draft for Approval
**Author:** Claude (Planning Mode)
**Date:** 2025-11-30
**Breaking Change:** Yes (Migration path provided)

---

## Executive Summary

This plan integrates a production-grade lobby system directly into `@martini-kit/core`, inspired by industry leaders (Photon PUN, Colyseus, PlayFab). The design adds explicit game phases (`lobby`, `playing`, `ended`), player ready-up coordination, and lifecycle callbacks while maintaining Martini Kit's deterministic, state-based architecture.

**Key Goals:**
- ✅ Gold-standard API matching Photon/Colyseus patterns
- ✅ Built into core runtime (not optional helpers)
- ✅ Clean migration path for existing games
- ✅ Zero impact on games that don't use lobbies

---

## Industry Research: What the Gold Standards Do

### [Photon PUN](https://doc.photonengine.com/pun/current/demos-and-tutorials/pun-basics-tutorial/lobby)
**Lifecycle Callbacks:**
```csharp
OnJoinedLobby()        // Lobby phase started
OnReceivedRoomList()   // Player list updates
OnConnectedToMaster()  // Ready to create/join rooms
OnLeftLobby()          // Returned to menu
```

**Key Pattern:** Explicit ready state checks before allowing room operations

### [Colyseus](https://docs.colyseus.io/server/room/built-in/lobby)
**Room Lifecycle:**
```typescript
onCreate()             // Room created by matchmaker
onJoin(client)         // Player joined (after auth)
onLeave(client)        // Player left
lock()                 // Prevent new joins (game started)
```

**Key Pattern:** Built-in `LobbyRoom` with automatic presence tracking

### [PlayFab](https://learn.microsoft.com/en-us/gaming/playfab/features/multiplayer/lobby/lobby-and-matchmaking)
**Ready State Flow:**
1. When `minPlayers` met → prompt ready confirmation
2. All players confirm within timeout (60s default)
3. Missing players auto-removed via `ForceRemoveMember`
4. Backfill matchmaking for missing slots

**Key Pattern:** Timeout-based ready confirmation with automatic cleanup

---

## Martini Kit Current Architecture

### What We Have Today

**GameDefinition Interface:**
```typescript
interface GameDefinition<TState> {
  setup?: (context: SetupContext) => TState;
  actions?: Record<string, ActionDefinition>;
  onPlayerJoin?: (state, playerId) => void;
  onPlayerLeave?: (state, playerId) => void;
}
```

**Platform-Level Waiting:**
- `runtime.waitForPlayers(minPlayers)` in [runtime.ts:156](/@martini-kit/phaser/src/runtime.ts#L156)
- Blocks until peer discovery completes
- No ready-up mechanism
- No lobby UI state

**Ad-Hoc Game Implementation:**
- [paddle-battle.ts:27](/@martini-kit/demos/src/lib/games/configs/paddle-battle.ts#L27): `gameStarted: false`
- [paddle-battle.ts:50-53](/@martini-kit/demos/src/lib/games/configs/paddle-battle.ts#L50-L53): Manual `startGame` action

### What's Missing

❌ No explicit lobby phase
❌ No ready-up coordination
❌ No player presence metadata
❌ No phase transition callbacks
❌ No late-joiner restrictions
❌ No timeout handling
❌ No spectator mode

---

## Proposed Design: Core Lobby System

### 1. Core Types (New)

```typescript
// @martini-kit/core/src/types.ts

/**
 * Game phase lifecycle
 */
export type GamePhase = 'lobby' | 'playing' | 'ended';

/**
 * Player presence metadata (for lobby state)
 */
export interface PlayerPresence {
  playerId: string;
  ready: boolean;
  joinedAt: number;
  metadata?: Record<string, any>; // Custom data (team, character, etc.)
}

/**
 * Lobby configuration
 */
export interface LobbyConfig {
  /** Minimum players required to start */
  minPlayers: number;

  /** Maximum players allowed */
  maxPlayers?: number;

  /** Require all players to ready-up before starting */
  requireAllReady?: boolean;

  /** Auto-start after timeout (ms) if minPlayers met */
  autoStartTimeout?: number;

  /** Allow players to join mid-game */
  allowLateJoin?: boolean;

  /** Ready-up timeout per player (ms) */
  readyTimeout?: number;
}

/**
 * Phase change context
 */
export interface PhaseChangeContext {
  /** Previous phase */
  from: GamePhase;

  /** New phase */
  to: GamePhase;

  /** Reason for change */
  reason: 'manual' | 'timeout' | 'all_ready' | 'player_left';

  /** Timestamp */
  timestamp: number;
}
```

### 2. Enhanced GameDefinition

```typescript
// @martini-kit/core/src/defineGame.ts (MODIFIED)

export interface GameDefinition<TState = any> {
  /** Initial state factory */
  setup?: (context: SetupContext) => TState;

  /** Actions - only way to modify state */
  actions?: Record<string, ActionDefinition<TState, any>>;

  /** Called when a player joins mid-game */
  onPlayerJoin?: (state: TState, playerId: string) => void;

  /** Called when a player leaves */
  onPlayerLeave?: (state: TState, playerId: string) => void;

  // ============ NEW: Lobby System ============

  /**
   * Lobby configuration (optional - enables lobby system)
   * If not provided, game starts immediately (legacy behavior)
   */
  lobby?: LobbyConfig;

  /**
   * Called when game phase changes
   * @param state - Current game state
   * @param context - Phase change details
   */
  onPhaseChange?: (state: TState, context: PhaseChangeContext) => void;

  /**
   * Called when a player changes ready state
   * @param state - Current game state
   * @param playerId - Player who changed ready state
   * @param ready - New ready state
   */
  onPlayerReady?: (state: TState, playerId: string, ready: boolean) => void;
}
```

### 3. Auto-Injected Lobby State

When `lobby` config is provided, GameRuntime **automatically injects** lobby metadata into state:

```typescript
// Auto-injected by GameRuntime.constructor()
interface AutoInjectedLobbyState {
  __lobby: {
    phase: GamePhase;
    players: Record<string, PlayerPresence>;
    config: LobbyConfig;
    startedAt?: number;
    endedAt?: number;
  };
}

// Example: User's state is augmented
type ActualState = UserState & AutoInjectedLobbyState;
```

**Rationale:** Similar to how Colyseus auto-manages room state. Users never manually manage `phase` or `players` metadata.

### 4. Built-In Lobby Actions

GameRuntime automatically provides these actions when `lobby` is configured:

```typescript
// Auto-injected into gameDef.actions
const LOBBY_ACTIONS = {
  __lobbyReady: {
    apply: (state, context, input: { ready: boolean }) => {
      const presence = state.__lobby.players[context.targetId];
      if (!presence) return;

      presence.ready = input.ready;

      // Trigger callback
      if (this.gameDef.onPlayerReady) {
        this.gameDef.onPlayerReady(state, context.targetId, input.ready);
      }

      // Check if all players ready
      this.checkLobbyStartConditions(state);
    }
  },

  __lobbyStart: {
    apply: (state, context) => {
      // Only host or all-ready can start
      if (!context.isHost && !this.allPlayersReady(state)) {
        return; // Ignore
      }

      this.transitionPhase(state, 'playing', 'manual');
    }
  },

  __lobbyEnd: {
    apply: (state, context) => {
      this.transitionPhase(state, 'ended', 'manual');
    }
  }
};
```

**User Access:**
```typescript
// In scene or UI
runtime.submitAction('__lobbyReady', { ready: true });
runtime.submitAction('__lobbyStart');
```

### 5. GameRuntime Enhancements

```typescript
// @martini-kit/core/src/GameRuntime.ts (MODIFIED)

export class GameRuntime<TState = any> {
  private lobbyConfig?: LobbyConfig;
  private lobbyTimeoutId?: any;

  constructor(gameDef, transport, config) {
    // ... existing initialization ...

    // NEW: Inject lobby system if configured
    if (gameDef.lobby) {
      this.lobbyConfig = gameDef.lobby;
      this.injectLobbyState();
      this.injectLobbyActions();
      this.startLobbyPhase();
    }
  }

  /**
   * Inject lobby metadata into state
   */
  private injectLobbyState(): void {
    (this.state as any).__lobby = {
      phase: 'lobby',
      players: {},
      config: this.lobbyConfig,
      startedAt: null,
      endedAt: null
    };

    // Initialize self as first player
    const myId = this.transport.getPlayerId();
    (this.state as any).__lobby.players[myId] = {
      playerId: myId,
      ready: false,
      joinedAt: Date.now()
    };
  }

  /**
   * Inject built-in lobby actions
   */
  private injectLobbyActions(): void {
    if (!this.gameDef.actions) {
      this.gameDef.actions = {};
    }

    // Add internal lobby actions (prefixed with __)
    Object.assign(this.gameDef.actions, {
      __lobbyReady: { apply: this.handleLobbyReady.bind(this) },
      __lobbyStart: { apply: this.handleLobbyStart.bind(this) },
      __lobbyEnd: { apply: this.handleLobbyEnd.bind(this) }
    });
  }

  /**
   * Start lobby phase with auto-start timer
   */
  private startLobbyPhase(): void {
    const { autoStartTimeout, minPlayers } = this.lobbyConfig!;

    if (autoStartTimeout && autoStartTimeout > 0) {
      this.lobbyTimeoutId = setTimeout(() => {
        const lobbyState = (this.state as any).__lobby;
        const playerCount = Object.keys(lobbyState.players).length;

        if (playerCount >= minPlayers && lobbyState.phase === 'lobby') {
          this.transitionPhase(this.state, 'playing', 'timeout');
        }
      }, autoStartTimeout);
    }
  }

  /**
   * Transition between phases
   */
  private transitionPhase(
    state: TState,
    newPhase: GamePhase,
    reason: PhaseChangeContext['reason']
  ): void {
    const lobbyState = (state as any).__lobby;
    const oldPhase = lobbyState.phase;

    if (oldPhase === newPhase) return;

    lobbyState.phase = newPhase;

    if (newPhase === 'playing') {
      lobbyState.startedAt = Date.now();
      // Lock room (prevent late joins if configured)
      if (!this.lobbyConfig!.allowLateJoin) {
        this.lockRoom();
      }
    } else if (newPhase === 'ended') {
      lobbyState.endedAt = Date.now();
    }

    // Trigger callback
    if (this.gameDef.onPhaseChange) {
      this.gameDef.onPhaseChange(state, {
        from: oldPhase,
        to: newPhase,
        reason,
        timestamp: Date.now()
      });
    }

    this.notifyStateChange();
  }

  /**
   * Handle player join with lobby presence
   */
  private handlePeerJoinWithLobby(peerId: string): void {
    const lobbyState = (this.state as any).__lobby;
    const { maxPlayers, allowLateJoin } = this.lobbyConfig!;

    // Check max players
    if (maxPlayers && Object.keys(lobbyState.players).length >= maxPlayers) {
      console.warn(`[Lobby] Max players (${maxPlayers}) reached, rejecting ${peerId}`);
      return; // TODO: Implement transport.reject(peerId)
    }

    // Check late join
    if (lobbyState.phase === 'playing' && !allowLateJoin) {
      console.warn(`[Lobby] Game in progress, late join disabled, rejecting ${peerId}`);
      return;
    }

    // Add player presence
    lobbyState.players[peerId] = {
      playerId: peerId,
      ready: false,
      joinedAt: Date.now()
    };

    // Call user's onPlayerJoin
    if (this.gameDef.onPlayerJoin) {
      this.gameDef.onPlayerJoin(this.state, peerId);
    }

    // Check if ready to start
    this.checkLobbyStartConditions(this.state);
  }

  /**
   * Check if lobby can transition to playing
   */
  private checkLobbyStartConditions(state: TState): void {
    const lobbyState = (state as any).__lobby;
    const { minPlayers, requireAllReady } = this.lobbyConfig!;

    if (lobbyState.phase !== 'lobby') return;

    const players = Object.values(lobbyState.players) as PlayerPresence[];
    const readyCount = players.filter(p => p.ready).length;

    // Auto-start conditions
    const hasMinPlayers = players.length >= minPlayers;
    const allReady = requireAllReady ? readyCount === players.length : true;

    if (hasMinPlayers && allReady) {
      this.transitionPhase(state, 'playing', 'all_ready');
    }
  }

  /**
   * Lock room (prevent new joins)
   */
  private lockRoom(): void {
    // TODO: Add to Transport interface
    const transport = this.transport as any;
    if (typeof transport.lock === 'function') {
      transport.lock();
    }
  }

  // ... (rest of existing methods)
}
```

### 6. User-Facing API

**Game Definition (Opt-In):**
```typescript
// Example: Paddle Battle with lobby
export const game = defineGame({
  // NEW: Add lobby config
  lobby: {
    minPlayers: 2,
    maxPlayers: 2,
    requireAllReady: true,
    autoStartTimeout: 30000, // 30s fallback
    allowLateJoin: false
  },

  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    ball: { x: 400, y: 300, velocityX: 200, velocityY: 150 },
    inputs: {}
    // NOTE: No manual 'gameStarted' flag - runtime injects __lobby.phase
  }),

  // NEW: Phase change callback
  onPhaseChange: (state, { from, to, reason }) => {
    console.log(`Game transitioned from ${from} to ${to} (${reason})`);

    if (to === 'playing') {
      // Reset ball velocity, etc.
      state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
    }
  },

  // NEW: Ready state callback
  onPlayerReady: (state, playerId, ready) => {
    console.log(`Player ${playerId} is ${ready ? 'ready' : 'not ready'}`);
  },

  actions: {
    move: createInputAction('inputs'),
    score: { /* ... */ }
    // NOTE: No manual 'startGame' action - runtime provides __lobbyStart
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);

    // Check if game should end due to insufficient players
    const lobbyState = (state as any).__lobby;
    if (lobbyState.phase === 'playing') {
      const remaining = Object.keys(lobbyState.players).length;
      if (remaining < 2) {
        // Trigger game end via runtime action
        // (runtime will call __lobbyEnd automatically)
      }
    }
  }
});
```

**Scene Usage:**
```typescript
// In Phaser scene
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  const state = runtime.getState();
  const lobbyState = (state as any).__lobby;

  // Check current phase
  if (lobbyState.phase === 'lobby') {
    this.showLobbyUI();
  }

  // Listen for phase changes
  runtime.onChange((newState) => {
    const lobby = (newState as any).__lobby;

    if (lobby.phase === 'playing') {
      this.hideLobbyUI();
      this.startGameplay();
    }
  });
}

// Ready-up button handler
onReadyButtonClick() {
  const myId = runtime.getMyPlayerId();
  const state = runtime.getState();
  const myPresence = (state as any).__lobby.players[myId];

  // Toggle ready state
  runtime.submitAction('__lobbyReady', { ready: !myPresence.ready });
}

// Host start button
onStartButtonClick() {
  runtime.submitAction('__lobbyStart');
}
```

---

## Migration Strategy

### For Existing Games (Breaking Change Mitigation)

**1. Backward Compatibility:**
Games without `lobby` config continue to work unchanged:
```typescript
// Old paddle-battle (still works!)
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    gameStarted: false  // Manual flag still works
  }),
  actions: {
    startGame: {
      apply: (state) => { state.gameStarted = true; }
    }
  }
});
```

**2. Opt-In Migration:**
Add `lobby` config gradually:
```typescript
// Step 1: Add lobby config
export const game = defineGame({
  lobby: { minPlayers: 2, requireAllReady: false },
  // ... existing setup, actions
});

// Step 2: Remove manual 'gameStarted' flag
// Step 3: Replace manual actions with __lobbyStart
// Step 4: Add onPhaseChange callback
```

**3. Deprecation Timeline:**
- **v1.0:** Lobby system released, old pattern still works
- **v1.1:** Deprecation warnings for manual `gameStarted` patterns
- **v2.0:** Remove warnings (both patterns supported indefinitely)

### Migration Example: Paddle Battle

**Before (Current):**
```typescript
setup: ({ playerIds }) => ({
  players: playerManager.initialize(playerIds),
  ball: { x: 400, y: 300, velocityX: 200, velocityY: 150 },
  inputs: {},
  gameStarted: false  // ❌ Manual
}),

actions: {
  move: createInputAction('inputs'),
  startGame: {        // ❌ Manual
    apply: (state) => { state.gameStarted = true; }
  }
}
```

**After (Migrated):**
```typescript
lobby: {              // ✅ Declarative
  minPlayers: 2,
  requireAllReady: true,
  autoStartTimeout: 30000
},

setup: ({ playerIds }) => ({
  players: playerManager.initialize(playerIds),
  ball: { x: 400, y: 300, velocityX: 200, velocityY: 150 },
  inputs: {}
  // ✅ No 'gameStarted' - runtime manages phase
}),

actions: {
  move: createInputAction('inputs')
  // ✅ No 'startGame' - runtime provides __lobbyStart
},

onPhaseChange: (state, { to }) => {  // ✅ Lifecycle hook
  if (to === 'playing') {
    // Reset ball on game start
  }
}
```

**Scene Changes:**
```typescript
// Before
update() {
  const state = runtime.getState();
  if (!state.gameStarted) {
    return; // Skip gameplay
  }
  // ... game logic
}

// After
update() {
  const state = runtime.getState();
  if ((state as any).__lobby.phase !== 'playing') {
    return; // Skip gameplay
  }
  // ... game logic (same)
}
```

---

## Implementation Checklist

### Phase 1: Core Types & Runtime (Week 1)
- [ ] Add `GamePhase`, `PlayerPresence`, `LobbyConfig` types to `@martini-kit/core/src/types.ts`
- [ ] Add `PhaseChangeContext` type
- [ ] Extend `GameDefinition` with `lobby`, `onPhaseChange`, `onPlayerReady`
- [ ] Update `defineGame()` validation

### Phase 2: GameRuntime Integration (Week 1-2)
- [ ] Implement `injectLobbyState()` in GameRuntime constructor
- [ ] Implement `injectLobbyActions()` (`__lobbyReady`, `__lobbyStart`, `__lobbyEnd`)
- [ ] Implement `transitionPhase()` with callback triggering
- [ ] Implement `checkLobbyStartConditions()` (auto-start logic)
- [ ] Implement `startLobbyPhase()` (timeout handling)
- [ ] Override `onPeerJoin` to call `handlePeerJoinWithLobby()`
- [ ] Override `onPeerLeave` to check min players

### Phase 3: Transport Enhancements (Week 2)
- [ ] Add `lock()` method to Transport interface
- [ ] Implement `lock()` in LocalTransport
- [ ] Implement `lock()` in TrysteroTransport
- [ ] Implement `lock()` in IframeBridgeTransport
- [ ] Add `reject(peerId)` for max players enforcement (optional)

### Phase 4: Testing (Week 2-3)
- [ ] Unit tests for phase transitions
- [ ] Unit tests for ready-up logic
- [ ] Unit tests for auto-start timeout
- [ ] Unit tests for max players enforcement
- [ ] Unit tests for late-join blocking
- [ ] Integration test: 2-player lobby
- [ ] Integration test: All-ready auto-start
- [ ] Integration test: Timeout fallback
- [ ] Integration test: Player leave during lobby

### Phase 5: Migration & Documentation (Week 3)
- [ ] Migrate `paddle-battle` to new lobby system
- [ ] Add lobby example to docs
- [ ] Write migration guide for existing games
- [ ] Add TypeScript autocomplete docs for `__lobby` state
- [ ] Add phase diagram to docs

### Phase 6: Optional UI Components (Week 4+)
- [ ] Create `<LobbyScreen>` Svelte component (in `@martini-kit/phaser`)
- [ ] Create `<PlayerList>` component
- [ ] Create `<ReadyButton>` component
- [ ] Add to GamePreview with `showLobby` prop

---

## Open Questions for User Approval

1. **Naming Convention:**
   - Internal actions: `__lobbyReady` vs `$lobbyReady` vs `@lobbyReady`?
   - State injection: `__lobby` vs `$lobby` vs `_meta`?

2. **Transport.lock() API:**
   - Should `lock()` be reversible (`unlock()`)? Or permanent?
   - Should transports throw if `lock()` not implemented? Or warn?

3. **Ready Timeout Enforcement:**
   - Should runtime auto-remove players who don't ready-up within `readyTimeout`?
   - Or leave that to user's `onPlayerReady` callback?

4. **Spectator Mode:**
   - Should late-joiners automatically become spectators if `allowLateJoin: false`?
   - Or simply reject the connection?

5. **Phase State Persistence:**
   - Should `__lobby` state persist in state snapshots (for DevTools)?
   - Or mark it as non-serializable metadata?

6. **Backfill/Matchmaking:**
   - Is backfill (replacing disconnected players) in scope for v1?
   - Or defer to future matchmaking system?

---

## Success Metrics

After implementation, we should see:

1. **Zero manual lobby code** in new games (declarative config only)
2. **<10 lines** to implement ready-up UI in scenes
3. **100% backward compatibility** with existing games
4. **All 4 demo games** optionally migrated to showcase patterns
5. **Matches Photon/Colyseus ergonomics** in user feedback

---

## Next Steps

**Awaiting User Approval On:**
1. Overall architecture (state injection vs. manual management)
2. Breaking change acceptance (with migration path)
3. Naming conventions (`__lobby`, `__lobbyReady`, etc.)
4. Scope boundaries (defer backfill/matchmaking to v2?)

**After Approval:**
1. Begin Phase 1 implementation (types & validation)
2. Create feature branch: `feature/lobby-system`
3. Implement with test coverage
4. Migrate paddle-battle as proof-of-concept
5. Document and release as **v1.0.0-beta.lobby**

---

## References

- [Photon PUN Lobby Tutorial](https://doc.photonengine.com/pun/current/demos-and-tutorials/pun-basics-tutorial/lobby)
- [Colyseus Room Lifecycle](https://docs.colyseus.io/server/room/built-in/lobby)
- [PlayFab Lobby & Matchmaking](https://learn.microsoft.com/en-us/gaming/playfab/features/multiplayer/lobby/lobby-and-matchmaking)
- Martini Kit Current Architecture: [GameRuntime.ts](/@martini-kit/core/src/GameRuntime.ts), [defineGame.ts](/@martini-kit/core/src/defineGame.ts)
