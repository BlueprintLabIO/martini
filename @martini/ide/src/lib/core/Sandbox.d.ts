/**
 * Sandbox - Iframe manager for isolated game execution
 *
 * Based on Vesper's GamePreview pattern
 * Runs bundled code in a sandboxed iframe with controlled messaging
 */
export interface SandboxOptions {
    /** Container element for the iframe */
    container: HTMLElement;
    /** CDN scripts to load (e.g., Phaser) */
    scripts: string[];
    /** Global variable mappings */
    globals: Record<string, string>;
    /** Error callback */
    onError?: (error: GameError) => void;
    /** Ready callback */
    onReady?: () => void;
    /** Console log callback */
    onLog?: (message: string) => void;
}
export interface GameError {
    type: 'runtime' | 'syntax';
    message: string;
    stack?: string;
}
export declare class Sandbox {
    private iframe;
    private options;
    private messageHandler;
    constructor(options: SandboxOptions);
    /**
     * Create and initialize the sandbox iframe
     */
    create(): Promise<void>;
    /**
     * Run bundled code in the sandbox
     */
    run(bundledCode: string): Promise<void>;
    /**
     * Destroy the sandbox
     */
    destroy(): void;
    /**
     * Write initial HTML to iframe
     */
    private writeInitialHTML;
}
