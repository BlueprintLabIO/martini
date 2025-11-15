import { r as redirect } from './index-Djsj11qr.js';
import { g as getProjectByShareCode } from './shareCode-BVlW2gVl.js';
import { d as db, p as projects } from './index3-Cd3ryqyN.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const load = async ({ params, url }) => {
  const { shareCode } = params;
  const roomCode = url.searchParams.get("room");
  if (!shareCode) {
    throw redirect(303, "/play");
  }
  let project;
  const isUUID = shareCode.length > 6 && shareCode.includes("-");
  if (isUUID) {
    const result = await db.select().from(projects).where(eq(projects.id, shareCode)).limit(1);
    if (result.length === 0) {
      throw redirect(303, "/play");
    }
    project = result[0];
  } else {
    if (shareCode.length !== 6) {
      throw redirect(303, "/play");
    }
    project = await getProjectByShareCode(shareCode.toUpperCase());
    if (!project) {
      throw redirect(303, "/play");
    }
    if (project.state !== "published" || !project.shareCode) {
      throw redirect(303, "/play");
    }
  }
  return {
    project: {
      id: project.id,
      name: project.name,
      shareCode: project.shareCode || shareCode
      // Use shareCode if published, otherwise use ID
    },
    roomCode,
    // Pass room code for multiplayer
    isTestingMode: isUUID
    // Flag to show "testing mode" UI
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DRU2n6e3.js')).default;
const server_id = "src/routes/play/[shareCode]/+page.server.ts";
const imports = ["_app/immutable/nodes/8.D8gliKZj.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/D0kfkDN9.js","_app/immutable/chunks/ColYgRh6.js","_app/immutable/chunks/KOK6V9ui.js","_app/immutable/chunks/BIPQOgtJ.js","_app/immutable/chunks/CLaPzNh_.js","_app/immutable/chunks/Da6Ho28f.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/Cl3uNc5W.js","_app/immutable/chunks/DsUD8RVk.js","_app/immutable/chunks/DbDae2xS.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-DnM6RKPM.js.map
