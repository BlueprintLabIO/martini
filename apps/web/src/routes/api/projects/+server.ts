import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { martiniTypeScriptStarter } from '$lib/server/templates/martini-typescript-starter';

// GET /api/projects - List all projects for authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userProjects = await db
		.select()
		.from(projects)
		.where(eq(projects.userId, user.id))
		.orderBy(desc(projects.updatedAt));

	return json({ projects: userProjects });
};

// POST /api/projects - Create a new project
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { name } = body;

	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		return json({ error: 'Project name is required' }, { status: 400 });
	}

	if (name.length > 100) {
		return json({ error: 'Project name must be 100 characters or less' }, { status: 400 });
	}

	const [project] = await db
		.insert(projects)
		.values({
			userId: user.id,
			name: name.trim()
		})
		.returning();

	// Create starter files for the project
	await db.insert(files).values(
		martiniTypeScriptStarter.map((file) => ({
			projectId: project.id,
			path: file.path,
			content: file.content
		}))
	);

	return json({ project }, { status: 201 });
};
