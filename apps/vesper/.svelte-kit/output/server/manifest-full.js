export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.Druut2_b.js",app:"_app/immutable/entry/app.CSwo_vwL.js",imports:["_app/immutable/entry/start.Druut2_b.js","_app/immutable/chunks/CAlFmoMD.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/entry/app.CSwo_vwL.js","_app/immutable/chunks/DB6PYH3G.js","_app/immutable/chunks/HPFAwkNo.js","_app/immutable/chunks/DCSryql4.js","_app/immutable/chunks/B1uGGgjB.js","_app/immutable/chunks/ZfXddHLz.js","_app/immutable/chunks/BBe825MA.js","_app/immutable/chunks/Do2flsC7.js","_app/immutable/chunks/ColYgRh6.js","_app/immutable/chunks/DsUD8RVk.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/chat",
				pattern: /^\/api\/chat\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/chat/_server.ts.js'))
			},
			{
				id: "/api/conversations/[id]",
				pattern: /^\/api\/conversations\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_id_/_server.ts.js'))
			},
			{
				id: "/api/conversations/[id]/messages",
				pattern: /^\/api\/conversations\/([^/]+?)\/messages\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_id_/messages/_server.ts.js'))
			},
			{
				id: "/api/play/[shareCode]/assets",
				pattern: /^\/api\/play\/([^/]+?)\/assets\/?$/,
				params: [{"name":"shareCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/play/_shareCode_/assets/_server.ts.js'))
			},
			{
				id: "/api/play/[shareCode]/bundle",
				pattern: /^\/api\/play\/([^/]+?)\/bundle\/?$/,
				params: [{"name":"shareCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/play/_shareCode_/bundle/_server.ts.js'))
			},
			{
				id: "/api/projects",
				pattern: /^\/api\/projects\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/assets",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/assets/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/assets/copy-starter",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/copy-starter\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/assets/copy-starter/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/assets/[assetId]",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"assetId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/assets/_assetId_/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/bundle",
				pattern: /^\/api\/projects\/([^/]+?)\/bundle\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/bundle/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/chat-images",
				pattern: /^\/api\/projects\/([^/]+?)\/chat-images\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/chat-images/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/conversations",
				pattern: /^\/api\/projects\/([^/]+?)\/conversations\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/conversations/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/files",
				pattern: /^\/api\/projects\/([^/]+?)\/files\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/files/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/files/[...path]",
				pattern: /^\/api\/projects\/([^/]+?)\/files(?:\/([^]*))?\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/files/_...path_/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/multiplayer",
				pattern: /^\/api\/projects\/([^/]+?)\/multiplayer\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/multiplayer/_server.ts.js'))
			},
			{
				id: "/api/starter-assets",
				pattern: /^\/api\/starter-assets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/starter-assets/_server.ts.js'))
			},
			{
				id: "/auth/login",
				pattern: /^\/auth\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/auth/signup",
				pattern: /^\/auth\/signup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/editor/[projectId]",
				pattern: /^\/editor\/([^/]+?)\/?$/,
				params: [{"name":"projectId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/play",
				pattern: /^\/play\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/play/[shareCode]",
				pattern: /^\/play\/([^/]+?)\/?$/,
				params: [{"name":"shareCode","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
