import { r as redirect, e as error } from './index-Djsj11qr.js';
import { d as db, p as projects, f as files } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-TyujgitS.js')).default;
const server_id = "src/routes/editor/[projectId]/+page.server.ts";
const imports = ["_app/immutable/nodes/6.D71ZjF7G.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CDGviZC4.js","_app/immutable/chunks/CU3yTzfR.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/Du7wOx7H.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/DvOtwofQ.js","_app/immutable/chunks/E779tUjU.js","_app/immutable/chunks/Cp2SW6Kf.js","_app/immutable/chunks/CKykJINX.js","_app/immutable/chunks/DG4T_AN_.js","_app/immutable/chunks/B5wtrm-B.js","_app/immutable/chunks/C-4hCRPg.js","_app/immutable/chunks/CgSNCr3d.js"];
const stylesheets = ["_app/immutable/assets/6.-GhynoMk.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-VZnBmU1J.js.map
