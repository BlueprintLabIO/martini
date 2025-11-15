/**
 * Public Assets API
 *
 * GET /api/play/[shareCode]/assets - Get game assets (no auth required)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';
import { db } from '$lib/server/db';
import { assets, projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

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

	// Fetch all assets for this project
	const projectAssets = await db
		.select()
		.from(assets)
		.where(eq(assets.projectId, project.id));

	// Return asset list with public URLs
	return json({
		assets: projectAssets.map((asset) => ({
			id: asset.id,
			filename: asset.filename,
			fileType: asset.fileType,
			url: `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${asset.storagePath}`
		}))
	});
};
