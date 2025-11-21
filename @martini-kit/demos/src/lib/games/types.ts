import type Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import type { LocalTransport } from '@martini-kit/transport-local';

/**
 * Shared keyboard state for dual-view demos
 */
export interface KeyState {
	host: {
		left: boolean;
		right: boolean;
		up: boolean;
		down: boolean;
	};
	client: {
		left: boolean;
		right: boolean;
		up: boolean;
		down: boolean;
	};
}

/**
 * Factory function to create a complete Phaser game configuration
 */
export type CreateGameConfig = (
	container: HTMLDivElement,
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: KeyState
) => Phaser.Types.Core.GameConfig;
