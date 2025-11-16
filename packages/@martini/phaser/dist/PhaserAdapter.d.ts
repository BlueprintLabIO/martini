/**
 * PhaserAdapter - Bridge between Phaser and @martini/core
 *
 * v2: Fully automatic sprite syncing. Host runs physics, clients mirror.
 * User never has to think about networking - it just works.
 */
import type { GameRuntime } from '@martini/core';
import { SpriteManager, type SpriteManagerConfig } from './helpers/SpriteManager.js';
import { InputManager } from './helpers/InputManager.js';
import { PlayerUIManager, type PlayerUIManagerConfig } from './helpers/PlayerUIManager.js';
import { CollisionManager, type CollisionManagerConfig } from './helpers/CollisionManager.js';
import { PhysicsManager, type PhysicsManagerConfig } from './helpers/PhysicsManager.js';
export interface SpriteTrackingOptions {
    /** Sync interval in ms (default: 50ms / 20 FPS) */
    syncInterval?: number;
    /** Properties to sync (default: x, y, rotation, alpha) */
    properties?: string[];
    /** Interpolate movement on clients for smoothness */
    interpolate?: boolean;
}
export interface PhaserAdapterConfig {
    /**
     * State namespace for sprite data (default: '_sprites')
     * Allows using a custom property name instead of magic _sprites
     */
    spriteNamespace?: string;
    /**
     * Enable automatic interpolation for remote sprites (default: true)
     * When enabled, remote sprites smoothly lerp to target positions
     */
    autoInterpolate?: boolean;
    /**
     * Interpolation lerp factor (default: 0.3)
     * Lower = smoother but laggier, Higher = snappier but jerkier
     * Range: 0.1 (very smooth) to 0.5 (very snappy)
     */
    lerpFactor?: number;
}
/**
 * Phaser Adapter - Auto-syncs sprites via GameRuntime
 *
 * Usage:
 * ```ts
 * const adapter = new PhaserAdapter(runtime, scene, {
 *   spriteNamespace: 'gameSprites', // optional, defaults to '_sprites'
 *   autoInterpolate: true,           // optional, defaults to true
 *   lerpFactor: 0.3                  // optional, defaults to 0.3
 * });
 * adapter.trackSprite(playerSprite, `player-${playerId}`);
 * // That's it! Sprite automatically syncs across network
 * ```
 */
export declare class PhaserAdapter<TState = any> {
    private runtime;
    private scene;
    private trackedSprites;
    private remoteSprites;
    private syncIntervalId;
    private readonly spriteNamespace;
    private readonly autoInterpolate;
    private readonly lerpFactor;
    constructor(runtime: GameRuntime<TState>, scene: any, // Phaser.Scene
    config?: PhaserAdapterConfig);
    /**
     * Get my player ID
     */
    get myId(): string;
    /**
     * Backwards-compatible helper - alias for {@link myId}
     */
    getMyPlayerId(): string;
    /**
     * Get the current player's state object from the runtime
     *
     * @param playersKey Key in the state where player records are stored (default: 'players')
     */
    getMyPlayer<TPlayer = any>(playersKey?: string): TPlayer | undefined;
    /**
     * Subscribe to changes in the current player's state
     *
     * @param callback Invoked whenever the local player's record changes
     * @param playersKey Key in the state where player records are stored (default: 'players')
     */
    onMyPlayerChange<TPlayer = any>(callback: (player: TPlayer | undefined) => void, playersKey?: string): () => void;
    /**
     * Check if this peer is the host
     */
    isHost(): boolean;
    /**
     * Expose the underlying Phaser scene
     */
    getScene(): any;
    /**
     * Track a sprite - automatically syncs position/rotation/etc
     *
     * @param sprite Phaser sprite to track
     * @param key Unique key for this sprite (e.g., `player-${playerId}`)
     * @param options Tracking options
     *
     * @example
     * ```ts
     * const player = this.physics.add.sprite(100, 100, 'player');
     * adapter.trackSprite(player, `player-${adapter.myId}`);
     * ```
     */
    trackSprite(sprite: any, key: string, options?: SpriteTrackingOptions): void;
    /**
     * Stop tracking a sprite
     */
    untrackSprite(key: string): void;
    /**
     * Broadcast a custom event
     */
    broadcast(eventName: string, payload: any): void;
    /**
     * Listen for custom events
     */
    on(eventName: string, callback: (senderId: string, payload: any) => void): () => void;
    /**
     * Cleanup
     */
    destroy(): void;
    /**
     * Sync all tracked sprites to state (host only)
     */
    private syncAllSprites;
    /**
     * Sync a single sprite to state
     */
    private syncSpriteToState;
    /**
     * Set static metadata for a tracked sprite (host only)
     */
    setSpriteStaticData(key: string, data: Record<string, any>): void;
    /**
     * Update sprites from state (clients only)
     */
    private updateSpritesFromState;
    /**
     * Apply sprite data to a sprite
     */
    private applySpriteData;
    /**
     * Register a remote sprite (for tracking sprites from other players)
     *
     * @param key - Unique identifier for this sprite
     * @param sprite - The Phaser sprite to register
     *
     * @example
     * ```ts
     * adapter.onChange((state) => {
     *   const sprites = state._sprites || state.gameSprites; // depends on config
     *   for (const [key, data] of Object.entries(sprites)) {
     *     if (!this.sprites[key] && key !== `player-${adapter.myId}`) {
     *       const sprite = this.add.sprite(data.x, data.y, 'player');
     *       adapter.registerRemoteSprite(key, sprite);
     *     }
     *   }
     * });
     * ```
     */
    registerRemoteSprite(key: string, sprite: any): void;
    /**
     * Call this in your Phaser update() loop to smoothly interpolate remote sprites
     * This should be called every frame (60 FPS) for smooth movement
     *
     * Note: If autoInterpolate is enabled in config, you don't need to call this manually.
     */
    updateInterpolation(): void;
    /**
     * Unregister a remote sprite
     */
    unregisterRemoteSprite(key: string): void;
    /**
     * Listen for state changes (convenience wrapper)
     */
    onChange(callback: (state: TState) => void): () => void;
    /**
     * Get the current game state (typed)
     */
    getState(): TState;
    /**
     * Get the runtime (for advanced usage)
     */
    getRuntime(): GameRuntime<TState>;
    /**
     * Create a SpriteManager for automatic sprite synchronization
     *
     * @example
     * ```ts
     * const spriteManager = adapter.createSpriteManager({
     *   onCreate: (key, data) => {
     *     const sprite = this.add.sprite(data.x, data.y, 'player');
     *     if (adapter.isHost()) {
     *       this.physics.add.existing(sprite);
     *     }
     *     return sprite;
     *   }
     * });
     *
     * // Host: Add sprites
     * spriteManager.add('player-1', { x: 100, y: 100 });
     *
     * // Update loop: Enable interpolation
     * spriteManager.update();
     * ```
     */
    createSpriteManager<TData extends {
        x: number;
        y: number;
        [key: string]: any;
    }>(config: SpriteManagerConfig<TData>): SpriteManager<TData>;
    /**
     * Create a PlayerUIManager for automatically managed player HUD elements
     */
    createPlayerUIManager(config: PlayerUIManagerConfig): PlayerUIManager;
    /**
     * Create a CollisionManager for declarative collision rules
     */
    createCollisionManager(config?: CollisionManagerConfig): CollisionManager;
    /**
     * Create an InputManager for simplified input handling
     *
     * @example
     * ```ts
     * const input = adapter.createInputManager();
     *
     * input.bindKeys({
     *   'ArrowLeft': { action: 'move', input: { x: -1 }, mode: 'continuous' },
     *   'ArrowRight': { action: 'move', input: { x: 1 }, mode: 'continuous' },
     *   'Space': 'jump'
     * });
     *
     * // In update loop
     * input.update();
     * ```
     */
    createInputManager(): InputManager;
    /**
     * Create a PhysicsManager for automatic physics behaviors
     */
    createPhysicsManager(config: PhysicsManagerConfig): PhysicsManager;
}
//# sourceMappingURL=PhaserAdapter.d.ts.map