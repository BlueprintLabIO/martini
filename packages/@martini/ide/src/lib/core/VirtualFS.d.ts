/**
 * VirtualFileSystem - Simple in-memory file system
 *
 * Phase 1: Simple Record<string, string> wrapper
 * Provides basic file operations for the IDE
 */
export declare class VirtualFileSystem {
    private files;
    constructor(initialFiles?: Record<string, string>);
    /**
     * Read a file's content
     */
    readFile(path: string): string | undefined;
    /**
     * Write a file's content
     */
    writeFile(path: string, content: string): void;
    /**
     * Delete a file
     */
    deleteFile(path: string): void;
    /**
     * Check if a file exists
     */
    exists(path: string): boolean;
    /**
     * Get all file paths
     */
    getFilePaths(): string[];
    /**
     * Get all files as a record
     */
    getAllFiles(): Record<string, string>;
    /**
     * Update multiple files at once
     */
    updateFiles(files: Record<string, string>): void;
    /**
     * Clear all files
     */
    clear(): void;
}
