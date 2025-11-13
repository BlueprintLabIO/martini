// @ts-nocheck
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProjectByShareCode } from '$lib/server/multiplayer/shareCode';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ params, url }: Parameters<PageServerLoad>[0]) => {
	const { shareCode } = params;
	const roomCode = url.searchParams.get('room'); // Multiplayer session code

	if (!shareCode) {
		throw redirect(303, '/play');
	}

	let project;

	// Check if it's a UUID (draft/testing mode via project ID)
	const isUUID = shareCode.length > 6 && shareCode.includes('-');

	if (isUUID) {
		// Testing mode - fetch project by ID (no published check)
		const result = await db
			.select()
			.from(projects)
			.where(eq(projects.id, shareCode))
			.limit(1);

		if (result.length === 0) {
			throw redirect(303, '/play');
		}

		project = result[0];
	} else {
		// Published mode - fetch by share code
		if (shareCode.length !== 6) {
			throw redirect(303, '/play');
		}

		project = await getProjectByShareCode(shareCode.toUpperCase());

		if (!project) {
			throw redirect(303, '/play');
		}

		// Check if project is published
		if (project.state !== 'published' || !project.shareCode) {
			throw redirect(303, '/play');
		}
	}

	return {
		project: {
			id: project.id,
			name: project.name,
			shareCode: project.shareCode || shareCode // Use shareCode if published, otherwise use ID
		},
		roomCode, // Pass room code for multiplayer
		isTestingMode: isUUID // Flag to show "testing mode" UI
	};
};
