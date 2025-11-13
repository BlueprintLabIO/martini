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
import { type Room } from 'trystero/mqtt';
import type { Transport, WireMessage } from '@martini/core';
export type ConnectionState = 'connecting' | 'connected' | 'disconnected';
export interface TrysteroTransportOptions {
    /** Unique room identifier for P2P session */
    roomId: string;
    /** Application ID for Trystero (prevents cross-app collisions) */
    appId?: string;
    /** Custom STUN/TURN servers for NAT traversal */
    rtcConfig?: RTCConfiguration;
    /** Custom MQTT relay URLs (e.g., ['wss://broker.hivemq.com:8884/mqtt']) */
    relayUrls?: string[];
    /**
     * Explicitly set this peer as host (industry standard: separate host/join URLs)
     * If true, this peer becomes host immediately without election.
     * If false, this peer will never be host (always client).
     * If undefined, uses automatic election (alphabetically lowest peer ID).
     */
    isHost?: boolean;
}
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
export declare class TrysteroTransport implements Transport {
    private room;
    private messageHandlers;
    private peerJoinHandlers;
    private peerLeaveHandlers;
    private connectionChangeHandlers;
    private errorHandlers;
    private hostDisconnectHandlers;
    private sendWire;
    private receiveWireCleanup;
    private permanentHost;
    private connectionState;
    private peers;
    private hadRemotePeers;
    private readyResolve;
    private explicitHostMode;
    constructor(options: TrysteroTransportOptions);
    /**
     * Send message to specific peer or broadcast to all
     */
    send(message: WireMessage, targetId?: string): void;
    /**
     * Inject message directly (used by server-style adapters)
     */
    deliver(message: WireMessage, senderId: string): void;
    /**
     * Register handler for incoming messages
     */
    onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;
    /**
     * Register handler for peer joins
     */
    onPeerJoin(callback: (peerId: string) => void): () => void;
    /**
     * Register handler for peer leaves
     */
    onPeerLeave(callback: (peerId: string) => void): () => void;
    /**
     * Get this peer's unique ID
     */
    getPlayerId(): string;
    /**
     * Get all connected peer IDs (excluding self)
     */
    getPeerIds(): string[];
    /**
     * Check if this peer is the authoritative host
     */
    isHost(): boolean;
    /**
     * Disconnect from the room
     */
    disconnect(): void;
    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState;
    /**
     * Register handler for connection state changes
     */
    onConnectionChange(callback: (state: ConnectionState) => void): () => void;
    /**
     * Register handler for when the host disconnects
     * In sticky host pattern, game should end when this happens
     */
    onHostDisconnect(callback: () => void): () => void;
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
    waitForReady(): Promise<void>;
    /**
     * Register error handler
     */
    onError(callback: (error: Error) => void): () => void;
    private setConnectionState;
    private updateConnectionState;
    private notifyError;
    /**
     * Get the Trystero room instance (for advanced use cases)
     */
    getRoom(): Room;
    /**
     * Get current host peer ID
     */
    getCurrentHost(): string | null;
}
//# sourceMappingURL=TrysteroTransport.d.ts.map