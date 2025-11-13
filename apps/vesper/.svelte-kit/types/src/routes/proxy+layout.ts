// @ts-nocheck
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load = async ({ fetch, data, depends }: Parameters<LayoutLoad>[0]) => {
	// This tells SvelteKit to re-run this load function whenever `invalidate('supabase:auth')` is called
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: {
					fetch
				}
			})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: {
					fetch
				},
				cookies: {
					getAll() {
						return data.cookies;
					}
				}
			});

	// Use the validated session from +layout.server.ts (which uses safeGetSession)
	// No need to call getSession() again - that would bypass validation
	return {
		supabase,
		session: data.session
	};
};
