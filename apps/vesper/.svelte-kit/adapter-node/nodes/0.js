import * as universal from '../entries/pages/_layout.ts.js';
import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.CnFTDU7O.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/CKykJINX.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/B0HB8HGj.js","_app/immutable/chunks/V4K-vHKj.js","_app/immutable/chunks/TPWCNmom.js"];
export const stylesheets = ["_app/immutable/assets/0.5lHJ66my.css"];
export const fonts = [];
