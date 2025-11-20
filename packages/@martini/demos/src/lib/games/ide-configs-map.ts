/**
 * IDE Configuration Mapping
 *
 * Maps game IDs to their IDE configurations and metadata.
 * Configs are extracted from the restored preview sources to keep /preview routes in sync.
 */

import type { MartiniIDEConfig } from '@martini/ide';

// Import all IDE configs from individual routes
// These are the source of truth for the latest Martini code
import fireAndIceConfig from './configs/fire-and-ice';
import paddleBattleConfig from './configs/paddle-battle';
import blobBattleConfig from './configs/blob-battle';
import arenaBlasterConfig from './configs/arena-blaster';
import circuitRacerConfig from './configs/circuit-racer';
import tileMatcherConfig from './configs/tile-matcher';

// Import playground templates
import blankConfig from './configs/blank';
import platformerConfig from './configs/platformer';
import topdownConfig from './configs/topdown';
import racingConfig from './configs/racing';
import pongConfig from './configs/pong';

export interface GamePreviewMetadata {
	title: string;
	description: string;
	category?: 'example' | 'template';
	icon?: string;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Game metadata for preview pages
 */
export const gameMetadata: Record<string, GamePreviewMetadata> = {
	// Examples - Full featured games
	'fire-and-ice': {
		title: 'Fire & Ice',
		description: 'A two-player platformer where teamwork is key. Fire (red) and Ice (blue) must work together!',
		category: 'example',
		difficulty: 'beginner'
	},
	'paddle-battle': {
		title: 'Paddle Battle',
		description: 'Classic Pong reimagined for multiplayer. First to 5 points wins!',
		category: 'example',
		difficulty: 'beginner'
	},
	'blob-battle': {
		title: 'Blob Battle',
		description: 'Showcasing StateDrivenSpawner (auto-spawns players & food from state) and createTickAction (server-side physics with collisions). Click to move, eat food to grow, eat smaller blobs to win!',
		category: 'example',
		difficulty: 'beginner'
	},
	'arena-blaster': {
		title: 'Arena Blaster',
		description: 'Twin-stick shooter action! WASD to move, Space to shoot.',
		category: 'example',
		difficulty: 'advanced'
	},
	'circuit-racer': {
		title: 'Circuit Racer',
		description: 'Showcasing event-driven architecture: createSpeedDisplay auto-updates via PhysicsManager.onVelocityChange, and attachDirectionalIndicator handles Phaser rotation conventions automatically. No manual update() calls, no rotation offset bugs!',
		category: 'example',
		difficulty: 'intermediate'
	},
	'tile-matcher': {
		title: 'Connect Four',
		description: 'Classic Connect Four game. Get 4 in a row to win!',
		category: 'example',
		difficulty: 'intermediate'
	},

	// Templates - Starting points for building games
	blank: {
		title: 'Blank',
		description: 'Start from scratch with minimal setup. Perfect for experimenting.',
		category: 'template',
		icon: '📝',
		difficulty: 'beginner'
	},
	platformer: {
		title: 'Platformer',
		description: 'Cooperative platformer with jumping and platforms. Uses PhysicsManager for easy setup.',
		category: 'template',
		icon: '🏃',
		difficulty: 'beginner'
	},
	topdown: {
		title: 'Top-Down Shooter',
		description: 'Arena-style game with movement and shooting. Uses TopDown physics.',
		category: 'template',
		icon: '🎮',
		difficulty: 'intermediate'
	},
	racing: {
		title: 'Racing',
		description: 'Top-down racing game with lap tracking. Uses racing physics behavior.',
		category: 'template',
		icon: '🏎️',
		difficulty: 'intermediate'
	},
	pong: {
		title: 'Pong',
		description: 'Classic Pong game. Simple to understand, great for learning multiplayer basics.',
		category: 'template',
		icon: '🏓',
		difficulty: 'beginner'
	}
};

/**
 * IDE configurations mapped by game ID
 */
const ideConfigs: Record<string, MartiniIDEConfig> = {
	// Examples
	'fire-and-ice': fireAndIceConfig,
	'paddle-battle': paddleBattleConfig,
	'blob-battle': blobBattleConfig,
	'arena-blaster': arenaBlasterConfig,
	'circuit-racer': circuitRacerConfig,
	'tile-matcher': tileMatcherConfig,

	// Templates
	blank: blankConfig,
	platformer: platformerConfig,
	topdown: topdownConfig,
	racing: racingConfig,
	pong: pongConfig
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

function cloneConfig(config: MartiniIDEConfig): MartiniIDEConfig {
	return {
		...config,
		files: { ...config.files },
		transport: { ...config.transport },
		editor: config.editor ? { ...config.editor } : undefined
	};
}

export { ideConfigs };
