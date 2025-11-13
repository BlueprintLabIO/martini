import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColyseusTransport } from '../ColyseusTransport';
import type { Room } from 'colyseus.js';

// Mock Colyseus Room
class MockRoom {
	public id = 'test-room';
	public sessionId = 'session-123';
	private messageHandlers = new Map<string | number, Function>();
	private stateChangeHandlers: Function[] = [];
	private leaveHandlers: Function[] = [];
	private errorHandlers: Function[] = [];

	send(type: string | number, message?: any) {
		// Mock implementation
	}

	onMessage(type: string | number, callback: Function) {
		this.messageHandlers.set(type, callback);
	}

	onStateChange(callback: Function) {
		this.stateChangeHandlers.push(callback);
	}

	onLeave(callback: Function) {
		this.leaveHandlers.push(callback);
	}

	onError(callback: Function) {
		this.errorHandlers.push(callback);
	}

	leave(consented = true) {
		// Mock leave
	}

	// Test helpers
	simulateMessage(type: string | number, message: any) {
		const handler = this.messageHandlers.get(type);
		if (handler) {
			handler(message);
		}
	}

	simulateLeave(code?: number) {
		this.leaveHandlers.forEach(h => h(code));
	}

	simulateError(code: number, message?: string) {
		this.errorHandlers.forEach(h => h(code, message));
	}
}

describe('ColyseusTransport', () => {
	let mockRoom: MockRoom;

	beforeEach(() => {
		mockRoom = new MockRoom();
	});

	describe('Initialization', () => {
		it('should initialize with a Colyseus room', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			expect(transport.getPlayerId()).toBe('session-123');
			expect(transport.isHost()).toBe(false); // Not host until told
		});

		it('should use sessionId as playerId', () => {
			mockRoom.sessionId = 'player-456';
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			expect(transport.getPlayerId()).toBe('player-456');
		});
	});

	describe('Sending Messages', () => {
		it('should send messages through room.send()', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const sendSpy = vi.spyOn(mockRoom, 'send');

			transport.send({
				type: 'action',
				payload: { action: 'move', x: 10 }
			});

			expect(sendSpy).toHaveBeenCalledWith('martini', {
				type: 'action',
				payload: { action: 'move', x: 10 },
				senderId: 'session-123'
			});
		});

		it('should support targeted messages', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const sendSpy = vi.spyOn(mockRoom, 'send');

			transport.send({
				type: 'state_sync',
				payload: { state: {} }
			}, 'player-789');

			expect(sendSpy).toHaveBeenCalledWith('martini', {
				type: 'state_sync',
				payload: { state: {} },
				senderId: 'session-123',
				targetId: 'player-789'
			});
		});
	});

	describe('Receiving Messages', () => {
		it('should receive messages from room.onMessage()', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const handler = vi.fn();

			transport.onMessage(handler);

			mockRoom.simulateMessage('martini', {
				type: 'action',
				payload: { test: 'data' },
				senderId: 'other-player'
			});

			expect(handler).toHaveBeenCalledWith(
				{
					type: 'action',
					payload: { test: 'data' },
					senderId: 'other-player'
				},
				'other-player'
			);
		});

		it('should not receive own messages', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const handler = vi.fn();

			transport.onMessage(handler);

			mockRoom.simulateMessage('martini', {
				type: 'action',
				senderId: 'session-123' // Same as our sessionId
			});

			expect(handler).not.toHaveBeenCalled();
		});

		it('should support multiple message handlers', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			transport.onMessage(handler1);
			transport.onMessage(handler2);

			mockRoom.simulateMessage('martini', {
				type: 'action',
				senderId: 'other-player'
			});

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('should allow unsubscribing handlers', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const handler = vi.fn();

			const unsubscribe = transport.onMessage(handler);

			mockRoom.simulateMessage('martini', {
				type: 'action',
				senderId: 'other-player'
			});

			expect(handler).toHaveBeenCalledTimes(1);

			unsubscribe();

			mockRoom.simulateMessage('martini', {
				type: 'action',
				senderId: 'other-player'
			});

			expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
		});
	});

	describe('Peer Management', () => {
		it('should track peer joins', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const joinHandler = vi.fn();

			transport.onPeerJoin(joinHandler);

			mockRoom.simulateMessage('martini', {
				type: 'player_join',
				payload: { playerId: 'new-player' },
				senderId: 'server'
			});

			expect(joinHandler).toHaveBeenCalledWith('new-player');
			expect(transport.getPeerIds()).toContain('new-player');
		});

		it('should track peer leaves', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const leaveHandler = vi.fn();

			// Add a peer first
			mockRoom.simulateMessage('martini', {
				type: 'player_join',
				payload: { playerId: 'player-to-leave' },
				senderId: 'server'
			});

			transport.onPeerLeave(leaveHandler);

			mockRoom.simulateMessage('martini', {
				type: 'player_leave',
				payload: { playerId: 'player-to-leave' },
				senderId: 'server'
			});

			expect(leaveHandler).toHaveBeenCalledWith('player-to-leave');
			expect(transport.getPeerIds()).not.toContain('player-to-leave');
		});

		it('should return empty peer list initially', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			expect(transport.getPeerIds()).toEqual([]);
		});

		it('should not include self in peer list', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			mockRoom.simulateMessage('martini', {
				type: 'player_join',
				payload: { playerId: 'session-123' }, // Same as sessionId
				senderId: 'server'
			});

			expect(transport.getPeerIds()).not.toContain('session-123');
		});
	});

	describe('Host Management', () => {
		it('should recognize host from host_announce message', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			expect(transport.isHost()).toBe(false);

			mockRoom.simulateMessage('martini', {
				type: 'host_announce',
				hostId: 'session-123',
				senderId: 'server'
			});

			expect(transport.isHost()).toBe(true);
		});

		it('should recognize when another player is host', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			mockRoom.simulateMessage('martini', {
				type: 'host_announce',
				hostId: 'other-player',
				senderId: 'server'
			});

			expect(transport.isHost()).toBe(false);
		});

		it('should handle host migration', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			// Initially another player is host
			mockRoom.simulateMessage('martini', {
				type: 'host_announce',
				hostId: 'player-1',
				senderId: 'server'
			});

			expect(transport.isHost()).toBe(false);

			// Migrate to this player
			mockRoom.simulateMessage('martini', {
				type: 'host_announce',
				hostId: 'session-123',
				senderId: 'server'
			});

			expect(transport.isHost()).toBe(true);
		});
	});

	describe('Cleanup', () => {
		it('should disconnect and clean up', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const leaveSpy = vi.spyOn(mockRoom, 'leave');

			transport.disconnect();

			expect(leaveSpy).toHaveBeenCalledWith();
		});

		it('should remove all handlers on disconnect', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const handler = vi.fn();

			transport.onMessage(handler);
			transport.disconnect();

			mockRoom.simulateMessage('martini', {
				type: 'action',
				senderId: 'other-player'
			});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should provide error callback', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const errorHandler = vi.fn();

			transport.onError(errorHandler);

			mockRoom.simulateError(1000, 'Test error');

			expect(errorHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Test error')
				})
			);
		});

		it('should handle room leave event', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);
			const errorHandler = vi.fn();

			transport.onError(errorHandler);

			mockRoom.simulateLeave(4000);

			expect(errorHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Left')
				})
			);
		});
	});

	describe('Integration with Colyseus State', () => {
		it('should handle peers_list message from server', () => {
			const transport = new ColyseusTransport(mockRoom as unknown as Room);

			mockRoom.simulateMessage('martini', {
				type: 'peers_list',
				payload: { peers: ['player-1', 'player-2', 'session-123'] },
				senderId: 'server'
			});

			const peers = transport.getPeerIds();
			expect(peers).toContain('player-1');
			expect(peers).toContain('player-2');
			expect(peers).not.toContain('session-123'); // Don't include self
		});
	});
});
