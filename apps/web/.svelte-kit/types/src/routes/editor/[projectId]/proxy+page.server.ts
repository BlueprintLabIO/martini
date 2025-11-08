// @ts-nocheck
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load = async ({ params, locals }: Parameters<PageServerLoad>[0]) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw redirect(303, '/auth/login');
	}

	// Validate projectId is a UUID (reject static files like .js, .map)
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(params.projectId)) {
		throw error(404, 'Invalid project ID');
	}

	// Fetch project
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, params.projectId))
		.limit(1);

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Verify ownership
	if (project.userId !== user.id) {
		throw error(403, 'You do not have access to this project');
	}

	// Fetch all files for this project
	const projectFiles = await db
		.select()
		.from(files)
		.where(eq(files.projectId, params.projectId))
		.orderBy(files.path);

	return {
		project,
		files: projectFiles
	};
};
