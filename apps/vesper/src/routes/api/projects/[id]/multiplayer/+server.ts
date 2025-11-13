/**
 * Multiplayer API Endpoint
 *
 * POST /api/projects/[id]/multiplayer - Generate share code and publish for multiplayer
 * DELETE /api/projects/[id]/multiplayer - Unpublish (clear share code)
 * GET /api/projects/[id]/multiplayer - Get current multiplayer status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	generateUniqueShareCode,
	clearShareCode,
	getProjectByShareCode
} from '$lib/server/multiplayer/shareCode';

/**
 * POST - Generate share code and publish game for multiplayer
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const { id: projectId } = params;

	// Check authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Get project and verify ownership
	const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

	if (project.length === 0) {
		throw error(404, 'Project not found');
	}

	if (project[0].userId !== user.id) {
		throw error(403, 'You do not own this project');
	}

	// Check if already published with share code
	if (project[0].shareCode && project[0].state === 'published') {
		return json({
			shareCode: project[0].shareCode,
			state: project[0].state,
			message: 'Project already published for multiplayer'
		});
	}

	// Generate unique share code
	const shareCode = await generateUniqueShareCode();

	// Update project
	await db
		.update(projects)
		.set({
			shareCode,
			state: 'published',
			updatedAt: new Date()
		})
		.where(eq(projects.id, projectId));

	console.log(`[Multiplayer] Project ${projectId} published with code ${shareCode}`);

	return json({
		shareCode,
		state: 'published',
		message: 'Share code generated successfully'
	});
};

/**
 * DELETE - Unpublish game (clear share code)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { id: projectId } = params;

	// Check authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Get project and verify ownership
	const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

	if (project.length === 0) {
		throw error(404, 'Project not found');
	}

	if (project[0].userId !== user.id) {
		throw error(403, 'You do not own this project');
	}

	// Clear share code
	await clearShareCode(projectId);

	console.log(`[Multiplayer] Project ${projectId} unpublished (share code cleared)`);

	return json({
		message: 'Multiplayer unpublished successfully'
	});
};

/**
 * GET - Get current multiplayer status
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { id: projectId } = params;

	// Check authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Get project and verify ownership
	const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

	if (project.length === 0) {
		throw error(404, 'Project not found');
	}

	if (project[0].userId !== user.id) {
		throw error(403, 'You do not own this project');
	}

	return json({
		shareCode: project[0].shareCode,
		state: project[0].state,
		published: project[0].state === 'published' && !!project[0].shareCode
	});
};
