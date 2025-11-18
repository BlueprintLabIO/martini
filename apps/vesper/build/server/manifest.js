const manifest = (() => {
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
		client: {start:"_app/immutable/entry/start.C_2q1TNP.js",app:"_app/immutable/entry/app.BSDNqJl2.js",imports:["_app/immutable/entry/start.C_2q1TNP.js","_app/immutable/chunks/TPWCNmom.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/entry/app.BSDNqJl2.js","_app/immutable/chunks/Du7wOx7H.js","_app/immutable/chunks/B9AHJbAJ.js","_app/immutable/chunks/Bpvq6DfM.js","_app/immutable/chunks/CDGviZC4.js","_app/immutable/chunks/x7DbN4b3.js","_app/immutable/chunks/CU3yTzfR.js","_app/immutable/chunks/E779tUjU.js","_app/immutable/chunks/DG4T_AN_.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-nih-XT7T.js')),
			__memo(() => import('./chunks/1-DvHfKMsw.js')),
			__memo(() => import('./chunks/2-DpfeaDqj.js')),
			__memo(() => import('./chunks/3-DEUj_kB4.js')),
			__memo(() => import('./chunks/4-DuXGBE4N.js')),
			__memo(() => import('./chunks/5-DmK9Nc-y.js')),
			__memo(() => import('./chunks/6-VZnBmU1J.js')),
			__memo(() => import('./chunks/7-DlhUi60h.js')),
			__memo(() => import('./chunks/8-D9Jqhn7z.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-CSRiwQZ2.js'))
			},
			{
				id: "/api/conversations/[id]",
				pattern: /^\/api\/conversations\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C4muE3VH.js'))
			},
			{
				id: "/api/conversations/[id]/messages",
				pattern: /^\/api\/conversations\/([^/]+?)\/messages\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-z6_1I4Dx.js'))
			},
			{
				id: "/api/play/[shareCode]/assets",
				pattern: /^\/api\/play\/([^/]+?)\/assets\/?$/,
				params: [{"name":"shareCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-vvkq8dEp.js'))
			},
			{
				id: "/api/play/[shareCode]/bundle",
				pattern: /^\/api\/play\/([^/]+?)\/bundle\/?$/,
				params: [{"name":"shareCode","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-TYlvE2hw.js'))
			},
			{
				id: "/api/projects",
				pattern: /^\/api\/projects\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cn_mqTp3.js'))
			},
			{
				id: "/api/projects/[id]/assets",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BMuoMEwC.js'))
			},
			{
				id: "/api/projects/[id]/assets/copy-starter",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/copy-starter\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-0X0UJdwM.js'))
			},
			{
				id: "/api/projects/[id]/assets/[assetId]",
				pattern: /^\/api\/projects\/([^/]+?)\/assets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"assetId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CpPZtXOi.js'))
			},
			{
				id: "/api/projects/[id]/bundle",
				pattern: /^\/api\/projects\/([^/]+?)\/bundle\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-LdAgp5aT.js'))
			},
			{
				id: "/api/projects/[id]/chat-images",
				pattern: /^\/api\/projects\/([^/]+?)\/chat-images\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DG4oUhrV.js'))
			},
			{
				id: "/api/projects/[id]/conversations",
				pattern: /^\/api\/projects\/([^/]+?)\/conversations\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DYuucm0P.js'))
			},
			{
				id: "/api/projects/[id]/files",
				pattern: /^\/api\/projects\/([^/]+?)\/files\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D5td_wcd.js'))
			},
			{
				id: "/api/projects/[id]/files/[...path]",
				pattern: /^\/api\/projects\/([^/]+?)\/files(?:\/([^]*))?\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-_dGnZv7L.js'))
			},
			{
				id: "/api/projects/[id]/multiplayer",
				pattern: /^\/api\/projects\/([^/]+?)\/multiplayer\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-l2IpDy5L.js'))
			},
			{
				id: "/api/starter-assets",
				pattern: /^\/api\/starter-assets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DQNy_mZU.js'))
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

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
