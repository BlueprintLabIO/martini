import type { SDK } from '$lib/stores/sdkPreference';

export interface DocsPage {
	title: string;
	href: string;
	sdks?: SDK[]; // Which SDKs this page applies to (undefined = all SDKs)
	external?: boolean; // For external links (roadmap items)
	scope?: string; // e.g., agnostic, phaser
}

export interface DocsSubsection {
	title: string;
	items: DocsPage[];
	id?: string; // Optional key used for ordering/grouping
	comingSoon?: boolean; // For future SDK subsections
}

export interface DocsSection {
	title: string;
	items: DocsPage[];
	subsections?: DocsSubsection[];
}

import { generateSidebar } from './generateSidebar';

// Load all markdown files to generate sidebar
const modules = import.meta.glob('/src/content/docs/**/*.md', { eager: true });

// Hierarchical navigation structure for sidebar
export const docsSections: DocsSection[] = generateSidebar(modules);

// Flat list of all documentation pages in reading order
// All hrefs use "latest" alias which points to the latest version
export const docsNavigation: DocsPage[] = docsSections.flatMap((section) => {
	const sectionItems = section.items;
	const subsectionItems = section.subsections?.flatMap((sub) => sub.items) || [];
	return [...sectionItems, ...subsectionItems];
});

/**
 * Normalize path by removing version/alias prefix if present
 * e.g., /docs/latest/getting-started/installation -> /docs/getting-started/installation
 * e.g., /docs/v0.1/getting-started/installation -> /docs/getting-started/installation
 */
function normalizePathForComparison(path: string): string {
	return path.replace(/\/docs\/(latest|next|v[\d.]+)\//, '/docs/');
}

/**
 * Extract version/alias from path if present
 * e.g., /docs/latest/getting-started/installation -> latest
 * e.g., /docs/v0.1/getting-started/installation -> v0.1
 */
function extractVersion(path: string): string | null {
	const match = path.match(/\/docs\/(latest|next|v[\d.]+)\//);
	return match ? match[1] : null;
}

/**
 * Add version/alias to href to match current path's version
 * e.g., addVersionToHref('/docs/latest/api/core', '/docs/v0.1/getting-started') -> '/docs/v0.1/api/core'
 */
function addVersionToHref(href: string, currentPath: string): string {
	const version = extractVersion(currentPath);
	if (version && !href.includes(version)) {
		return href.replace('/docs/latest/', `/docs/${version}/`);
	}
	return href;
}

export function getPrevNext(currentPath: string): {
	prev: DocsPage | null;
	next: DocsPage | null;
} {
	// Normalize the current path to match against navigation items
	const normalizedPath = normalizePathForComparison(currentPath);

	const index = docsNavigation.findIndex((item) => {
		const normalizedItemHref = normalizePathForComparison(item.href);
		return normalizedItemHref === normalizedPath;
	});

	const prevItem = index > 0 ? docsNavigation[index - 1] : null;
	const nextItem = index < docsNavigation.length - 1 ? docsNavigation[index + 1] : null;

	return {
		prev: prevItem ? { ...prevItem, href: addVersionToHref(prevItem.href, currentPath) } : null,
		next: nextItem ? { ...nextItem, href: addVersionToHref(nextItem.href, currentPath) } : null
	};
}
