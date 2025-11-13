import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { createArenaBlasterScene } from './scene';

export { arenaBlasterGame } from './game';

/**
 * Creates a complete Phaser game configuration for Arena Blaster
 */
export function createArenaBlasterConfig(
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
				gravity: { x: 0, y: 0 }, // No gravity for top-down shooter
				debug: false,
			},
		},
		backgroundColor: '#2d3748',
		scene: createArenaBlasterScene(runtime, transport, isHost, playerId, role, keys),
	};
}
