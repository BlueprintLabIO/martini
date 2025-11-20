import type { SDK } from '$lib/stores/sdkPreference';

export interface DocsPage {
	title: string;
	href: string;
	sdks?: SDK[]; // Which SDKs this page applies to (undefined = all SDKs)
	external?: boolean; // For external links (roadmap items)
}

export interface DocsSubsection {
	title: string;
	items: DocsPage[];
	comingSoon?: boolean; // For future SDK subsections
}

export interface DocsSection {
	title: string;
	items: DocsPage[];
	subsections?: DocsSubsection[];
}

// Hierarchical navigation structure for sidebar
export const docsSections: DocsSection[] = [
	{
		title: 'Getting Started',
		items: [
			{ title: 'Introduction', href: '/docs' },
			{ title: 'Installation', href: '/docs/latest/getting-started/installation', sdks: ['phaser', 'core'] },
			{ title: 'Quick Start', href: '/docs/latest/getting-started/quick-start', sdks: ['phaser', 'core'] },
			{ title: 'First Game', href: '/docs/latest/getting-started/first-game', sdks: ['phaser', 'core'] }
		]
	},
	{
		title: 'Core Concepts',
		items: [
			{ title: 'Architecture', href: '/docs/latest/concepts/architecture' },
			{ title: 'State Management', href: '/docs/latest/concepts/state-management' },
			{ title: 'Actions', href: '/docs/latest/concepts/actions' },
			{ title: 'Transport Layer', href: '/docs/latest/concepts/transport-layer' },
			{ title: 'Player Lifecycle', href: '/docs/latest/concepts/player-lifecycle' },
			{ title: 'Determinism', href: '/docs/latest/concepts/determinism' }
		]
	},
	{
		title: 'Guides',
		items: [
			{ title: 'Phaser Integration', href: '/docs/latest/guides/phaser-integration', sdks: ['phaser'] },
			{ title: 'Physics & Collision', href: '/docs/latest/guides/physics-and-collision', sdks: ['phaser', 'core'] },
			{ title: 'UI & HUD', href: '/docs/latest/guides/ui-and-hud', sdks: ['phaser', 'core'] },
			{ title: 'Testing', href: '/docs/latest/guides/testing' },
			{ title: 'Deployment', href: '/docs/latest/guides/deployment' },
			{ title: 'Optimization', href: '/docs/latest/guides/optimization' }
		]
	},
	{
		title: 'Examples & Recipes',
		items: [
			{ title: 'Examples Overview', href: '/docs/latest/examples/overview' },
			{ title: 'Player Movement', href: '/docs/latest/recipes/player-movement' },
			{ title: 'Shooting Mechanics', href: '/docs/latest/recipes/shooting-mechanics' },
			{ title: 'Health & Damage', href: '/docs/latest/recipes/health-and-damage' },
			{ title: 'Power-ups', href: '/docs/latest/recipes/power-ups' },
			{ title: 'Game Modes', href: '/docs/latest/recipes/game-modes' }
		]
	},
	{
		title: 'API Reference',
		items: [],
		subsections: [
			{
				title: 'Core',
				items: [
					{ title: 'defineGame()', href: '/docs/latest/api/core/define-game', sdks: ['core', 'phaser'] },
					{ title: 'GameRuntime', href: '/docs/latest/api/core/game-runtime', sdks: ['core', 'phaser'] },
					{ title: 'Transport', href: '/docs/latest/api/core/transport', sdks: ['core', 'phaser'] },
					{ title: 'SeededRandom', href: '/docs/latest/api/core/seeded-random', sdks: ['core', 'phaser'] },
					{ title: 'Helpers', href: '/docs/latest/api/core/helpers', sdks: ['core', 'phaser'] },
					{ title: 'Logger', href: '/docs/latest/api/core/logger', sdks: ['core', 'phaser'] },
					{ title: 'Sync (Diff/Patch)', href: '/docs/latest/api/core/sync', sdks: ['core', 'phaser'] }
				]
			},
			{
				title: 'Phaser',
				items: [
					{ title: 'PhaserAdapter', href: '/docs/latest/api/phaser/adapter', sdks: ['phaser'] },
					{ title: 'SpriteManager', href: '/docs/latest/api/phaser/sprite-manager', sdks: ['phaser'] },
					{ title: 'Reactive APIs', href: '/docs/latest/api/phaser/reactive-apis', sdks: ['phaser'] },
					{ title: 'InputManager', href: '/docs/latest/api/phaser/input-manager', sdks: ['phaser'] },
					{ title: 'PhysicsManager', href: '/docs/latest/api/phaser/physics-manager', sdks: ['phaser'] },
					{ title: 'CollisionManager', href: '/docs/latest/api/phaser/collision-manager', sdks: ['phaser'] },
					{ title: 'UI Helpers', href: '/docs/latest/api/phaser/ui-helpers', sdks: ['phaser'] },
					{ title: 'StateDrivenSpawner', href: '/docs/latest/api/phaser/spawner', sdks: ['phaser'] }
				]
			},
			{
				title: 'Transports',
				items: [
					{ title: 'Overview', href: '/docs/latest/api/transports/overview', sdks: ['core', 'phaser'] },
					{ title: 'LocalTransport', href: '/docs/latest/api/transports/local', sdks: ['core', 'phaser'] },
					{ title: 'IframeBridgeTransport', href: '/docs/latest/api/transports/iframe-bridge', sdks: ['core', 'phaser'] },
					{ title: 'TrysteroTransport', href: '/docs/latest/api/transports/trystero', sdks: ['core', 'phaser'] },
					{ title: 'Custom Transports', href: '/docs/latest/api/transports/custom', sdks: ['core', 'phaser'] }
				]
			},
			{
				title: 'DevTools',
				items: [
					{ title: 'StateInspector', href: '/docs/latest/api/devtools/state-inspector', sdks: ['core', 'phaser'] }
				]
			},
			{
				title: 'Unity (Coming Soon)',
				comingSoon: true,
				items: [
					{ title: 'Track on GitHub', href: 'https://github.com/BlueprintLabIO/martini', external: true }
				]
			}
		]
	},
	{
		title: 'Contributing',
		items: [
			{ title: 'Getting Started', href: '/docs/latest/contributing/getting-started' },
			{ title: 'Architecture', href: '/docs/latest/contributing/architecture' },
			{ title: 'Where to Contribute', href: '/docs/latest/contributing/where-to-contribute' },
			{ title: 'Development Workflow', href: '/docs/latest/contributing/development-workflow' },
			{ title: 'Coding Standards', href: '/docs/latest/contributing/coding-standards' },
			{ title: 'Adding Examples', href: '/docs/latest/contributing/adding-examples' }
		]
	},
	{
		title: 'Help',
		items: [
			{ title: 'Troubleshooting', href: '/docs/latest/troubleshooting/common-issues' },
			{ title: 'Debugging', href: '/docs/latest/troubleshooting/debugging' },
			{ title: 'FAQ', href: '/docs/latest/faq' },
			{ title: 'Migration Guide', href: '/docs/latest/migration/v1-to-v2' },
			{ title: 'Changelog', href: '/docs/latest/changelog' }
		]
	}
];

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
