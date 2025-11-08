import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as esbuild from 'esbuild';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify project ownership
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, params.id))
		.limit(1);

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	if (project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Fetch all JavaScript files
	const projectFiles = await db
		.select()
		.from(files)
		.where(eq(files.projectId, params.id));

	const jsFiles = projectFiles.filter(
		(f) => f.path.endsWith('.js') && f.path.startsWith('/src/')
	);

	if (jsFiles.length === 0) {
		return json({ error: 'No JavaScript files found in /src/' }, { status: 400 });
	}

	// Find entry point (main.js)
	const entryFile = jsFiles.find((f) => f.path === '/src/main.js');

	if (!entryFile) {
		return json({ error: 'Entry point /src/main.js not found' }, { status: 400 });
	}

	try {
		// Create virtual file system for esbuild
		const fileMap = new Map<string, string>();
		jsFiles.forEach((file) => {
			// Remove leading slash for esbuild
			const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
			fileMap.set(path, file.content);
		});

		// esbuild plugin to resolve virtual files
		const virtualPlugin: esbuild.Plugin = {
			name: 'virtual-files',
			setup(build) {
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

						const resolved = resolvedParts.join('/');
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
						loader: 'js'
					};
				});
			}
		};

		// Bundle with esbuild
		const result = await esbuild.build({
			stdin: {
				contents: entryFile.content,
				sourcefile: 'src/main.js',
				loader: 'js'
			},
			bundle: true,
			format: 'iife',
			platform: 'browser',
			target: 'es2020',
			write: false,
			plugins: [virtualPlugin],
			minify: false, // Keep readable for debugging
			sourcemap: false
		});

		const bundledCode = result.outputFiles[0].text;

		return json({
			success: true,
			code: bundledCode
		});
	} catch (error) {
		console.error('Bundling error:', error);

		return json(
			{
				error: 'Failed to bundle code',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
