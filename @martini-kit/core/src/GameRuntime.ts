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
   */
  async waitForPlayers(minPlayers: number, options: { timeoutMs?: number; includeSelf?: boolean } = {}): Promise<void> {
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
        if (this.gameDef.onPlayerJoin) {
          this.gameDef.onPlayerJoin(this.state, peerId);
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
        if (this.gameDef.onPlayerLeave) {
          this.gameDef.onPlayerLeave(this.state, peerId);
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
}
