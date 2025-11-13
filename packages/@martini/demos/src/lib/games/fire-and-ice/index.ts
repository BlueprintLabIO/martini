import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { createFireAndIceScene } from './scene';

export { fireAndIceGame } from './game';

/**
 * Creates a complete Phaser game configuration for Fire & Ice
 *
 * Web App Architecture Pattern:
 * - Only needs runtime (no transport, keys, role, etc.)
 * - Scene is self-contained class
 * - Works in web IDEs and matches AI-generated code
 */
export function createFireAndIceConfig(
	container: HTMLDivElement,
	runtime: GameRuntime
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
		scene: createFireAndIceScene(runtime),
	};
}
