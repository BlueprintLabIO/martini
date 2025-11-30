/**
 * LocalTransport - In-memory transport for same-page multiplayer
 *
 * Perfect for:
 * - Side-by-side demo instances on the same page
 * - Unit/integration testing
 * - Local development without network overhead
 *
 * All instances in the same room share messages instantly via an in-memory event bus.
 */
/**
 * Static registry of all local transport instances, grouped by room
 */
class LocalTransportRegistry {
    static rooms = new Map();
    static register(roomId, transport) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        const room = this.rooms.get(roomId);
        // Check if any existing peer has locked the room
        const isRoomLocked = Array.from(room).some(peer => peer.isRoomLocked());
        if (isRoomLocked) {
            console.warn(`[LocalTransport] Room ${roomId} is locked, rejecting new peer ${transport.playerId}`);
            // Don't add the transport to the room
            return;
        }
        room.add(transport);
        // Notify existing peers about the new peer
        for (const peer of room) {
            if (peer !== transport) {
                // Notify existing peer about new peer
                peer.notifyPeerJoin(transport.playerId);
                // Notify new peer about existing peer
                transport.notifyPeerJoin(peer.playerId);
            }
        }
    }
    static unregister(roomId, transport) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        // Check if the leaving peer is the host before removing
        const isLeavingPeerHost = transport.isHost();
        room.delete(transport);
        // Notify remaining peers about the disconnect
        for (const peer of room) {
            peer.notifyPeerLeave(transport.playerId, isLeavingPeerHost);
        }
        if (room.size === 0) {
            this.rooms.delete(roomId);
        }
    }
    static getPeers(roomId, excludeId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room).filter((t) => t.playerId !== excludeId);
    }
    static broadcast(roomId, message, senderId) {
        const peers = this.getPeers(roomId, senderId);
        for (const peer of peers) {
            peer.deliver(message, senderId);
        }
    }
    static unicast(roomId, message, senderId, targetId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const target = Array.from(room).find((p) => p.playerId === targetId);
        if (target) {
            target.deliver(message, senderId);
        }
    }
}
/**
 * Metrics implementation for LocalTransport
 * Tracks connection state, peer count, and message statistics
 */
class LocalTransportMetrics {
    transport;
    connectionState = 'disconnected';
    connectionChangeHandlers = [];
    messagesSent = 0;
    messagesReceived = 0;
    messagesErrored = 0;
    constructor(transport) {
        this.transport = transport;
        // LocalTransport is always "connected" since it's in-memory
        this.connectionState = 'connected';
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
    /** @internal - Called by LocalTransport when message is sent */
    trackMessageSent() {
        this.messagesSent++;
    }
    /** @internal - Called by LocalTransport when message is received */
    trackMessageReceived() {
        this.messagesReceived++;
    }
    /** @internal - Called by LocalTransport when message fails */
    trackMessageError() {
        this.messagesErrored++;
    }
    /** @internal - Called by LocalTransport when disconnecting */
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
export class LocalTransport {
    playerId;
    roomId;
    _isHost;
    metrics;
    messageHandlers = [];
    peerJoinHandlers = [];
    peerLeaveHandlers = [];
    hostDisconnectHandlers = [];
    isLocked = false;
    constructor(config) {
        this.roomId = config.roomId;
        this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
        this._isHost = config.isHost;
        // Initialize metrics
        this.metrics = new LocalTransportMetrics(this);
        // Register with the global registry
        LocalTransportRegistry.register(this.roomId, this);
    }
    send(message, targetId) {
        try {
            if (targetId) {
                // Unicast
                LocalTransportRegistry.unicast(this.roomId, message, this.playerId, targetId);
            }
            else {
                // Broadcast
                LocalTransportRegistry.broadcast(this.roomId, message, this.playerId);
            }
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
        return LocalTransportRegistry.getPeers(this.roomId, this.playerId).map((p) => p.playerId);
    }
    isHost() {
        return this._isHost;
    }
    /**
     * Lock the room - prevent new peers from joining
     * For LocalTransport, this is a simple flag check
     */
    lock() {
        this.isLocked = true;
    }
    disconnect() {
        this.metrics.setDisconnected();
        LocalTransportRegistry.unregister(this.roomId, this);
    }
    /**
     * Check if room is locked
     * @internal
     */
    isRoomLocked() {
        return this.isLocked;
    }
    // Internal methods called by the registry
    /** @internal */
    deliver(message, senderId) {
        this.metrics.trackMessageReceived();
        this.messageHandlers.forEach((h) => h(message, senderId));
    }
    /** @internal */
    notifyPeerJoin(peerId) {
        this.peerJoinHandlers.forEach((h) => h(peerId));
    }
    /** @internal */
    notifyPeerLeave(peerId, wasHost) {
        this.peerLeaveHandlers.forEach((h) => h(peerId));
        // If the leaving peer was the host, notify host disconnect handlers
        if (wasHost) {
            this.hostDisconnectHandlers.forEach((h) => h());
        }
    }
}
//# sourceMappingURL=LocalTransport.js.map