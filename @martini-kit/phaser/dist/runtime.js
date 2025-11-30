/**
 * @martini-kit/phaser/runtime
 *
 * High-level runtime initialization for Phaser games.
 * Abstracts away transport selection and configuration.
 */
import { GameRuntime } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
import { TrysteroTransport } from '@martini-kit/transport-trystero';
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';
import Phaser from 'phaser';
const GLOBAL_GAME_KEY = '__martini-kit_CURRENT_GAME__';
function getExistingCleanup() {
    if (typeof globalThis === 'undefined')
        return null;
    const existing = globalThis[GLOBAL_GAME_KEY];
    return typeof existing?.cleanup === 'function' ? existing.cleanup : null;
}
function setGlobalCleanup(cleanup) {
    if (typeof globalThis === 'undefined')
        return;
    globalThis[GLOBAL_GAME_KEY] = { cleanup };
}
function clearGlobalCleanup() {
    if (typeof globalThis === 'undefined')
        return;
    delete globalThis[GLOBAL_GAME_KEY];
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
export async function initializeGame(config) {
    const hot = typeof import.meta !== 'undefined' ? import.meta.hot : undefined;
    // During HMR, ensure any prior game instance is cleaned up before creating a new one
    const previousCleanup = getExistingCleanup();
    if (previousCleanup) {
        previousCleanup();
    }
    // Fallback: if a transport is still registered globally (e.g., HMR edge), disconnect it
    const leakedTransport = globalThis['__martini-kit_TRANSPORT__'];
    if (leakedTransport) {
        console.debug('[Martini] Found leaked transport, cleaning up...', leakedTransport);
        if (typeof leakedTransport.disconnect === 'function') {
            leakedTransport.disconnect();
        }
        else if (typeof leakedTransport.destroy === 'function') {
            leakedTransport.destroy();
        }
        // Force clear the global to ensure it's gone
        delete globalThis['__martini-kit_TRANSPORT__'];
        console.debug('[Martini] Transport cleanup complete, global cleared');
    }
    // Read platform-injected config
    const platformConfig = window['__martini-kit_CONFIG__'];
    if (!platformConfig) {
        throw new Error('Missing __martini-kit_CONFIG__. The platform must inject this before running user code.');
    }
    // Create transport based on platform config
    const transport = createTransport(platformConfig.transport);
    // Wait for transport readiness (important for P2P host discovery)
    if (typeof transport.waitForReady === 'function') {
        await transport.waitForReady();
    }
    // Seed only self; peers will be added via onPeerJoin to avoid double-seeding/ordering bugs
    const initialPlayerIds = [transport.getPlayerId()];
    // Create runtime with own player ID (peers discovered via onPeerJoin)
    const runtime = new GameRuntime(config.game, transport, {
        isHost: platformConfig.transport.isHost,
        playerIds: initialPlayerIds
    });
    // Optionally wait for minimum players before continuing
    // Skip if lobby system is enabled - it handles player coordination
    const hasLobby = config.game.lobby !== undefined;
    const minPlayers = platformConfig.minPlayers && platformConfig.minPlayers > 0 ? platformConfig.minPlayers : 1;
    if (!hasLobby && minPlayers > 1) {
        try {
            await runtime.waitForPlayers(minPlayers, { timeoutMs: 10000 });
        }
        catch (err) {
            console.warn('[Martini] waitForPlayers timed out:', err);
        }
    }
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
    const disconnectTransport = () => {
        if ('disconnect' in transport && typeof transport.disconnect === 'function') {
            transport.disconnect();
        }
        else if ('destroy' in transport && typeof transport.destroy === 'function') {
            transport.destroy();
        }
    };
    const handleIdeDisconnect = (event) => {
        if (event.data?.type === 'martini-kit:transport:disconnect') {
            disconnectTransport();
        }
    };
    const handleBeforeUnload = () => {
        disconnectTransport();
    };
    // Auto-cleanup: Disconnect transport when navigating away
    // Two mechanisms for defense-in-depth:
    // 1. Message from parent (IDE-initiated cleanup)
    // 2. beforeunload event (direct browser navigation)
    if (typeof window !== 'undefined') {
        // Listen for IDE cleanup message
        window.addEventListener('message', handleIdeDisconnect);
        // Fallback: Disconnect on browser navigation/close
        window.addEventListener('beforeunload', handleBeforeUnload);
    }
    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp)
            return;
        cleanedUp = true;
        clearGlobalCleanup();
        if (typeof window !== 'undefined') {
            window.removeEventListener('message', handleIdeDisconnect);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }
        runtime.destroy();
        disconnectTransport();
        phaserGame.destroy(true);
    };
    setGlobalCleanup(cleanup);
    if (hot?.dispose) {
        hot.dispose(() => {
            cleanup();
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
        case 'trystero':
            return new TrysteroTransport({
                appId: config.appId || 'martini-kit',
                roomId: config.roomId,
                isHost: config.isHost,
                rtcConfig: config.rtcConfig,
                relayUrls: config.relayUrls
            });
        default:
            throw new Error(`Unknown transport type: ${config.type}. Only 'local', 'iframe-bridge', and 'trystero' are supported in IDE mode.`);
    }
}
//# sourceMappingURL=runtime.js.map