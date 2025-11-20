/**
 * @martini/phaser/runtime
 *
 * High-level runtime initialization for Phaser games.
 * Abstracts away transport selection and configuration.
 */
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
// import { TrysteroTransport } from '@martini/transport-trystero'; // Disabled for IDE
import { IframeBridgeTransport } from '@martini/transport-iframe-bridge';
import Phaser from 'phaser';
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
 * import { initializeGame } from '@martini/phaser';
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
export function initializeGame(config) {
    // Read platform-injected config
    const platformConfig = window.__MARTINI_CONFIG__;
    if (!platformConfig) {
        throw new Error('Missing __MARTINI_CONFIG__. The platform must inject this before running user code.');
    }
    // Create transport based on platform config
    const transport = createTransport(platformConfig.transport);
    // Create runtime with own player ID (peers discovered via onPeerJoin)
    const runtime = new GameRuntime(config.game, transport, {
        isHost: platformConfig.transport.isHost,
        playerIds: [transport.getPlayerId()]
    });
    // Create Phaser game with user's scene and config
    // Default scale configuration ensures canvas fits container properly
    const defaultScale = {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: config.phaserConfig?.width || 800,
        height: config.phaserConfig?.height || 600
    };
    // Default input configuration ensures pointer/mouse/touch events work
    // especially when running inside iframes (IDE environment)
    const defaultInput = {
        activePointers: 3 // Enable mouse + 2 touch pointers by default
    };
    const phaserConfig = {
        type: Phaser.AUTO,
        parent: 'game',
        scale: defaultScale,
        input: defaultInput,
        ...config.phaserConfig,
        scene: config.scene(runtime)
    };
    const phaserGame = new Phaser.Game(phaserConfig);
    // Register runtime with IDE sandbox (if present)
    if (typeof window !== 'undefined' && window.__MARTINI_IDE__) {
        window.__MARTINI_IDE__.registerRuntime(runtime);
    }
    // Listen for transport disconnect message from parent (IDE cleanup)
    // This ensures proper cleanup when navigating away from preview pages
    if (typeof window !== 'undefined') {
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'martini:transport:disconnect') {
                // Disconnect transport to notify relay and remove stale peers
                // Only IframeBridgeTransport has disconnect() method
                if ('disconnect' in transport && typeof transport.disconnect === 'function') {
                    transport.disconnect();
                }
            }
        });
    }
    return { runtime, phaser: phaserGame };
}
/**
 * Create transport from platform configuration
 * @internal
 */
function createTransport(config) {
    switch (config.type) {
        case 'iframe-bridge':
            return new IframeBridgeTransport({
                roomId: config.roomId,
                isHost: config.isHost
            });
        case 'local':
            return new LocalTransport({
                roomId: config.roomId,
                isHost: config.isHost
            });
        // case 'trystero':
        //   return new TrysteroTransport({
        //     appId: config.appId || 'martini',
        //     roomId: config.roomId,
        //     isHost: config.isHost
        //   });
        default:
            throw new Error(`Unknown transport type: ${config.type}. Only 'local' and 'iframe-bridge' are supported in IDE mode.`);
    }
}
//# sourceMappingURL=runtime.js.map