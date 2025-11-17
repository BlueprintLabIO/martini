import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;

	// Redirect old /demo/[gameId] routes to /preview/[gameId]
	if (url.pathname.startsWith('/demo/')) {
		const gameId = url.pathname.replace('/demo/', '');
		throw redirect(301, `/preview/${gameId}`);
	}

	// Redirect old /ide-[gameId] routes to /preview/[gameId]
	if (url.pathname.startsWith('/ide-')) {
		const gameId = url.pathname.replace('/ide-', '').replace(/\//g, '');
		throw redirect(301, `/preview/${gameId}`);
	}

	// Redirect generic /ide route to home (was just a test page)
	if (url.pathname === '/ide' || url.pathname === '/ide-test-dual') {
		throw redirect(301, '/');
	}

	return resolve(event);
};
