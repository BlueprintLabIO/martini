/**
 * Logger - Unity-inspired logging system for martini-kit
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
export declare class Logger {
    private channelName;
    private listeners;
    private enabled;
    private minLevel;
    private context?;
    private parentContext?;
    private includeStack;
    private timers;
    private static readonly LEVEL_PRIORITY;
    constructor(channel?: string, parentContext?: Record<string, any>);
    /**
     * Log an informational message
     */
    log(message: string, ...data: any[]): void;
    /**
     * Log a warning message
     */
    warn(message: string, ...data: any[]): void;
    /**
     * Log an error message
     */
    error(message: string, ...data: any[]): void;
    /**
     * Create a collapsible group in the console
     */
    group(label: string): void;
    /**
     * End the current group
     */
    groupEnd(): void;
    /**
     * Assert a condition, log error if false
     */
    assert(condition: boolean, message?: string): void;
    /**
     * Start a performance timer
     */
    time(label: string): void;
    /**
     * End a performance timer and log the duration
     */
    timeEnd(label: string): void;
    /**
     * Create a child logger with a nested channel name
     */
    channel(name: string): Logger;
    /**
     * Register a listener for log entries (used by DevTools)
     */
    onLog(listener: LogListener): () => void;
    /**
     * Enable or disable console output
     * Note: Listeners are still notified when disabled (for DevTools)
     */
    setEnabled(enabled: boolean): void;
    /**
     * Set minimum log level (filters out lower priority logs)
     */
    setMinLevel(level: LogLevel): void;
    /**
     * Attach context data to all log entries
     */
    setContext(context: Record<string, any> | undefined): void;
    /**
     * Include stack traces in all log entries
     */
    setIncludeStack(include: boolean): void;
    /**
     * Internal: Write a log entry
     */
    private writeLog;
    /**
     * Check if a log level should be output
     */
    private shouldLog;
    /**
     * Format message with channel prefix
     */
    private formatMessage;
    /**
     * Write to browser console
     */
    private writeToConsole;
    /**
     * Notify all listeners
     */
    private notifyListeners;
    /**
     * Merge parent and local context
     */
    private getMergedContext;
    /**
     * Capture current stack trace
     */
    private captureStack;
}
/**
 * Default logger instance
 */
export declare const logger: Logger;
//# sourceMappingURL=Logger.d.ts.map