import { r as redirect } from './index-Djsj11qr.js';

const load = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    throw redirect(303, "/auth/login");
  }
  return {
    user
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CbQ-6GDs.js')).default;
const server_id = "src/routes/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/5.BJ_AJ_Qp.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/Da6Ho28f.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/DiiBiV_f.js","_app/immutable/chunks/CAlFmoMD.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-CXXrMtvx.js.map
