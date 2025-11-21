/**
 * ColyseusTransport - Colyseus room adapter for @martini-kit/core
 *
 * Wraps a Colyseus Room to work with martini-kit's Transport interface.
 * Allows you to use Colyseus for matchmaking/rooms while using martini-kit for game logic.
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
 * import { ColyseusTransport } from '@martini-kit/transport-colyseus';
 *
 * const client = new Client('ws://localhost:2567');
 * const room = await client.joinOrCreate('my_room');
 * const transport = new ColyseusTransport(room);
 * ```
 */
import type { Transport, WireMessage } from '@martini-kit/core';
import type { Room } from 'colyseus.js';
type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type ErrorHandler = (error: Error) => void;
export declare class ColyseusTransport implements Transport {
    private room;
    private playerId;
    private connectedPeers;
    private currentHost;
    private messageHandlers;
    private peerJoinHandlers;
    private peerLeaveHandlers;
    private errorHandlers;
    constructor(room: Room);
    private setupMessageHandlers;
    private setupErrorHandlers;
    private handleMessage;
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
     * Listen for errors
     */
    onError(handler: ErrorHandler): () => void;
    /**
     * Leave the Colyseus room and clean up
     */
    disconnect(): void;
    /**
     * Get the underlying Colyseus room (for advanced use cases)
     */
    getRoom(): Room;
}
export {};
//# sourceMappingURL=ColyseusTransport.d.ts.map