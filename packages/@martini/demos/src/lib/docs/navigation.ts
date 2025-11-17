export interface DocsPage {
	title: string;
	href: string;
}

export interface DocsSection {
	title: string;
	items: DocsPage[];
}

// Hierarchical navigation structure for sidebar
export const docsSections: DocsSection[] = [
	{
		title: 'Getting Started',
		items: [
			{ title: 'Introduction', href: '/docs' },
			{ title: 'Installation', href: '/docs/latest/getting-started/installation' },
			{ title: 'Quick Start', href: '/docs/latest/getting-started/quick-start' },
			{ title: 'First Game', href: '/docs/latest/getting-started/first-game' }
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
		title: 'API Reference',
		items: [
			// Core
			{ title: 'defineGame()', href: '/docs/latest/api/core/define-game' },
			{ title: 'GameRuntime', href: '/docs/latest/api/core/game-runtime' },
			{ title: 'Transport', href: '/docs/latest/api/core/transport' },
			{ title: 'SeededRandom', href: '/docs/latest/api/core/seeded-random' },
			{ title: 'Helpers', href: '/docs/latest/api/core/helpers' },
			{ title: 'Logger', href: '/docs/latest/api/core/logger' },
			{ title: 'Sync (Diff/Patch)', href: '/docs/latest/api/core/sync' },
			// Phaser
			{ title: 'PhaserAdapter', href: '/docs/latest/api/phaser/adapter' },
			{ title: 'SpriteManager', href: '/docs/latest/api/phaser/sprite-manager' },
			{ title: 'Reactive APIs', href: '/docs/latest/api/phaser/reactive-apis' },
			{ title: 'InputManager', href: '/docs/latest/api/phaser/input-manager' },
			{ title: 'PhysicsManager', href: '/docs/latest/api/phaser/physics-manager' },
			{ title: 'CollisionManager', href: '/docs/latest/api/phaser/collision-manager' },
			{ title: 'UI Helpers', href: '/docs/latest/api/phaser/ui-helpers' },
			{ title: 'StateDrivenSpawner', href: '/docs/latest/api/phaser/spawner' },
			// Transports
			{ title: 'Transports Overview', href: '/docs/latest/api/transports/overview' },
			{ title: 'LocalTransport', href: '/docs/latest/api/transports/local' },
			{ title: 'IframeBridgeTransport', href: '/docs/latest/api/transports/iframe-bridge' },
			{ title: 'TrysteroTransport', href: '/docs/latest/api/transports/trystero' },
			{ title: 'Custom Transports', href: '/docs/latest/api/transports/custom' },
			// DevTools
			{ title: 'StateInspector', href: '/docs/latest/api/devtools/state-inspector' }
		]
	},
	{
		title: 'Guides',
		items: [
			{ title: 'Phaser Integration', href: '/docs/latest/guides/phaser-integration' },
			{ title: 'Physics & Collision', href: '/docs/latest/guides/physics-and-collision' },
			{ title: 'UI & HUD', href: '/docs/latest/guides/ui-and-hud' },
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
export const docsNavigation: DocsPage[] = docsSections.flatMap((section) => section.items);

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
