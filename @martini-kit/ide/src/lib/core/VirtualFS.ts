/**
 * VirtualFileSystem - In-memory file + folder graph
 *
 * Tracks folders separately so empty folders are representable.
 */
export class VirtualFileSystem {
	private files: Record<string, string>;
	private folders: Set<string>;

	constructor(initialFiles: Record<string, string> = {}, initialFolders: string[] = []) {
		this.files = {};
		this.folders = new Set<string>();

		// Seed files and infer folders from paths
		for (const [path, content] of Object.entries(initialFiles)) {
			const normalized = this.normalizePath(path);
			this.files[normalized] = content;
			this.ensureParentFolders(normalized);
		}

		// Seed explicit folders
		for (const folder of initialFolders) {
			const normalized = this.normalizeFolderPath(folder);
			this.folders.add(normalized);
			this.ensureParentFolders(normalized);
		}
	}

	/**
	 * Read a file's content
	 */
	readFile(path: string): string | undefined {
		return this.files[this.normalizePath(path)];
	}

	/**
	 * Write a file's content (creates file if missing)
	 */
	writeFile(path: string, content: string): void {
		const normalized = this.normalizePath(path);
		this.ensureParentFolders(normalized);
		this.files[normalized] = content;
	}

	/**
	 * Create a file if it does not exist
	 */
	createFile(path: string, content = ''): void {
		const normalized = this.normalizePath(path);
		if (this.exists(normalized)) {
			throw new Error(`Path already exists: ${normalized}`);
		}
		this.writeFile(normalized, content);
	}

	/**
	 * Create a folder (empty folders are supported)
	 */
	createFolder(path: string): void {
		const normalized = this.normalizeFolderPath(path);
		if (this.exists(normalized)) {
			throw new Error(`Path already exists: ${normalized}`);
		}
		this.ensureParentFolders(normalized);
		this.folders.add(normalized);
	}

	/**
	 * Delete a file or folder (recursive for folders)
	 */
	deletePath(path: string): void {
		const normalized = this.normalizePath(path);
		const isFile = normalized in this.files;
		const isFolder = this.folders.has(normalized);

		if (!isFile && !isFolder) {
			return;
		}

		if (isFile) {
			delete this.files[normalized];
		}

		if (isFolder) {
			// Remove folder and any nested folders/files
			this.folders.delete(normalized);
			for (const folder of [...this.folders]) {
				if (folder.startsWith(normalized + '/')) {
					this.folders.delete(folder);
				}
			}
			for (const filePath of Object.keys(this.files)) {
				if (filePath.startsWith(normalized + '/')) {
					delete this.files[filePath];
				}
			}
		}
	}

	/**
	 * Rename or move a file/folder
	 */
	renamePath(oldPath: string, newPath: string): void {
		const from = this.normalizePath(oldPath);
		const to = this.normalizePath(newPath);

		if (!this.exists(from)) {
			throw new Error(`Path does not exist: ${from}`);
		}

		if (this.exists(to)) {
			throw new Error(`Target already exists: ${to}`);
		}

		const isFile = from in this.files;
		const isFolder = this.folders.has(from);

		if (isFile) {
			const content = this.files[from];
			delete this.files[from];
			this.ensureParentFolders(to);
			this.files[to] = content;
		} else if (isFolder) {
			// Move folder entry
			this.folders.delete(from);
			this.folders.add(this.normalizeFolderPath(to));

			// Move nested folders
			for (const folder of [...this.folders]) {
				if (folder.startsWith(from + '/')) {
					const updated = folder.replace(from, to);
					this.folders.delete(folder);
					this.folders.add(updated);
				}
			}

			// Move nested files
			for (const filePath of Object.keys(this.files)) {
				if (filePath === from || filePath.startsWith(from + '/')) {
					const updated = filePath.replace(from, to);
					this.files[updated] = this.files[filePath];
					delete this.files[filePath];
				}
			}
		}
	}

	/**
	 * Check if a file or folder exists
	 */
	exists(path: string): boolean {
		const normalized = this.normalizePath(path);
		return normalized in this.files || this.folders.has(normalized);
	}

	/**
	 * Get all file paths
	 */
	getFilePaths(): string[] {
		return Object.keys(this.files);
	}

	/**
	 * Get all folder paths
	 */
	getFolderPaths(): string[] {
		return Array.from(this.folders);
	}

	/**
	 * Get all paths (files + folders)
	 */
	getAllPaths(): string[] {
		return [...this.getFolderPaths(), ...this.getFilePaths()];
	}

	/**
	 * Get all files as a record
	 */
	getAllFiles(): Record<string, string> {
		return { ...this.files };
	}

	/**
	 * Update multiple files at once (rebuilds folder graph)
	 */
	updateFiles(files: Record<string, string>): void {
		this.files = {};
		this.folders = new Set<string>();
		for (const [path, content] of Object.entries(files)) {
			const normalized = this.normalizePath(path);
			this.files[normalized] = content;
			this.ensureParentFolders(normalized);
		}
	}

	/**
	 * Clear all files and folders
	 */
	clear(): void {
		this.files = {};
		this.folders = new Set<string>();
	}

	/**
	 * Clone the VFS (preserves empty folders)
	 */
	clone(): VirtualFileSystem {
		return new VirtualFileSystem(this.getAllFiles(), this.getFolderPaths());
	}

	private normalizePath(path: string): string {
		if (!path) return '/';
		return path.startsWith('/') ? path : `/${path}`;
	}

	private normalizeFolderPath(path: string): string {
		const normalized = this.normalizePath(path);
		return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
	}

	private ensureParentFolders(path: string): void {
		const parts = this.normalizePath(path).split('/').filter(Boolean);
		let current = '';
		for (let i = 0; i < parts.length - 1; i++) {
			current += `/${parts[i]}`;
			this.folders.add(this.normalizeFolderPath(current));
		}
	}
}
