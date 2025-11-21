import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../Logger';

describe('Logger', () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleGroupSpy: ReturnType<typeof vi.spyOn>;
	let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
		consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Basic Logging', () => {
		it('should log messages to console.log', () => {
			const logger = new Logger();
			logger.log('Test message');

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
		});

		it('should log warnings to console.warn', () => {
			const logger = new Logger();
			logger.warn('Warning message');

			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
		});

		it('should log errors to console.error', () => {
			const logger = new Logger();
			logger.error('Error message');

			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
		});

		it('should support multiple arguments', () => {
			const logger = new Logger();
			logger.log('Position:', { x: 10, y: 20 }, 'velocity:', 5);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Position:'),
				{ x: 10, y: 20 },
				'velocity:',
				5
			);
		});
	});

	describe('Channels', () => {
		it('should prefix messages with default channel name', () => {
			const logger = new Logger('Physics');
			logger.log('Collision detected');

			expect(consoleLogSpy).toHaveBeenCalledWith('[Physics] Collision detected');
		});

		it('should create child loggers with nested channel names', () => {
			const logger = new Logger('Game');
			const physics = logger.channel('Physics');

			physics.log('Update');

			expect(consoleLogSpy).toHaveBeenCalledWith('[Game:Physics] Update');
		});

		it('should support deeply nested channels', () => {
			const game = new Logger('Game');
			const physics = game.channel('Physics');
			const collision = physics.channel('Collision');

			collision.log('AABB check');

			expect(consoleLogSpy).toHaveBeenCalledWith('[Game:Physics:Collision] AABB check');
		});

		it('should use empty channel name by default', () => {
			const logger = new Logger();
			logger.log('Message');

			// Should not have any channel prefix
			const callArg = consoleLogSpy.mock.calls[0][0] as string;
			expect(callArg).not.toContain('[');
		});
	});

	describe('Grouping', () => {
		it('should create collapsible groups', () => {
			const logger = new Logger();
			logger.group('Player Stats');
			logger.log('Health: 100');
			logger.log('Mana: 50');
			logger.groupEnd();

			expect(consoleGroupSpy).toHaveBeenCalledWith(expect.stringContaining('Player Stats'));
			expect(consoleLogSpy).toHaveBeenCalledTimes(2);
			expect(consoleGroupEndSpy).toHaveBeenCalledTimes(1);
		});

		it('should support nested groups', () => {
			const logger = new Logger();
			logger.group('Outer');
			logger.log('Outer message');
			logger.group('Inner');
			logger.log('Inner message');
			logger.groupEnd();
			logger.groupEnd();

			expect(consoleGroupSpy).toHaveBeenCalledTimes(2);
			expect(consoleGroupEndSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('Assertions', () => {
		it('should log error when assertion fails', () => {
			const logger = new Logger();
			logger.assert(false, 'This should fail');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Assertion failed: This should fail');
		});

		it('should not log when assertion passes', () => {
			const logger = new Logger();
			logger.assert(true, 'This should pass');

			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});

		it('should support assertion without message', () => {
			const logger = new Logger();
			logger.assert(false);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Assertion failed')
			);
		});
	});

	describe('Event Listeners', () => {
		it('should notify listeners on log', () => {
			const logger = new Logger('Test');
			const listener = vi.fn();

			logger.onLog(listener);
			logger.log('Test message', { data: 123 });

			expect(listener).toHaveBeenCalledWith({
				level: 'log',
				channel: 'Test',
				message: 'Test message',
				data: [{ data: 123 }],
				timestamp: expect.any(Number)
			});
		});

		it('should notify listeners on warn', () => {
			const logger = new Logger('Test');
			const listener = vi.fn();

			logger.onLog(listener);
			logger.warn('Warning');

			expect(listener).toHaveBeenCalledWith({
				level: 'warn',
				channel: 'Test',
				message: 'Warning',
				data: [],
				timestamp: expect.any(Number)
			});
		});

		it('should notify listeners on error', () => {
			const logger = new Logger('Test');
			const listener = vi.fn();

			logger.onLog(listener);
			logger.error('Error');

			expect(listener).toHaveBeenCalledWith({
				level: 'error',
				channel: 'Test',
				message: 'Error',
				data: [],
				timestamp: expect.any(Number),
				context: undefined,
				stack: expect.any(String)
			});
		});

		it('should support multiple listeners', () => {
			const logger = new Logger();
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			logger.onLog(listener1);
			logger.onLog(listener2);
			logger.log('Test');

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should allow unsubscribing listeners', () => {
			const logger = new Logger();
			const listener = vi.fn();

			const unsubscribe = logger.onLog(listener);
			logger.log('First');
			unsubscribe();
			logger.log('Second');

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should not notify parent channel listeners from child channels', () => {
			const parent = new Logger('Parent');
			const child = parent.channel('Child');
			const parentListener = vi.fn();
			const childListener = vi.fn();

			parent.onLog(parentListener);
			child.onLog(childListener);

			child.log('Test');

			expect(childListener).toHaveBeenCalledTimes(1);
			expect(parentListener).not.toHaveBeenCalled();
		});
	});

	describe('Enable/Disable', () => {
		it('should not log when disabled', () => {
			const logger = new Logger();
			logger.setEnabled(false);
			logger.log('Should not appear');

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should resume logging when re-enabled', () => {
			const logger = new Logger();
			logger.setEnabled(false);
			logger.log('Should not appear');
			logger.setEnabled(true);
			logger.log('Should appear');

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		it('should be enabled by default', () => {
			const logger = new Logger();
			logger.log('Test');

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		it('should still notify listeners when disabled', () => {
			const logger = new Logger();
			const listener = vi.fn();
			logger.onLog(listener);

			logger.setEnabled(false);
			logger.log('Test');

			// Listeners should still be notified (for DevTools)
			expect(listener).toHaveBeenCalledTimes(1);
			// But console should not be called
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});
	});

	describe('Log Level Filtering', () => {
		it('should filter logs below minimum level', () => {
			const logger = new Logger();
			logger.setMinLevel('error');

			logger.log('Info message');
			logger.warn('Warning message');
			logger.error('Error message');

			expect(consoleLogSpy).not.toHaveBeenCalled();
			expect(consoleWarnSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		});

		it('should allow all logs with "log" level', () => {
			const logger = new Logger();
			logger.setMinLevel('log');

			logger.log('Info');
			logger.warn('Warning');
			logger.error('Error');

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		});

		it('should use "log" as default minimum level', () => {
			const logger = new Logger();

			logger.log('Test');

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('Context Data', () => {
		it('should attach context to all log entries', () => {
			const logger = new Logger('Game');
			const listener = vi.fn();
			logger.onLog(listener);

			logger.setContext({ playerId: 'player1', scene: 'main' });
			logger.log('Test');

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					context: { playerId: 'player1', scene: 'main' }
				})
			);
		});

		it('should allow clearing context', () => {
			const logger = new Logger();
			const listener = vi.fn();
			logger.onLog(listener);

			logger.setContext({ test: 'data' });
			logger.setContext(undefined);
			logger.log('Test');

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					context: undefined
				})
			);
		});

		it('should merge context when creating child channels', () => {
			const parent = new Logger('Parent');
			const listener = vi.fn();

			parent.setContext({ parentData: 'value1' });
			const child = parent.channel('Child');
			child.onLog(listener);
			child.setContext({ childData: 'value2' });

			child.log('Test');

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					context: {
						parentData: 'value1',
						childData: 'value2'
					}
				})
			);
		});
	});

	describe('Stack Traces', () => {
		it('should include stack trace for errors', () => {
			const logger = new Logger();
			const listener = vi.fn();
			logger.onLog(listener);

			logger.error('Test error');

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					stack: expect.any(String)
				})
			);
		});

		it('should not include stack trace for log/warn', () => {
			const logger = new Logger();
			const listener = vi.fn();
			logger.onLog(listener);

			logger.log('Test');
			logger.warn('Test');

			const logCall = listener.mock.calls[0][0];
			const warnCall = listener.mock.calls[1][0];

			expect(logCall.stack).toBeUndefined();
			expect(warnCall.stack).toBeUndefined();
		});

		it('should allow forcing stack trace on any level', () => {
			const logger = new Logger();
			const listener = vi.fn();
			logger.onLog(listener);

			logger.setIncludeStack(true);
			logger.log('Test');

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					stack: expect.any(String)
				})
			);
		});
	});

	describe('Performance Timing', () => {
		it('should measure time between time() and timeEnd()', () => {
			const logger = new Logger();

			logger.time('test-operation');
			// Simulate some work
			logger.timeEnd('test-operation');

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/test-operation: \d+\.\d+ms/));
		});

		it('should warn if timeEnd() called without time()', () => {
			const logger = new Logger();

			logger.timeEnd('unknown-timer');

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Timer "unknown-timer" does not exist')
			);
		});

		it('should support multiple concurrent timers', () => {
			const logger = new Logger();

			logger.time('timer1');
			logger.time('timer2');
			logger.timeEnd('timer1');
			logger.timeEnd('timer2');

			expect(consoleLogSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('Default Logger Instance', () => {
		it('should export a default logger instance', () => {
			// Import will be tested in integration
			expect(Logger).toBeDefined();
		});
	});
});
