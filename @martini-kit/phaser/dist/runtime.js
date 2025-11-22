/**
 * @martini-kit/phaser/runtime
 *
 * High-level runtime initialization for Phaser games.
 * Abstracts away transport selection and configuration.
 */
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
// import { TrysteroTransport } from '@martini-kit/transport-trystero'; // Disabled for IDE
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';
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
export function initializeGame(config) {
    // Read platform-injected config
    const platformConfig = window['__martini-kit_CONFIG__'];
    if (!platformConfig) {
        throw new Error('Missing __martini-kit_CONFIG__. The platform must inject this before running user code.');
    }
    // Create transport based on platform config
    const transport = createTransport(platformConfig.transport);
    // Create runtime with own player ID (peers discovered via onPeerJoin)
    const runtime = new GameRuntime(config.game, transport, {
        isHost: platformConfig.transport.isHost,
        playerIds: [transport.getPlayerId()]
    });
    // Resolve Phaser from import or global (Sandpack can fail to hydrate default import)
    const PhaserLib = Phaser ?? (typeof window !== 'undefined' ? window.Phaser : undefined);
    if (!PhaserLib) {
        throw new Error('Phaser failed to load. Ensure the Phaser script is available in the sandbox.');
    }
    // Create Phaser game with user's scene and config
    // Default scale configuration ensures canvas fits container properly
    const defaultScale = {
        mode: PhaserLib.Scale.FIT,
        autoCenter: PhaserLib.Scale.CENTER_BOTH,
        width: config.phaserConfig?.width || 800,
        height: config.phaserConfig?.height || 600
    };
    // Default input configuration ensures pointer/mouse/touch events work
    // especially when running inside iframes (IDE environment)
    const defaultInput = {
        activePointers: 3 // Enable mouse + 2 touch pointers by default
    };
    const phaserConfig = {
        type: PhaserLib.AUTO,
        parent: 'game',
        scale: defaultScale,
        input: defaultInput,
        ...config.phaserConfig,
        scene: config.scene(runtime)
    };
    const phaserGame = new PhaserLib.Game(phaserConfig);
    // Register runtime with IDE sandbox (if present)
    if (typeof window !== 'undefined' && window['__martini-kit_IDE__']) {
        window['__martini-kit_IDE__'].registerRuntime(runtime);
    }
    // Auto-cleanup: Disconnect transport when navigating away
    // Two mechanisms for defense-in-depth:
    // 1. Message from parent (IDE-initiated cleanup)
    // 2. beforeunload event (direct browser navigation)
    if (typeof window !== 'undefined') {
        // Listen for IDE cleanup message
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'martini-kit:transport:disconnect') {
                // Disconnect transport to notify relay and remove stale peers
                // Only IframeBridgeTransport has disconnect() method
                if ('disconnect' in transport && typeof transport.disconnect === 'function') {
                    transport.disconnect();
                }
            }
        });
        // Fallback: Disconnect on browser navigation/close
        window.addEventListener('beforeunload', () => {
            if ('disconnect' in transport && typeof transport.disconnect === 'function') {
                transport.disconnect();
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
        //     appId: config.appId || 'martini-kit',
        //     roomId: config.roomId,
        //     isHost: config.isHost
        //   });
        default:
            throw new Error(`Unknown transport type: ${config.type}. Only 'local' and 'iframe-bridge' are supported in IDE mode.`);
    }
}
//# sourceMappingURL=runtime.js.map