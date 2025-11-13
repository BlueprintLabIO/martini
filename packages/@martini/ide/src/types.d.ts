/**
 * @martini/ide - Type definitions
 */
export interface MartiniIDEConfig {
    /** Initial project files (reactive - can be updated externally) */
    files: Record<string, string>;
    /** Game engine (Phase 1: Phaser only) */
    engine: 'phaser';
    /** Multiplayer transport (Phase 1: Local only) */
    transport: {
        type: 'local';
    };
    /** Layout mode */
    layout?: 'dual' | 'code-only';
    /** Editor settings */
    editor?: {
        theme?: 'dark' | 'light';
        fontSize?: number;
    };
    /** Callbacks */
    onChange?: (files: Record<string, string>) => void;
    onError?: (error: GameError) => void;
    onReady?: () => void;
    onRun?: () => void;
}
export interface GameError {
    type: 'syntax' | 'type' | 'runtime';
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string;
}
export interface TypeDiagnostic {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: number;
}
