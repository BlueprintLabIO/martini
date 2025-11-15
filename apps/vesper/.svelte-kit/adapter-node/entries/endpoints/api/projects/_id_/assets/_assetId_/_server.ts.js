import { json } from "@sveltejs/kit";
import { d as db, p as projects, a as assets } from "../../../../../../../chunks/index3.js";
import { eq, and } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { P as PUBLIC_SUPABASE_URL, a as PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "../../../../../../../chunks/public.js";
const DELETE = async ({ params, locals, cookies }) => {
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
  const [asset] = await db.select().from(assets).where(and(eq(assets.id, params.assetId), eq(assets.projectId, params.id))).limit(1);
  if (!asset) {
    return json({ error: "Asset not found" }, { status: 404 });
  }
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: options.path ?? "/" });
        });
      }
    }
  });
  const { error: deleteError } = await supabase.storage.from("project-assets").remove([asset.storagePath]);
  if (deleteError) {
    console.error("Supabase delete error:", deleteError);
  }
  await db.delete(assets).where(eq(assets.id, params.assetId));
  return json({ success: true, message: "Asset deleted successfully" });
};
export {
  DELETE
};
