import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { createPaddleBattleScene } from './scene';

export { paddleBattleGame } from './game';

/**
 * Creates a complete Phaser game configuration for Paddle Battle
 */
export function createPaddleBattleConfig(
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
				gravity: { x: 0, y: 0 }, // No gravity for Pong!
				debug: false,
			},
		},
		backgroundColor: '#1a1a2e',
		scene: createPaddleBattleScene(runtime, transport, isHost, playerId, role, keys),
	};
}
