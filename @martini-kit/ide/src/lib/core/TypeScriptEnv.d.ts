/**
 * TypeScriptEnvironment - @typescript/vfs wrapper for type checking
 *
 * Provides TypeScript language services for autocomplete, type errors, etc.
 */
import ts from 'typescript';
import type { VirtualFileSystem } from './VirtualFS';
export interface TypeDiagnostic {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: number;
}
export declare class TypeScriptEnvironment {
    private env;
    private compilerOptions;
    constructor();
    /**
     * Initialize TypeScript environment with files from VFS
     */
    initialize(vfs: VirtualFileSystem): Promise<void>;
    /**
     * Update file content and re-check
     */
    updateFile(path: string, content: string): void;
    /**
     * Get type diagnostics for a file
     */
    getDiagnostics(filePath: string): TypeDiagnostic[];
    /**
     * Get all diagnostics for all files
     */
    getAllDiagnostics(vfs: VirtualFileSystem): TypeDiagnostic[];
    /**
     * Get completion suggestions at a position
     * (Phase 1: Basic implementation, can be enhanced later)
     */
    getCompletions(filePath: string, position: number): ts.CompletionEntry[];
    /**
     * Cleanup resources
     */
    dispose(): void;
}
