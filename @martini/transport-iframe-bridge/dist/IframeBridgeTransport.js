/**
 * IframeBridgeTransport - Iframe-based transport for sandboxed multiplayer
 *
 * Perfect for:
 * - IDE dual-view local testing (sandboxed iframes)
 * - Any scenario where peers are in separate sandboxed iframes
 * - Testing with iframe isolation
 *
 * Architecture:
 * - Parent window runs IframeBridgeRelay (message hub)
 * - Each iframe has IframeBridgeTransport instance
 * - Messages flow: iframe → parent relay → other iframes
 *
 * @example
 * ```typescript
 * // In parent window
 * const relay = new IframeBridgeRelay();
 * relay.registerIframe('host', hostIframe);
 * relay.registerIframe('client', clientIframe);
 *
 * // In host iframe
 * const transport = new IframeBridgeTransport({ roomId: 'room-1', isHost: true });
 *
 * // In client iframe
 * const transport = new IframeBridgeTransport({ roomId: 'room-1', isHost: false });
 * ```
 */
/**
 * Metrics implementation for IframeBridgeTransport
 */
class IframeBridgeTransportMetrics {
    constructor(transport) {
        this.transport = transport;
        this.connectionState = 'connecting';
        this.connectionChangeHandlers = [];
        this.messagesSent = 0;
        this.messagesReceived = 0;
        this.messagesErrored = 0;
        // Start as 'connecting', will change to 'connected' when relay responds
    }
    getConnectionState() {
        return this.connectionState;
    }
    onConnectionChange(callback) {
        this.connectionChangeHandlers.push(callback);
        return () => {
            const idx = this.connectionChangeHandlers.indexOf(callback);
            if (idx >= 0)
                this.connectionChangeHandlers.splice(idx, 1);
        };
    }
    getPeerCount() {
        return this.transport.getPeerIds().length;
    }
    getMessageStats() {
        return {
            sent: this.messagesSent,
            received: this.messagesReceived,
            errors: this.messagesErrored
        };
    }
    resetStats() {
        this.messagesSent = 0;
        this.messagesReceived = 0;
        this.messagesErrored = 0;
    }
    /** @internal */
    trackMessageSent() {
        this.messagesSent++;
    }
    /** @internal */
    trackMessageReceived() {
        this.messagesReceived++;
    }
    /** @internal */
    trackMessageError() {
        this.messagesErrored++;
    }
    /** @internal */
    setConnected() {
        if (this.connectionState !== 'connected') {
            this.connectionState = 'connected';
            this.notifyConnectionChange();
        }
    }
    /** @internal */
    setDisconnected() {
        if (this.connectionState !== 'disconnected') {
            this.connectionState = 'disconnected';
            this.notifyConnectionChange();
        }
    }
    notifyConnectionChange() {
        this.connectionChangeHandlers.forEach(h => {
            try {
                h(this.connectionState);
            }
            catch (error) {
                console.error('Error in connection change handler:', error);
            }
        });
    }
}
export class IframeBridgeTransport {
    constructor(config) {
        this.HEARTBEAT_INTERVAL_MS = 3000;
        this.messageHandlers = [];
        this.peerJoinHandlers = [];
        this.peerLeaveHandlers = [];
        this.hostDisconnectHandlers = [];
        this.peerIds = new Set();
        this.messageHandler = null;
        this.isDisconnected = false;
        this.heartbeatInterval = null;
        // Transport lifecycle guardrail: Prevent double-initialization
        // This catches bugs where transport is created multiple times without cleanup
        if (typeof globalThis !== 'undefined' && globalThis.__martini-kit_TRANSPORT__) {
            throw new Error('[IframeBridgeTransport] Transport already exists! ' +
                'Did you forget to call disconnect() before creating a new transport? ' +
                'Each iframe should only have ONE transport instance. ' +
                'If you see this error, check for: ' +
                '1. Multiple initializeGame() calls without cleanup ' +
                '2. Hot reload without proper transport.disconnect() ' +
                '3. Navigation without cleanup (should be handled by beforeunload)');
        }
        this.roomId = config.roomId;
        this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
        this._isHost = config.isHost;
        // Initialize metrics
        this.metrics = new IframeBridgeTransportMetrics(this);
        // Register this transport globally for guardrail
        if (typeof globalThis !== 'undefined') {
            globalThis.__martini-kit_TRANSPORT__ = this;
        }
        this.setupMessageListener();
        this.registerWithRelay();
        this.startHeartbeat();
        this.setupVisibilityListener();
    }
    /**
     * Set up listener for messages from parent relay
     */
    setupMessageListener() {
        this.messageHandler = (event) => {
            const data = event.data;
            // Ignore messages not from our relay system
            if (!data || !data.type || !data.type.startsWith('BRIDGE_')) {
                return;
            }
            // Ignore messages for other rooms
            if (data.roomId !== this.roomId) {
                return;
            }
            switch (data.type) {
                case 'BRIDGE_DELIVER':
                    // Received message from another peer
                    if (data.payload?.message && data.playerId !== this.playerId) {
                        this.metrics.trackMessageReceived();
                        this.messageHandlers.forEach(h => h(data.payload.message, data.playerId));
                    }
                    break;
                case 'BRIDGE_PEER_JOIN':
                    // Another peer joined the room
                    if (data.payload?.peerId && data.payload.peerId !== this.playerId) {
                        this.peerIds.add(data.payload.peerId);
                        this.metrics.setConnected(); // Mark as connected when first peer joins
                        this.peerJoinHandlers.forEach(h => h(data.payload.peerId));
                    }
                    break;
                case 'BRIDGE_PEER_LEAVE':
                    // Another peer left the room
                    if (data.payload?.peerId) {
                        this.peerIds.delete(data.payload.peerId);
                        this.peerLeaveHandlers.forEach(h => h(data.payload.peerId));
                    }
                    break;
                case 'BRIDGE_HOST_DISCONNECT':
                    // Host disconnected
                    if (data.payload?.wasHost && !this._isHost) {
                        this.hostDisconnectHandlers.forEach(h => h());
                    }
                    break;
                case 'BRIDGE_ERROR':
                    // Relay rejected our message (e.g., unknown sender after timeout)
                    // Auto-reconnect to re-establish connection
                    console.warn('[IframeBridgeTransport] Relay error, reconnecting...', data.payload?.error);
                    this.registerWithRelay();
                    this.sendHeartbeat();
                    break;
            }
        };
        window.addEventListener('message', this.messageHandler);
    }
    /**
     * Register this transport instance with parent relay
     */
    registerWithRelay() {
        if (!window.parent || window.parent === window) {
            console.warn('[IframeBridgeTransport] No parent window found - transport may not work');
            return;
        }
        const registerMessage = {
            type: 'BRIDGE_REGISTER',
            roomId: this.roomId,
            playerId: this.playerId,
            payload: {}
        };
        window.parent.postMessage(registerMessage, '*');
    }
    /**
     * Send periodic heartbeat to relay
     */
    sendHeartbeat() {
        if (this.isDisconnected)
            return;
        if (!window.parent || window.parent === window)
            return;
        const heartbeat = {
            type: 'BRIDGE_HEARTBEAT',
            roomId: this.roomId,
            playerId: this.playerId
        };
        window.parent.postMessage(heartbeat, '*');
    }
    startHeartbeat() {
        if (typeof window === 'undefined')
            return;
        this.stopHeartbeat();
        this.sendHeartbeat();
        this.heartbeatInterval = window.setInterval(() => this.sendHeartbeat(), this.HEARTBEAT_INTERVAL_MS);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    setupVisibilityListener() {
        if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
            return;
        }
        this.visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                this.registerWithRelay();
                this.sendHeartbeat();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    /**
     * Send message to peer(s)
     */
    send(message, targetId) {
        if (this.isDisconnected) {
            console.warn('[IframeBridgeTransport] Cannot send - transport is disconnected');
            this.metrics.trackMessageError();
            return;
        }
        if (!window.parent || window.parent === window) {
            console.warn('[IframeBridgeTransport] No parent window - message not sent');
            this.metrics.trackMessageError();
            return;
        }
        try {
            const bridgeMessage = {
                type: 'BRIDGE_SEND',
                roomId: this.roomId,
                playerId: this.playerId,
                payload: {
                    message,
                    targetId
                }
            };
            window.parent.postMessage(bridgeMessage, '*');
            this.metrics.trackMessageSent();
        }
        catch (error) {
            this.metrics.trackMessageError();
            throw error;
        }
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
        return () => {
            const idx = this.messageHandlers.indexOf(handler);
            if (idx >= 0)
                this.messageHandlers.splice(idx, 1);
        };
    }
    onPeerJoin(handler) {
        this.peerJoinHandlers.push(handler);
        return () => {
            const idx = this.peerJoinHandlers.indexOf(handler);
            if (idx >= 0)
                this.peerJoinHandlers.splice(idx, 1);
        };
    }
    onPeerLeave(handler) {
        this.peerLeaveHandlers.push(handler);
        return () => {
            const idx = this.peerLeaveHandlers.indexOf(handler);
            if (idx >= 0)
                this.peerLeaveHandlers.splice(idx, 1);
        };
    }
    onHostDisconnect(handler) {
        this.hostDisconnectHandlers.push(handler);
        return () => {
            const idx = this.hostDisconnectHandlers.indexOf(handler);
            if (idx >= 0)
                this.hostDisconnectHandlers.splice(idx, 1);
        };
    }
    getPlayerId() {
        return this.playerId;
    }
    getPeerIds() {
        return Array.from(this.peerIds);
    }
    isHost() {
        return this._isHost;
    }
    disconnect() {
        if (this.isDisconnected)
            return;
        this.metrics.setDisconnected();
        this.isDisconnected = true;
        this.stopHeartbeat();
        // Clear global transport reference to allow new instances
        if (typeof globalThis !== 'undefined' && globalThis.__martini-kit_TRANSPORT__ === this) {
            delete globalThis.__martini-kit_TRANSPORT__;
        }
        // Notify relay
        if (window.parent && window.parent !== window) {
            const disconnectMessage = {
                type: 'BRIDGE_PEER_LEAVE',
                roomId: this.roomId,
                playerId: this.playerId,
                payload: {
                    peerId: this.playerId,
                    wasHost: this._isHost
                }
            };
            window.parent.postMessage(disconnectMessage, '*');
        }
        // Clean up
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }
        this.messageHandlers = [];
        this.peerJoinHandlers = [];
        this.peerLeaveHandlers = [];
        this.hostDisconnectHandlers = [];
        this.peerIds.clear();
        if (this.visibilityHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = undefined;
        }
    }
}
//# sourceMappingURL=IframeBridgeTransport.js.map