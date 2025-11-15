import { json } from "@sveltejs/kit";
import { d as db, p as projects, f as files } from "../../../../../../../chunks/index3.js";
import { eq, and } from "drizzle-orm";
const GET = async ({ params, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectId = params.id;
  const filePath = `/${params.path}`;
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const [file] = await db.select().from(files).where(and(eq(files.projectId, projectId), eq(files.path, filePath))).limit(1);
  if (!file) {
    return json({ error: "File not found", path: filePath }, { status: 404 });
  }
  return json({
    path: file.path,
    content: file.content,
    updatedAt: file.updatedAt
  });
};
export {
  GET
};
