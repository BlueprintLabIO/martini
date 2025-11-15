import Fuse from 'fuse.js';

export interface SearchDoc {
	title: string;
	description: string;
	content: string;
	path: string;
	section: string;
}

let searchIndex: Fuse<SearchDoc> | null = null;

function extractTextContent(html: string): string {
	// Remove HTML tags and get plain text
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function getSearchIndex(): Promise<Fuse<SearchDoc>> {
	if (searchIndex) {
		return searchIndex;
	}

	// Import all markdown files
	const modules = import.meta.glob('/src/content/docs/**/*.md', { eager: true });

	const searchDocs: SearchDoc[] = [];

	for (const [path, module] of Object.entries(modules)) {
		const mod = module as any;
		const metadata = mod.metadata || {};

		// Convert path to URL
		const urlPath = path
			.replace('/src/content/docs', '/docs')
			.replace('.md', '')
			.replace('/index', '');

		searchDocs.push({
			title: metadata.title || 'Untitled',
			description: metadata.description || '',
			content: '', // We'll skip content extraction for now to keep it simple
			path: urlPath,
			section: metadata.section || 'general'
		});
	}

	searchIndex = new Fuse(searchDocs, {
		keys: [
			{ name: 'title', weight: 0.7 },
			{ name: 'description', weight: 0.3 }
		],
		threshold: 0.3,
		includeMatches: true,
		minMatchCharLength: 2,
		ignoreLocation: true
	});

	return searchIndex;
}
