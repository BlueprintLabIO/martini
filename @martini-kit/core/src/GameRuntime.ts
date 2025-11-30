/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */

import type { GameDefinition } from './defineGame.js';
import type { Transport, WireMessage, RuntimeConfig } from './transport.js';
import { generateDiff, applyPatch, deepClone, type Patch } from './sync.js';
import { SeededRandom } from './SeededRandom.js';
import type { LobbyState, GamePhase, PhaseChangeContext, PlayerPresence } from './lobby.js';

type StateChangeCallback<TState> = (state: TState) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;

/**
 * Extended runtime configuration with strict mode
 */
export interface GameRuntimeConfig extends RuntimeConfig {
  /** Throw errors instead of warnings (recommended for development) */
  strict?: boolean;

  /**
   * Validate that all playerIds are initialized in setup()
   * Throws an error if strictPlayerInit is true, warns otherwise
   * @default false
   */
  strictPlayerInit?: boolean;

  /**
   * Key in state where players are stored (for validation)
   * @default 'players'
   */
  playersKey?: string;
}

export class GameRuntime<TState = any> {
  private state: TState = {} as TState;
  private previousState: TState = {} as TState;
  private _isHost: boolean;
  private syncIntervalId: any = null;
  private syncTickerId: any = null;
  private unsubscribes: Array<() => void> = [];
  private strict: boolean;
  private actionCounter: number = 100000; // For seeding action random (start high to avoid LCG collisions)

  // Lobby system state
  private lobbyTimeoutId: any = null;
  private lobbyReconcileIntervalId: any = null;
  private hasLobby: boolean = false;

  private stateChangeCallbacks: StateChangeCallback<TState>[] = [];
  private eventCallbacks: Map<string, EventCallback[]> = new Map();
  private patchListeners: Array<(patches: Patch[]) => void> = [];
  private lastSyncSent: number = Date.now();
  private readonly heartbeatIntervalMs = 100;

  constructor(
    private gameDef: GameDefinition<TState>,
    private transport: Transport,
    private config: GameRuntimeConfig
  ) {
    this._isHost = config.isHost;
    this.strict = config.strict ?? false;

    // Initialize state
    const initialPlayerIds = config.playerIds || [];
    if (gameDef.setup) {
      // Create deterministic random for setup (same seed for all clients)
      const setupRandom = new SeededRandom(12345);
      this.state = gameDef.setup({ playerIds: initialPlayerIds, random: setupRandom });
    }
    this.previousState = deepClone(this.state);

    // Validate player initialization (dev mode)
    if (process.env.NODE_ENV !== 'production' && initialPlayerIds.length > 0) {
      this.validatePlayerInitialization(initialPlayerIds);
    }

    // Initialize lobby system if configured
    if (gameDef.lobby) {
      this.hasLobby = true;
      this.injectLobbyState();
      this.injectLobbyActions();
      this.startLobbyPhase();

      // Start lobby-transport reconciliation (host only, defense in depth)
      if (this._isHost) {
        this.startLobbyReconciliation();
      }
    }

    // Setup transport listeners
    this.setupTransport();

    // Start sync loop if host
    if (this._isHost) {
      const syncInterval = config.syncInterval || 13; // ~75 FPS default for smoother arrivals
      this.startSyncLoop(syncInterval);
    }
  }

  /**
   * Get current state (read-only, typed)
   */
  getState(): TState {
    return this.state;
  }

  /**
   * Check if this runtime is the host
   */
  isHost(): boolean {
    return this._isHost;
  }

  /**
   * Get the current player's ID
   *
   * @returns The unique player ID for this client
   *
   * @example
   * ```ts
   * const myId = runtime.getMyPlayerId();
   * console.log('My player ID:', myId);
   * ```
   */
  getMyPlayerId(): string {
    return this.transport.getPlayerId();
  }

  /**
   * Get transport (for adapters to check isHost, getPlayerId, etc)
   * @internal
   */
  getTransport(): Transport {
    return this.transport;
  }

  /**
   * Directly mutate state (for adapters only - bypasses actions)
   * Only the host should call this
   * @internal
   */
  mutateState(mutator: (state: TState) => void): void {
    if (!this._isHost) {
      this.handleError('mutateState called on non-host - ignoring');
      return;
    }
    mutator(this.state);
    this.notifyStateChange();
  }

  /**
   * Execute an action (validates input, applies to state, broadcasts)
   * @param actionName - Name of the action to execute
   * @param input - Action payload/input data
   * @param targetId - Optional target player ID (defaults to caller's ID)
   */
  submitAction(actionName: string, input: any, targetId?: string): void {
    if (!this.gameDef.actions) {
      this.handleError('No actions defined in game');
      return;
    }

    const action = this.gameDef.actions[actionName];
    if (!action) {
      const availableActions = Object.keys(this.gameDef.actions);
      const suggestion = this.findClosestMatch(actionName, availableActions);

      let errorMsg = `Action "${actionName}" not found.`;

      if (availableActions.length > 0) {
        errorMsg += `\n\nAvailable actions: ${availableActions.join(', ')}`;
        if (suggestion) {
          errorMsg += `\n\nDid you mean "${suggestion}"?`;
        }
      } else {
        errorMsg += '\n\nNo actions are defined in your game.';
      }

      this.handleError(errorMsg);
      return;
    }

    const playerId = this.transport.getPlayerId();

    // Create deterministic random for this action
    const actionSeed = this.actionCounter++;
    const actionRandom = new SeededRandom(actionSeed);

    const context = {
      playerId,                          // Who called submitAction
      targetId: targetId || playerId,    // Who is affected (defaults to caller)
      isHost: this._isHost,
      random: actionRandom
    };

    // If we're the host, apply immediately
    if (this._isHost) {
      action.apply(this.state, context, input);
      this.notifyStateChange();
    }

    // Broadcast action to all peers (include actionSeed for determinism)
    this.transport.send({
      type: 'action',
      payload: { actionName, input, context, actionSeed },
      senderId: playerId
    });
  }

  /**
   * Broadcast a custom event
   */
  broadcastEvent(eventName: string, payload: any): void {
    const playerId = this.transport.getPlayerId();
    this.transport.send({
      type: 'event',
      payload: { eventName, payload },
      senderId: playerId
    });
  }

  /**
   * Listen for custom events
   */
  onEvent(eventName: string, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName)!.push(callback);

    return () => {
      const callbacks = this.eventCallbacks.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Wait until the desired number of players (including self) are present.
   * Helpful for P2P transports where peers join asynchronously.
   *
   * @deprecated Use the lobby system instead for better player coordination:
   * ```ts
   * defineGame({
   *   lobby: {
   *     minPlayers: 2,
   *     requireAllReady: true
   *   }
   * })
   * ```
   * This method is automatically skipped when lobby system is enabled.
   */
  async waitForPlayers(minPlayers: number, options: { timeoutMs?: number; includeSelf?: boolean } = {}): Promise<void> {
    // Warn if lobby system is enabled
    if (this.hasLobby) {
      console.warn(
        '[GameRuntime] waitForPlayers() is deprecated when using the lobby system. ' +
        'The lobby automatically manages player coordination via minPlayers config.'
      );
      return;
    }

    const includeSelf = options.includeSelf !== false;
    const target = Math.max(1, minPlayers);
    const getCount = () => (includeSelf ? 1 : 0) + this.transport.getPeerIds().length;

    if (getCount() >= target) return;

    // Attempt transport-level readiness if available (e.g., Trystero waitForReady)
    const maybeWaitForReady = (this.transport as any).waitForReady;
    if (typeof maybeWaitForReady === 'function') {
      try {
        await maybeWaitForReady.call(this.transport);
      } catch {
        // Ignore readiness errors here; onPeerJoin may still fire.
      }
      if (getCount() >= target) return;
    }

    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const timeout =
        options.timeoutMs && options.timeoutMs > 0
          ? setTimeout(() => {
              if (!resolved) {
                resolved = true;
                reject(new Error(`Timed out waiting for ${target} players`));
              }
            }, options.timeoutMs)
          : null;

      const unsubscribe = this.transport.onPeerJoin(() => {
        if (getCount() >= target && !resolved) {
          resolved = true;
          if (timeout) clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * Listen for state changes (typed)
   */
  onChange(callback: StateChangeCallback<TState>): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index !== -1) this.stateChangeCallbacks.splice(index, 1);
    };
  }

  /**
   * Subscribe to state patches as they're generated
   * This allows DevTools to reuse the patches that GameRuntime already computed
   * instead of re-cloning and re-diffing the state
   */
  onPatch(listener: (patches: Patch[]) => void): () => void {
    this.patchListeners.push(listener);

    return () => {
      const index = this.patchListeners.indexOf(listener);
      if (index !== -1) {
        this.patchListeners.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    if (this.syncTickerId && typeof (globalThis as any).cancelAnimationFrame === 'function') {
      (globalThis as any).cancelAnimationFrame(this.syncTickerId);
    }
    if (this.lobbyTimeoutId) {
      clearTimeout(this.lobbyTimeoutId);
    }
    if (this.lobbyReconcileIntervalId) {
      clearInterval(this.lobbyReconcileIntervalId);
    }
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private setupTransport(): void {
    // Listen for incoming messages
    this.unsubscribes.push(
      this.transport.onMessage((msg, senderId) => {
        this.handleMessage(msg, senderId);
      })
    );

    // Listen for peer join
    this.unsubscribes.push(
      this.transport.onPeerJoin((peerId) => {
        // Use lobby handler if lobby system enabled
        if (this.hasLobby) {
          this.handlePeerJoinWithLobby(peerId);
        } else {
          // Legacy behavior (no lobby)
          if (this.gameDef.onPlayerJoin) {
            this.gameDef.onPlayerJoin(this.state, peerId);
          }
        }

        // If we're the host, send full state to new peer
        if (this._isHost) {
          this.transport.send({
            type: 'state_sync',
            payload: { fullState: this.state }
          }, peerId);
        }
      })
    );

    // Listen for peer leave
    this.unsubscribes.push(
      this.transport.onPeerLeave((peerId) => {
        // Use lobby handler if lobby system enabled
        if (this.hasLobby) {
          this.handlePeerLeaveWithLobby(peerId);
        } else {
          // Legacy behavior (no lobby)
          if (this.gameDef.onPlayerLeave) {
            this.gameDef.onPlayerLeave(this.state, peerId);
          }
        }
      })
    );
  }

  private handleMessage(msg: WireMessage, senderId: string): void {
    switch (msg.type) {
      case 'state_sync':
        // Only clients should receive state syncs
        if (!this._isHost) {
          this.handleStateSync(msg.payload);
        }
        break;

      case 'heartbeat':
        // Lightweight keep-alive to keep arrival cadence stable (clients only)
        if (!this._isHost) {
          this.notifyStateChange();
        }
        break;

      case 'action':
        // Only host processes actions from clients
        if (this._isHost && senderId !== this.transport.getPlayerId()) {
          this.handleActionFromClient(msg.payload);
        }
        break;

      case 'event':
        this.handleEvent(senderId, msg.payload);
        break;
    }
  }

  private handleStateSync(payload: any): void {
    if (payload.fullState) {
      // Full state replacement - generate patches from old → new
      this.state = payload.fullState;
      this.notifyStateChange(); // Will generate patches internally
    } else if (payload.patches) {
      // Apply patches and reuse them for listeners (zero-copy optimization)
      for (const patch of payload.patches) {
        applyPatch(this.state, patch);
      }
      this.notifyStateChange(payload.patches); // Reuse host-computed patches
    } else if (payload?.heartbeat) {
      // Keep arrival cadence stable even when no state diff
      this.notifyStateChange();
    }
  }

  private handleActionFromClient(payload: any): void {
    const { actionName, input, context, actionSeed } = payload;

    if (!this.gameDef.actions) {
      this.handleError('No actions defined');
      return;
    }

    const action = this.gameDef.actions[actionName];
    if (!action) {
      const availableActions = Object.keys(this.gameDef.actions);
      this.handleError(
        `Unknown action from client: ${actionName}. Available: ${availableActions.join(', ')}`
      );
      return;
    }

    // Recreate the same random from the actionSeed for determinism
    const contextWithRandom = {
      ...context,
      random: new SeededRandom(actionSeed)
    };

    // Apply action to state with context
    action.apply(this.state, contextWithRandom, input);
    this.notifyStateChange();
  }

  private handleEvent(senderId: string, payload: any): void {
    const { eventName, payload: eventPayload } = payload;
    const callbacks = this.eventCallbacks.get(eventName) || [];

    for (const callback of callbacks) {
      callback(senderId, eventName, eventPayload);
    }
  }

  private syncState(now: number = Date.now()): void {
    if (!this._isHost) return;

    // Generate diff from last sync
    const patches = generateDiff(this.previousState, this.state);

    if (patches.length > 0) {
      // Broadcast patches to all clients
      this.transport.send({
        type: 'state_sync',
        payload: { patches }
      });

      // Notify all listeners (Inspector + state change callbacks)
      this.notifyStateChange(patches);

      this.lastSyncSent = now;
    }

    // Update baseline for next sync (even if no patches this time)
    // This captures all mutations that happened since last sync
    this.previousState = deepClone(this.state);

    // Heartbeat to keep arrival cadence stable when idle
    if (patches.length === 0 && now - this.lastSyncSent >= this.heartbeatIntervalMs) {
      this.transport.send({
        type: 'heartbeat',
        payload: { heartbeat: true }
      });
      this.notifyStateChange();
      this.lastSyncSent = now;
    }
  }

  /**
   * Start a jitter-resistant sync loop.
   * Prefer requestAnimationFrame with an accumulator; fall back to setInterval when rAF is unavailable.
   */
  private startSyncLoop(intervalMs: number): void {
    // Clear any existing loop
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    if (this.syncTickerId && typeof (globalThis as any).cancelAnimationFrame === 'function') {
      (globalThis as any).cancelAnimationFrame(this.syncTickerId);
      this.syncTickerId = null;
    }

    const raf = (globalThis as any).requestAnimationFrame as
      | ((cb: (time: number) => void) => number)
      | undefined;
    const useRaf = typeof raf === 'function';

    if (useRaf) {
      let last = performance.now();
      const tick = (now: number) => {
        if (!this._isHost) return; // bail if role changes
        const elapsed = now - last;
        if (elapsed >= intervalMs - 0.5) {
          this.syncState(now);
          last = now;
        }
        this.syncTickerId = raf!(tick) as any;
      };
      this.syncTickerId = raf(tick) as any;
    } else {
      this.syncIntervalId = setInterval(() => this.syncState(), intervalMs);
    }
  }

  /**
   * Unified state change notification - ensures all listeners are notified consistently
   * @param patches - Optional pre-computed patches (e.g., from host sync). If not provided, generates them.
   *
   * Note: This does NOT update previousState. Only syncState() updates it (once per sync interval).
   * This ensures optimal performance - we only clone state 20 times/sec (at sync) instead of
   * on every action/mutation which could be 100+ times/sec.
   */
  private notifyStateChange(patches?: Patch[]): void {
    // 1. Generate patches if not provided (and we have listeners that need them)
    let computedPatches: Patch[] | null = null;
    if (this.patchListeners.length > 0) {
      computedPatches = patches ?? generateDiff(this.previousState, this.state);

      // 2. Emit to patch listeners (Inspector)
      if (computedPatches.length > 0) {
        this.patchListeners.forEach(listener => {
          try {
            listener(computedPatches!);
          } catch (error) {
            console.error('Error in patch listener:', error);
          }
        });
      }
    }

    // 3. Emit to state change listeners
    for (const callback of this.stateChangeCallbacks) {
      callback(this.state);
    }

    // Note: previousState is NOT updated here - only in syncState() for optimal performance
  }

  /**
   * Handle errors with strict mode support
   */
  private handleError(message: string): void {
    if (this.strict) {
      throw new Error(`[martini-kit] ${message}`);
    } else {
      console.warn(`[martini-kit] ${message}`);
    }
  }

  /**
   * Find closest string match (for typo suggestions)
   */
  private findClosestMatch(input: string, options: string[]): string | null {
    if (options.length === 0) return null;

    let minDistance = Infinity;
    let closest: string | null = null;

    for (const option of options) {
      const distance = this.levenshteinDistance(input.toLowerCase(), option.toLowerCase());
      if (distance < minDistance && distance <= 3) { // Max 3 character difference
        minDistance = distance;
        closest = option;
      }
    }

    return closest;
  }

  /**
   * Calculate Levenshtein distance for typo detection
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Validate that all playerIds are initialized in state.players
   * Emits warning or throws error based on configuration
   */
  private validatePlayerInitialization(playerIds: string[]): void {
    const playersKey = this.config.playersKey || 'players';
    const players = (this.state as any)[playersKey];

    // Check if players key exists
    if (!players || typeof players !== 'object') {
      const message = [
        `⚠️  Player initialization issue detected:`,
        ``,
        `Expected state.${playersKey} to be an object, but got: ${typeof players}`,
        ``,
        `Fix: Initialize players in setup():`,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: Object.fromEntries(`,
        `      playerIds.map(id => [id, { x: 100, y: 100 }])`,
        `    )`,
        `  })`
      ].join('\n');

      if (this.config.strictPlayerInit) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
      return;
    }

    // Check if all playerIds are initialized
    const missingPlayers = playerIds.filter(id => !(id in players));

    if (missingPlayers.length > 0) {
      const message = [
        `⚠️  Player initialization issue detected:`,
        ``,
        `Expected ${playerIds.length} players, but ${missingPlayers.length} missing from state.${playersKey}`,
        `Missing player IDs: ${missingPlayers.join(', ')}`,
        ``,
        `Fix: Initialize all players in setup():`,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: Object.fromEntries(`,
        `      playerIds.map((id, index) => [id, {`,
        `        x: index * 100,`,
        `        y: 100,`,
        `        score: 0`,
        `      }])`,
        `    )`,
        `  })`,
        ``,
        `Or use the createPlayers helper:`,
        `  import { createPlayers } from '@martini-kit/core';`,
        ``,
        `  setup: ({ playerIds }) => ({`,
        `    ${playersKey}: createPlayers(playerIds, (id, index) => ({`,
        `      x: index * 100, y: 100, score: 0`,
        `    }))`,
        `  })`
      ].join('\n');

      if (this.config.strictPlayerInit) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
  }

  // ============================================================================
  // Lobby System (Private methods)
  // ============================================================================

  /**
   * Inject lobby metadata into state
   */
  private injectLobbyState(): void {
    const myId = this.transport.getPlayerId();
    const allPeerIds = [myId, ...this.transport.getPeerIds()];

    // Initialize lobby with ALL known peers from transport (not just self!)
    // This prevents the bug where clients initialize with only themselves
    const lobbyPlayers: Record<string, PlayerPresence> = {};
    for (const peerId of allPeerIds) {
      lobbyPlayers[peerId] = {
        playerId: peerId,
        ready: false,
        joinedAt: Date.now()
      };
    }

    (this.state as any).__lobby = {
      phase: 'lobby' as GamePhase,
      players: lobbyPlayers,
      config: this.gameDef.lobby!,
      startedAt: undefined,
      endedAt: undefined
    } as LobbyState;
  }

  /**
   * Inject built-in lobby actions
   */
  private injectLobbyActions(): void {
    if (!this.gameDef.actions) {
      this.gameDef.actions = {};
    }

    // Add internal lobby actions (prefixed with __)
    this.gameDef.actions.__lobbyReady = {
      apply: (state, context, input: { ready: boolean }) => {
        this.handleLobbyReady(state, context, input);
      }
    };

    this.gameDef.actions.__lobbyStart = {
      apply: (state, context) => {
        this.handleLobbyStart(state, context);
      }
    };

    this.gameDef.actions.__lobbyEnd = {
      apply: (state, context) => {
        this.handleLobbyEnd(state, context);
      }
    };
  }

  /**
   * Start lobby phase with auto-start timer
   */
  private startLobbyPhase(): void {
    const lobbyConfig = this.gameDef.lobby!;

    if (lobbyConfig.autoStartTimeout && lobbyConfig.autoStartTimeout > 0) {
      this.lobbyTimeoutId = setTimeout(() => {
        const lobbyState = (this.state as any).__lobby as LobbyState;
        const playerCount = Object.keys(lobbyState.players).length;

        if (playerCount >= lobbyConfig.minPlayers && lobbyState.phase === 'lobby') {
          this.transitionPhase(this.state, 'playing', 'timeout');
        }
      }, lobbyConfig.autoStartTimeout);
    }
  }

  /**
   * Handle __lobbyReady action
   */
  private handleLobbyReady(state: TState, context: any, input: { ready: boolean }): void {
    const lobbyState = (state as any).__lobby as LobbyState;
    const presence = lobbyState.players[context.targetId];

    if (!presence) return;

    presence.ready = input.ready;

    // Trigger callback
    if (this.gameDef.onPlayerReady) {
      this.gameDef.onPlayerReady(state, context.targetId, input.ready);
    }

    // Check if all players ready
    this.checkLobbyStartConditions(state);
  }

  /**
   * Handle __lobbyStart action
   */
  private handleLobbyStart(state: TState, context: any): void {
    const lobbyState = (state as any).__lobby as LobbyState;
    const lobbyConfig = this.gameDef.lobby!;

    // Only host or all-ready can force start
    if (!context.isHost && lobbyConfig.requireAllReady && !this.allPlayersReady(state)) {
      return; // Ignore non-host start attempts if all-ready required
    }

    this.transitionPhase(state, 'playing', 'manual');
  }

  /**
   * Handle __lobbyEnd action
   */
  private handleLobbyEnd(state: TState, _context: any): void {
    this.transitionPhase(state, 'ended', 'manual');
  }

  /**
   * Transition between phases
   */
  private transitionPhase(
    state: TState,
    newPhase: GamePhase,
    reason: PhaseChangeContext['reason']
  ): void {
    const lobbyState = (state as any).__lobby as LobbyState;
    const oldPhase = lobbyState.phase;

    if (oldPhase === newPhase) return;

    lobbyState.phase = newPhase;

    if (newPhase === 'playing') {
      lobbyState.startedAt = Date.now();
      // Clear auto-start timeout
      if (this.lobbyTimeoutId) {
        clearTimeout(this.lobbyTimeoutId);
        this.lobbyTimeoutId = null;
      }
      // Lock room (prevent late joins if configured)
      if (!this.gameDef.lobby!.allowLateJoin) {
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
   * Check if lobby can transition to playing
   */
  private checkLobbyStartConditions(state: TState): void {
    const lobbyState = (state as any).__lobby as LobbyState;
    const lobbyConfig = this.gameDef.lobby!;

    if (lobbyState.phase !== 'lobby') return;

    const players = Object.values(lobbyState.players) as PlayerPresence[];
    const readyCount = players.filter(p => p.ready).length;

    // Auto-start conditions
    const hasMinPlayers = players.length >= lobbyConfig.minPlayers;
    const allReady = lobbyConfig.requireAllReady ? readyCount === players.length : true;

    if (hasMinPlayers && allReady) {
      this.transitionPhase(state, 'playing', 'all_ready');
    }
  }

  /**
   * Check if all players are ready
   */
  private allPlayersReady(state: TState): boolean {
    const lobbyState = (state as any).__lobby as LobbyState;
    const players = Object.values(lobbyState.players) as PlayerPresence[];
    return players.length > 0 && players.every(p => p.ready);
  }

  /**
   * Handle peer join with lobby presence
   */
  private handlePeerJoinWithLobby(peerId: string): void {
    const lobbyState = (this.state as any).__lobby as LobbyState;
    const lobbyConfig = this.gameDef.lobby!;

    // Check max players
    if (lobbyConfig.maxPlayers && Object.keys(lobbyState.players).length >= lobbyConfig.maxPlayers) {
      console.warn(`[Lobby] Max players (${lobbyConfig.maxPlayers}) reached, rejecting ${peerId}`);
      // TODO: Implement transport.reject(peerId) when available
      return;
    }

    // Check late join
    if (lobbyState.phase === 'playing' && !lobbyConfig.allowLateJoin) {
      console.warn(`[Lobby] Game in progress, late join disabled, rejecting ${peerId}`);
      // TODO: Implement transport.reject(peerId) when available
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
   * Handle peer leave with lobby cleanup
   */
  private handlePeerLeaveWithLobby(peerId: string): void {
    const lobbyState = (this.state as any).__lobby as LobbyState;

    // Remove player presence
    delete lobbyState.players[peerId];

    // Call user's onPlayerLeave
    if (this.gameDef.onPlayerLeave) {
      this.gameDef.onPlayerLeave(this.state, peerId);
    }

    // Check if game should end due to insufficient players
    const lobbyConfig = this.gameDef.lobby!;
    if (lobbyState.phase === 'playing') {
      const remaining = Object.keys(lobbyState.players).length;
      if (remaining < lobbyConfig.minPlayers) {
        this.transitionPhase(this.state, 'ended', 'player_left');
      }
    }
  }

  /**
   * Lock room (prevent new joins)
   */
  private lockRoom(): void {
    const transport = this.transport as any;
    if (typeof transport.lock === 'function') {
      transport.lock();
    } else {
      // Warn if lock not implemented
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Lobby] Transport does not implement lock() - late joins cannot be prevented');
      }
    }
  }

  /**
   * Start periodic lobby-transport reconciliation (HOST ONLY)
   *
   * Defense in depth: Periodically checks transport.getPeerIds() against lobby.players
   * and removes disconnected players. This handles edge cases where:
   * - WebRTC onPeerLeave doesn't fire (page refresh, browser crash)
   * - Health check hasn't detected timeout yet
   * - Network partitions or other anomalies
   *
   * Runs every 30 seconds (conservative interval to avoid spam)
   */
  private startLobbyReconciliation(): void {
    this.lobbyReconcileIntervalId = setInterval(() => {
      this.reconcileLobbyWithTransport();
    }, 30000); // 30 seconds
  }

  /**
   * Reconcile lobby players with transport peer list
   *
   * Removes players from lobby that are no longer connected according to transport.
   * This is the "source of truth" synchronization between transport layer and game layer.
   */
  private reconcileLobbyWithTransport(): void {
    if (!this.hasLobby || !this._isHost) return;

    const lobbyState = (this.state as any).__lobby as LobbyState;
    const transportPeers = new Set([
      this.transport.getPlayerId(),
      ...this.transport.getPeerIds()
    ]);

    let removedAny = false;

    // Remove players from lobby who aren't in transport's peer list
    for (const playerId in lobbyState.players) {
      if (!transportPeers.has(playerId)) {
        console.warn(`[GameRuntime] Reconciliation: Removing disconnected player ${playerId} from lobby`);
        delete lobbyState.players[playerId];
        removedAny = true;

        // Also remove from game state
        if (this.gameDef.onPlayerLeave) {
          this.gameDef.onPlayerLeave(this.state, playerId);
        }
      }
    }

    // Check if game should end due to insufficient players
    if (removedAny && lobbyState.phase === 'playing') {
      const lobbyConfig = this.gameDef.lobby!;
      const remaining = Object.keys(lobbyState.players).length;
      if (remaining < lobbyConfig.minPlayers) {
        this.transitionPhase(this.state, 'ended', 'player_left');
      }
    }

    if (removedAny) {
      this.notifyStateChange();
    }
  }
}
