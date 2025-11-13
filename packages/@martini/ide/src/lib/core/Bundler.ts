/**
 * Bundler - esbuild-wasm wrapper for in-browser TypeScript compilation
 *
 * Takes TypeScript/JavaScript files and bundles them into a single executable module
 */

import * as esbuild from 'esbuild-wasm';
import type { VirtualFileSystem } from './VirtualFS';

export interface BundleResult {
	code: string;
	errors: BundleError[];
	warnings: BundleError[];
}

export interface BundleError {
	message: string;
	file?: string;
	line?: number;
	column?: number;
}

// Global flag to track if esbuild has been initialized (singleton per page)
let esbuildInitialized = false;

export class Bundler {
	/**
	 * Initialize esbuild-wasm (singleton - only once per page)
	 * Must be called once before bundling
	 */
	async initialize(): Promise<void> {
		if (esbuildInitialized) {
			console.log('[Bundler] esbuild already initialized, skipping');
			return;
		}

		console.log('[Bundler] Initializing esbuild-wasm...');
		await esbuild.initialize({
			wasmURL: 'https://unpkg.com/esbuild-wasm@0.27.0/esbuild.wasm'
		});

		esbuildInitialized = true;
		console.log('[Bundler] esbuild initialized successfully');
	}

	/**
	 * Bundle files from virtual file system
	 *
	 * @param vfs Virtual file system containing source files
	 * @param entryPoint Entry point file path (e.g., '/src/main.ts')
	 * @param globals Global variable mappings for imports
	 */
	async bundle(
		vfs: VirtualFileSystem,
		entryPoint: string,
		globals: Record<string, string> = {}
	): Promise<BundleResult> {
		if (!esbuildInitialized) {
			throw new Error('Bundler not initialized. Call initialize() first.');
		}

		try {
			// Create plugin to resolve files from VFS
			const vfsPlugin: esbuild.Plugin = {
				name: 'vfs',
				setup(build) {
					// Resolve imports
					build.onResolve({ filter: /.*/ }, (args) => {
						// Handle relative imports
						if (args.path.startsWith('.')) {
							const dir = args.importer.substring(0, args.importer.lastIndexOf('/'));
							let resolved = resolvePath(dir, args.path);

							// Add .ts extension if not present and file doesn't exist
							if (!resolved.match(/\.(ts|js|tsx|jsx)$/)) {
								// Try with .ts extension first
								const withTs = resolved + '.ts';
								if (vfs.readFile(withTs) !== undefined) {
									resolved = withTs;
								} else {
									// Try with .js extension
									const withJs = resolved + '.js';
									if (vfs.readFile(withJs) !== undefined) {
										resolved = withJs;
									} else {
										// Default to .ts
										resolved = withTs;
									}
								}
							}

							return { path: resolved, namespace: 'vfs' };
						}

						// Handle absolute imports
						if (args.path.startsWith('/')) {
							let resolved = args.path;

							// Add .ts extension if not present
							if (!resolved.match(/\.(ts|js|tsx|jsx)$/)) {
								const withTs = resolved + '.ts';
								if (vfs.readFile(withTs) !== undefined) {
									resolved = withTs;
								} else {
									const withJs = resolved + '.js';
									if (vfs.readFile(withJs) !== undefined) {
										resolved = withJs;
									} else {
										resolved = withTs;
									}
								}
							}

							return { path: resolved, namespace: 'vfs' };
						}

						// Handle external modules (from globals)
						if (args.path in globals) {
							return { path: args.path, namespace: 'global' };
						}

						return { path: args.path, namespace: 'vfs' };
					});

					// Load files from VFS
					build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
						const content = vfs.readFile(args.path);

						if (content === undefined) {
							return {
								errors: [{ text: `File not found: ${args.path}` }]
							};
						}

						// Determine loader based on file extension
						const ext = args.path.split('.').pop();
						const loader = ext === 'ts' || ext === 'tsx' ? 'ts' : 'js';

						return {
							contents: content,
							loader
						};
					});

					// Replace global imports with actual globals
					build.onLoad({ filter: /.*/, namespace: 'global' }, (args) => {
						const globalVar = globals[args.path];

						// For @martini/core and @martini/phaser, we need to re-export all named exports
						// from the window.MartiniMultiplayer global object
						if (args.path === '@martini/core' || args.path === '@martini/phaser') {
							return {
								contents: `
									// Re-export all named exports from MartiniMultiplayer
									export const defineGame = ${globalVar}.defineGame;
									export const GameRuntime = ${globalVar}.GameRuntime;
									export const TrysteroTransport = ${globalVar}.TrysteroTransport;
									export const LocalTransport = ${globalVar}.LocalTransport;
									export const IframeBridgeTransport = ${globalVar}.IframeBridgeTransport;
									export const IframeBridgeRelay = ${globalVar}.IframeBridgeRelay;
									export const PhaserAdapter = ${globalVar}.PhaserAdapter;
									export const initializeGame = ${globalVar}.initializeGame;
									export const generateDiff = ${globalVar}.generateDiff;
									export const applyPatch = ${globalVar}.applyPatch;
									export default ${globalVar};
								`,
								loader: 'js'
							};
						}

						// For phaser, just export the global Phaser object
						if (args.path === 'phaser') {
							return {
								contents: `export default ${globalVar};`,
								loader: 'js'
							};
						}

						// Default: export as default
						return {
							contents: `export default ${globalVar};`,
							loader: 'js'
						};
					});
				}
			};

			// Bundle the code
			const result = await esbuild.build({
				stdin: {
					contents: `import '${entryPoint}';`,
					loader: 'js',
					resolveDir: '/'
				},
				bundle: true,
				write: false,
				format: 'iife',
				target: 'es2020',
				plugins: [vfsPlugin],
				logLevel: 'silent'
			});

			const code = result.outputFiles?.[0]?.text || '';

			return {
				code,
				errors: result.errors.map(formatError),
				warnings: result.warnings.map(formatError)
			};
		} catch (error) {
			return {
				code: '',
				errors: [
					{
						message: error instanceof Error ? error.message : 'Unknown bundling error'
					}
				],
				warnings: []
			};
		}
	}

	/**
	 * Cleanup esbuild resources
	 */
	stop(): void {
		// esbuild-wasm doesn't require explicit cleanup in browser
	}
}

/**
 * Resolve relative path
 */
function resolvePath(dir: string, relative: string): string {
	const parts = dir.split('/').filter(Boolean);

	relative.split('/').forEach((part) => {
		if (part === '..') {
			parts.pop();
		} else if (part !== '.') {
			parts.push(part);
		}
	});

	return '/' + parts.join('/');
}

/**
 * Format esbuild error
 */
function formatError(err: esbuild.Message): BundleError {
	return {
		message: err.text,
		file: err.location?.file,
		line: err.location?.line,
		column: err.location?.column
	};
}
