import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, c as conversations } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const PATCH = async ({ params, locals, request }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversationId = params.id;
  const body = await request.json();
  const { title, isArchived } = body;
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
  const updates = {
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (title !== void 0 && typeof title === "string") {
    updates.title = title.trim();
  }
  if (isArchived !== void 0 && typeof isArchived === "boolean") {
    updates.isArchived = isArchived;
  }
  const [updated] = await db.update(conversations).set(updates).where(eq(conversations.id, conversationId)).returning();
  return json({
    conversation: updated
  });
};
const DELETE = async ({ params, locals }) => {
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
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  return json({ success: true });
};

export { DELETE, PATCH };
//# sourceMappingURL=_server.ts-C4muE3VH.js.map
