/**
 * MultiplayerHost - Host side P2P connection manager
 *
 * Responsibilities:
 * - Connect to signaling server
 * - Create room with share code
 * - Manage SimplePeer connections to multiple clients
 * - Handle lobby approval (approve/deny pending clients)
 * - Forward data between game sandbox and peers
 */

import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';

interface PeerConnection {
	peer: SimplePeer.Instance;
	clientId: string;
	approved: boolean;
}

interface MultiplayerHostOptions {
	shareCode: string;
	signalingUrl: string;
	stunUrls: string[];
	onError: (error: Error) => void;
	onClientJoined: (clientId: string) => void;
	onClientLeft: (clientId: string) => void;
	onJoinRequest: (clientId: string) => void;
	onDataReceived: (clientId: string, data: any) => void;
}

export class MultiplayerHost {
	private socket: Socket | null = null;
	private peers: Map<string, PeerConnection> = new Map();
	private shareCode: string;
	private signalingUrl: string;
	private stunUrls: string[];
	private playerId: string | null = null;

	// Callbacks
	private onError: (error: Error) => void;
	private onClientJoined: (clientId: string) => void;
	private onClientLeft: (clientId: string) => void;
	private onJoinRequest: (clientId: string) => void;
	private onDataReceived: (clientId: string, data: any) => void;

	constructor(options: MultiplayerHostOptions) {
		this.shareCode = options.shareCode;
		this.signalingUrl = options.signalingUrl;
		this.stunUrls = options.stunUrls;
		this.onError = options.onError;
		this.onClientJoined = options.onClientJoined;
		this.onClientLeft = options.onClientLeft;
		this.onJoinRequest = options.onJoinRequest;
		this.onDataReceived = options.onDataReceived;
	}

	/**
	 * Connect to signaling server and create room
	 */
	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			// Connect to signaling server
			this.socket = io(this.signalingUrl, {
				transports: ['websocket', 'polling']
			});

			this.socket.on('connect', () => {
				console.log('[MultiplayerHost] Connected to signaling server');

				// Create room
				this.socket!.emit('create-room', {
					shareCode: this.shareCode,
					hostId: 'host'
				});
			});

			this.socket.on('room-created', (data: { shareCode: string; hostId: string }) => {
				console.log('[MultiplayerHost] Room created:', data);
				this.playerId = data.hostId;
				resolve();
			});

			this.socket.on('join-request', (data: { clientId: string; clientName?: string }) => {
				console.log('[MultiplayerHost] Join request from:', data.clientId);
				this.onJoinRequest(data.clientId);
			});

			this.socket.on('client-joined', (data: { clientId: string; playerCount: number }) => {
				console.log('[MultiplayerHost] Client joined:', data.clientId);
				// Client was approved and joined - they'll initiate peer connection
			});

			this.socket.on('client-left', (data: { clientId: string; playerCount: number }) => {
				console.log('[MultiplayerHost] Client left:', data.clientId);
				this.removePeer(data.clientId);
				this.onClientLeft(data.clientId);
			});

			this.socket.on('signal', (data: { signal: any; from: string }) => {
				console.log('[MultiplayerHost] Signal from:', data.from);
				this.handleSignal(data.from, data.signal);
			});

			this.socket.on('error', (data: { message: string; code?: string }) => {
				console.error('[MultiplayerHost] Error:', data);
				this.onError(new Error(data.message));
				reject(new Error(data.message));
			});

			this.socket.on('disconnect', () => {
				console.log('[MultiplayerHost] Disconnected from signaling server');
			});

			// Connection timeout
			setTimeout(() => {
				if (!this.playerId) {
					reject(new Error('Connection timeout'));
				}
			}, 10000);
		});
	}

	/**
	 * Approve a pending client
	 */
	approveClient(clientId: string): void {
		if (!this.socket) {
			throw new Error('Not connected to signaling server');
		}

		console.log('[MultiplayerHost] Approving client:', clientId);

		this.socket.emit('approve-client', {
			shareCode: this.shareCode,
			clientId
		});

		// Client will be added to peers when they initiate connection
	}

	/**
	 * Deny a pending client
	 */
	denyClient(clientId: string): void {
		if (!this.socket) {
			throw new Error('Not connected to signaling server');
		}

		console.log('[MultiplayerHost] Denying client:', clientId);

		this.socket.emit('deny-client', {
			shareCode: this.shareCode,
			clientId
		});
	}

	/**
	 * Handle incoming WebRTC signal from client
	 */
	private handleSignal(clientId: string, signal: any): void {
		let peerConnection = this.peers.get(clientId);

		if (!peerConnection) {
			// New peer connection - client is initiating
			console.log('[MultiplayerHost] Creating peer connection for:', clientId);

			const peer = new SimplePeer({
				initiator: false, // Host is not initiator
				trickle: true,
				config: {
					iceServers: this.stunUrls.map((url) => ({ urls: url }))
				}
			});

			peerConnection = {
				peer,
				clientId,
				approved: true // Already approved by this point
			};

			this.peers.set(clientId, peerConnection);

			// Set up peer event handlers
			peer.on('signal', (signal) => {
				console.log('[MultiplayerHost] Sending signal to:', clientId);
				this.socket!.emit('signal', {
					shareCode: this.shareCode,
					signal,
					targetId: clientId
				});
			});

			peer.on('connect', () => {
				console.log('[MultiplayerHost] Peer connected:', clientId);
				this.onClientJoined(clientId);
			});

			peer.on('data', (data) => {
				try {
					const parsed = JSON.parse(data.toString());
					this.onDataReceived(clientId, parsed);
				} catch (e) {
					console.error('[MultiplayerHost] Failed to parse data:', e);
				}
			});

			peer.on('close', () => {
				console.log('[MultiplayerHost] Peer closed:', clientId);
				this.removePeer(clientId);
				this.onClientLeft(clientId);
			});

			peer.on('error', (err) => {
				console.error('[MultiplayerHost] Peer error:', err);
				this.onError(err);
			});
		}

		// Signal the peer
		peerConnection.peer.signal(signal);
	}

	/**
	 * Send data to a specific client
	 */
	sendToClient(clientId: string, data: any): void {
		const peerConnection = this.peers.get(clientId);

		if (!peerConnection) {
			console.warn('[MultiplayerHost] No peer connection for:', clientId);
			return;
		}

		if (!peerConnection.peer.connected) {
			console.warn('[MultiplayerHost] Peer not connected:', clientId);
			return;
		}

		try {
			peerConnection.peer.send(JSON.stringify(data));
		} catch (e) {
			console.error('[MultiplayerHost] Failed to send data:', e);
		}
	}

	/**
	 * Broadcast data to all connected clients
	 */
	broadcast(data: any): void {
		this.peers.forEach((peerConnection) => {
			this.sendToClient(peerConnection.clientId, data);
		});
	}

	/**
	 * Get list of connected client IDs
	 */
	getConnectedClients(): string[] {
		const connected: string[] = [];

		this.peers.forEach((peerConnection, clientId) => {
			if (peerConnection.peer.connected) {
				connected.push(clientId);
			}
		});

		return connected;
	}

	/**
	 * Remove peer connection
	 */
	private removePeer(clientId: string): void {
		const peerConnection = this.peers.get(clientId);

		if (peerConnection) {
			try {
				peerConnection.peer.destroy();
			} catch (e) {
				// Ignore errors during cleanup
			}
			this.peers.delete(clientId);
		}
	}

	/**
	 * Disconnect and clean up
	 */
	disconnect(): void {
		console.log('[MultiplayerHost] Disconnecting...');

		// Close all peer connections
		this.peers.forEach((peerConnection) => {
			try {
				peerConnection.peer.destroy();
			} catch (e) {
				// Ignore errors during cleanup
			}
		});

		this.peers.clear();

		// Disconnect from signaling server
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.playerId = null;
	}

	/**
	 * Get host player ID
	 */
	getPlayerId(): string | null {
		return this.playerId;
	}

	/**
	 * Get share code
	 */
	getShareCode(): string {
		return this.shareCode;
	}
}
