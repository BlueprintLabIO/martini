import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { createFireAndIceScene } from './scene';

export { fireAndIceGame } from './game';

/**
 * Creates a complete Phaser game configuration for Fire & Ice
 */
export function createFireAndIceConfig(
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
				gravity: { x: 0, y: 400 }, // Fire & Ice needs gravity for platforming
				debug: false,
			},
		},
		backgroundColor: '#f8f9fa',
		scene: createFireAndIceScene(runtime, transport, isHost, playerId, role, keys),
	};
}
