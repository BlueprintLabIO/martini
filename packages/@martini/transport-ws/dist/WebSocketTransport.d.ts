/**
 * WebSocketTransport - Production-ready WebSocket transport for @martini/core
 *
 * Features:
 * - Client-server architecture
 * - Automatic reconnection
 * - Server-managed host election
 * - Peer tracking via server
 * - Error handling with callbacks
 *
 * Usage:
 * ```ts
 * const transport = new WebSocketTransport('ws://localhost:8080', {
 *   playerId: 'player-123',
 *   reconnect: true
 * });
 *
 * await transport.waitForReady();
 * ```
 */
import type { Transport, WireMessage } from '@martini/core';
export interface WebSocketTransportConfig {
    /** Player ID (generated if not provided) */
    playerId?: string;
    /** Enable automatic reconnection (default: true) */
    reconnect?: boolean;
    /** Reconnection delay in ms (default: 1000) */
    reconnectDelay?: number;
    /** Max reconnection attempts (default: Infinity) */
    maxReconnectAttempts?: number;
}
type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type ErrorHandler = (error: Error) => void;
export declare class WebSocketTransport implements Transport {
    private url;
    private ws;
    private playerId;
    private connectedPeers;
    private currentHost;
    private messageHandlers;
    private peerJoinHandlers;
    private peerLeaveHandlers;
    private errorHandlers;
    private readyPromise;
    private readyResolve;
    private reconnectEnabled;
    private reconnectDelay;
    private maxReconnectAttempts;
    private reconnectAttempts;
    private reconnectTimeout;
    constructor(url: string, config?: WebSocketTransportConfig);
    private connect;
    private handleDisconnect;
    private handleMessage;
    private sendRaw;
    private generatePlayerId;
    private notifyMessage;
    private notifyPeerJoin;
    private notifyPeerLeave;
    private notifyError;
    send(message: WireMessage, targetId?: string): void;
    onMessage(handler: MessageHandler): () => void;
    onPeerJoin(handler: PeerHandler): () => void;
    onPeerLeave(handler: PeerHandler): () => void;
    getPlayerId(): string;
    getPeerIds(): string[];
    isHost(): boolean;
    /**
     * Wait for the connection to be ready
     */
    waitForReady(): Promise<void>;
    /**
     * Listen for errors
     */
    onError(handler: ErrorHandler): () => void;
    /**
     * Disconnect from server
     */
    disconnect(): void;
}
export {};
//# sourceMappingURL=WebSocketTransport.d.ts.map