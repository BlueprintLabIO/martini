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
const component = async () => component_cache ??= (await import('./_page.svelte-CvP0MnFg.js')).default;
const server_id = "src/routes/editor/[projectId]/+page.server.ts";
const imports = ["_app/immutable/nodes/6.4w5D4Ula.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/DB6PYH3G.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/DiiBiV_f.js","_app/immutable/chunks/ColYgRh6.js","_app/immutable/chunks/Da6Ho28f.js","_app/immutable/chunks/COv4CibV.js","_app/immutable/chunks/DsUD8RVk.js","_app/immutable/chunks/BIPQOgtJ.js","_app/immutable/chunks/CLaPzNh_.js","_app/immutable/chunks/Cl3uNc5W.js","_app/immutable/chunks/DbDae2xS.js"];
const stylesheets = ["_app/immutable/assets/6.-GhynoMk.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-SnJ5D1vT.js.map
