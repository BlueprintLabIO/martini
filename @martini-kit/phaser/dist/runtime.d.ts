/**
 * @martini-kit/phaser/runtime
 *
 * High-level runtime initialization for Phaser games.
 * Abstracts away transport selection and configuration.
 */
import { GameRuntime, type GameDefinition } from '@martini-kit/core';
import Phaser from 'phaser';
/**
 * Platform-injected configuration (set by IDE, demos, production runtime)
 */
export interface MartiniKitConfig {
    transport: {
        type: 'local' | 'iframe-bridge' | 'trystero';
        roomId: string;
        isHost: boolean;
        appId?: string;
        rtcConfig?: RTCConfiguration;
        relayUrls?: string[];
    };
    /**
     * Minimum players required before starting the game loop/rendering.
     * Useful for P2P transports where peers join asynchronously.
     */
    minPlayers?: number;
}
/**
 * User-provided game configuration
 */
export interface GameConfig<TState = any> {
    /** Game definition (logic, actions, setup) */
    game: GameDefinition<TState>;
    /** Scene factory function that receives the runtime */
    scene: (runtime: GameRuntime<TState>) => typeof Phaser.Scene | Phaser.Types.Scenes.CreateSceneFromObjectConfig;
    /** Phaser engine configuration */
    phaserConfig?: Partial<Phaser.Types.Core.GameConfig>;
}
/**
 * Initialize a multiplayer Phaser game.
 *
 * This is the main entry point for user code. It handles:
 * - Reading platform configuration (transport type, room ID, etc.)
 * - Creating the appropriate transport
 * - Setting up the GameRuntime
 * - Creating the Phaser game instance
 *
 * User code never needs to know about transports!
 *
 * @example
 * ```typescript
 * import { initializeGame } from '@martini-kit/phaser';
 * import { game } from './game';
 * import { createScene } from './scene';
 *
 * initializeGame({
 *   game,
 *   scene: createScene,
 *   phaserConfig: {
 *     width: 800,
 *     height: 600,
 *     backgroundColor: '#1a1a2e'
 *   }
 * });
 * ```
 */
export declare function initializeGame<TState = any>(config: GameConfig<TState>): Promise<{
    runtime: GameRuntime<TState>;
    phaser: Phaser.Game;
}>;
//# sourceMappingURL=runtime.d.ts.map