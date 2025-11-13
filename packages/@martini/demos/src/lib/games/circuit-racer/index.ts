import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { createCircuitRacerScene } from './scene';

export { circuitRacerGame } from './game';

/**
 * Creates a complete Phaser game configuration for Circuit Racer
 */
export function createCircuitRacerConfig(
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
				gravity: { x: 0, y: 0 }, // No gravity for racing game
				debug: false,
			},
		},
		backgroundColor: '#2d5016',
		scene: createCircuitRacerScene(runtime, transport, isHost, playerId, role, keys),
	};
}
