export interface DocsPage {
	title: string;
	href: string;
}

// Flat list of all documentation pages in reading order
export const docsNavigation: DocsPage[] = [
	{ title: 'Introduction', href: '/docs' },
	{ title: 'Installation', href: '/docs/getting-started/installation' },
	{ title: 'Quick Start', href: '/docs/getting-started/quick-start' },
	{ title: '@martini/core', href: '/docs/api/core' },
	{ title: '@martini/phaser', href: '/docs/api/phaser' },
	{ title: 'Transports', href: '/docs/api/transports' }
];

export function getPrevNext(currentPath: string): {
	prev: DocsPage | null;
	next: DocsPage | null;
} {
	const index = docsNavigation.findIndex((item) => item.href === currentPath);

	return {
		prev: index > 0 ? docsNavigation[index - 1] : null,
		next: index < docsNavigation.length - 1 ? docsNavigation[index + 1] : null
	};
}
