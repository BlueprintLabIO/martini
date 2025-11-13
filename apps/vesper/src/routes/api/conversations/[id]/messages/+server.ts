import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, conversations, chatMessages } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/conversations/[id]/messages - Load messages for a conversation
export const GET: RequestHandler = async ({ params, locals }) => {
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

	// Fetch messages
	const [messagesRow] = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, conversationId))
		.limit(1);

	// If no messages row exists, create one with empty array
	if (!messagesRow) {
		const [newRow] = await db
			.insert(chatMessages)
			.values({
				conversationId,
				messages: []
			})
			.returning();

		return json({
			messages: newRow.messages || []
		});
	}

	return json({
		messages: messagesRow.messages || []
	});
};

// POST /api/conversations/[id]/messages - Save messages for a conversation
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const conversationId = params.id;
	const { messages } = await request.json();

	if (!Array.isArray(messages)) {
		return json({ error: 'Messages must be an array' }, { status: 400 });
	}

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

	// Update or insert messages
	const [messagesRow] = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, conversationId))
		.limit(1);

	if (messagesRow) {
		// Update existing
		await db
			.update(chatMessages)
			.set({
				messages: messages as any, // jsonb type
				updatedAt: new Date()
			})
			.where(eq(chatMessages.conversationId, conversationId));
	} else {
		// Insert new
		await db.insert(chatMessages).values({
			conversationId,
			messages: messages as any
		});
	}

	// Update conversation's updatedAt timestamp
	await db
		.update(conversations)
		.set({ updatedAt: new Date() })
		.where(eq(conversations.id, conversationId));

	return json({
		success: true,
		messageCount: messages.length
	});
};
