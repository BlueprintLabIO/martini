import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { bundleProjectFiles } from '$lib/server/bundler';

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

	// Fetch all source files (TypeScript or JavaScript)
	const projectFiles = await db
		.select()
		.from(files)
		.where(eq(files.projectId, params.id));

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
