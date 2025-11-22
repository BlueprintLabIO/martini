import { error } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

/**
 * Serve dev packages from static/dev-packages/
 * This endpoint serves local package builds for Sandpack during development
 */
export const GET: RequestHandler = ({ params }) => {
	const { path } = params;

	// Security: prevent directory traversal
	if (path.includes('..')) {
		throw error(403, 'Forbidden');
	}

	// Construct file path
	const filePath = join(process.cwd(), 'static/dev-packages', path);

	// Check if file exists
	if (!existsSync(filePath)) {
		throw error(404, `File not found: ${path}`);
	}

	try {
		// Read file
		const content = readFileSync(filePath, 'utf-8');

		// Determine content type based on extension
		const contentType = path.endsWith('.js')
			? 'application/javascript'
			: path.endsWith('.json')
			? 'application/json'
			: path.endsWith('.d.ts')
			? 'text/plain'
			: 'text/plain';

		return new Response(content, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'no-cache' // Disable cache for dev
			}
		});
	} catch (err) {
		console.error('[dev-packages] Error reading file:', err);
		throw error(500, 'Failed to read file');
	}
};
