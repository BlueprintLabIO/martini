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
const component = async () => component_cache ??= (await import('./_layout.svelte-ZqutSRPM.js')).default;
const universal_id = "src/routes/+layout.ts";
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.Bug9HVXU.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/COv4CibV.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/D0kfkDN9.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/CAlFmoMD.js"];
const stylesheets = ["_app/immutable/assets/0.grg0fkY3.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets, _layout_ts as universal, universal_id };
//# sourceMappingURL=0-GkFNmJeJ.js.map
