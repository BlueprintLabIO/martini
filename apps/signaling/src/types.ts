/**
 * Signaling Server Types
 *
 * Message types exchanged between clients and signaling server
 * for WebRTC peer connection establishment.
 */

/**
 * Room state stored in memory on signaling server
 */
export interface Room {
	/** Socket ID of the host who created the room */
	host: string;
	/** Set of socket IDs of approved/connected clients */
	clients: Set<string>;
	/** Set of socket IDs waiting for host approval */
	pendingClients: Set<string>;
	/** Timestamp when room was created (for cleanup) */
	createdAt: number;
	/** Timestamp when room code expires (15 minutes from creation) */
	expiresAt: number;
	/** 6-digit room code */
	shareCode: string;
}

/**
 * Create room request from host
 */
export interface CreateRoomPayload {
	/** 6-digit share code (e.g., "ABC123") */
	shareCode: string;
	/** Optional host user ID for analytics */
	hostId?: string;
}

/**
 * Join room request from client
 */
export interface JoinRoomPayload {
	/** 6-digit share code to join */
	shareCode: string;
	/** Optional client user ID for analytics */
	clientId?: string;
}

/**
 * WebRTC signal forwarding payload
 */
export interface SignalPayload {
	/** Room code to forward signal to */
	shareCode: string;
	/** WebRTC signal data (SDP offer/answer or ICE candidate) */
	signal: any;
	/** Optional: specific socket ID to send to (for direct peer-to-peer) */
	targetId?: string;
}

/**
 * Room created confirmation
 */
export interface RoomCreatedResponse {
	shareCode: string;
	/** Host socket ID */
	hostId: string;
}

/**
 * Room joined confirmation
 */
export interface RoomJoinedResponse {
	shareCode: string;
	/** Total number of players including host */
	playerCount: number;
}

/**
 * Client joined notification (sent to host)
 */
export interface ClientJoinedNotification {
	/** Socket ID of client who joined */
	clientId: string;
	/** Updated player count */
	playerCount: number;
}

/**
 * Client left notification (sent to host)
 */
export interface ClientLeftNotification {
	/** Socket ID of client who left */
	clientId: string;
	/** Updated player count */
	playerCount: number;
}

/**
 * Signal from peer
 */
export interface SignalFromPeer {
	/** WebRTC signal data */
	signal: any;
	/** Socket ID of sender */
	from: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
	message: string;
	code?: string;
}

/**
 * Warning response (non-fatal)
 */
export interface WarningResponse {
	message: string;
}

/**
 * Join request notification (sent to host when client wants to join)
 */
export interface JoinRequestNotification {
	/** Socket ID of client requesting to join */
	clientId: string;
	/** Optional display name/user ID */
	clientName?: string;
}

/**
 * Approve/deny client payload (from host)
 */
export interface ApproveClientPayload {
	/** Share code of the room */
	shareCode: string;
	/** Socket ID of client to approve or deny */
	clientId: string;
}

/**
 * Join request status (sent to client)
 */
export interface JoinRequestStatus {
	/** Whether in pending state */
	pending: boolean;
	/** Message to display */
	message: string;
}

/**
 * Socket.IO event names
 */
export const SocketEvents = {
	// Client → Server
	CREATE_ROOM: 'create-room',
	JOIN_ROOM: 'join-room',
	APPROVE_CLIENT: 'approve-client',
	DENY_CLIENT: 'deny-client',
	SIGNAL: 'signal',
	DISCONNECT: 'disconnect',

	// Server → Client
	ROOM_CREATED: 'room-created',
	ROOM_JOINED: 'room-joined',
	JOIN_REQUEST: 'join-request',
	JOIN_PENDING: 'join-pending',
	JOIN_DENIED: 'join-denied',
	CLIENT_JOINED: 'client-joined',
	CLIENT_LEFT: 'client-left',
	HOST_DISCONNECTED: 'host-disconnected',
	ROOM_EXPIRED: 'room-expired',
	SIGNAL_FROM_PEER: 'signal',
	ERROR: 'error',
	WARNING: 'warning'
} as const;
