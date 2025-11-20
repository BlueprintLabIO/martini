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
import type { Transport, WireMessage, TransportMetrics } from '@martini/core';
export interface IframeBridgeConfig {
    /** Unique room identifier */
    roomId: string;
    /** Player ID (auto-generated if not provided) */
    playerId?: string;
    /** Whether this instance is the host */
    isHost: boolean;
}
/**
 * Message types for iframe ↔ parent communication
 */
export interface BridgeMessage {
    type: 'BRIDGE_REGISTER' | 'BRIDGE_SEND' | 'BRIDGE_DELIVER' | 'BRIDGE_PEER_JOIN' | 'BRIDGE_PEER_LEAVE' | 'BRIDGE_HOST_DISCONNECT' | 'BRIDGE_HEARTBEAT' | 'BRIDGE_ERROR';
    roomId: string;
    playerId: string;
    payload?: {
        message?: WireMessage;
        targetId?: string;
        peerId?: string;
        wasHost?: boolean;
        error?: string;
    };
}
export declare class IframeBridgeTransport implements Transport {
    readonly playerId: string;
    private readonly roomId;
    private readonly _isHost;
    readonly metrics: TransportMetrics;
    private readonly HEARTBEAT_INTERVAL_MS;
    private messageHandlers;
    private peerJoinHandlers;
    private peerLeaveHandlers;
    private hostDisconnectHandlers;
    private peerIds;
    private messageHandler;
    private isDisconnected;
    private heartbeatInterval;
    private visibilityHandler?;
    constructor(config: IframeBridgeConfig);
    /**
     * Set up listener for messages from parent relay
     */
    private setupMessageListener;
    /**
     * Register this transport instance with parent relay
     */
    private registerWithRelay;
    /**
     * Send periodic heartbeat to relay
     */
    private sendHeartbeat;
    private startHeartbeat;
    private stopHeartbeat;
    private setupVisibilityListener;
    /**
     * Send message to peer(s)
     */
    send(message: WireMessage, targetId?: string): void;
    onMessage(handler: (msg: WireMessage, senderId: string) => void): () => void;
    onPeerJoin(handler: (peerId: string) => void): () => void;
    onPeerLeave(handler: (peerId: string) => void): () => void;
    onHostDisconnect(handler: () => void): () => void;
    getPlayerId(): string;
    getPeerIds(): string[];
    isHost(): boolean;
    disconnect(): void;
}
//# sourceMappingURL=IframeBridgeTransport.d.ts.map