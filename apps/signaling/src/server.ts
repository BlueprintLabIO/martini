/**
 * WebRTC Signaling Server
 *
 * Facilitates peer-to-peer WebRTC connections by relaying SDP offers/answers
 * and ICE candidates between browsers. Uses Socket.IO for real-time communication.
 *
 * Key Features:
 * - Room-based architecture with 6-digit share codes
 * - Unlimited players per room (warns at 4+)
 * - Automatic cleanup of stale rooms (>1 hour)
 * - Host disconnect handling
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import type {
	Room,
	CreateRoomPayload,
	JoinRoomPayload,
	SignalPayload,
	ApproveClientPayload,
	RoomCreatedResponse,
	RoomJoinedResponse,
	JoinRequestNotification,
	JoinRequestStatus,
	ClientJoinedNotification,
	ClientLeftNotification,
	SignalFromPeer,
	ErrorResponse,
	WarningResponse
} from './types.js';
import { SocketEvents } from './types.js';

// Environment variables
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ROOM_MAX_AGE = 60 * 60 * 1000; // 1 hour
const ROOM_CODE_EXPIRATION = 15 * 60 * 1000; // 15 minutes
const PERFORMANCE_WARNING_THRESHOLD = 3; // Warn at 4+ total players (1 host + 3 clients)

// Express app for health checks
const app = express();
const server = createServer(app);

// Socket.IO server with CORS
const io = new Server(server, {
	cors: {
		origin: ALLOWED_ORIGINS,
		methods: ['GET', 'POST'],
		credentials: true
	},
	// Performance tuning
	pingTimeout: 30000,
	pingInterval: 25000,
	transports: ['websocket', 'polling']
});

// In-memory room storage
const rooms = new Map<string, Room>();

/**
 * Health check endpoint for monitoring
 */
app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		uptime: process.uptime(),
		roomCount: rooms.size,
		timestamp: new Date().toISOString()
	});
});

/**
 * Stats endpoint for debugging
 */
app.get('/stats', (req, res) => {
	const now = Date.now();
	const stats = {
		totalRooms: rooms.size,
		rooms: Array.from(rooms.entries()).map(([code, room]) => ({
			shareCode: code,
			activeClients: room.clients.size,
			pendingClients: room.pendingClients.size,
			totalPlayers: room.clients.size + 1, // +1 for host
			ageMinutes: Math.floor((now - room.createdAt) / 60000),
			expiresInMinutes: Math.floor((room.expiresAt - now) / 60000),
			expired: now > room.expiresAt
		}))
	};
	res.json(stats);
});

/**
 * Main Socket.IO connection handler
 */
io.on('connection', (socket: Socket) => {
	console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);

	/**
	 * HOST: Create a new room
	 */
	socket.on(SocketEvents.CREATE_ROOM, (payload: CreateRoomPayload) => {
		const { shareCode, hostId } = payload;

		// Validate share code format
		if (!shareCode || shareCode.length !== 6 || !/^[A-Z0-9]+$/.test(shareCode)) {
			const error: ErrorResponse = {
				message: 'Invalid share code. Must be 6 uppercase alphanumeric characters.',
				code: 'INVALID_SHARE_CODE'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Check if room already exists
		if (rooms.has(shareCode)) {
			const error: ErrorResponse = {
				message: 'Room already exists. Please generate a new share code.',
				code: 'ROOM_EXISTS'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Create room with expiration and pending clients
		const now = Date.now();
		const room: Room = {
			host: socket.id,
			clients: new Set(),
			pendingClients: new Set(),
			createdAt: now,
			expiresAt: now + ROOM_CODE_EXPIRATION,
			shareCode
		};

		rooms.set(shareCode, room);
		socket.join(shareCode);

		const response: RoomCreatedResponse = {
			shareCode,
			hostId: socket.id
		};

		socket.emit(SocketEvents.ROOM_CREATED, response);

		console.log(
			`[${new Date().toISOString()}] Room ${shareCode} created by ${hostId || socket.id} (expires in 15 minutes)`
		);
	});

	/**
	 * CLIENT: Request to join an existing room (lobby approval system)
	 */
	socket.on(SocketEvents.JOIN_ROOM, (payload: JoinRoomPayload) => {
		const { shareCode, clientId } = payload;

		const room = rooms.get(shareCode);

		if (!room) {
			const error: ErrorResponse = {
				message: 'Room not found. Please check the share code.',
				code: 'ROOM_NOT_FOUND'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Check if room code has expired
		if (Date.now() > room.expiresAt) {
			const error: ErrorResponse = {
				message: 'Room code has expired (15 minute limit). Host must create a new game.',
				code: 'ROOM_EXPIRED'
			};
			socket.emit(SocketEvents.ERROR, error);

			// Notify host that someone tried to join with expired code
			io.to(room.host).emit(SocketEvents.ROOM_EXPIRED);

			console.log(
				`[${new Date().toISOString()}] Client tried to join expired room ${shareCode}`
			);
			return;
		}

		// Add client to pending queue (lobby approval system)
		room.pendingClients.add(socket.id);

		// Notify host of join request
		const joinRequest: JoinRequestNotification = {
			clientId: socket.id,
			clientName: clientId
		};
		io.to(room.host).emit(SocketEvents.JOIN_REQUEST, joinRequest);

		// Notify client they are pending approval
		const pendingStatus: JoinRequestStatus = {
			pending: true,
			message: 'Waiting for host approval...'
		};
		socket.emit(SocketEvents.JOIN_PENDING, pendingStatus);

		console.log(
			`[${new Date().toISOString()}] Client ${clientId || socket.id} requesting to join room ${shareCode} (pending approval)`
		);
	});

	/**
	 * HOST: Approve a client to join
	 */
	socket.on(SocketEvents.APPROVE_CLIENT, (payload: ApproveClientPayload) => {
		const { shareCode, clientId } = payload;

		const room = rooms.get(shareCode);

		if (!room || room.host !== socket.id) {
			const error: ErrorResponse = {
				message: 'You are not the host of this room.',
				code: 'NOT_HOST'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Check if client is in pending queue
		if (!room.pendingClients.has(clientId)) {
			const error: ErrorResponse = {
				message: 'Client is not in pending queue.',
				code: 'CLIENT_NOT_PENDING'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Move client from pending to active
		room.pendingClients.delete(clientId);
		room.clients.add(clientId);

		// Add client to Socket.IO room
		io.sockets.sockets.get(clientId)?.join(shareCode);

		const playerCount = room.clients.size + 1; // +1 for host

		// Performance warning at 4+ players
		if (room.clients.size >= PERFORMANCE_WARNING_THRESHOLD) {
			const warning: WarningResponse = {
				message: `${playerCount} players connected. Performance may degrade with many players.`
			};
			io.to(clientId).emit(SocketEvents.WARNING, warning);
		}

		// Notify approved client
		const response: RoomJoinedResponse = {
			shareCode,
			playerCount
		};
		io.to(clientId).emit(SocketEvents.ROOM_JOINED, response);

		// Notify host
		const hostNotification: ClientJoinedNotification = {
			clientId,
			playerCount
		};
		io.to(room.host).emit(SocketEvents.CLIENT_JOINED, hostNotification);

		console.log(
			`[${new Date().toISOString()}] Client ${clientId} approved and joined room ${shareCode} (${playerCount} players)`
		);
	});

	/**
	 * HOST: Deny a client from joining
	 */
	socket.on(SocketEvents.DENY_CLIENT, (payload: ApproveClientPayload) => {
		const { shareCode, clientId } = payload;

		const room = rooms.get(shareCode);

		if (!room || room.host !== socket.id) {
			const error: ErrorResponse = {
				message: 'You are not the host of this room.',
				code: 'NOT_HOST'
			};
			socket.emit(SocketEvents.ERROR, error);
			return;
		}

		// Check if client is in pending queue
		if (!room.pendingClients.has(clientId)) {
			return; // Silently ignore if not pending
		}

		// Remove from pending queue
		room.pendingClients.delete(clientId);

		// Notify denied client
		const error: ErrorResponse = {
			message: 'Host denied your request to join.',
			code: 'JOIN_DENIED'
		};
		io.to(clientId).emit(SocketEvents.JOIN_DENIED, error);

		console.log(
			`[${new Date().toISOString()}] Client ${clientId} denied from room ${shareCode}`
		);
	});

	/**
	 * Forward WebRTC signals between peers
	 */
	socket.on(SocketEvents.SIGNAL, (payload: SignalPayload) => {
		const { shareCode, signal, targetId } = payload;

		const room = rooms.get(shareCode);
		if (!room) {
			console.warn(`[${new Date().toISOString()}] Signal sent to non-existent room: ${shareCode}`);
			return;
		}

		const signalData: SignalFromPeer = {
			signal,
			from: socket.id
		};

		if (targetId) {
			// Direct signal to specific peer
			io.to(targetId).emit(SocketEvents.SIGNAL_FROM_PEER, signalData);
			console.log(
				`[${new Date().toISOString()}] Signal forwarded in ${shareCode}: ${socket.id} → ${targetId}`
			);
		} else {
			// Broadcast to entire room (except sender)
			socket.to(shareCode).emit(SocketEvents.SIGNAL_FROM_PEER, signalData);
			console.log(
				`[${new Date().toISOString()}] Signal broadcast in ${shareCode} from ${socket.id}`
			);
		}
	});

	/**
	 * Handle client disconnect
	 */
	socket.on(SocketEvents.DISCONNECT, () => {
		console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}`);

		// Find and clean up rooms
		rooms.forEach((room, shareCode) => {
			if (room.host === socket.id) {
				// Host left - notify all clients (active and pending) and close room
				io.to(shareCode).emit(SocketEvents.HOST_DISCONNECTED);

				// Notify pending clients
				room.pendingClients.forEach((pendingId) => {
					io.to(pendingId).emit(SocketEvents.HOST_DISCONNECTED);
				});

				rooms.delete(shareCode);
				console.log(
					`[${new Date().toISOString()}] Room ${shareCode} closed (host ${socket.id} left)`
				);
			} else if (room.clients.has(socket.id)) {
				// Active client left - notify host
				room.clients.delete(socket.id);

				const notification: ClientLeftNotification = {
					clientId: socket.id,
					playerCount: room.clients.size + 1
				};
				io.to(room.host).emit(SocketEvents.CLIENT_LEFT, notification);

				console.log(
					`[${new Date().toISOString()}] Client ${socket.id} left room ${shareCode} (${room.clients.size + 1} players remaining)`
				);
			} else if (room.pendingClients.has(socket.id)) {
				// Pending client left - just remove silently
				room.pendingClients.delete(socket.id);

				console.log(
					`[${new Date().toISOString()}] Pending client ${socket.id} disconnected from room ${shareCode}`
				);
			}
		});
	});
});

/**
 * Periodic cleanup of stale rooms (>1 hour old or expired codes)
 */
setInterval(() => {
	const now = Date.now();
	let cleanedCount = 0;
	let expiredCount = 0;

	rooms.forEach((room, shareCode) => {
		// Clean up old rooms (>1 hour)
		if (now - room.createdAt > ROOM_MAX_AGE) {
			// Notify all players (active and pending)
			io.to(shareCode).emit(SocketEvents.HOST_DISCONNECTED);
			room.pendingClients.forEach((pendingId) => {
				io.to(pendingId).emit(SocketEvents.HOST_DISCONNECTED);
			});

			rooms.delete(shareCode);
			cleanedCount++;
			console.log(
				`[${new Date().toISOString()}] Cleaned up stale room: ${shareCode} (age: ${Math.floor((now - room.createdAt) / 60000)} minutes)`
			);
		}
		// Also check for expired codes (>15 minutes) but keep room if game already started
		else if (now > room.expiresAt && room.clients.size === 0) {
			// Code expired and no players joined yet - clean up
			io.to(room.host).emit(SocketEvents.ROOM_EXPIRED);

			// Notify any pending clients
			room.pendingClients.forEach((pendingId) => {
				io.to(pendingId).emit(SocketEvents.ROOM_EXPIRED);
			});

			rooms.delete(shareCode);
			expiredCount++;
			console.log(
				`[${new Date().toISOString()}] Cleaned up expired room: ${shareCode} (no players joined within 15 minutes)`
			);
		}
	});

	if (cleanedCount > 0 || expiredCount > 0) {
		console.log(
			`[${new Date().toISOString()}] Cleanup: ${cleanedCount} stale room(s), ${expiredCount} expired code(s). Active rooms: ${rooms.size}`
		);
	}
}, ROOM_CLEANUP_INTERVAL);

/**
 * Start server
 */
server.listen(PORT, () => {
	console.log(`
╔════════════════════════════════════════════════════════════╗
║  🎮 Signaling Server Running                              ║
╟────────────────────────────────────────────────────────────╢
║  Port:           ${PORT.toString().padEnd(40)} ║
║  CORS Origins:   ${ALLOWED_ORIGINS[0].padEnd(40)} ║
║  Cleanup:        Every ${(ROOM_CLEANUP_INTERVAL / 60000).toString()} minutes (rooms >1 hour old)${' '.repeat(8)} ║
║  Max Room Age:   ${(ROOM_MAX_AGE / 60000).toString()} minutes${' '.repeat(40)} ║
╟────────────────────────────────────────────────────────────╢
║  Health:         http://localhost:${PORT}/health${' '.repeat(20)} ║
║  Stats:          http://localhost:${PORT}/stats${' '.repeat(21)} ║
╚════════════════════════════════════════════════════════════╝
	`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
	console.log('\n[SIGTERM] Shutting down gracefully...');

	// Notify all connected clients
	io.emit(SocketEvents.HOST_DISCONNECTED);

	server.close(() => {
		console.log('[SHUTDOWN] Server closed');
		process.exit(0);
	});

	// Force shutdown after 10s
	setTimeout(() => {
		console.error('[SHUTDOWN] Forced shutdown after timeout');
		process.exit(1);
	}, 10000);
});

process.on('SIGINT', () => {
	console.log('\n[SIGINT] Shutting down gracefully...');

	// Notify all connected clients
	io.emit(SocketEvents.HOST_DISCONNECTED);

	server.close(() => {
		console.log('[SHUTDOWN] Server closed');
		process.exit(0);
	});

	// Force shutdown after 10s
	setTimeout(() => {
		console.error('[SHUTDOWN] Forced shutdown after timeout');
		process.exit(1);
	}, 10000);
});
