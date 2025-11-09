import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, conversations, chatMessages } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/projects/[id]/conversations - List all conversations for a project
export const GET: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = params.id;

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

	// Fetch all conversations (non-archived first, then by updatedAt)
	const allConversations = await db
		.select()
		.from(conversations)
		.where(eq(conversations.projectId, projectId))
		.orderBy(desc(conversations.updatedAt));

	return json({
		conversations: allConversations
	});
};

// POST /api/projects/[id]/conversations - Create new conversation
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = params.id;
	const { title } = await request.json();

	if (!title || typeof title !== 'string') {
		return json({ error: 'Title is required' }, { status: 400 });
	}

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

	// Create new conversation
	const [newConversation] = await db
		.insert(conversations)
		.values({
			projectId,
			title: title.trim()
		})
		.returning();

	// Create empty messages row for this conversation
	await db.insert(chatMessages).values({
		conversationId: newConversation.id,
		messages: []
	});

	return json({
		conversation: newConversation
	}, { status: 201 });
};
