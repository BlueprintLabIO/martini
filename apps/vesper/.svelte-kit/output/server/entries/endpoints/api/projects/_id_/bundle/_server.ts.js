import { json } from "@sveltejs/kit";
import { d as db, p as projects, f as files } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { b as bundleProjectFiles } from "../../../../../../chunks/bundler.js";
const POST = async ({ params, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const projectFiles = await db.select().from(files).where(eq(files.projectId, params.id));
  const sourceFiles = projectFiles.filter((f) => (f.path.endsWith(".ts") || f.path.endsWith(".js")) && f.path.startsWith("/src/")).map((f) => ({ path: f.path, content: f.content }));
  const result = await bundleProjectFiles(sourceFiles);
  if (!result.success) {
    return json(
      {
        error: result.error,
        details: result.details
      },
      { status: 500 }
    );
  }
  return json({
    success: true,
    code: result.code
  });
};
export {
  POST
};
