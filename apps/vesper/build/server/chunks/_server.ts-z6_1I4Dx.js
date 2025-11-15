import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, c as conversations, b as chatMessages } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const GET = async ({ params, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversationId = params.id;
  const [conversation] = await db.select({
    conversation: conversations,
    project: projects
  }).from(conversations).innerJoin(projects, eq(conversations.projectId, projects.id)).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) {
    return json({ error: "Conversation not found" }, { status: 404 });
  }
  if (conversation.project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [messagesRow] = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).limit(1);
  if (!messagesRow) {
    const [newRow] = await db.insert(chatMessages).values({
      conversationId,
      messages: []
    }).returning();
    return json({
      messages: newRow.messages || []
    });
  }
  return json({
    messages: messagesRow.messages || []
  });
};
const POST = async ({ params, locals, request }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversationId = params.id;
  const { messages } = await request.json();
  if (!Array.isArray(messages)) {
    return json({ error: "Messages must be an array" }, { status: 400 });
  }
  const [conversation] = await db.select({
    conversation: conversations,
    project: projects
  }).from(conversations).innerJoin(projects, eq(conversations.projectId, projects.id)).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) {
    return json({ error: "Conversation not found" }, { status: 404 });
  }
  if (conversation.project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [messagesRow] = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).limit(1);
  if (messagesRow) {
    await db.update(chatMessages).set({
      messages,
      // jsonb type
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(chatMessages.conversationId, conversationId));
  } else {
    await db.insert(chatMessages).values({
      conversationId,
      messages
    });
  }
  await db.update(conversations).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, conversationId));
  return json({
    success: true,
    messageCount: messages.length
  });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-z6_1I4Dx.js.map
