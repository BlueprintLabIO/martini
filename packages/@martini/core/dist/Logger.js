/**
 * Logger - Unity-inspired logging system for Martini
 *
 * Provides structured logging with channels, levels, assertions, and DevTools integration.
 * Inspired by Unity's Debug class and browser console API.
 */
export class Logger {
    channelName;
    listeners = [];
    enabled = true;
    minLevel = 'log';
    context;
    parentContext;
    includeStack = false;
    timers = new Map();
    static LEVEL_PRIORITY = {
        log: 0,
        warn: 1,
        error: 2
    };
    constructor(channel = '', parentContext) {
        this.channelName = channel;
        this.parentContext = parentContext;
    }
    /**
     * Log an informational message
     */
    log(message, ...data) {
        this.writeLog('log', message, data);
    }
    /**
     * Log a warning message
     */
    warn(message, ...data) {
        this.writeLog('warn', message, data);
    }
    /**
     * Log an error message
     */
    error(message, ...data) {
        this.writeLog('error', message, data);
    }
    /**
     * Create a collapsible group in the console
     */
    group(label) {
        if (this.enabled) {
            const formatted = this.formatMessage(label);
            console.group(formatted);
        }
    }
    /**
     * End the current group
     */
    groupEnd() {
        if (this.enabled) {
            console.groupEnd();
        }
    }
    /**
     * Assert a condition, log error if false
     */
    assert(condition, message) {
        if (!condition) {
            const assertMessage = message ? `Assertion failed: ${message}` : 'Assertion failed';
            this.writeLog('error', assertMessage, []);
        }
    }
    /**
     * Start a performance timer
     */
    time(label) {
        this.timers.set(label, performance.now());
    }
    /**
     * End a performance timer and log the duration
     */
    timeEnd(label) {
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
    channel(name) {
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
    onLog(listener) {
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
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Set minimum log level (filters out lower priority logs)
     */
    setMinLevel(level) {
        this.minLevel = level;
    }
    /**
     * Attach context data to all log entries
     */
    setContext(context) {
        this.context = context;
    }
    /**
     * Include stack traces in all log entries
     */
    setIncludeStack(include) {
        this.includeStack = include;
    }
    /**
     * Internal: Write a log entry
     */
    writeLog(level, message, data) {
        // Check if this level should be logged
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
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
    shouldLog(level) {
        const levelPriority = Logger.LEVEL_PRIORITY[level];
        const minPriority = Logger.LEVEL_PRIORITY[this.minLevel];
        return levelPriority >= minPriority;
    }
    /**
     * Format message with channel prefix
     */
    formatMessage(message) {
        if (this.channelName) {
            return `[${this.channelName}] ${message}`;
        }
        return message;
    }
    /**
     * Write to browser console
     */
    writeToConsole(level, message, data) {
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
    notifyListeners(entry) {
        for (const listener of this.listeners) {
            try {
                listener(entry);
            }
            catch (err) {
                // Don't let listener errors break logging
                console.error('Error in log listener:', err);
            }
        }
    }
    /**
     * Merge parent and local context
     */
    getMergedContext() {
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
    captureStack() {
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
//# sourceMappingURL=Logger.js.map