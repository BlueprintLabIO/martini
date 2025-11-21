export async function load() {
	try {
		// Import the index markdown file
		const module = await import('../../content/docs/index.md');
		const rawModule = await import('../../content/docs/index.md?raw');

		return {
			component: module.default,
			metadata: module.metadata || {},
			rawMarkdown: rawModule.default || '',
			slug: 'index',
			version: 'v0.1'
		};
	} catch (e) {
		console.error('Error loading docs index:', e);
		return {
			component: null,
			metadata: { title: 'Documentation' },
			rawMarkdown: '',
			slug: 'index',
			version: 'v0.1'
		};
	}
}

export const prerender = true;
