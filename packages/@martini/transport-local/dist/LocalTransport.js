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
        this.rooms.get(roomId).add(transport);
        // Notify existing peers about the new peer
        const room = this.rooms.get(roomId);
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
        room.delete(transport);
        // Notify remaining peers about the disconnect
        for (const peer of room) {
            peer.notifyPeerLeave(transport.playerId);
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
        const peers = this.getPeers(roomId, senderId);
        const target = peers.find((p) => p.playerId === targetId);
        if (target) {
            target.deliver(message, senderId);
        }
    }
}
export class LocalTransport {
    playerId;
    roomId;
    _isHost;
    messageHandlers = [];
    peerJoinHandlers = [];
    peerLeaveHandlers = [];
    hostDisconnectHandlers = [];
    constructor(config) {
        this.roomId = config.roomId;
        this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
        this._isHost = config.isHost;
        // Register with the global registry
        LocalTransportRegistry.register(this.roomId, this);
    }
    send(message, targetId) {
        if (targetId) {
            // Unicast
            LocalTransportRegistry.unicast(this.roomId, message, this.playerId, targetId);
        }
        else {
            // Broadcast
            LocalTransportRegistry.broadcast(this.roomId, message, this.playerId);
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
    disconnect() {
        LocalTransportRegistry.unregister(this.roomId, this);
    }
    // Internal methods called by the registry
    /** @internal */
    deliver(message, senderId) {
        this.messageHandlers.forEach((h) => h(message, senderId));
    }
    /** @internal */
    notifyPeerJoin(peerId) {
        this.peerJoinHandlers.forEach((h) => h(peerId));
    }
    /** @internal */
    notifyPeerLeave(peerId) {
        this.peerLeaveHandlers.forEach((h) => h(peerId));
        // If the leaving peer was the host, notify host disconnect handlers
        const peers = LocalTransportRegistry.getPeers(this.roomId, this.playerId);
        const leavingPeer = peers.find((p) => p.playerId === peerId);
        if (leavingPeer && leavingPeer.isHost()) {
            this.hostDisconnectHandlers.forEach((h) => h());
        }
    }
}
//# sourceMappingURL=LocalTransport.js.map