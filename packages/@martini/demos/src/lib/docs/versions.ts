export interface Version {
	id: string; // 'v0.1', 'v1.0', etc.
	label: string; // 'v0.1', 'v1.0', etc.
	status: 'latest' | 'next' | 'legacy';
	releaseDate?: string; // ISO date string
}

export const versions: Version[] = [
	{ id: 'v0.1', label: 'v0.1', status: 'latest', releaseDate: '2025-01-17' }
	// Future versions will be added here:
	// { id: 'v1.0', label: 'v1.0', status: 'next' }
];

export const latestVersion = versions.find((v) => v.status === 'latest') || versions[0];
export const nextVersion = versions.find((v) => v.status === 'next');

// Use "latest" as the default version alias instead of specific version number
export const defaultVersion = 'latest';

/**
 * Version alias mapping
 * Maps user-friendly aliases to actual version IDs
 */
export const versionAliases: Record<string, string> = {
	latest: latestVersion.id, // 'latest' -> 'v0.1'
	next: nextVersion?.id || latestVersion.id // 'next' -> next version or latest if none
};

/**
 * Resolve version alias to actual version ID
 * e.g., 'stable' -> 'v0.1', 'v0.1' -> 'v0.1'
 */
export function resolveVersionAlias(versionParam: string): string {
	return versionAliases[versionParam] || versionParam;
}

/**
 * Get version from path parameter and resolve aliases
 * Returns actual version ID (e.g., 'v0.1')
 */
export function getVersionFromPath(versionParam: string | undefined): string {
	if (!versionParam) return latestVersion.id;

	// Resolve alias first (stable -> v0.1)
	const resolvedVersion = resolveVersionAlias(versionParam);

	// Check if it's a valid version
	const version = versions.find((v) => v.id === resolvedVersion);
	return version ? version.id : latestVersion.id;
}

/**
 * Check if a version or alias exists
 */
export function isValidVersion(versionId: string): boolean {
	// Check if it's an alias
	if (versionAliases[versionId]) return true;
	// Check if it's a direct version
	return versions.some((v) => v.id === versionId);
}
