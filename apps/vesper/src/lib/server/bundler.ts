/**
 * Shared TypeScript/JavaScript bundler using esbuild
 *
 * Bundles project source files from the database into a single IIFE bundle
 * that can be executed in the browser sandbox.
 */

import * as esbuild from 'esbuild';

export interface SourceFile {
	path: string;
	content: string;
}

export interface BundleResult {
	success: boolean;
	code?: string;
	error?: string;
	details?: string;
}

/**
 * Bundle project source files into executable JavaScript
 *
 * @param sourceFiles - Array of TypeScript/JavaScript files
 * @returns Bundled code or error
 */
export async function bundleProjectFiles(sourceFiles: SourceFile[]): Promise<BundleResult> {
	// Validate source files
	if (sourceFiles.length === 0) {
		return { success: false, error: 'No source files found in /src/' };
	}

	// Find entry point (main.ts or main.js)
	const entryFile = sourceFiles.find((f) => f.path === '/src/main.ts' || f.path === '/src/main.js');

	if (!entryFile) {
		return { success: false, error: 'Entry point /src/main.ts or /src/main.js not found' };
	}

	try {
		// Create virtual file system for esbuild
		const fileMap = new Map<string, string>();
		sourceFiles.forEach((file) => {
			// Remove leading slash for esbuild
			const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
			fileMap.set(path, file.content);
		});

		// esbuild plugin to resolve virtual files and globals
		const virtualPlugin: esbuild.Plugin = {
			name: 'virtual-files',
			setup(build) {
				// Handle @martini/* imports (map to global MartiniMultiplayer)
				build.onResolve({ filter: /^@martini\/(phaser|core)$/ }, (args) => {
					return { path: args.path, namespace: 'martini-global' };
				});

				build.onLoad({ filter: /.*/, namespace: 'martini-global' }, (args) => {
					// Map @martini imports to global MartiniMultiplayer
					return {
						contents: `
							export const defineGame = window.MartiniMultiplayer.defineGame;
							export const GameRuntime = window.MartiniMultiplayer.GameRuntime;
							export const PhaserAdapter = window.MartiniMultiplayer.PhaserAdapter;
							export const TrysteroTransport = window.MartiniMultiplayer.TrysteroTransport;
						`,
						loader: 'js'
					};
				});

				// Handle phaser import (map to global Phaser)
				build.onResolve({ filter: /^phaser$/ }, (args) => {
					return { path: args.path, namespace: 'phaser-global' };
				});

				build.onLoad({ filter: /.*/, namespace: 'phaser-global' }, () => {
					return {
						contents: 'export default window.Phaser;',
						loader: 'js'
					};
				});

				// Resolve file paths
				build.onResolve({ filter: /.*/ }, (args) => {
					// Handle relative imports
					if (args.path.startsWith('./') || args.path.startsWith('../')) {
						// Get directory of the importing file
						const importerDir = args.importer.split('/').slice(0, -1);
						const pathParts = args.path.split('/');

						// Build resolved path
						const resolvedParts = [...importerDir];

						for (const part of pathParts) {
							if (part === '..') {
								resolvedParts.pop();
							} else if (part === '.') {
								// Skip current directory
								continue;
							} else {
								resolvedParts.push(part);
							}
						}

						let resolved = resolvedParts.join('/');

						// Try adding .ts extension if no extension found
						if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
							// Check if .ts file exists
							if (fileMap.has(resolved + '.ts')) {
								resolved += '.ts';
							} else if (fileMap.has(resolved + '.js')) {
								resolved += '.js';
							}
						}

						return { path: resolved, namespace: 'virtual' };
					}

					// Absolute imports (e.g., '/src/...' or 'src/...')
					const normalizedPath = args.path.startsWith('/') ? args.path.slice(1) : args.path;
					return { path: normalizedPath, namespace: 'virtual' };
				});

				// Load file contents
				build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
					const content = fileMap.get(args.path);

					if (!content) {
						// Log available files for debugging
						const availableFiles = Array.from(fileMap.keys()).join(', ');
						return {
							errors: [
								{
									text: `File not found: ${args.path}`,
									detail: `Available files: ${availableFiles}`
								}
							]
						};
					}

					return {
						contents: content,
						loader: args.path.endsWith('.ts') ? 'ts' : 'js'
					};
				});
			}
		};

		// Bundle with esbuild
		const result = await esbuild.build({
			stdin: {
				contents: entryFile.content,
				sourcefile: entryFile.path.startsWith('/') ? entryFile.path.slice(1) : entryFile.path,
				loader: entryFile.path.endsWith('.ts') ? 'ts' : 'js'
			},
			bundle: true,
			format: 'iife',
			platform: 'browser',
			target: 'es2020',
			write: false,
			plugins: [virtualPlugin],
			minify: false, // Keep readable for debugging
			sourcemap: 'inline' // Enable source maps for better error messages
		});

		const bundledCode = result.outputFiles[0].text;

		return {
			success: true,
			code: bundledCode
		};
	} catch (error) {
		console.error('Bundling error:', error);

		return {
			success: false,
			error: 'Failed to bundle code',
			details: error instanceof Error ? error.message : String(error)
		};
	}
}
