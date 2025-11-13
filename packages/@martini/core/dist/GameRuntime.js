/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import { generateDiff, applyPatch, deepClone } from './sync';
export class GameRuntime {
    gameDef;
    transport;
    config;
    state = {};
    previousState = {};
    isHost;
    syncIntervalId = null;
    unsubscribes = [];
    stateChangeCallbacks = [];
    eventCallbacks = new Map();
    constructor(gameDef, transport, config) {
        this.gameDef = gameDef;
        this.transport = transport;
        this.config = config;
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
    getState() {
        return this.state;
    }
    /**
     * Get transport (for adapters to check isHost, getPlayerId, etc)
     * @internal
     */
    getTransport() {
        return this.transport;
    }
    /**
     * Directly mutate state (for adapters only - bypasses actions)
     * Only the host should call this
     * @internal
     */
    mutateState(mutator) {
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
    submitAction(actionName, input, targetId) {
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
            playerId, // Who called submitAction
            targetId: targetId || playerId, // Who is affected (defaults to caller)
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
    broadcastEvent(eventName, payload) {
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
    onEvent(eventName, callback) {
        if (!this.eventCallbacks.has(eventName)) {
            this.eventCallbacks.set(eventName, []);
        }
        this.eventCallbacks.get(eventName).push(callback);
        return () => {
            const callbacks = this.eventCallbacks.get(eventName);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            }
        };
    }
    /**
     * Listen for state changes
     */
    onChange(callback) {
        this.stateChangeCallbacks.push(callback);
        return () => {
            const index = this.stateChangeCallbacks.indexOf(callback);
            if (index !== -1)
                this.stateChangeCallbacks.splice(index, 1);
        };
    }
    /**
     * Cleanup
     */
    destroy() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];
    }
    // ============================================================================
    // Private methods
    // ============================================================================
    setupTransport() {
        // Listen for incoming messages
        this.unsubscribes.push(this.transport.onMessage((msg, senderId) => {
            this.handleMessage(msg, senderId);
        }));
        // Listen for peer join
        this.unsubscribes.push(this.transport.onPeerJoin((peerId) => {
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
        }));
        // Listen for peer leave
        this.unsubscribes.push(this.transport.onPeerLeave((peerId) => {
            if (this.gameDef.onPlayerLeave) {
                this.gameDef.onPlayerLeave(this.state, peerId);
            }
        }));
    }
    handleMessage(msg, senderId) {
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
    handleStateSync(payload) {
        if (payload.fullState) {
            // Full state replacement
            this.state = payload.fullState;
            this.notifyStateChange();
        }
        else if (payload.patches) {
            // Apply patches
            for (const patch of payload.patches) {
                applyPatch(this.state, patch);
            }
            this.notifyStateChange();
        }
    }
    handleActionFromClient(payload) {
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
    handleEvent(senderId, payload) {
        const { eventName, payload: eventPayload } = payload;
        const callbacks = this.eventCallbacks.get(eventName) || [];
        for (const callback of callbacks) {
            callback(senderId, eventName, eventPayload);
        }
    }
    syncState() {
        if (!this.isHost)
            return;
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
    notifyStateChange() {
        for (const callback of this.stateChangeCallbacks) {
            callback(this.state);
        }
    }
}
//# sourceMappingURL=GameRuntime.js.map