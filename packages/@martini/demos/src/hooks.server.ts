import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;

	// Redirect old /demo/[gameId] routes to /preview/[gameId]
	if (url.pathname.startsWith('/demo/')) {
		const gameId = url.pathname.replace('/demo/', '');
		throw redirect(301, `/preview/${gameId}`);
	}

	return resolve(event);
};
