/**
 * Logger - Unity-inspired logging system for Martini
 *
 * Provides structured logging with channels, levels, assertions, and DevTools integration.
 * Inspired by Unity's Debug class and browser console API.
 */

export type LogLevel = 'log' | 'warn' | 'error';

export interface LogEntry {
	level: LogLevel;
	channel: string;
	message: string;
	data: any[];
	timestamp: number;
	context?: Record<string, any>;
	stack?: string;
}

export type LogListener = (entry: LogEntry) => void;

export class Logger {
	private channelName: string;
	private listeners: LogListener[] = [];
	private enabled: boolean = true;
	private minLevel: LogLevel = 'log';
	private context?: Record<string, any>;
	private parentContext?: Record<string, any>;
	private includeStack: boolean = false;
	private timers: Map<string, number> = new Map();

	private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
		log: 0,
		warn: 1,
		error: 2
	};

	constructor(channel: string = '', parentContext?: Record<string, any>) {
		this.channelName = channel;
		this.parentContext = parentContext;
	}

	/**
	 * Log an informational message
	 */
	log(message: string, ...data: any[]): void {
		this.writeLog('log', message, data);
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, ...data: any[]): void {
		this.writeLog('warn', message, data);
	}

	/**
	 * Log an error message
	 */
	error(message: string, ...data: any[]): void {
		this.writeLog('error', message, data);
	}

	/**
	 * Create a collapsible group in the console
	 */
	group(label: string): void {
		if (this.enabled) {
			const formatted = this.formatMessage(label);
			console.group(formatted);
		}
	}

	/**
	 * End the current group
	 */
	groupEnd(): void {
		if (this.enabled) {
			console.groupEnd();
		}
	}

	/**
	 * Assert a condition, log error if false
	 */
	assert(condition: boolean, message?: string): void {
		if (!condition) {
			const assertMessage = message ? `Assertion failed: ${message}` : 'Assertion failed';
			this.writeLog('error', assertMessage, []);
		}
	}

	/**
	 * Start a performance timer
	 */
	time(label: string): void {
		this.timers.set(label, performance.now());
	}

	/**
	 * End a performance timer and log the duration
	 */
	timeEnd(label: string): void {
		const startTime = this.timers.get(label);

		if (startTime === undefined) {
			this.warn(`Timer "${label}" does not exist`);
			return;
		}

		const duration = performance.now() - startTime;
		this.timers.delete(label);

		if (this.enabled) {
			const formatted = this.formatMessage(`${label}: ${duration.toFixed(2)}ms`);
			console.log(formatted);
		}
	}

	/**
	 * Create a child logger with a nested channel name
	 */
	channel(name: string): Logger {
		const childChannel = this.channelName ? `${this.channelName}:${name}` : name;
		const mergedContext = this.getMergedContext();
		const child = new Logger(childChannel, mergedContext);
		child.enabled = this.enabled;
		child.minLevel = this.minLevel;
		child.includeStack = this.includeStack;
		return child;
	}

	/**
	 * Register a listener for log entries (used by DevTools)
	 */
	onLog(listener: LogListener): () => void {
		this.listeners.push(listener);

		// Return unsubscribe function
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index !== -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Enable or disable console output
	 * Note: Listeners are still notified when disabled (for DevTools)
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Set minimum log level (filters out lower priority logs)
	 */
	setMinLevel(level: LogLevel): void {
		this.minLevel = level;
	}

	/**
	 * Attach context data to all log entries
	 */
	setContext(context: Record<string, any> | undefined): void {
		this.context = context;
	}

	/**
	 * Include stack traces in all log entries
	 */
	setIncludeStack(include: boolean): void {
		this.includeStack = include;
	}

	/**
	 * Internal: Write a log entry
	 */
	private writeLog(level: LogLevel, message: string, data: any[]): void {
		// Check if this level should be logged
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			channel: this.channelName,
			message,
			data,
			timestamp: Date.now(),
			context: this.getMergedContext()
		};

		// Add stack trace if needed
		if (this.includeStack || level === 'error') {
			entry.stack = this.captureStack();
		}

		// Notify listeners (even if console is disabled)
		this.notifyListeners(entry);

		// Write to console if enabled
		if (this.enabled) {
			this.writeToConsole(level, message, data);
		}
	}

	/**
	 * Check if a log level should be output
	 */
	private shouldLog(level: LogLevel): boolean {
		const levelPriority = Logger.LEVEL_PRIORITY[level];
		const minPriority = Logger.LEVEL_PRIORITY[this.minLevel];
		return levelPriority >= minPriority;
	}

	/**
	 * Format message with channel prefix
	 */
	private formatMessage(message: string): string {
		if (this.channelName) {
			return `[${this.channelName}] ${message}`;
		}
		return message;
	}

	/**
	 * Write to browser console
	 */
	private writeToConsole(level: LogLevel, message: string, data: any[]): void {
		const formatted = this.formatMessage(message);

		switch (level) {
			case 'log':
				console.log(formatted, ...data);
				break;
			case 'warn':
				console.warn(formatted, ...data);
				break;
			case 'error':
				console.error(formatted, ...data);
				break;
		}
	}

	/**
	 * Notify all listeners
	 */
	private notifyListeners(entry: LogEntry): void {
		for (const listener of this.listeners) {
			try {
				listener(entry);
			} catch (err) {
				// Don't let listener errors break logging
				console.error('Error in log listener:', err);
			}
		}
	}

	/**
	 * Merge parent and local context
	 */
	private getMergedContext(): Record<string, any> | undefined {
		if (!this.parentContext && !this.context) {
			return undefined;
		}

		return {
			...this.parentContext,
			...this.context
		};
	}

	/**
	 * Capture current stack trace
	 */
	private captureStack(): string {
		const error = new Error();
		if (error.stack) {
			// Remove the first few lines (Error constructor, this function, writeLog)
			const lines = error.stack.split('\n');
			return lines.slice(3).join('\n');
		}
		return '';
	}
}

/**
 * Default logger instance
 */
export const logger = new Logger('Martini');
