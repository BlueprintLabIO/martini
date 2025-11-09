/**
 * Multiplayer - Simple P2P wrapper around Trystero
 *
 * Provides clean API over Trystero's Nostr strategy for P2P WebRTC connections.
 * No signaling server needed - uses decentralized Nostr relays.
 */

import { joinRoom, type Room, selfId } from 'trystero/nostr';

interface MultiplayerOptions {
	appId: string;
	roomId: string;
}

export class Multiplayer {
	public room: Room;
	public selfId: string;

	constructor(options: MultiplayerOptions) {
		// Join room via Trystero
		this.room = joinRoom({ appId: options.appId }, options.roomId);
		this.selfId = selfId;

		console.log('[Multiplayer] Joined room:', options.roomId, '| My ID:', this.selfId);
	}

	/**
	 * Disconnect and clean up
	 */
	disconnect(): void {
		console.log('[Multiplayer] Disconnecting...');
		this.room.leave();
	}
}
