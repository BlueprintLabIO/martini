/**
 * DualRuntimeFactory - Create host/client preview setups in one line
 *
 * Eliminates the 40+ lines of boilerplate for spinning up dual runtimes
 * that every demo and IDE route currently reimplements.
 *
 * This is the ROOT CAUSE of IDE drift - when demos update their wiring,
 * IDE routes don't, because they've all copy-pasted the setup code.
 *
 * Usage:
 * ```ts
 * const preview = createDualRuntimePreview({
 *   game: arenaBlasterGame,
 *   hostContainer,
 *   clientContainer,
 *   onHostReady: () => console.log('Host ready'),
 *   onClientReady: () => console.log('Client ready')
 * });
 *
 * // That's it! Returns:
 * // - hostRuntime
 * // - clientRuntime
 * // - hostTransport
 * // - clientTransport
 * // - cleanup function
 * ```
 */

import { GameRuntime, type GameDefinition } from '@martini-kit/core';
import { LocalTransport } from '@martini-kit/transport-local';

export interface DualRuntimePreviewConfig {
  /**
   * The game definition to run
   */
  game: GameDefinition;

  /**
   * Optional room ID (auto-generated if not provided)
   */
  roomId?: string;

  /**
   * Optional callbacks for status updates
   */
  onHostReady?: () => void;
  onClientReady?: () => void;
  onError?: (error: Error) => void;
}

export interface DualRuntimePreview {
  /**
   * Host runtime instance
   */
  hostRuntime: GameRuntime;

  /**
   * Client runtime instance
   */
  clientRuntime: GameRuntime;

  /**
   * Host transport instance
   */
  hostTransport: LocalTransport;

  /**
   * Client transport instance
   */
  clientTransport: LocalTransport;

  /**
   * Host player ID
   */
  hostPlayerId: string;

  /**
   * Client player ID
   */
  clientPlayerId: string;

  /**
   * Generated room ID
   */
  roomId: string;

  /**
   * Cleanup function - call on unmount
   */
  cleanup: () => void;
}

/**
 * Create a dual runtime preview (host + client)
 *
 * This eliminates the ~40 lines of boilerplate that every demo/IDE route
 * currently reimplements. By using this factory, IDE routes are guaranteed
 * to stay in sync with demo implementations.
 *
 * @example
 * ```ts
 * const preview = createDualRuntimePreview({
 *   game: arenaBlasterGame,
 *   onHostReady: () => setHostStatus('ready'),
 *   onClientReady: () => setClientStatus('ready'),
 *   onError: (err) => setError(err.message)
 * });
 *
 * // Use preview.hostRuntime, preview.clientRuntime, etc.
 *
 * // Cleanup on unmount:
 * onCleanup(() => preview.cleanup());
 * ```
 */
export function createDualRuntimePreview(
  config: DualRuntimePreviewConfig
): DualRuntimePreview {
  try {
    // Generate room ID if not provided
    const roomId = config.roomId || `dual-preview-${Math.random().toString(36).substring(2, 8)}`;

    // Create Host instance with LocalTransport
    const hostTransport = new LocalTransport({
      roomId,
      isHost: true,
    });

    // Create Client instance with LocalTransport
    const clientTransport = new LocalTransport({
      roomId,
      isHost: false,
    });

    // Get both player IDs to initialize both runtimes
    // This is CRITICAL for host-authoritative architecture:
    // Both runtimes need to know about ALL players from the start
    const hostPlayerId = hostTransport.getPlayerId();
    const clientPlayerId = clientTransport.getPlayerId();

    const hostRuntime = new GameRuntime(config.game, hostTransport, {
      isHost: true,
      playerIds: [hostPlayerId, clientPlayerId],
    });

    config.onHostReady?.();

    const clientRuntime = new GameRuntime(config.game, clientTransport, {
      isHost: false,
      playerIds: [hostPlayerId, clientPlayerId],
    });

    config.onClientReady?.();

    // Cleanup function
    const cleanup = () => {
      // Add any necessary cleanup here
      // (LocalTransport doesn't currently expose cleanup, but we include this for future-proofing)
    };

    return {
      hostRuntime,
      clientRuntime,
      hostTransport,
      clientTransport,
      hostPlayerId,
      clientPlayerId,
      roomId,
      cleanup,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to create dual runtime preview');
    config.onError?.(error);
    throw error;
  }
}
