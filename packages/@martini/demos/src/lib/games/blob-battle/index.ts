import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { createBlobBattleScene } from './scene';

export { blobBattleGame } from './game';

/**
 * Creates a complete Phaser game configuration for Blob Battle
 */
export function createBlobBattleConfig(
	container: HTMLDivElement,
	runtime: GameRuntime,
	keyState?: any
): Phaser.Types.Core.GameConfig {
	return {
		type: Phaser.AUTO,
		width: 800,
		height: 600,
		parent: container,
		backgroundColor: '#1a1a2e',
		scene: createBlobBattleScene(runtime, keyState),
	};
}
