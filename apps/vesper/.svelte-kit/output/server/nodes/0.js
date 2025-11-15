import * as universal from '../entries/pages/_layout.ts.js';
import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.Bug9HVXU.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/COv4CibV.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/D0kfkDN9.js","_app/immutable/chunks/CRjFmqpM.js","_app/immutable/chunks/CAlFmoMD.js"];
export const stylesheets = ["_app/immutable/assets/0.grg0fkY3.css"];
export const fonts = [];
