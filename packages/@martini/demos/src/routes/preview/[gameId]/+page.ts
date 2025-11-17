import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { demoGames } from '$lib/games';

export const load: PageLoad = ({ params }) => {
	const { gameId } = params;

	// Find the game in our games list
	const game = demoGames.find((g) => g.id === gameId);

	if (!game) {
		throw error(404, {
			message: `Game "${gameId}" not found`
		});
	}

	return {
		game
	};
};
