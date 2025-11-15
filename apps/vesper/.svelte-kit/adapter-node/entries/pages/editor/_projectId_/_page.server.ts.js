import { redirect, error } from "@sveltejs/kit";
import { d as db, p as projects, f as files } from "../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
const load = async ({ params, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw redirect(303, "/auth/login");
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.projectId)) {
    throw error(404, "Invalid project ID");
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.projectId)).limit(1);
  if (!project) {
    throw error(404, "Project not found");
  }
  if (project.userId !== user.id) {
    throw error(403, "You do not have access to this project");
  }
  const projectFiles = await db.select().from(files).where(eq(files.projectId, params.projectId)).orderBy(files.path);
  return {
    project,
    files: projectFiles
  };
};
export {
  load
};
