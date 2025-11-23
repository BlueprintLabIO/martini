/**
 * VirtualFileSystem - In-memory file + folder graph
 *
 * Tracks folders separately so empty folders are representable.
 */
export declare class VirtualFileSystem {
    private files;
    private folders;
    constructor(initialFiles?: Record<string, string>, initialFolders?: string[]);
    /**
     * Read a file's content
     */
    readFile(path: string): string | undefined;
    /**
     * Write a file's content (creates file if missing)
     */
    writeFile(path: string, content: string): void;
    /**
     * Create a file if it does not exist
     */
    createFile(path: string, content?: string): void;
    /**
     * Create a folder (empty folders are supported)
     */
    createFolder(path: string): void;
    /**
     * Delete a file or folder (recursive for folders)
     */
    deletePath(path: string): void;
    /**
     * Rename or move a file/folder
     */
    renamePath(oldPath: string, newPath: string): void;
    /**
     * Check if a file or folder exists
     */
    exists(path: string): boolean;
    /**
     * Get all file paths
     */
    getFilePaths(): string[];
    /**
     * Get all folder paths
     */
    getFolderPaths(): string[];
    /**
     * Get all paths (files + folders)
     */
    getAllPaths(): string[];
    /**
     * Get all files as a record
     */
    getAllFiles(): Record<string, string>;
    /**
     * Update multiple files at once (rebuilds folder graph)
     */
    updateFiles(files: Record<string, string>): void;
    /**
     * Clear all files and folders
     */
    clear(): void;
    /**
     * Clone the VFS (preserves empty folders)
     */
    clone(): VirtualFileSystem;
    private normalizePath;
    private normalizeFolderPath;
    private ensureParentFolders;
}
