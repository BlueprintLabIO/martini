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

import type { Transport, WireMessage } from '@martini/core';
import type { Room } from 'colyseus.js';

type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type ErrorHandler = (error: Error) => void;

export class ColyseusTransport implements Transport {
	private room: Room;
	private playerId: string;
	private connectedPeers = new Set<string>();
	private currentHost: string | null = null;

	private messageHandlers: MessageHandler[] = [];
	private peerJoinHandlers: PeerHandler[] = [];
	private peerLeaveHandlers: PeerHandler[] = [];
	private errorHandlers: ErrorHandler[] = [];

	constructor(room: Room) {
		this.room = room;
		this.playerId = room.sessionId;

		this.setupMessageHandlers();
		this.setupErrorHandlers();
	}

	private setupMessageHandlers(): void {
		// Listen for all Martini messages on the 'martini' channel
		this.room.onMessage('martini', (message: any) => {
			this.handleMessage(message);
		});
	}

	private setupErrorHandlers(): void {
		// Handle room errors
		this.room.onError((code: number, message?: string) => {
			const error = new Error(`Colyseus room error (${code}): ${message || 'Unknown error'}`);
			this.notifyError(error);
		});

		// Handle room leave
		this.room.onLeave((code?: number) => {
			const error = new Error(`Left Colyseus room (code: ${code || 'unknown'})`);
			this.notifyError(error);
		});
	}

	private handleMessage(data: any): void {
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
					payload.peers.forEach((peerId: string) => {
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

	private notifyMessage(message: WireMessage, senderId: string): void {
		this.messageHandlers.forEach(handler => {
			try {
				handler(message, senderId);
			} catch (error) {
				this.notifyError(error as Error);
			}
		});
	}

	private notifyPeerJoin(peerId: string): void {
		this.peerJoinHandlers.forEach(handler => handler(peerId));
	}

	private notifyPeerLeave(peerId: string): void {
		this.peerLeaveHandlers.forEach(handler => handler(peerId));
	}

	private notifyError(error: Error): void {
		this.errorHandlers.forEach(handler => handler(error));
	}

	// ============================================================================
	// Transport Interface Implementation
	// ============================================================================

	send(message: WireMessage, targetId?: string): void {
		const envelope = {
			...message,
			senderId: this.playerId,
			...(targetId && { targetId })
		};

		this.room.send('martini', envelope);
	}

	onMessage(handler: MessageHandler): () => void {
		this.messageHandlers.push(handler);
		return () => {
			const index = this.messageHandlers.indexOf(handler);
			if (index >= 0) {
				this.messageHandlers.splice(index, 1);
			}
		};
	}

	onPeerJoin(handler: PeerHandler): () => void {
		this.peerJoinHandlers.push(handler);
		return () => {
			const index = this.peerJoinHandlers.indexOf(handler);
			if (index >= 0) {
				this.peerJoinHandlers.splice(index, 1);
			}
		};
	}

	onPeerLeave(handler: PeerHandler): () => void {
		this.peerLeaveHandlers.push(handler);
		return () => {
			const index = this.peerLeaveHandlers.indexOf(handler);
			if (index >= 0) {
				this.peerLeaveHandlers.splice(index, 1);
			}
		};
	}

	getPlayerId(): string {
		return this.playerId;
	}

	getPeerIds(): string[] {
		return Array.from(this.connectedPeers);
	}

	isHost(): boolean {
		return this.currentHost === this.playerId;
	}

	// ============================================================================
	// Additional Methods
	// ============================================================================

	/**
	 * Listen for errors
	 */
	onError(handler: ErrorHandler): () => void {
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
	disconnect(): void {
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
	getRoom(): Room {
		return this.room;
	}
}
