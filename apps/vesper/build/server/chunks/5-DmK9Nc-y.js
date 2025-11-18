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
const component = async () => component_cache ??= (await import('./_page.svelte-B1o3D0V6.js')).default;
const server_id = "src/routes/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/5.DAjNkowg.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CDGviZC4.js","_app/immutable/chunks/CU3yTzfR.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/Cp2SW6Kf.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/DvOtwofQ.js","_app/immutable/chunks/TPWCNmom.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-DmK9Nc-y.js.map
