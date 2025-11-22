/**
 * @martini-kit/phaser/runtime
 *
 * High-level runtime initialization for Phaser games.
 * Abstracts away transport selection and configuration.
 */

import { GameRuntime, type GameDefinition } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';
// import { TrysteroTransport } from '@martini-kit/transport-trystero'; // Disabled for IDE
import { IframeBridgeTransport } from '@martini-kit/transport-iframe-bridge';
import type { Transport } from '@martini-kit/core';
import Phaser from 'phaser';

/**
 * Platform-injected configuration (set by IDE, demos, production runtime)
 */
export interface MartiniKitConfig {
  transport: {
    type: 'local' | 'iframe-bridge' | 'trystero';
    roomId: string;
    isHost: boolean;
    appId?: string; // For Trystero
  };
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

type CleanupHandle = () => void;

const GLOBAL_GAME_KEY = '__martini-kit_CURRENT_GAME__';

function getExistingCleanup(): CleanupHandle | null {
  if (typeof globalThis === 'undefined') return null;
  const existing = (globalThis as any)[GLOBAL_GAME_KEY];
  return typeof existing?.cleanup === 'function' ? existing.cleanup : null;
}

function setGlobalCleanup(cleanup: CleanupHandle): void {
  if (typeof globalThis === 'undefined') return;
  (globalThis as any)[GLOBAL_GAME_KEY] = { cleanup };
}

function clearGlobalCleanup(): void {
  if (typeof globalThis === 'undefined') return;
  delete (globalThis as any)[GLOBAL_GAME_KEY];
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
export function initializeGame<TState = any>(
  config: GameConfig<TState>
): { runtime: GameRuntime<TState>; phaser: Phaser.Game } {
  const hot = typeof import.meta !== 'undefined' ? (import.meta as any).hot : undefined;

  // During HMR, ensure any prior game instance is cleaned up before creating a new one
  const previousCleanup = getExistingCleanup();
  if (previousCleanup) {
    previousCleanup();
  }

  // Fallback: if a transport is still registered globally (e.g., HMR edge), disconnect it
  const leakedTransport = (globalThis as any)['__martini-kit_TRANSPORT__'];
  if (leakedTransport) {
    console.debug('[Martini] Found leaked transport, cleaning up...', leakedTransport);
    if (typeof leakedTransport.disconnect === 'function') {
      leakedTransport.disconnect();
    } else if (typeof leakedTransport.destroy === 'function') {
      leakedTransport.destroy();
    }
    // Force clear the global to ensure it's gone
    delete (globalThis as any)['__martini-kit_TRANSPORT__'];
    console.debug('[Martini] Transport cleanup complete, global cleared');
  }

  // Read platform-injected config
  const platformConfig = (window as any)['__martini-kit_CONFIG__'] as MartiniKitConfig | undefined;

  if (!platformConfig) {
    throw new Error(
      'Missing __martini-kit_CONFIG__. The platform must inject this before running user code.'
    );
  }

  // Create transport based on platform config
  const transport = createTransport(platformConfig.transport);

  // Create runtime with own player ID (peers discovered via onPeerJoin)
  const runtime = new GameRuntime(
    config.game,
    transport,
    {
      isHost: platformConfig.transport.isHost,
      playerIds: [transport.getPlayerId()]
    }
  );

  // Resolve Phaser from import or global (Sandpack can fail to hydrate default import)
  const PhaserLib = Phaser ?? (typeof window !== 'undefined' ? (window as any).Phaser : undefined);
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

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: PhaserLib.AUTO,
    parent: 'game',
    scale: defaultScale,
    input: defaultInput,
    ...config.phaserConfig,
    scene: config.scene(runtime)
  };

  const phaserGame = new PhaserLib.Game(phaserConfig);

  // Register runtime with IDE sandbox (if present)
  if (typeof window !== 'undefined' && (window as any)['__martini-kit_IDE__']) {
    (window as any)['__martini-kit_IDE__'].registerRuntime(runtime);
  }

  const disconnectTransport = () => {
    if ('disconnect' in transport && typeof (transport as any).disconnect === 'function') {
      (transport as any).disconnect();
    } else if ('destroy' in transport && typeof (transport as any).destroy === 'function') {
      (transport as any).destroy();
    }
  };

  const handleIdeDisconnect = (event: MessageEvent) => {
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
    if (cleanedUp) return;
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
function createTransport(config: MartiniKitConfig['transport']): Transport {
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
      throw new Error(`Unknown transport type: ${(config as any).type}. Only 'local' and 'iframe-bridge' are supported in IDE mode.`);
  }
}
