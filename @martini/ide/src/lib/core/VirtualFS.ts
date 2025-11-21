/**
 * VirtualFileSystem - Simple in-memory file system
 *
 * Phase 1: Simple Record<string, string> wrapper
 * Provides basic file operations for the IDE
 */

export class VirtualFileSystem {
	private files: Record<string, string>;

	constructor(initialFiles: Record<string, string> = {}) {
		this.files = { ...initialFiles };
	}

	/**
	 * Read a file's content
	 */
	readFile(path: string): string | undefined {
		return this.files[path];
	}

	/**
	 * Write a file's content
	 */
	writeFile(path: string, content: string): void {
		this.files[path] = content;
	}

	/**
	 * Delete a file
	 */
	deleteFile(path: string): void {
		delete this.files[path];
	}

	/**
	 * Check if a file exists
	 */
	exists(path: string): boolean {
		return path in this.files;
	}

	/**
	 * Get all file paths
	 */
	getFilePaths(): string[] {
		return Object.keys(this.files);
	}

	/**
	 * Get all files as a record
	 */
	getAllFiles(): Record<string, string> {
		return { ...this.files };
	}

	/**
	 * Update multiple files at once
	 */
	updateFiles(files: Record<string, string>): void {
		this.files = { ...this.files, ...files };
	}

	/**
	 * Clear all files
	 */
	clear(): void {
		this.files = {};
	}
}
