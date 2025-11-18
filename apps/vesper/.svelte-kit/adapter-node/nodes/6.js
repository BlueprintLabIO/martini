import * as server from '../entries/pages/editor/_projectId_/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/editor/_projectId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/editor/[projectId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.D71ZjF7G.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CDGviZC4.js","_app/immutable/chunks/CU3yTzfR.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/Du7wOx7H.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/DvOtwofQ.js","_app/immutable/chunks/E779tUjU.js","_app/immutable/chunks/Cp2SW6Kf.js","_app/immutable/chunks/CKykJINX.js","_app/immutable/chunks/DG4T_AN_.js","_app/immutable/chunks/B5wtrm-B.js","_app/immutable/chunks/C-4hCRPg.js","_app/immutable/chunks/CgSNCr3d.js"];
export const stylesheets = ["_app/immutable/assets/6.-GhynoMk.css"];
export const fonts = [];
