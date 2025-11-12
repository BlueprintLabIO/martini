// @ts-nocheck
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';

export const load = async ({ params }: Parameters<PageServerLoad>[0]) => {
	const { shareCode } = params;

	// Validate share code format
	if (!shareCode || shareCode.length !== 6) {
		throw redirect(303, '/play');
	}

	// Look up project by share code
	const project = await getProjectByShareCode(shareCode.toUpperCase());

	if (!project) {
		throw redirect(303, '/play');
	}

	// Check if project is published
	if (project.state !== 'published' || !project.shareCode) {
		throw redirect(303, '/play');
	}

	return {
		project: {
			id: project.id,
			name: project.name,
			shareCode: project.shareCode
		}
	};
};
