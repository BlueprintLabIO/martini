import { isBrowser, createBrowserClient, createServerClient } from '@supabase/ssr';
import { P as PUBLIC_SUPABASE_URL, a as PUBLIC_SUPABASE_PUBLISHABLE_KEY } from './public-C280cyOd.js';

const load$1 = async ({ fetch, data, depends }) => {
  depends("supabase:auth");
  const supabase = isBrowser() ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch
    }
  }) : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch
    },
    cookies: {
      getAll() {
        return data.cookies;
      }
    }
  });
  return {
    supabase,
    session: data.session
  };
};

var _layout_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load$1
});

const load = async ({ locals, cookies }) => {
  const { session } = await locals.safeGetSession();
  return {
    session,
    cookies: cookies.getAll()
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-YKbMB4ir.js')).default;
const universal_id = "src/routes/+layout.ts";
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.CnFTDU7O.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CKykJINX.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/B0HB8HGj.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/TPWCNmom.js"];
const stylesheets = ["_app/immutable/assets/0.5lHJ66my.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets, _layout_ts as universal, universal_id };
//# sourceMappingURL=0-nih-XT7T.js.map
