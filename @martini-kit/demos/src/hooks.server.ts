import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;

	// Redirect old /demo/[gameId] and /preview/[gameId] routes to /editor/[gameId]
	if (url.pathname.startsWith('/demo/')) {
		const gameId = url.pathname.replace('/demo/', '');
		throw redirect(301, `/editor/${gameId}`);
	}
	if (url.pathname.startsWith('/preview/')) {
		const gameId = url.pathname.replace('/preview/', '');
		throw redirect(301, `/editor/${gameId}`);
	}

	return resolve(event);
};
