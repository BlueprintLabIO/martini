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
import { GameRuntime, type GameDefinition } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
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
export declare function createDualRuntimePreview(config: DualRuntimePreviewConfig): DualRuntimePreview;
//# sourceMappingURL=DualRuntimeFactory.d.ts.map