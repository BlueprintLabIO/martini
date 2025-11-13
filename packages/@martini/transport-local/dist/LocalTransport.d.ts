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
import type { Transport, WireMessage } from '@martini/core';
type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
export interface LocalTransportConfig {
    roomId: string;
    playerId?: string;
    isHost: boolean;
}
export declare class LocalTransport implements Transport {
    readonly playerId: string;
    private readonly roomId;
    private readonly _isHost;
    private messageHandlers;
    private peerJoinHandlers;
    private peerLeaveHandlers;
    private hostDisconnectHandlers;
    constructor(config: LocalTransportConfig);
    send(message: WireMessage, targetId?: string): void;
    onMessage(handler: MessageHandler): () => void;
    onPeerJoin(handler: PeerHandler): () => void;
    onPeerLeave(handler: PeerHandler): () => void;
    onHostDisconnect(handler: () => void): () => void;
    getPlayerId(): string;
    getPeerIds(): string[];
    isHost(): boolean;
    disconnect(): void;
    /** @internal */
    deliver(message: WireMessage, senderId: string): void;
    /** @internal */
    notifyPeerJoin(peerId: string): void;
    /** @internal */
    notifyPeerLeave(peerId: string): void;
}
export {};
//# sourceMappingURL=LocalTransport.d.ts.map