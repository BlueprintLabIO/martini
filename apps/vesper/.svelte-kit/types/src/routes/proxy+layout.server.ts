// @ts-nocheck
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals, cookies }: Parameters<LayoutServerLoad>[0]) => {
	const { session } = await locals.safeGetSession();

	return {
		session,
		cookies: cookies.getAll()
	};
};
