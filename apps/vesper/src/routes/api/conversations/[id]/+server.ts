import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, conversations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/conversations/[id] - Update conversation (title, archive status)
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const conversationId = params.id;
	const body = await request.json();
	const { title, isArchived } = body;

	// Fetch conversation with project ownership check
	const [conversation] = await db
		.select({
			conversation: conversations,
			project: projects
		})
		.from(conversations)
		.innerJoin(projects, eq(conversations.projectId, projects.id))
		.where(eq(conversations.id, conversationId))
		.limit(1);

	if (!conversation) {
		return json({ error: 'Conversation not found' }, { status: 404 });
	}

	if (conversation.project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Build update object
	const updates: Partial<typeof conversations.$inferInsert> = {
		updatedAt: new Date()
	};

	if (title !== undefined && typeof title === 'string') {
		updates.title = title.trim();
	}

	if (isArchived !== undefined && typeof isArchived === 'boolean') {
		updates.isArchived = isArchived;
	}

	// Update conversation
	const [updated] = await db
		.update(conversations)
		.set(updates)
		.where(eq(conversations.id, conversationId))
		.returning();

	return json({
		conversation: updated
	});
};

// DELETE /api/conversations/[id] - Delete conversation permanently
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const conversationId = params.id;

	// Fetch conversation with project ownership check
	const [conversation] = await db
		.select({
			conversation: conversations,
			project: projects
		})
		.from(conversations)
		.innerJoin(projects, eq(conversations.projectId, projects.id))
		.where(eq(conversations.id, conversationId))
		.limit(1);

	if (!conversation) {
		return json({ error: 'Conversation not found' }, { status: 404 });
	}

	if (conversation.project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Delete conversation (cascade deletes chat_messages)
	await db.delete(conversations).where(eq(conversations.id, conversationId));

	return json({ success: true });
};
