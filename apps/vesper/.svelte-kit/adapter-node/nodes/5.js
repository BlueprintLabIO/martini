import * as server from '../entries/pages/dashboard/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.DAjNkowg.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CDGviZC4.js","_app/immutable/chunks/CU3yTzfR.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/Cp2SW6Kf.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/DvOtwofQ.js","_app/immutable/chunks/TPWCNmom.js"];
export const stylesheets = [];
export const fonts = [];
