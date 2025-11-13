/**
 * GameRuntime - Host-authoritative game state manager
 *
 * v2: Simplified, no determinism, no prediction, no rollback.
 * The host runs the game, clients mirror the state.
 */
import { generateDiff, applyPatch, deepClone } from './sync';
import { SeededRandom } from './SeededRandom';
export class GameRuntime {
    gameDef;
    transport;
    config;
    state = {};
    previousState = {};
    _isHost;
    syncIntervalId = null;
    unsubscribes = [];
    strict;
    actionCounter = 100000; // For seeding action random (start high to avoid LCG collisions)
    stateChangeCallbacks = [];
    eventCallbacks = new Map();
    constructor(gameDef, transport, config) {
        this.gameDef = gameDef;
        this.transport = transport;
        this.config = config;
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
        // Setup transport listeners
        this.setupTransport();
        // Start sync loop if host
        if (this._isHost) {
            const syncInterval = config.syncInterval || 50; // 20 FPS default
            this.syncIntervalId = setInterval(() => this.syncState(), syncInterval);
        }
    }
    /**
     * Get current state (read-only, typed)
     */
    getState() {
        return this.state;
    }
    /**
     * Check if this runtime is the host
     */
    isHost() {
        return this._isHost;
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
    submitAction(actionName, input, targetId) {
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
            }
            else {
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
            playerId, // Who called submitAction
            targetId: targetId || playerId, // Who is affected (defaults to caller)
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
     * Listen for state changes (typed)
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
            if (this._isHost) {
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
                if (!this._isHost) {
                    this.handleStateSync(msg.payload);
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
        const { actionName, input, context, actionSeed } = payload;
        if (!this.gameDef.actions) {
            this.handleError('No actions defined');
            return;
        }
        const action = this.gameDef.actions[actionName];
        if (!action) {
            const availableActions = Object.keys(this.gameDef.actions);
            this.handleError(`Unknown action from client: ${actionName}. Available: ${availableActions.join(', ')}`);
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
    handleEvent(senderId, payload) {
        const { eventName, payload: eventPayload } = payload;
        const callbacks = this.eventCallbacks.get(eventName) || [];
        for (const callback of callbacks) {
            callback(senderId, eventName, eventPayload);
        }
    }
    syncState() {
        if (!this._isHost)
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
    /**
     * Handle errors with strict mode support
     */
    handleError(message) {
        if (this.strict) {
            throw new Error(`[Martini] ${message}`);
        }
        else {
            console.warn(`[Martini] ${message}`);
        }
    }
    /**
     * Find closest string match (for typo suggestions)
     */
    findClosestMatch(input, options) {
        if (options.length === 0)
            return null;
        let minDistance = Infinity;
        let closest = null;
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
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++)
            dp[i][0] = i;
        for (let j = 0; j <= n; j++)
            dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
                else {
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1, // insertion
                    dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return dp[m][n];
    }
}
//# sourceMappingURL=GameRuntime.js.map