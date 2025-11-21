// Import all source files as raw strings at build time
// Exclude the source.ts file itself to avoid circular imports
const allSourceFiles = import.meta.glob('./**/*.{ts,md}', {
	query: '?raw',
	eager: true,
});

// Create a map of game ID to files map
export const gameSources: Record<string, Record<string, string>> = {};

for (const [path, module] of Object.entries(allSourceFiles)) {
	// Skip source.ts itself
	if (path.includes('source.ts')) continue;

	// Extract game ID and filename from path: ./fire-and-ice/game.ts -> { gameId: 'fire-and-ice', filename: 'game.ts' }
	const match = path.match(/\.\/([^/]+)\/(.+)$/);
	if (match) {
		const gameId = match[1];
		const filename = match[2];

		if (!gameSources[gameId]) {
			gameSources[gameId] = {};
		}

		gameSources[gameId][filename] = (module as { default: string }).default;
	}
}
