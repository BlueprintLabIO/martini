/**
 * Multiplayer - Unified P2P connection manager using Trystero
 *
 * Single class for both host and client using Trystero's Nostr strategy.
 * Replaces SimplePeer + Socket.IO with ~150 lines of clean code.
 *
 * Features:
 * - P2P WebRTC via Trystero (no signaling server needed)
 * - Lobby approval system (host approves/denies join requests)
 * - Automatic peer discovery and connection
 * - Nostr relays for signaling (zero setup, always available)
 */

import { joinRoom, type Room } from 'trystero/nostr';

interface PeerInfo {
	peerId: string;
	approved: boolean;
	connected: boolean;
}

interface MultiplayerOptions {
	shareCode: string;
	isHost: boolean;
	appId: string; // Unique app identifier for Trystero
	onError: (error: Error) => void;
	onJoinRequest?: (peerId: string) => void; // Host only
	onClientJoined: (peerId: string) => void;
	onClientLeft: (peerId: string) => void;
	onConnected?: () => void; // Client only
	onDisconnected?: () => void; // Client only
	onPending?: () => void; // Client only
	onDenied?: () => void; // Client only
	onDataReceived: (peerId: string, data: any) => void;
}

export class Multiplayer {
	private room: Room | null = null;
	private isHost: boolean;
	private myId: string | null = null;
	private shareCode: string;
	private appId: string;
	private peers: Map<string, PeerInfo> = new Map();

	// Trystero actions (RPC-like communication)
	private sendApprovalRequest: ((data: any, peerId: string) => void) | null = null;
	private sendApprovalResponse: ((data: any, peerId: string) => void) | null = null;
	private sendGameData: ((data: any, peerId?: string) => void) | null = null;

	// Callbacks
	private onError: (error: Error) => void;
	private onJoinRequest?: (peerId: string) => void;
	private onClientJoined: (peerId: string) => void;
	private onClientLeft: (peerId: string) => void;
	private onConnected?: () => void;
	private onDisconnected?: () => void;
	private onPending?: () => void;
	private onDenied?: () => void;
	private onDataReceived: (peerId: string, data: any) => void;

	// Client-side approval state
	private isWaitingApproval: boolean = false;
	private hostPeerId: string | null = null;

	constructor(options: MultiplayerOptions) {
		this.shareCode = options.shareCode;
		this.isHost = options.isHost;
		this.appId = options.appId;
		this.onError = options.onError;
		this.onJoinRequest = options.onJoinRequest;
		this.onClientJoined = options.onClientJoined;
		this.onClientLeft = options.onClientLeft;
		this.onConnected = options.onConnected;
		this.onDisconnected = options.onDisconnected;
		this.onPending = options.onPending;
		this.onDenied = options.onDenied;
		this.onDataReceived = options.onDataReceived;
	}

	/**
	 * Connect to Trystero room
	 */
	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				console.log('[Multiplayer] Connecting to Trystero room:', this.shareCode);

				// Join room via Nostr strategy
				this.room = joinRoom(
					{
						appId: this.appId
					},
					this.shareCode
				);

				// Generate my ID (Trystero doesn't provide one, so we create it)
				this.myId = this.isHost ? 'host' : `client-${Math.random().toString(36).substr(2, 9)}`;

				console.log('[Multiplayer] Room joined. My ID:', this.myId);

				// Set up Trystero actions
				this.setupActions();

				// Set up peer event handlers
				this.setupPeerHandlers();

				if (this.isHost) {
					console.log('[Multiplayer] Host mode activated');
					resolve();
				} else {
					console.log('[Multiplayer] Client mode activated - waiting for approval');
					// Client resolves immediately but waits for approval
					resolve();
				}
			} catch (error) {
				console.error('[Multiplayer] Connection error:', error);
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	/**
	 * Set up Trystero actions (RPC-like communication channels)
	 */
	private setupActions(): void {
		if (!this.room) return;

		// Approval request action (client → host)
		// Note: Trystero has 12-byte limit on action names
		const [sendApproval, getApproval] = this.room.makeAction('approve-req');
		this.sendApprovalRequest = sendApproval;

		// Approval response action (host → client)
		const [sendResponse, getResponse] = this.room.makeAction('approve-res');
		this.sendApprovalResponse = sendResponse;

		// Game data action (bidirectional)
		const [sendData, getData] = this.room.makeAction('game-data');
		this.sendGameData = sendData;

		// Host: Listen for approval requests
		if (this.isHost) {
			getApproval((data: any, peerId: string) => {
				console.log('[Multiplayer] Approval request from:', peerId);

				// Add to pending peers
				this.peers.set(peerId, {
					peerId,
					approved: false,
					connected: true
				});

				// Notify UI
				if (this.onJoinRequest) {
					this.onJoinRequest(peerId);
				}
			});
		}

		// Client: Listen for approval responses
		if (!this.isHost) {
			getResponse((data: any, peerId: string) => {
				console.log('[Multiplayer] Approval response:', data);

				if (data && data.approved) {
					this.isWaitingApproval = false;
					this.hostPeerId = peerId;

					console.log('[Multiplayer] Approved! Connected to host');
					if (this.onConnected) {
						this.onConnected();
					}
				} else {
					console.log('[Multiplayer] Denied by host');
					if (this.onDenied) {
						this.onDenied();
					}
					this.disconnect();
				}
			});
		}

		// Both: Listen for game data
		getData((data: any, peerId: string) => {
			this.onDataReceived(peerId, data);
		});
	}

	/**
	 * Set up peer join/leave handlers
	 */
	private setupPeerHandlers(): void {
		if (!this.room) return;

		// Peer joined
		this.room.onPeerJoin((peerId: string) => {
			console.log('[Multiplayer] Peer joined:', peerId);

			if (!this.isHost) {
				// Client: Send approval request to host
				console.log('[Multiplayer] Sending approval request to host');
				this.isWaitingApproval = true;

				if (this.sendApprovalRequest) {
					this.sendApprovalRequest({ clientId: this.myId }, peerId);
				}

				if (this.onPending) {
					this.onPending();
				}
			} else {
				// Host: Peer will send approval request, wait for it
				console.log('[Multiplayer] New peer connected, waiting for approval request');
			}
		});

		// Peer left
		this.room.onPeerLeave((peerId: string) => {
			console.log('[Multiplayer] Peer left:', peerId);

			// Remove from peers
			this.peers.delete(peerId);

			// Notify callbacks
			if (this.isHost) {
				this.onClientLeft(peerId);
			} else {
				// Client: Host disconnected
				if (this.onDisconnected) {
					this.onDisconnected();
				}
			}
		});
	}

	/**
	 * Approve a pending client (host only)
	 */
	approveClient(clientId: string): void {
		if (!this.isHost) {
			console.error('[Multiplayer] Only host can approve clients');
			return;
		}

		const peer = this.peers.get(clientId);
		if (!peer) {
			console.error('[Multiplayer] Client not found:', clientId);
			return;
		}

		console.log('[Multiplayer] Approving client:', clientId);

		// Update peer state
		peer.approved = true;

		// Send approval response
		if (this.sendApprovalResponse) {
			this.sendApprovalResponse({ approved: true }, clientId);
		}

		// Notify UI
		this.onClientJoined(clientId);
	}

	/**
	 * Deny a pending client (host only)
	 */
	denyClient(clientId: string): void {
		if (!this.isHost) {
			console.error('[Multiplayer] Only host can deny clients');
			return;
		}

		console.log('[Multiplayer] Denying client:', clientId);

		// Send denial response
		if (this.sendApprovalResponse) {
			this.sendApprovalResponse({ approved: false }, clientId);
		}

		// Remove from peers
		this.peers.delete(clientId);
	}

	/**
	 * Send data to a specific peer
	 */
	sendToPeer(peerId: string, data: any): void {
		const peer = this.peers.get(peerId);

		if (!peer) {
			console.warn('[Multiplayer] Peer not found:', peerId);
			return;
		}

		if (!peer.approved) {
			console.warn('[Multiplayer] Peer not approved yet:', peerId);
			return;
		}

		if (this.sendGameData) {
			this.sendGameData(data, peerId);
		}
	}

	/**
	 * Broadcast data to all connected peers
	 */
	broadcast(data: any): void {
		if (!this.isHost) {
			console.error('[Multiplayer] Only host can broadcast');
			return;
		}

		// Send to all approved peers
		this.peers.forEach((peer) => {
			if (peer.approved) {
				this.sendToPeer(peer.peerId, data);
			}
		});
	}

	/**
	 * Send data to host (client only)
	 */
	send(data: any): void {
		if (this.isHost) {
			console.error('[Multiplayer] Host should use broadcast() instead');
			return;
		}

		if (!this.hostPeerId) {
			console.warn('[Multiplayer] Not connected to host yet');
			return;
		}

		if (this.sendGameData) {
			this.sendGameData(data, this.hostPeerId);
		}
	}

	/**
	 * Get list of connected (approved) client IDs
	 */
	getConnectedClients(): string[] {
		return Array.from(this.peers.values())
			.filter((peer) => peer.approved)
			.map((peer) => peer.peerId);
	}

	/**
	 * Check if connected (client only)
	 */
	isConnected(): boolean {
		return !this.isWaitingApproval && this.hostPeerId !== null;
	}

	/**
	 * Check if waiting for approval (client only)
	 */
	isPendingApproval(): boolean {
		return this.isWaitingApproval;
	}

	/**
	 * Disconnect and clean up
	 */
	disconnect(): void {
		console.log('[Multiplayer] Disconnecting...');

		if (this.room) {
			this.room.leave();
			this.room = null;
		}

		this.peers.clear();
		this.myId = null;
		this.hostPeerId = null;
		this.isWaitingApproval = false;
	}

	/**
	 * Get player ID
	 */
	getPlayerId(): string | null {
		return this.myId;
	}

	/**
	 * Get share code
	 */
	getShareCode(): string {
		return this.shareCode;
	}
}
