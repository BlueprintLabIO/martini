/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */

import type { GameDefinition } from './defineGame';
import type { Transport, WireMessage, RuntimeConfig } from './transport';
import { generateDiff, applyPatch, deepClone, type Patch } from './sync';

type StateChangeCallback = (state: any) => void;
type EventCallback = (senderId: string, eventName: string, payload: any) => void;

export class GameRuntime {
  private state: any = {};
  private previousState: any = {};
  private isHost: boolean;
  private syncIntervalId: any = null;
  private unsubscribes: Array<() => void> = [];

  private stateChangeCallbacks: StateChangeCallback[] = [];
  private eventCallbacks: Map<string, EventCallback[]> = new Map();

  constructor(
    private gameDef: GameDefinition,
    private transport: Transport,
    private config: RuntimeConfig
  ) {
    this.isHost = config.isHost;

    // Initialize state
    const initialPlayerIds = config.playerIds || [];
    if (gameDef.setup) {
      this.state = gameDef.setup({ playerIds: initialPlayerIds });
    }
    this.previousState = deepClone(this.state);

    // Setup transport listeners
    this.setupTransport();

    // Start sync loop if host
    if (this.isHost) {
      const syncInterval = config.syncInterval || 50; // 20 FPS default
      this.syncIntervalId = setInterval(() => this.syncState(), syncInterval);
    }
  }

  /**
   * Get current state (read-only)
   */
  getState(): any {
    return this.state;
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
  mutateState(mutator: (state: any) => void): void {
    if (!this.isHost) {
      console.warn('mutateState called on non-host - ignoring');
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
      console.warn('No actions defined in game');
      return;
    }

    const action = this.gameDef.actions[actionName];
    if (!action) {
      console.warn(`Action "${actionName}" not found`);
      return;
    }

    const playerId = this.transport.getPlayerId();
    const context = {
      playerId,                          // Who called submitAction
      targetId: targetId || playerId,    // Who is affected (defaults to caller)
      isHost: this.isHost
    };

    // If we're the host, apply immediately
    if (this.isHost) {
      action.apply(this.state, context, input);
      this.notifyStateChange();
    }

    // Broadcast action to all peers
    this.transport.send({
      type: 'action',
      payload: { actionName, input, context },
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
   * Listen for state changes
   */
  onChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index !== -1) this.stateChangeCallbacks.splice(index, 1);
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
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
        if (this.isHost) {
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
        if (!this.isHost) {
          this.handleStateSync(msg.payload);
        }
        break;

      case 'action':
        // Only host processes actions from clients
        if (this.isHost && senderId !== this.transport.getPlayerId()) {
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
      // Full state replacement
      this.state = payload.fullState;
      this.notifyStateChange();
    } else if (payload.patches) {
      // Apply patches
      for (const patch of payload.patches) {
        applyPatch(this.state, patch);
      }
      this.notifyStateChange();
    }
  }

  private handleActionFromClient(payload: any): void {
    const { actionName, input, context } = payload;

    if (!this.gameDef.actions) {
      console.warn('No actions defined');
      return;
    }

    const action = this.gameDef.actions[actionName];
    if (!action) {
      console.warn(`Unknown action from client: ${actionName}`);
      return;
    }

    // Apply action to state with context
    action.apply(this.state, context, input);
    this.notifyStateChange();
  }

  private handleEvent(senderId: string, payload: any): void {
    const { eventName, payload: eventPayload } = payload;
    const callbacks = this.eventCallbacks.get(eventName) || [];

    for (const callback of callbacks) {
      callback(senderId, eventName, eventPayload);
    }
  }

  private syncState(): void {
    if (!this.isHost) return;

    // Generate diff
    const patches = generateDiff(this.previousState, this.state);

    if (patches.length > 0) {
      // Broadcast patches to all clients
      this.transport.send({
        type: 'state_sync',
        payload: { patches }
      });

      // Update previous state
      this.previousState = deepClone(this.state);
    }
  }

  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      callback(this.state);
    }
  }
}
