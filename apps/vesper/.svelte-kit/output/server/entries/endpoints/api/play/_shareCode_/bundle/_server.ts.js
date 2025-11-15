import { error, json } from "@sveltejs/kit";
import { g as getProjectByShareCode } from "../../../../../../chunks/shareCode.js";
import { d as db, p as projects, f as files } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { b as bundleProjectFiles } from "../../../../../../chunks/bundler.js";
const GET = async ({ params }) => {
  const { shareCode } = params;
  let project;
  const isUUID = shareCode.length > 6 && shareCode.includes("-");
  if (isUUID) {
    const result2 = await db.select().from(projects).where(eq(projects.id, shareCode)).limit(1);
    if (result2.length === 0) {
      throw error(404, "Game not found");
    }
    project = result2[0];
  } else {
    project = await getProjectByShareCode(shareCode.toUpperCase());
    if (!project) {
      throw error(404, "Game not found");
    }
    if (project.state !== "published" || !project.shareCode) {
      throw error(404, "Game not available");
    }
  }
  const projectFiles = await db.select().from(files).where(eq(files.projectId, project.id));
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
  GET
};
