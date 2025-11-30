/**
 * TrysteroTransport - P2P WebRTC transport adapter using Trystero
 *
 * Implements the Transport interface for serverless P2P multiplayer.
 *
 * Features:
 * - Zero server costs (fully P2P)
 * - Sticky host pattern (first peer = permanent host)
 * - Game ends if host disconnects (simple, predictable)
 * - Reliable message delivery via Trystero
 *
 * Host Selection:
 * - First peer to join room becomes permanent host
 * - Host status never changes during game session
 * - If host leaves, all clients are notified (game should end)
 */
import { joinRoom, selfId } from 'trystero/mqtt';
/**
 * Trystero-based P2P transport implementation
 *
 * @example
 * ```typescript
 * const transport = new TrysteroTransport({
 *   roomId: 'game-room-123',
 *   appId: 'my-game'
 * });
 *
 * const runtime = createMultiplayerRuntime(gameLogic, transport, {
 *   isHost: transport.isHost()
 * });
 * ```
 */
export class TrysteroTransport {
    constructor(options) {
        this.messageHandlers = [];
        this.peerJoinHandlers = [];
        this.peerLeaveHandlers = [];
        this.connectionChangeHandlers = [];
        this.errorHandlers = [];
        this.hostDisconnectHandlers = [];
        this.permanentHost = null; // Set once, never changes
        this.connectionState = 'connecting';
        this.peers = new Set();
        this.hadRemotePeers = false;
        this.readyResolve = null;
        // Health check for detecting stale/zombie connections
        this.peerLastSeen = new Map();
        this.healthCheckInterval = null;
        this.HEALTH_CHECK_INTERVAL = 5000; // Ping every 5 seconds
        this.PEER_TIMEOUT = 15000; // Timeout after 15 seconds of no response
        const { roomId, appId = 'martini-kit-game', rtcConfig = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }, relayUrls, isHost } = options;
        // Store explicit host mode
        this.explicitHostMode = isHost;
        // Explicit host mode (industry standard: separate host/join URLs)
        if (isHost === true) {
            this.permanentHost = selfId;
            console.log('[TrysteroTransport] Explicit host mode - I am the host:', selfId);
        }
        else if (isHost === false) {
            // Client mode - waiting for host, NEVER auto-elect
            console.log('[TrysteroTransport] Explicit client mode - will NEVER become host');
        }
        // else: undefined = automatic election
        // Join room via Trystero (using MQTT for signaling)
        const trysteroConfig = {
            appId,
            rtcConfig,
            // Default to HiveMQ broker (more reliable than mosquitto/emqx)
            // Users can override with relayUrls option
            relayUrls: relayUrls || ['wss://broker.hivemq.com:8884/mqtt']
        };
        this.room = joinRoom(trysteroConfig, roomId);
        // Setup wire message channel
        const [send, receive] = this.room.makeAction('wire');
        this.sendWire = send;
        // Listen for incoming messages
        const cleanup = receive((message, peerId) => {
            // Update last seen timestamp for health check
            this.peerLastSeen.set(peerId, Date.now());
            // Handle health check ping/pong
            if ('type' in message && message.type === 'health_ping') {
                // Respond to ping with pong
                this.send({
                    type: 'health_pong',
                    timestamp: Date.now()
                }, peerId);
                return; // Don't propagate ping to game logic
            }
            if ('type' in message && message.type === 'health_pong') {
                // Pong received - peer is alive (already updated lastSeen above)
                return; // Don't propagate pong to game logic
            }
            // Handle host discovery protocol
            if ('type' in message && message.type === 'host_query') {
                // Someone is asking who the host is
                if (this.permanentHost === selfId) {
                    // I'm the host, announce myself
                    console.log('[TrysteroTransport] Received host query, announcing myself as host');
                    this.send({
                        type: 'host_announce',
                        hostId: selfId,
                        timestamp: Date.now()
                    });
                }
            }
            if ('type' in message && message.type === 'host_announce') {
                // Someone announced they're the host
                const announcedHost = message.hostId;
                if (this.permanentHost === null) {
                    console.log('[TrysteroTransport] Discovered existing host:', announcedHost);
                    this.permanentHost = announcedHost;
                    // Resolve waitForReady if waiting
                    if (this.readyResolve) {
                        this.readyResolve();
                        this.readyResolve = null;
                    }
                }
                else if (this.permanentHost !== announcedHost) {
                    // Conflict! Use deterministic tiebreaker (alphabetically lowest ID wins)
                    const allKnownPeers = [selfId, announcedHost, ...Array.from(this.peers)].sort();
                    const correctHost = allKnownPeers[0];
                    if (this.permanentHost !== correctHost) {
                        console.log('[TrysteroTransport] Host conflict detected! Correcting:', this.permanentHost, '->', correctHost);
                        this.permanentHost = correctHost;
                    }
                }
            }
            // Track host from heartbeat messages
            if ('type' in message && message.type === 'heartbeat') {
                if (this.permanentHost !== message.sessionId) {
                    this.permanentHost = message.sessionId || null;
                }
            }
            // Handle host migration
            if ('type' in message && message.type === 'host_migration') {
                this.permanentHost = message.newHost || null;
            }
            // Notify all registered handlers
            this.messageHandlers.forEach((handler) => {
                try {
                    handler(message, peerId);
                }
                catch (error) {
                    console.error('[TrysteroTransport] Message handler error:', error);
                    this.notifyError(error);
                }
            });
        });
        this.receiveWireCleanup = typeof cleanup === 'function' ? cleanup : () => { };
        // Setup peer join/leave listeners
        this.room.onPeerJoin((peerId) => {
            this.peers.add(peerId);
            this.peerLastSeen.set(peerId, Date.now()); // Initialize health check timestamp
            // STICKY HOST: Only set host if not already set AND not in explicit client mode
            if (this.permanentHost === null) {
                // If explicit client mode (isHost: false), discover host from peer
                if (this.explicitHostMode === false) {
                    // In client mode, the peer we joined is the host
                    this.permanentHost = peerId;
                    console.log('[TrysteroTransport] Client mode: discovered host is', peerId);
                }
                // If explicit host mode or auto mode, use alphabetical election
                else {
                    const allPeers = [selfId, ...Array.from(this.peers)].sort();
                    this.permanentHost = allPeers[0];
                    console.log('[TrysteroTransport] Host elected:', this.permanentHost);
                }
            }
            console.log('[TrysteroTransport] Peer joined:', peerId, 'Host:', this.permanentHost, 'Am I host?', this.isHost());
            // Signal ready if waiting
            if (this.readyResolve) {
                this.readyResolve();
                this.readyResolve = null;
            }
            this.updateConnectionState();
            this.peerJoinHandlers.forEach((handler) => handler(peerId));
        });
        this.room.onPeerLeave((peerId) => {
            this.peers.delete(peerId);
            this.peerLastSeen.delete(peerId); // Clean up health check timestamp
            this.updateConnectionState();
            // STICKY HOST: If host disconnects, notify and do NOT migrate
            if (peerId === this.permanentHost) {
                console.log('[TrysteroTransport] HOST DISCONNECTED - Game should end!');
                this.hostDisconnectHandlers.forEach((handler) => handler());
            }
            this.peerLeaveHandlers.forEach((handler) => handler(peerId));
        });
        // Initialize peers from room
        // NOTE: This is usually empty on fresh join because WebRTC connections
        // haven't been established yet. getPeers() returns actual WebRTC connections,
        // not "potential" peers in the room.
        const initialPeers = this.room.getPeers();
        const peerArray = Array.isArray(initialPeers) ? initialPeers : Object.keys(initialPeers);
        this.peers = new Set(peerArray);
        // IMPORTANT: Don't set host here! getPeers() is empty on initial join
        // because WebRTC handshake hasn't completed yet. Both tabs would see
        // empty peers and both would become host.
        //
        // Instead, host election happens in onPeerJoin() or waitForReady() timeout.
        this.updateConnectionState();
        // Start health check system to detect zombie/stale connections
        this.startHealthCheck();
        console.log('[TrysteroTransport] Initialized:', {
            selfId,
            initialPeers: peerArray.length,
            permanentHost: this.permanentHost,
            note: 'Host election pending - waiting for peer discovery or timeout'
        });
    }
    // ============================================================================
    // Transport Interface Implementation
    // ============================================================================
    /**
     * Send message to specific peer or broadcast to all
     */
    send(message, targetId) {
        try {
            if (targetId) {
                // Unicast to specific peer
                this.sendWire(message, targetId);
            }
            else {
                // Broadcast to all peers
                this.sendWire(message);
            }
        }
        catch (error) {
            console.error('[TrysteroTransport] Send error:', error);
            this.notifyError(error);
        }
    }
    /**
     * Inject message directly (used by server-style adapters)
     */
    deliver(message, senderId) {
        this.messageHandlers.forEach((handler) => {
            try {
                handler(message, senderId);
            }
            catch (error) {
                console.error('[TrysteroTransport] Deliver handler error:', error);
                this.notifyError(error);
            }
        });
    }
    /**
     * Register handler for incoming messages
     */
    onMessage(handler) {
        this.messageHandlers.push(handler);
        // Return cleanup function
        return () => {
            const idx = this.messageHandlers.indexOf(handler);
            if (idx >= 0) {
                this.messageHandlers.splice(idx, 1);
            }
        };
    }
    /**
     * Register handler for peer joins
     */
    onPeerJoin(callback) {
        this.peerJoinHandlers.push(callback);
        return () => {
            const idx = this.peerJoinHandlers.indexOf(callback);
            if (idx >= 0) {
                this.peerJoinHandlers.splice(idx, 1);
            }
        };
    }
    /**
     * Register handler for peer leaves
     */
    onPeerLeave(callback) {
        this.peerLeaveHandlers.push(callback);
        return () => {
            const idx = this.peerLeaveHandlers.indexOf(callback);
            if (idx >= 0) {
                this.peerLeaveHandlers.splice(idx, 1);
            }
        };
    }
    /**
     * Get this peer's unique ID
     */
    getPlayerId() {
        return selfId;
    }
    /**
     * Get all connected peer IDs (excluding self)
     */
    getPeerIds() {
        return Array.from(this.peers);
    }
    /**
     * Check if this peer is the authoritative host
     */
    isHost() {
        return selfId === this.permanentHost;
    }
    /**
     * Disconnect from the room
     */
    disconnect() {
        try {
            // Stop health check
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            this.receiveWireCleanup();
            this.room.leave();
            this.setConnectionState('disconnected');
            this.messageHandlers = [];
            this.peerJoinHandlers = [];
            this.peerLeaveHandlers = [];
            this.connectionChangeHandlers = [];
            this.errorHandlers = [];
            this.peerLastSeen.clear();
        }
        catch (error) {
            console.error('[TrysteroTransport] Disconnect error:', error);
            this.notifyError(error);
        }
    }
    /**
     * Get current connection state
     */
    getConnectionState() {
        return this.connectionState;
    }
    /**
     * Register handler for connection state changes
     */
    onConnectionChange(callback) {
        this.connectionChangeHandlers.push(callback);
        return () => {
            const idx = this.connectionChangeHandlers.indexOf(callback);
            if (idx >= 0) {
                this.connectionChangeHandlers.splice(idx, 1);
            }
        };
    }
    /**
     * Register handler for when the host disconnects
     * In sticky host pattern, game should end when this happens
     */
    onHostDisconnect(callback) {
        this.hostDisconnectHandlers.push(callback);
        return () => {
            const idx = this.hostDisconnectHandlers.indexOf(callback);
            if (idx >= 0) {
                this.hostDisconnectHandlers.splice(idx, 1);
            }
        };
    }
    /**
     * Wait for transport to be ready (peers discovered, host elected)
     *
     * Uses active host discovery protocol:
     * 1. Broadcasts "host_query" to ask if anyone is host
     * 2. Waits 3 seconds for "host_announce" responses
     * 3. If response received, uses announced host
     * 4. If no response AND no peers discovered, becomes solo host
     * 5. If conflict (two hosts), uses deterministic tiebreaker (lowest peer ID)
     *
     * This solves the race condition where both tabs open simultaneously.
     *
     * @example
     * ```ts
     * const transport = new TrysteroTransport({ roomId });
     * await transport.waitForReady();
     * const isHost = transport.isHost(); // Now reliable!
     * ```
     */
    async waitForReady() {
        // If host is already determined, we're ready
        if (this.permanentHost !== null) {
            console.log('[TrysteroTransport] Already ready, host:', this.permanentHost);
            return;
        }
        console.log('[TrysteroTransport] Starting active host discovery...');
        // Broadcast host query
        this.send({
            type: 'host_query',
            timestamp: Date.now()
        });
        // Wait for response or peers to join
        return new Promise((resolve) => {
            this.readyResolve = resolve;
            // Timeout after 3 seconds
            setTimeout(() => {
                if (this.readyResolve) {
                    // No host announced and no peers joined
                    if (this.permanentHost === null && this.peers.size === 0) {
                        console.log('[TrysteroTransport] No peers found after 3s - becoming solo host');
                        this.permanentHost = selfId;
                    }
                    // Peers exist but no host elected - use deterministic tiebreaker
                    else if (this.permanentHost === null && this.peers.size > 0) {
                        const allPeers = [selfId, ...Array.from(this.peers)].sort();
                        this.permanentHost = allPeers[0];
                        console.log('[TrysteroTransport] Multiple peers, no host announced - electing:', this.permanentHost);
                    }
                    console.log('[TrysteroTransport] Ready! Host:', this.permanentHost, 'Am I host?', this.isHost());
                    this.readyResolve();
                    this.readyResolve = null;
                }
            }, 3000);
        });
    }
    /**
     * Register error handler
     */
    onError(callback) {
        this.errorHandlers.push(callback);
        return () => {
            const idx = this.errorHandlers.indexOf(callback);
            if (idx >= 0) {
                this.errorHandlers.splice(idx, 1);
            }
        };
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    setConnectionState(newState) {
        if (this.connectionState !== newState) {
            this.connectionState = newState;
            this.connectionChangeHandlers.forEach((handler) => handler(newState));
        }
    }
    updateConnectionState() {
        if (this.peers.size > 0) {
            this.hadRemotePeers = true;
            this.setConnectionState('connected');
        }
        else if (!this.hadRemotePeers && this.permanentHost === selfId) {
            this.setConnectionState('connected');
        }
        else if (this.hadRemotePeers && this.connectionState === 'connected') {
            this.setConnectionState('disconnected');
        }
    }
    notifyError(error) {
        this.errorHandlers.forEach((handler) => {
            try {
                handler(error);
            }
            catch (err) {
                console.error('[TrysteroTransport] Error handler threw:', err);
            }
        });
    }
    /**
     * Start health check system to detect zombie/stale peer connections
     *
     * Sends ping every 5 seconds and removes peers that haven't responded in 15 seconds.
     * This fixes the issue where WebRTC onPeerLeave doesn't fire on page refresh/crash.
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            const now = Date.now();
            // Send ping to all peers
            this.send({
                type: 'health_ping',
                timestamp: now
            });
            // Check for stale peers (no message received in PEER_TIMEOUT ms)
            for (const [peerId, lastSeen] of this.peerLastSeen.entries()) {
                if (now - lastSeen > this.PEER_TIMEOUT) {
                    console.warn('[TrysteroTransport] Peer timed out (no response in 15s):', peerId);
                    // Remove stale peer
                    this.peers.delete(peerId);
                    this.peerLastSeen.delete(peerId);
                    // Notify listeners (triggers GameRuntime.onPeerLeave)
                    this.peerLeaveHandlers.forEach(handler => handler(peerId));
                    // Check if it was the host
                    if (peerId === this.permanentHost) {
                        console.log('[TrysteroTransport] HOST TIMEOUT - Game should end!');
                        this.hostDisconnectHandlers.forEach(handler => handler());
                    }
                    this.updateConnectionState();
                }
            }
        }, this.HEALTH_CHECK_INTERVAL);
    }
    // ============================================================================
    // Public Utilities
    // ============================================================================
    /**
     * Get the Trystero room instance (for advanced use cases)
     */
    getRoom() {
        return this.room;
    }
    /**
     * Get current host peer ID
     */
    getCurrentHost() {
        return this.permanentHost;
    }
}
//# sourceMappingURL=TrysteroTransport.js.map