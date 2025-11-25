import { error } from '@sveltejs/kit';

// Eager import to match docs handling
const modules = import.meta.glob('/src/content/docs/operate/changelog.md', { eager: true });
const rawModules = import.meta.glob('/src/content/docs/operate/changelog.md', { query: '?raw', eager: true });

export function load() {
	const module = modules['/src/content/docs/operate/changelog.md'];
	const rawModule = rawModules['/src/content/docs/operate/changelog.md'];

	if (!module) {
		throw error(404, 'Changelog not found');
	}

	return {
		component: module.default,
		metadata: module.metadata || {},
		rawMarkdown: rawModule?.default || ''
	};
}

export const prerender = true;
