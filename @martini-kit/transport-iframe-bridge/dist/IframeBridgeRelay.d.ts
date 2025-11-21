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
export interface PeerInfo {
    playerId: string;
    roomId: string;
    iframe: HTMLIFrameElement;
    isHost: boolean;
    lastHeartbeat: number;
}
export declare class IframeBridgeRelay {
    private peers;
    private rooms;
    private messageHandler;
    private heartbeatInterval;
    private readonly HEARTBEAT_CHECK_MS;
    private readonly PEER_TIMEOUT_MS;
    constructor();
    /**
     * Set up listener for messages from iframes
     */
    private setupMessageListener;
    /**
     * Handle peer registration
     */
    private handleRegister;
    /**
     * Handle message send from a peer
     */
    private handleSend;
    /**
     * Handle heartbeat from peers
     */
    private handleHeartbeat;
    /**
     * Handle peer leaving
     */
    private handlePeerLeave;
    /**
     * Start heartbeat monitor to detect stale peers
     * Checks every 5 seconds and removes peers inactive for 10+ seconds
     */
    private startHeartbeatMonitor;
    /**
     * Get all peers in a room
     */
    private getPeersInRoom;
    /**
     * Send message to an iframe
     */
    private sendToIframe;
    /**
     * Manually register an iframe (useful for testing or explicit control)
     */
    registerIframe(playerId: string, roomId: string, iframe: HTMLIFrameElement, isHost: boolean): void;
    /**
     * Get info about registered peers
     */
    getPeers(): PeerInfo[];
    /**
     * Get peers in a specific room
     */
    getPeersInRoomById(roomId: string): PeerInfo[];
    /**
     * Clean up
     */
    destroy(): void;
}
//# sourceMappingURL=IframeBridgeRelay.d.ts.map