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
}
export declare class IframeBridgeRelay {
    private peers;
    private rooms;
    private messageHandler;
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
     * Handle peer leaving
     */
    private handlePeerLeave;
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