/**
 * IframeBridgeRelay - Parent window coordinator for iframe-based multiplayer
 *
 * Runs in the parent window and relays messages between sandboxed iframes.
 * Acts as a message hub - receives messages from one iframe and forwards to others.
 *
 * @example
 * ```typescript
 * // In parent window (IDE component)
 * const relay = new IframeBridgeRelay();
 *
 * // When iframes are created
 * relay.registerIframe('host-player-123', hostIframeElement);
 * relay.registerIframe('client-player-456', clientIframeElement);
 *
 * // Cleanup when done
 * relay.destroy();
 * ```
 */
export class IframeBridgeRelay {
    constructor() {
        this.peers = new Map();
        this.rooms = new Map(); // roomId → Set<playerId>
        this.messageHandler = null;
        this.setupMessageListener();
    }
    /**
     * Set up listener for messages from iframes
     */
    setupMessageListener() {
        this.messageHandler = (event) => {
            const data = event.data;
            // Ignore non-bridge messages
            if (!data || !data.type || !data.type.startsWith('BRIDGE_')) {
                return;
            }
            switch (data.type) {
                case 'BRIDGE_REGISTER':
                    this.handleRegister(data, event.source);
                    break;
                case 'BRIDGE_SEND':
                    this.handleSend(data);
                    break;
                case 'BRIDGE_PEER_LEAVE':
                    this.handlePeerLeave(data);
                    break;
            }
        };
        window.addEventListener('message', this.messageHandler);
    }
    /**
     * Handle peer registration
     */
    handleRegister(data, source) {
        const { playerId, roomId } = data;
        // Find the iframe that sent this message
        const iframe = Array.from(document.querySelectorAll('iframe')).find((iframe) => iframe.contentWindow === source);
        if (!iframe) {
            console.warn('[IframeBridgeRelay] Could not find iframe for registration:', playerId);
            return;
        }
        // Determine if this is the host (first peer in room)
        const room = this.rooms.get(roomId);
        const isHost = !room || room.size === 0;
        // Register peer
        this.peers.set(playerId, {
            playerId,
            roomId,
            iframe,
            isHost
        });
        // Add to room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(playerId);
        // Notify existing peers about new peer
        const existingPeers = this.getPeersInRoom(roomId).filter(p => p.playerId !== playerId);
        for (const peer of existingPeers) {
            this.sendToIframe(peer.iframe, {
                type: 'BRIDGE_PEER_JOIN',
                roomId,
                playerId: peer.playerId,
                payload: { peerId: playerId }
            });
        }
        // Notify new peer about existing peers
        for (const peer of existingPeers) {
            this.sendToIframe(iframe, {
                type: 'BRIDGE_PEER_JOIN',
                roomId,
                playerId,
                payload: { peerId: peer.playerId }
            });
        }
    }
    /**
     * Handle message send from a peer
     */
    handleSend(data) {
        const { playerId, roomId, payload } = data;
        if (!payload?.message) {
            console.warn('[IframeBridgeRelay] No message in BRIDGE_SEND');
            return;
        }
        const sender = this.peers.get(playerId);
        if (!sender) {
            console.warn('[IframeBridgeRelay] Unknown sender:', playerId);
            return;
        }
        // Get target peer(s)
        const targets = payload.targetId
            ? [this.peers.get(payload.targetId)].filter(Boolean)
            : this.getPeersInRoom(roomId).filter(p => p.playerId !== playerId);
        // Deliver message to target(s)
        for (const target of targets) {
            this.sendToIframe(target.iframe, {
                type: 'BRIDGE_DELIVER',
                roomId,
                playerId, // Original sender ID
                payload: { message: payload.message }
            });
        }
    }
    /**
     * Handle peer leaving
     */
    handlePeerLeave(data) {
        const { playerId, roomId, payload } = data;
        const peer = this.peers.get(playerId);
        if (!peer)
            return;
        // Remove from tracking
        this.peers.delete(playerId);
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(playerId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
        console.log(`[IframeBridgeRelay] Peer ${playerId} left room ${roomId}`);
        // Notify remaining peers
        const remainingPeers = this.getPeersInRoom(roomId);
        for (const otherPeer of remainingPeers) {
            this.sendToIframe(otherPeer.iframe, {
                type: 'BRIDGE_PEER_LEAVE',
                roomId,
                playerId: otherPeer.playerId,
                payload: {
                    peerId: playerId,
                    wasHost: payload?.wasHost || false
                }
            });
        }
        // If host left, notify about host disconnect
        if (peer.isHost) {
            for (const otherPeer of remainingPeers) {
                this.sendToIframe(otherPeer.iframe, {
                    type: 'BRIDGE_HOST_DISCONNECT',
                    roomId,
                    playerId: otherPeer.playerId,
                    payload: { wasHost: true }
                });
            }
        }
    }
    /**
     * Get all peers in a room
     */
    getPeersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room)
            .map(playerId => this.peers.get(playerId))
            .filter(Boolean);
    }
    /**
     * Send message to an iframe
     */
    sendToIframe(iframe, message) {
        if (!iframe.contentWindow) {
            console.warn('[IframeBridgeRelay] Iframe has no contentWindow');
            return;
        }
        iframe.contentWindow.postMessage(message, '*');
    }
    /**
     * Manually register an iframe (useful for testing or explicit control)
     */
    registerIframe(playerId, roomId, iframe, isHost) {
        this.peers.set(playerId, {
            playerId,
            roomId,
            iframe,
            isHost
        });
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(playerId);
        console.log(`[IframeBridgeRelay] Manually registered ${playerId} in ${roomId}`);
    }
    /**
     * Get info about registered peers
     */
    getPeers() {
        return Array.from(this.peers.values());
    }
    /**
     * Get peers in a specific room
     */
    getPeersInRoomById(roomId) {
        return this.getPeersInRoom(roomId);
    }
    /**
     * Clean up
     */
    destroy() {
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }
        this.peers.clear();
        this.rooms.clear();
    }
}
//# sourceMappingURL=IframeBridgeRelay.js.map