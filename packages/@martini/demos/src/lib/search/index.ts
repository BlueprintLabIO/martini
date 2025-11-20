import Fuse from 'fuse.js';

export interface SearchDoc {
	title: string;
	description: string;
	content: string;
	path: string;
	section: string;
}

let searchIndex: Fuse<SearchDoc> | null = null;
let loadingPromise: Promise<Fuse<SearchDoc>> | null = null;

export async function getSearchIndex(): Promise<Fuse<SearchDoc>> {
	if (searchIndex) {
		return searchIndex;
	}

	if (!loadingPromise) {
		loadingPromise = loadSearchDocs().then((docs) => {
			searchIndex = new Fuse(docs, {
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
		}).catch((err) => {
			loadingPromise = null;
			throw err;
		});
	}

	return loadingPromise;
}

async function loadSearchDocs(): Promise<SearchDoc[]> {
	const response = await fetch('/docs/search.json', {
		headers: {
			accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to load search index: ${response.status}`);
	}

	return response.json();
}
