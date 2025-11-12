/**
 * Public Assets API
 *
 * GET /api/play/[shareCode]/assets - Get game assets (no auth required)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';
import { db } from '$lib/server/db';
import { assets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SUPABASE_URL } from '$env/static/private';

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
			url: `${SUPABASE_URL}/storage/v1/object/public/game-assets/${asset.storagePath}`
		}))
	});
};
