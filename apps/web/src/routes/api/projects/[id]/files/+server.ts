import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/projects/[id]/files - Create a new file
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { path, content = '' } = body;

	if (!path || typeof path !== 'string') {
		return json({ error: 'File path is required' }, { status: 400 });
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

	// Create the new file
	try {
		const [newFile] = await db
			.insert(files)
			.values({
				projectId: params.id,
				path,
				content
			})
			.returning();

		// Update project's updatedAt timestamp
		await db
			.update(projects)
			.set({ updatedAt: new Date() })
			.where(eq(projects.id, params.id));

		return json({ success: true, file: newFile }, { status: 201 });
	} catch (error) {
		// Handle unique constraint violation (file already exists)
		return json({ error: 'File already exists at this path' }, { status: 409 });
	}
};

// PUT /api/projects/[id]/files - Update a file
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { path, content } = body;

	if (!path || typeof path !== 'string') {
		return json({ error: 'File path is required' }, { status: 400 });
	}

	if (typeof content !== 'string') {
		return json({ error: 'File content must be a string' }, { status: 400 });
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

	// Update the file
	const [updatedFile] = await db
		.update(files)
		.set({
			content,
			updatedAt: new Date()
		})
		.where(and(eq(files.projectId, params.id), eq(files.path, path)))
		.returning();

	if (!updatedFile) {
		return json({ error: 'File not found' }, { status: 404 });
	}

	// Update project's updatedAt timestamp
	await db
		.update(projects)
		.set({ updatedAt: new Date() })
		.where(eq(projects.id, params.id));


	return json({ success: true, file: updatedFile });
};

// PATCH /api/projects/[id]/files - Update file with search/replace
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { path, search, replace } = body;

	if (!path || typeof path !== 'string') {
		return json({ error: 'File path is required' }, { status: 400 });
	}

	if (typeof search !== 'string' || typeof replace !== 'string') {
		return json({ error: 'Search and replace must be strings' }, { status: 400 });
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

	// Get the current file
	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.projectId, params.id), eq(files.path, path)))
		.limit(1);

	if (!file) {
		return json({ error: 'File not found' }, { status: 404 });
	}

	// Check if search text exists
	if (!file.content.includes(search)) {
		return json(
			{
				error: 'Search text not found in file',
				hint: 'The exact text to search for was not found. Make sure to use the exact text from the file.'
			},
			{ status: 400 }
		);
	}

	// Apply search/replace
	const newContent = file.content.replace(search, replace);

	// Update the file
	const [updatedFile] = await db
		.update(files)
		.set({
			content: newContent,
			updatedAt: new Date()
		})
		.where(and(eq(files.projectId, params.id), eq(files.path, path)))
		.returning();

	// Update project's updatedAt timestamp
	await db
		.update(projects)
		.set({ updatedAt: new Date() })
		.where(eq(projects.id, params.id));


	return json({ success: true, file: updatedFile });
};
