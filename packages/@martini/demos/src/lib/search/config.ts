import type { IFuseOptions, FuseOptionKey, FuseResult, FuseIndex } from 'fuse.js';

export interface SearchDoc {
	id: string;
	title: string;
	description: string;
	section: string;
	path: string;
	content: string;
	headings: string[];
}

export type SearchResult = FuseResult<SearchDoc>;

export const SEARCH_ENDPOINT = '/docs/search-index.json';

export type SerializedFuseIndex = ReturnType<FuseIndex<SearchDoc>['toJSON']>;

export interface SearchIndexPayload {
	docs: SearchDoc[];
	index: SerializedFuseIndex;
}

export const SEARCH_KEYS: ReadonlyArray<FuseOptionKey<SearchDoc>> = [
	{ name: 'title', weight: 0.55 },
	{ name: 'description', weight: 0.2 },
	{ name: 'headings', weight: 0.15 },
	{ name: 'content', weight: 0.1 }
];

export const SEARCH_OPTIONS: IFuseOptions<SearchDoc> = {
	keys: [...SEARCH_KEYS],
	threshold: 0.3,
	includeMatches: true,
	ignoreLocation: true,
	minMatchCharLength: 2
};
