export async function load() {
	try {
		// Import the index markdown file
		const module = await import('../../content/docs/index.md');

		return {
			component: module.default,
			metadata: module.metadata || {}
		};
	} catch (e) {
		console.error('Error loading docs index:', e);
		return {
			component: null,
			metadata: { title: 'Documentation' }
		};
	}
}

export const prerender = true;
