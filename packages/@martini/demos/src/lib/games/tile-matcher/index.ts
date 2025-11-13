import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { createTileMatcherScene } from './scene';

export { tileMatcherGame } from './game';

/**
 * Creates a complete Phaser game configuration for Tile Matcher
 */
export function createTileMatcherConfig(
	container: HTMLDivElement,
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean }; client: { left: boolean; right: boolean; up: boolean } }
): Phaser.Types.Core.GameConfig {
	return {
		type: Phaser.AUTO,
		width: 800,
		height: 600,
		parent: container,
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 }, // No physics needed for puzzle game
				debug: false,
			},
		},
		backgroundColor: '#1f2937',
		scene: createTileMatcherScene(runtime, transport, isHost, playerId, role, keys),
		// Note: This game uses native DOM click events instead of Phaser's input system
		// to prevent conflicts when running dual instances in the same page
	};
}
