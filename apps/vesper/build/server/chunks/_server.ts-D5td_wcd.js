import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, f as files } from './index3-Cd3ryqyN.js';
import { eq, and } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const POST = async ({ params, request, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { path, content = "" } = body;
  if (!path || typeof path !== "string") {
    return json({ error: "File path is required" }, { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const [newFile] = await db.insert(files).values({
      projectId: params.id,
      path,
      content
    }).returning();
    await db.update(projects).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, params.id));
    return json({ success: true, file: newFile }, { status: 201 });
  } catch (error) {
    return json({ error: "File already exists at this path" }, { status: 409 });
  }
};
const PUT = async ({ params, request, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { path, content } = body;
  if (!path || typeof path !== "string") {
    return json({ error: "File path is required" }, { status: 400 });
  }
  if (typeof content !== "string") {
    return json({ error: "File content must be a string" }, { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [updatedFile] = await db.update(files).set({
    content,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(and(eq(files.projectId, params.id), eq(files.path, path))).returning();
  if (!updatedFile) {
    return json({ error: "File not found" }, { status: 404 });
  }
  await db.update(projects).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, params.id));
  return json({ success: true, file: updatedFile });
};
const PATCH = async ({ params, request, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { path, search, replace } = body;
  if (!path || typeof path !== "string") {
    return json({ error: "File path is required" }, { status: 400 });
  }
  if (typeof search !== "string" || typeof replace !== "string") {
    return json({ error: "Search and replace must be strings" }, { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [file] = await db.select().from(files).where(and(eq(files.projectId, params.id), eq(files.path, path))).limit(1);
  if (!file) {
    return json({ error: "File not found" }, { status: 404 });
  }
  if (!file.content.includes(search)) {
    return json(
      {
        error: "Search text not found in file",
        hint: "The exact text to search for was not found. Make sure to use the exact text from the file."
      },
      { status: 400 }
    );
  }
  const newContent = file.content.replace(search, replace);
  const [updatedFile] = await db.update(files).set({
    content: newContent,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(and(eq(files.projectId, params.id), eq(files.path, path))).returning();
  await db.update(projects).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, params.id));
  return json({ success: true, file: updatedFile });
};

export { PATCH, POST, PUT };
//# sourceMappingURL=_server.ts-D5td_wcd.js.map
