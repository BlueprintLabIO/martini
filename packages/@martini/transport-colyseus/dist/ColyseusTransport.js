/**
 * ColyseusTransport - Colyseus room adapter for @martini/core
 *
 * Wraps a Colyseus Room to work with Martini's Transport interface.
 * Allows you to use Colyseus for matchmaking/rooms while using Martini for game logic.
 *
 * Features:
 * - Automatic message routing through Colyseus room
 * - Peer tracking via server messages
 * - Host election support
 * - Error handling and room lifecycle management
 *
 * Usage:
 * ```ts
 * import { Client } from 'colyseus.js';
 * import { ColyseusTransport } from '@martini/transport-colyseus';
 *
 * const client = new Client('ws://localhost:2567');
 * const room = await client.joinOrCreate('my_room');
 * const transport = new ColyseusTransport(room);
 * ```
 */
export class ColyseusTransport {
    constructor(room) {
        this.connectedPeers = new Set();
        this.currentHost = null;
        this.messageHandlers = [];
        this.peerJoinHandlers = [];
        this.peerLeaveHandlers = [];
        this.errorHandlers = [];
        this.room = room;
        this.playerId = room.sessionId;
        this.setupMessageHandlers();
        this.setupErrorHandlers();
    }
    setupMessageHandlers() {
        // Listen for all Martini messages on the 'martini' channel
        this.room.onMessage('martini', (message) => {
            this.handleMessage(message);
        });
    }
    setupErrorHandlers() {
        // Handle room errors
        this.room.onError((code, message) => {
            const error = new Error(`Colyseus room error (${code}): ${message || 'Unknown error'}`);
            this.notifyError(error);
        });
        // Handle room leave
        this.room.onLeave((code) => {
            const error = new Error(`Left Colyseus room (code: ${code || 'unknown'})`);
            this.notifyError(error);
        });
    }
    handleMessage(data) {
        const { type, senderId, payload, hostId, targetId } = data;
        // Ignore our own messages
        if (senderId === this.playerId) {
            return;
        }
        // Handle control messages
        switch (type) {
            case 'player_join':
                if (payload?.playerId && payload.playerId !== this.playerId) {
                    this.connectedPeers.add(payload.playerId);
                    this.notifyPeerJoin(payload.playerId);
                }
                break;
            case 'player_leave':
                if (payload?.playerId) {
                    this.connectedPeers.delete(payload.playerId);
                    this.notifyPeerLeave(payload.playerId);
                }
                break;
            case 'host_announce':
                this.currentHost = hostId;
                break;
            case 'peers_list':
                // Server sends list of all connected peers
                if (payload?.peers) {
                    this.connectedPeers.clear();
                    payload.peers.forEach((peerId) => {
                        if (peerId !== this.playerId) {
                            this.connectedPeers.add(peerId);
                        }
                    });
                }
                break;
        }
        // Notify message handlers for all messages (including control messages)
        this.notifyMessage(data, senderId || 'server');
    }
    notifyMessage(message, senderId) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(message, senderId);
            }
            catch (error) {
                this.notifyError(error);
            }
        });
    }
    notifyPeerJoin(peerId) {
        this.peerJoinHandlers.forEach(handler => handler(peerId));
    }
    notifyPeerLeave(peerId) {
        this.peerLeaveHandlers.forEach(handler => handler(peerId));
    }
    notifyError(error) {
        this.errorHandlers.forEach(handler => handler(error));
    }
    // ============================================================================
    // Transport Interface Implementation
    // ============================================================================
    send(message, targetId) {
        const envelope = {
            ...message,
            senderId: this.playerId,
            ...(targetId && { targetId })
        };
        this.room.send('martini', envelope);
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
        return () => {
            const index = this.messageHandlers.indexOf(handler);
            if (index >= 0) {
                this.messageHandlers.splice(index, 1);
            }
        };
    }
    onPeerJoin(handler) {
        this.peerJoinHandlers.push(handler);
        return () => {
            const index = this.peerJoinHandlers.indexOf(handler);
            if (index >= 0) {
                this.peerJoinHandlers.splice(index, 1);
            }
        };
    }
    onPeerLeave(handler) {
        this.peerLeaveHandlers.push(handler);
        return () => {
            const index = this.peerLeaveHandlers.indexOf(handler);
            if (index >= 0) {
                this.peerLeaveHandlers.splice(index, 1);
            }
        };
    }
    getPlayerId() {
        return this.playerId;
    }
    getPeerIds() {
        return Array.from(this.connectedPeers);
    }
    isHost() {
        return this.currentHost === this.playerId;
    }
    // ============================================================================
    // Additional Methods
    // ============================================================================
    /**
     * Listen for errors
     */
    onError(handler) {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index >= 0) {
                this.errorHandlers.splice(index, 1);
            }
        };
    }
    /**
     * Leave the Colyseus room and clean up
     */
    disconnect() {
        this.room.leave();
        // Clear all handlers
        this.messageHandlers = [];
        this.peerJoinHandlers = [];
        this.peerLeaveHandlers = [];
        this.errorHandlers = [];
    }
    /**
     * Get the underlying Colyseus room (for advanced use cases)
     */
    getRoom() {
        return this.room;
    }
}
