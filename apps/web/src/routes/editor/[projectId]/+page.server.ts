import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw redirect(303, '/auth/login');
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
