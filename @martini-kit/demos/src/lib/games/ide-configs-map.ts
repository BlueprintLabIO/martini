/**
 * IDE Configuration Mapping
 *
 * Maps game IDs to their IDE configurations and metadata.
 * Configs are extracted from the restored preview sources to keep /preview routes in sync.
 */

import type { MartiniKitIDEConfig } from '@martini-kit/ide';

// Import all IDE configs from individual routes
// These are the source of truth for the latest martini-kit code
import fireAndIceConfig from './configs/fire-and-ice';
import paddleBattleConfig from './configs/paddle-battle';
import blobBattleConfig from './configs/blob-battle';
import arenaBlasterConfig from './configs/arena-blaster';
import circuitRacerConfig from './configs/circuit-racer';
import tileMatcherConfig from './configs/tile-matcher';

export interface GamePreviewMetadata {
	title: string;
	description: string;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Game metadata for preview pages
 */
export const gameMetadata: Record<string, GamePreviewMetadata> = {
	'fire-and-ice': {
		title: 'Fire & Ice',
		description: 'A two-player platformer where teamwork is key. Fire (red) and Ice (blue) must work together!',
		difficulty: 'beginner'
	},
	'paddle-battle': {
		title: 'Paddle Battle',
		description: 'Classic Pong reimagined for multiplayer. First to 5 points wins!',
		difficulty: 'beginner'
	},
	'blob-battle': {
		title: 'Blob Battle',
		description: 'Showcasing StateDrivenSpawner (auto-spawns players & food from state) and createTickAction (server-side physics with collisions). Click to move, eat food to grow, eat smaller blobs to win!',
		difficulty: 'beginner'
	},
	'arena-blaster': {
		title: 'Arena Blaster',
		description: 'Twin-stick shooter action! WASD to move, Space to shoot.',
		difficulty: 'advanced'
	},
	'circuit-racer': {
		title: 'Circuit Racer',
		description: 'Showcasing event-driven architecture: createSpeedDisplay auto-updates via PhysicsManager.onVelocityChange, and attachDirectionalIndicator handles Phaser rotation conventions automatically. No manual update() calls, no rotation offset bugs!',
		difficulty: 'intermediate'
	},
	'tile-matcher': {
		title: 'Connect Four',
		description: 'Classic Connect Four game. Get 4 in a row to win!',
		difficulty: 'intermediate'
	}
};

/**
 * IDE configurations mapped by game ID
 */
const ideConfigs: Record<string, MartiniKitIDEConfig> = {
	'fire-and-ice': fireAndIceConfig,
	'paddle-battle': paddleBattleConfig,
	'blob-battle': blobBattleConfig,
	'arena-blaster': arenaBlasterConfig,
	'circuit-racer': circuitRacerConfig,
	'tile-matcher': tileMatcherConfig
};

/**
 * Get IDE configuration for a game
 */
export function getIDEConfig(gameId: string): MartiniKitIDEConfig | null {
	const config = ideConfigs[gameId];
	if (!config) {
		console.warn(`No IDE config found for game: ${gameId}`);
		return null;
	}
	return cloneConfig(config);
}

/**
 * Get metadata for a game
 */
export function getGameMetadata(gameId: string): GamePreviewMetadata | null {
	const metadata = gameMetadata[gameId];
	if (!metadata) {
		console.warn(`No metadata found for game: ${gameId}`);
		return null;
	}
	return metadata;
}

function cloneConfig(config: MartiniKitIDEConfig): MartiniKitIDEConfig {
	return {
		...config,
		files: { ...config.files },
		transport: { ...config.transport },
		editor: config.editor ? { ...config.editor } : undefined
	};
}

export { ideConfigs };
