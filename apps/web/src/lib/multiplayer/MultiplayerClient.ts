/**
 * MultiplayerClient - Client side P2P connection manager
 *
 * Responsibilities:
 * - Connect to signaling server
 * - Join room with share code
 * - Create SimplePeer connection to host
 * - Wait for host approval (lobby system)
 * - Forward data between game sandbox and host peer
 */

import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';

interface MultiplayerClientOptions {
	shareCode: string;
	signalingUrl: string;
	stunUrls: string[];
	onError: (error: Error) => void;
	onConnected: () => void;
	onDisconnected: () => void;
	onPending: () => void;
	onDenied: () => void;
	onDataReceived: (data: any) => void;
}

export class MultiplayerClient {
	private socket: Socket | null = null;
	private peer: SimplePeer.Instance | null = null;
	private shareCode: string;
	private signalingUrl: string;
	private stunUrls: string[];
	private playerId: string | null = null;
	private isPending: boolean = false;

	// Callbacks
	private onError: (error: Error) => void;
	private onConnected: () => void;
	private onDisconnected: () => void;
	private onPending: () => void;
	private onDenied: () => void;
	private onDataReceived: (data: any) => void;

	constructor(options: MultiplayerClientOptions) {
		this.shareCode = options.shareCode;
		this.signalingUrl = options.signalingUrl;
		this.stunUrls = options.stunUrls;
		this.onError = options.onError;
		this.onConnected = options.onConnected;
		this.onDisconnected = options.onDisconnected;
		this.onPending = options.onPending;
		this.onDenied = options.onDenied;
		this.onDataReceived = options.onDataReceived;
	}

	/**
	 * Connect to signaling server and join room
	 */
	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			// Connect to signaling server
			this.socket = io(this.signalingUrl, {
				transports: ['websocket', 'polling']
			});

			this.socket.on('connect', () => {
				console.log('[MultiplayerClient] Connected to signaling server');
				this.playerId = this.socket!.id ?? null;

				// Request to join room
				this.socket!.emit('join-room', {
					shareCode: this.shareCode,
					clientId: 'client'
				});
			});

			this.socket.on('join-pending', (data: { pending: boolean; message: string }) => {
				console.log('[MultiplayerClient] Join pending:', data.message);
				this.isPending = true;
				this.onPending();
				resolve(); // Resolve promise even though pending
			});

			this.socket.on('room-joined', (data: { shareCode: string; playerCount: number }) => {
				console.log('[MultiplayerClient] Room joined! Players:', data.playerCount);
				this.isPending = false;

				// Now initiate peer connection to host
				this.createPeerConnection();
			});

			this.socket.on('join-denied', (data: { message: string; code?: string }) => {
				console.log('[MultiplayerClient] Join denied:', data.message);
				this.onDenied();
				reject(new Error(data.message));
			});

			this.socket.on('signal', (data: { signal: any; from: string }) => {
				console.log('[MultiplayerClient] Signal from host');
				if (this.peer) {
					this.peer.signal(data.signal);
				}
			});

			this.socket.on('host-disconnected', () => {
				console.log('[MultiplayerClient] Host disconnected');
				this.onDisconnected();
				this.disconnect();
			});

			this.socket.on('room-expired', () => {
				console.log('[MultiplayerClient] Room expired');
				this.onError(new Error('Room code expired'));
				reject(new Error('Room code expired'));
			});

			this.socket.on('error', (data: { message: string; code?: string }) => {
				console.error('[MultiplayerClient] Error:', data);
				this.onError(new Error(data.message));
				reject(new Error(data.message));
			});

			this.socket.on('disconnect', () => {
				console.log('[MultiplayerClient] Disconnected from signaling server');
				this.onDisconnected();
			});

			this.socket.on('warning', (data: { message: string }) => {
				console.warn('[MultiplayerClient] Warning:', data.message);
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
	 * Create peer connection to host
	 */
	private createPeerConnection(): void {
		console.log('[MultiplayerClient] Creating peer connection to host');

		this.peer = new SimplePeer({
			initiator: true, // Client initiates
			trickle: true,
			config: {
				iceServers: this.stunUrls.map((url) => ({ urls: url }))
			}
		});

		this.peer.on('signal', (signal) => {
			console.log('[MultiplayerClient] Sending signal to host');
			this.socket!.emit('signal', {
				shareCode: this.shareCode,
				signal
			});
		});

		this.peer.on('connect', () => {
			console.log('[MultiplayerClient] Connected to host!');
			this.onConnected();
		});

		this.peer.on('data', (data) => {
			try {
				const parsed = JSON.parse(data.toString());
				this.onDataReceived(parsed);
			} catch (e) {
				console.error('[MultiplayerClient] Failed to parse data:', e);
			}
		});

		this.peer.on('close', () => {
			console.log('[MultiplayerClient] Peer connection closed');
			this.onDisconnected();
		});

		this.peer.on('error', (err) => {
			console.error('[MultiplayerClient] Peer error:', err);
			this.onError(err);
		});
	}

	/**
	 * Send data to host
	 */
	send(data: any): void {
		if (!this.peer) {
			console.warn('[MultiplayerClient] No peer connection');
			return;
		}

		if (!this.peer.connected) {
			console.warn('[MultiplayerClient] Peer not connected');
			return;
		}

		try {
			this.peer.send(JSON.stringify(data));
		} catch (e) {
			console.error('[MultiplayerClient] Failed to send data:', e);
		}
	}

	/**
	 * Check if connected to host
	 */
	isConnected(): boolean {
		return this.peer?.connected || false;
	}

	/**
	 * Check if waiting for approval
	 */
	isPendingApproval(): boolean {
		return this.isPending;
	}

	/**
	 * Disconnect and clean up
	 */
	disconnect(): void {
		console.log('[MultiplayerClient] Disconnecting...');

		// Close peer connection
		if (this.peer) {
			try {
				this.peer.destroy();
			} catch (e) {
				// Ignore errors during cleanup
			}
			this.peer = null;
		}

		// Disconnect from signaling server
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.playerId = null;
		this.isPending = false;
	}

	/**
	 * Get player ID
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
