import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { files, projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/projects/:id/files/*path
 * Fetch a single file's content
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = params.id;
	const filePath = `/${params.path}`; // Add leading slash

	// Verify project ownership
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	if (project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Fetch file
	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.projectId, projectId), eq(files.path, filePath)))
		.limit(1);

	if (!file) {
		return json({ error: 'File not found', path: filePath }, { status: 404 });
	}

	return json({
		path: file.path,
		content: file.content,
		updatedAt: file.updatedAt
	});
};
