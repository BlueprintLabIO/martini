
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/chat" | "/api/projects" | "/api/projects/[id]" | "/api/projects/[id]/bundle" | "/api/projects/[id]/files" | "/auth" | "/auth/login" | "/auth/signup" | "/dashboard" | "/editor" | "/editor/[projectId]";
		RouteParams(): {
			"/api/projects/[id]": { id: string };
			"/api/projects/[id]/bundle": { id: string };
			"/api/projects/[id]/files": { id: string };
			"/editor/[projectId]": { projectId: string }
		};
		LayoutParams(): {
			"/": { id?: string; projectId?: string };
			"/api": { id?: string };
			"/api/chat": Record<string, never>;
			"/api/projects": { id?: string };
			"/api/projects/[id]": { id: string };
			"/api/projects/[id]/bundle": { id: string };
			"/api/projects/[id]/files": { id: string };
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/auth/signup": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/editor": { projectId?: string };
			"/editor/[projectId]": { projectId: string }
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/chat" | "/api/chat/" | "/api/projects" | "/api/projects/" | `/api/projects/${string}` & {} | `/api/projects/${string}/` & {} | `/api/projects/${string}/bundle` & {} | `/api/projects/${string}/bundle/` & {} | `/api/projects/${string}/files` & {} | `/api/projects/${string}/files/` & {} | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/auth/signup" | "/auth/signup/" | "/dashboard" | "/dashboard/" | "/editor" | "/editor/" | `/editor/${string}` & {} | `/editor/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | "/sandbox-runtime.html" | string & {};
	}
}