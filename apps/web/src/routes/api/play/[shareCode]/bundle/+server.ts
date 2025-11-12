/**
 * Public Bundle API
 *
 * GET /api/play/[shareCode]/bundle - Get bundled game code (no auth required)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as esbuild from 'esbuild';

export const GET: RequestHandler = async ({ params }) => {
	const { shareCode } = params;

	// Validate and lookup project
	const project = await getProjectByShareCode(shareCode.toUpperCase());

	if (!project) {
		throw error(404, 'Game not found');
	}

	// Verify project is published
	if (project.state !== 'published' || !project.shareCode) {
		throw error(404, 'Game not available');
	}

	// Fetch all JavaScript files
	const projectFiles = await db
		.select()
		.from(files)
		.where(eq(files.projectId, project.id));

	const jsFiles = projectFiles.filter(
		(f) => f.path.endsWith('.js') && f.path.startsWith('/src/')
	);

	if (jsFiles.length === 0) {
		return json({ error: 'No JavaScript files found' }, { status: 400 });
	}

	// Find entry point
	const entryFile = jsFiles.find((f) => f.path === '/src/main.js');

	if (!entryFile) {
		return json({ error: 'Entry point /src/main.js not found' }, { status: 400 });
	}

	try {
		// Create virtual file system for esbuild
		const fileMap = new Map<string, string>();
		jsFiles.forEach((file) => {
			const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
			fileMap.set(path, file.content);
		});

		// esbuild plugin to resolve virtual files
		const virtualPlugin: esbuild.Plugin = {
			name: 'virtual-files',
			setup(build) {
				build.onResolve({ filter: /.*/ }, (args) => {
					if (args.path.startsWith('./') || args.path.startsWith('../')) {
						const importerDir = args.importer.split('/').slice(0, -1);
						const pathParts = args.path.split('/');
						const resolvedParts = [...importerDir];

						for (const part of pathParts) {
							if (part === '..') {
								resolvedParts.pop();
							} else if (part === '.') {
								continue;
							} else {
								resolvedParts.push(part);
							}
						}

						const resolved = resolvedParts.join('/');
						return { path: resolved, namespace: 'virtual' };
					}

					const normalizedPath = args.path.startsWith('/') ? args.path.slice(1) : args.path;
					return { path: normalizedPath, namespace: 'virtual' };
				});

				build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
					const content = fileMap.get(args.path);

					if (!content) {
						return {
							errors: [{ text: `File not found: ${args.path}` }]
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
			minify: false,
			sourcemap: false
		});

		const bundledCode = result.outputFiles[0].text;

		return json({
			success: true,
			code: bundledCode
		});
	} catch (err) {
		console.error('Public bundling error:', err);

		return json(
			{
				error: 'Failed to bundle code',
				details: err instanceof Error ? err.message : String(err)
			},
			{ status: 500 }
		);
	}
};
