/**
 * IDE Configuration Mapping
 *
 * Maps game IDs to their IDE configurations and metadata.
 * Configs are extracted from the latest /ide-* routes which contain
 * the most up-to-date Martini SDK code.
 */

import type { MartiniIDEConfig } from '@martini/ide';

// Import all IDE configs from individual routes
// These are the source of truth for the latest Martini code
import fireAndIceConfig from './configs/fire-and-ice';
import paddleBattleConfig from './configs/paddle-battle';
import blobBattleConfig from './configs/blob-battle';
import arenaBlasterConfig from './configs/arena-blaster';
import circuitRacerConfig from './configs/circuit-racer';

export interface GamePreviewMetadata {
	title: string;
	description: string;
}

/**
 * Game metadata for preview pages
 */
export const gameMetadata: Record<string, GamePreviewMetadata> = {
	'fire-and-ice': {
		title: 'Fire & Ice - Cooperative Platformer',
		description: 'A two-player platformer where teamwork is key. Fire (red) and Ice (blue) must work together!'
	},
	'paddle-battle': {
		title: 'Paddle Battle - Multiplayer Pong',
		description: 'Classic Pong reimagined for multiplayer. First to 5 points wins!'
	},
	'blob-battle': {
		title: 'Blob Battle - Agar.io-style Multiplayer',
		description: 'Showcasing StateDrivenSpawner (auto-spawns players & food from state) and createTickAction (server-side physics with collisions). Click to move, eat food to grow, eat smaller blobs to win!'
	},
	'arena-blaster': {
		title: 'Arena Blaster - Top-Down Shooter',
		description: 'Twin-stick shooter action! WASD to move, Space to shoot.'
	},
	'circuit-racer': {
		title: 'Circuit Racer - Pit of Success Demo',
		description: 'Showcasing event-driven architecture: createSpeedDisplay auto-updates via PhysicsManager.onVelocityChange, and attachDirectionalIndicator handles Phaser rotation conventions automatically. No manual update() calls, no rotation offset bugs!'
	},
	'tile-matcher': {
		title: 'Connect Four - Turn-Based Strategy',
		description: 'Classic Connect Four game. Get 4 in a row to win!'
	}
};

/**
 * IDE configurations mapped by game ID
 */
export const ideConfigs: Record<string, MartiniIDEConfig> = {
	'fire-and-ice': fireAndIceConfig,
	'paddle-battle': paddleBattleConfig,
	'blob-battle': blobBattleConfig,
	'arena-blaster': arenaBlasterConfig,
	'circuit-racer': circuitRacerConfig
	// tile-matcher will be added when we extract its config
};

/**
 * Get IDE configuration for a game
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
