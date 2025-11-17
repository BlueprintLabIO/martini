/**
 * Centralized IDE Configurations for all demo games
 *
 * This file contains all MartiniIDE configurations used in the preview routes.
 * Each game has its full source code embedded for the IDE experience.
 */

import type { MartiniIDEConfig } from '@martini/ide';

/**
 * Get IDE configuration for a specific game by ID
 */
export function getIDEConfig(gameId: string): MartiniIDEConfig | null {
	const config = ideConfigs[gameId];
	if (!config) {
		console.warn(`No IDE config found for game: ${gameId}`);
		return null;
	}
	return config;
}

/**
 * Get metadata for a game (title and description for the preview page)
 */
export function getGameMetadata(gameId: string): { title: string; description: string } | null {
	const metadata = gameMetadata[gameId];
	if (!metadata) {
		console.warn(`No metadata found for game: ${gameId}`);
		return null;
	}
	return metadata;
}

/**
 * Game metadata (title and description shown in preview header)
 */
const gameMetadata: Record<string, { title: string; description: string }> = {
	'blob-battle': {
		title: 'Blob Battle - Agar.io-style Multiplayer',
		description: 'Showcasing StateDrivenSpawner (auto-spawns players & food from state) and createTickAction (server-side physics with collisions). Click to move, eat food to grow, eat smaller blobs to win!'
	},
	'fire-and-ice': {
		title: 'Fire & Ice - Cooperative Platformer',
		description: 'A two-player platformer where teamwork is key. Fire (red) and Ice (blue) must work together!'
	},
	'paddle-battle': {
		title: 'Paddle Battle - Multiplayer Pong',
		description: 'Classic Pong reimagined for multiplayer. First to 5 points wins!'
	},
	'arena-blaster': {
		title: 'Arena Blaster - Top-Down Shooter',
		description: 'Fast-paced multiplayer shooter with health, bullets, and respawning. Last player standing wins!'
	},
	'circuit-racer': {
		title: 'Circuit Racer - Top-Down Racing',
		description: 'Race against other players! Complete laps the fastest to win.'
	},
	'tile-matcher': {
		title: 'Connect Four - Turn-Based Strategy',
		description: 'Classic Connect Four game. Get 4 in a row to win!'
	}
};

/**
 * All IDE configurations mapped by game ID
 */
const ideConfigs: Record<string, MartiniIDEConfig> = {
	// Will be populated below
};

// Export for external use
export { ideConfigs, gameMetadata };
