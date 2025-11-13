/**
 * Public Bundle API
 *
 * GET /api/play/[shareCode]/bundle - Get bundled game code (no auth required)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';
import { db } from '$lib/server/db';
import { files, projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { bundleProjectFiles } from '$lib/server/bundler';

export const GET: RequestHandler = async ({ params }) => {
	const { shareCode } = params;

	let project;

	// Check if it's a UUID (testing mode) or share code (published mode)
	const isUUID = shareCode.length > 6 && shareCode.includes('-');

	if (isUUID) {
		// Testing mode - fetch by project ID (no published check)
		const result = await db
			.select()
			.from(projects)
			.where(eq(projects.id, shareCode))
			.limit(1);

		if (result.length === 0) {
			throw error(404, 'Game not found');
		}

		project = result[0];
	} else {
		// Published mode - validate and lookup by share code
		project = await getProjectByShareCode(shareCode.toUpperCase());

		if (!project) {
			throw error(404, 'Game not found');
		}

		// Verify project is published
		if (project.state !== 'published' || !project.shareCode) {
			throw error(404, 'Game not available');
		}
	}

	// Fetch all TypeScript/JavaScript files
	const projectFiles = await db
		.select()
		.from(files)
		.where(eq(files.projectId, project.id));

	const sourceFiles = projectFiles
		.filter((f) => (f.path.endsWith('.ts') || f.path.endsWith('.js')) && f.path.startsWith('/src/'))
		.map((f) => ({ path: f.path, content: f.content }));

	// Bundle using shared bundler
	const result = await bundleProjectFiles(sourceFiles);

	if (!result.success) {
		return json(
			{
				error: result.error,
				details: result.details
			},
			{ status: 500 }
		);
	}

	return json({
		success: true,
		code: result.code
	});
};
