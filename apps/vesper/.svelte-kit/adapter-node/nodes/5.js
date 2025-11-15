import * as server from '../entries/pages/dashboard/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.BJ_AJ_Qp.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/Da6Ho28f.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/DiiBiV_f.js","_app/immutable/chunks/CAlFmoMD.js"];
export const stylesheets = [];
export const fonts = [];
