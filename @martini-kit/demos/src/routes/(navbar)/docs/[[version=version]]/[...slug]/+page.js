import { error } from '@sveltejs/kit';
import { getPrevNext } from '$lib/docs/navigation';
import { getVersionFromPath, defaultVersion } from '$lib/docs/versions';

// Use eager loading for reliable module resolution during navigation
// Load both current docs and versioned docs
const modules = import.meta.glob([
	'/src/content/docs/**/*.md',
	'/src/content/versioned_docs/**/*.md'
], { eager: true });

const rawModules = import.meta.glob([
	'/src/content/docs/**/*.md',
	'/src/content/versioned_docs/**/*.md'
], { query: '?raw', eager: true });

/**
 * @param {{ params: { slug?: string, version?: string }, url: URL }} params
 */
export async function load({ params, url }) {
	const { slug, version } = params;

	// Determine which version to load (default to latest)
	// The param matcher ensures version is only set for valid version strings
	const versionToLoad = getVersionFromPath(version);

	// Build the path to the markdown file
	const path = slug ? `/${slug}` : '/index';

	try {
		// Normalize path and generate candidates for both direct file and index fallback
		const normalizedPath = path.replace(/\/+$/, '');
		const isIndex = normalizedPath.endsWith('/index');

		/** @type {string[]} */
		const possiblePaths = [];

		// Versioned candidates (if not default)
		if (versionToLoad !== defaultVersion) {
			possiblePaths.push(`/src/content/versioned_docs/${versionToLoad}${normalizedPath}.md`);
			if (!isIndex) possiblePaths.push(`/src/content/versioned_docs/${versionToLoad}${normalizedPath}/index.md`);
		}

		// Current docs candidates
		possiblePaths.push(`/src/content/docs${normalizedPath}.md`);
		if (!isIndex) possiblePaths.push(`/src/content/docs${normalizedPath}/index.md`);

		/** @type {string | null} */
		let matchingPath = null;
		for (const tryPath of possiblePaths) {
			if (modules[tryPath]) {
				matchingPath = tryPath;
				break;
			}
		}

		if (!matchingPath) {
			throw error(404, `Documentation page not found: ${path} (version: ${versionToLoad})`);
		}

		// Access modules directly (already loaded via eager)
		const module = modules[matchingPath];
		const rawModule = rawModules[matchingPath];
		const rawMarkdown = rawModule?.default || '';

		// Calculate prev/next navigation
		const currentPath = url.pathname;
		const { prev, next } = getPrevNext(currentPath);

		// Determine if we fell back to default docs instead of a versioned file
		const resolvedVersion = matchingPath.includes('/versioned_docs/')
			? versionToLoad
			: defaultVersion;
		const versionFallback = versionToLoad !== resolvedVersion;

		return {
			component: module.default,
			metadata: module.metadata || {},
			slug: slug || 'index',
			version: resolvedVersion,
			versionFallback,
			requestedVersion: versionToLoad,
			rawMarkdown: rawMarkdown,
			prev,
			next
		};
	} catch (e) {
		// @ts-ignore - e could be an error object
		if (e?.status === 404) throw e;
		console.error('Error loading doc:', e);
		throw error(500, 'Failed to load documentation page');
	}
}

// Generate prerender entries for all markdown files and versions
export function entries() {
	/** @type {Array<{ version?: string, slug: string }>} */
	const entries = [];

	Object.keys(modules).forEach(path => {
		// Handle current docs (/src/content/docs/)
		if (path.startsWith('/src/content/docs/')) {
			const slug = path
				.replace('/src/content/docs/', '')
				.replace('.md', '')
				.replace('/index', '');

			if (slug) {
				// Add "latest" alias entry (primary URL for latest version)
				entries.push({ version: 'latest', slug });
				// Also add actual version entry (e.g., v0.1) for direct access
				entries.push({ version: 'v0.1', slug });
			}
		}

		// Handle versioned docs (/src/content/versioned_docs/v0.1/, v1.0/, etc.)
		if (path.startsWith('/src/content/versioned_docs/')) {
			const withoutPrefix = path.replace('/src/content/versioned_docs/', '');
			const parts = withoutPrefix.split('/');
			const version = parts[0]; // e.g., 'v0.1', 'v1.0'
			const slug = parts.slice(1).join('/')
				.replace('.md', '')
				.replace('/index', '');

			if (slug) {
				// Add versioned entry for this specific version
				entries.push({ version, slug });
			}
		}
	});

	return entries;
}

export const prerender = true;
