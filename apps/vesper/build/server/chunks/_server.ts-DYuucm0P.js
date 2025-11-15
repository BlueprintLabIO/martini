import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, c as conversations, b as chatMessages } from './index3-Cd3ryqyN.js';
import { eq, desc } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const GET = async ({ params, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectId = params.id;
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const allConversations = await db.select().from(conversations).where(eq(conversations.projectId, projectId)).orderBy(desc(conversations.updatedAt));
  return json({
    conversations: allConversations
  });
};
const POST = async ({ params, locals, request }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectId = params.id;
  const { title } = await request.json();
  if (!title || typeof title !== "string") {
    return json({ error: "Title is required" }, { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [newConversation] = await db.insert(conversations).values({
    projectId,
    title: title.trim()
  }).returning();
  await db.insert(chatMessages).values({
    conversationId: newConversation.id,
    messages: []
  });
  return json({
    conversation: newConversation
  }, { status: 201 });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-DYuucm0P.js.map
