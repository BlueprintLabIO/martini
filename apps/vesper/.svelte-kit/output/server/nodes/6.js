import * as server from '../entries/pages/editor/_projectId_/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/editor/_projectId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/editor/[projectId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.4w5D4Ula.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/DB6PYH3G.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/DiiBiV_f.js","_app/immutable/chunks/ColYgRh6.js","_app/immutable/chunks/Da6Ho28f.js","_app/immutable/chunks/COv4CibV.js","_app/immutable/chunks/DsUD8RVk.js","_app/immutable/chunks/BIPQOgtJ.js","_app/immutable/chunks/CLaPzNh_.js","_app/immutable/chunks/Cl3uNc5W.js","_app/immutable/chunks/DbDae2xS.js"];
export const stylesheets = ["_app/immutable/assets/6.-GhynoMk.css"];
export const fonts = [];
