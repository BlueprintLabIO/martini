import { error } from '@sveltejs/kit';
import { getPrevNext } from '$lib/docs/navigation';

export async function load({ params, url }) {
	const { slug } = params;

	// Build the path to the markdown file
	const path = slug ? `/${slug}` : '/index';

	try {
		// Import all markdown files from content/docs
		const modules = import.meta.glob('/src/content/docs/**/*.md', { eager: true });
		const rawModules = import.meta.glob('/src/content/docs/**/*.md', { eager: true, query: '?raw' });

		// Find the matching module
		const matchingPath = Object.keys(modules).find(key => {
			// Remove /src/content/docs and .md extension
			const normalized = key
				.replace('/src/content/docs', '')
				.replace('.md', '');
			return normalized === path;
		});

		if (!matchingPath) {
			throw error(404, `Documentation page not found: ${path}`);
		}

		const module = modules[matchingPath];
		const rawModule = rawModules[matchingPath];
		const rawMarkdown = rawModule?.default || '';

		// Calculate prev/next navigation
		const currentPath = url.pathname;
		const { prev, next } = getPrevNext(currentPath);

		return {
			component: module.default,
			metadata: module.metadata || {},
			slug: slug || 'index',
			rawMarkdown: rawMarkdown,
			prev,
			next
		};
	} catch (e) {
		if (e.status === 404) throw e;
		console.error('Error loading doc:', e);
		throw error(500, 'Failed to load documentation page');
	}
}

export const prerender = true;
