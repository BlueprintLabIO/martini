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
import { StateDrivenSpawner, type StateDrivenSpawnerConfig } from './helpers/StateDrivenSpawner.js';
import { HealthBarManager, type HealthBarConfig } from './helpers/HealthBarManager.js';
export interface SpriteTrackingOptions {
    /** Sync interval in ms (default: 50ms / 20 FPS) */
    syncInterval?: number;
    /** Properties to sync (default: x, y, rotation, alpha) */
    properties?: string[];
    /** Interpolate movement on clients for smoothness */
    interpolate?: boolean;
    /** Namespace to write sprite data to (default: uses adapter's spriteNamespace) */
    namespace?: string;
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
    private spriteManagers;
    constructor(runtime: GameRuntime<TState>, scene: any, // Phaser.Scene
    config?: PhaserAdapterConfig);
    /**
     * Get my player ID
     */
    get myId(): string;
    /**
     * Get the local player's ID
     * More discoverable alias for {@link myId}
     */
    getLocalPlayerId(): string;
    /**
     * Backwards-compatible helper - alias for {@link myId}
     * @deprecated Use {@link getLocalPlayerId} instead for better discoverability
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
     * Watch a derived value from the current player's state with automatic change detection
     *
     * This is the reactive counterpart to `onMyPlayerChange`. It re-runs a selector function
     * on every state change and only fires the callback when the selected value changes
     * (using Object.is equality by default).
     *
     * Perfect for reactive UIs that need to respond to property mutations like size, health, score, etc.
     *
     * @param selector Function that extracts a value from the player state
     * @param callback Invoked when the selected value changes
     * @param options Optional configuration
     * @returns Unsubscribe function
     *
     * @example
     * ```ts
     * // Watch player size changes
     * adapter.watchMyPlayer(
     *   (player) => player?.size,
     *   (size) => {
     *     hudText.setText(`Size: ${size}`);
     *   }
     * );
     *
     * // Watch multiple properties
     * adapter.watchMyPlayer(
     *   (player) => ({ size: player?.size, health: player?.health }),
     *   (stats) => {
     *     hudText.setText(`Size: ${stats.size}, HP: ${stats.health}`);
     *   }
     * );
     *
     * // Custom equality check
     * adapter.watchMyPlayer(
     *   (player) => player?.position,
     *   (pos) => console.log('Position changed:', pos),
     *   { equals: (a, b) => a?.x === b?.x && a?.y === b?.y }
     * );
     * ```
     */
    watchMyPlayer<TPlayer = any, TSelected = any>(selector: (player: TPlayer | undefined) => TSelected, callback: (selected: TSelected, prev: TSelected | undefined) => void, options?: {
        /** Key in state where players are stored (default: 'players') */
        playersKey?: string;
        /** Custom equality check (default: Object.is) */
        equals?: (a: TSelected, b: TSelected) => boolean;
    }): () => void;
    /**
     * Check if this peer is the host
     */
    isHost(): boolean;
    /**
     * Expose the underlying Phaser scene
     */
    getScene(): any;
    /**
     * FIX #2: Wait for required metadata properties before executing callback
     *
     * This is a shared utility that prevents race conditions when creating UI/sprites
     * that depend on static properties like role, team, side, etc.
     *
     * Extracted pattern from PlayerUIManager and HUDHelper for reuse across the SDK.
     *
     * @param stateKey - Key in state where the entity data lives (e.g., 'players')
     * @param entityId - ID of the specific entity (e.g., player ID)
     * @param requiredProperties - Array of property names that must exist before callback fires
     * @param callback - Called when all required properties are present
     * @returns Unsubscribe function
     *
     * @example
     * ```ts
     * // Wait for player metadata before creating UI
     * adapter.waitForMetadata('players', playerId, ['role', 'team'], (data) => {
     *   const color = data.role === 'fire' ? 0xff0000 : 0x0000ff;
     *   const sprite = this.add.circle(data.x, data.y, 20, color);
     * });
     *
     * // Wait for sprite static properties
     * adapter.waitForMetadata('__sprites__.players', spriteKey, ['role'], (data) => {
     *   const label = this.add.text(data.x, data.y, data.role.toUpperCase());
     * });
     * ```
     */
    waitForMetadata(stateKey: string, entityId: string, requiredProperties: string[], callback: (data: any) => void): () => void;
    /**
     * Helper to get nested property from state (e.g., '__sprites__.players')
     * @internal
     */
    private getNestedProperty;
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
     *
     * @param key - Sprite key
     * @param namespace - Optional namespace (defaults to spriteNamespace from config)
     */
    untrackSprite(key: string, namespace?: string): void;
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
     *
     * @param key - Sprite key
     * @param data - Static data to set
     * @param namespace - Optional namespace (defaults to spriteNamespace from config)
     */
    setSpriteStaticData(key: string, data: Record<string, any>, namespace?: string): void;
    /**
     * Update sprites from state (clients only)
     *
     * MULTI-NAMESPACE SUPPORT: This method now handles sprites from all registered
     * namespaces, including both the default namespace and custom namespaces from
     * createSpriteRegistry(). This fixes the bug where sprites in custom namespaces
     * (like __sprites__.players) weren't getting interpolation targets on clients.
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
     * @param namespace - Optional namespace (defaults to spriteNamespace config)
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
    registerRemoteSprite(key: string, sprite: any, namespace?: string): void;
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
     *   namespace: 'players',  // optional, defaults to '_sprites'
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
     * Register a SpriteManager with this adapter for multi-namespace support
     * Internal method - automatically called by createSpriteManager
     */
    registerSpriteManager(manager: {
        namespace: string;
    }): void;
    /**
     * Create a typed registry of sprite managers
     *
     * This provides type-safe collections of sprites with automatic namespacing.
     * Each sprite type gets its own isolated namespace in the state tree.
     *
     * @example
     * ```ts
     * const sprites = adapter.createSpriteRegistry({
     *   players: {
     *     onCreate: (key, data: { x: number, y: number, role: string }) => {
     *       const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
     *       return this.add.circle(data.x, data.y, 20, color);
     *     },
     *     staticProperties: ['role'],
     *     label: { getText: (d) => d.role.toUpperCase() }
     *   },
     *   enemies: {
     *     onCreate: (key, data: { x: number, y: number, type: string }) => {
     *       return this.add.sprite(data.x, data.y, data.type);
     *     }
     *   }
     * });
     *
     * // Type-safe sprite creation
     * sprites.players.add('p1', { x: 100, y: 100, role: 'fire' });
     * sprites.enemies.add('e1', { x: 200, y: 200, type: 'goblin' });
     *
     * // Each collection has its own namespace:
     * // state.__sprites__.players = { p1: { x: 100, y: 100, role: 'fire' } }
     * // state.__sprites__.enemies = { e1: { x: 200, y: 200, type: 'goblin' } }
     * ```
     */
    createSpriteRegistry<TRegistry extends Record<string, SpriteManagerConfig<any>>>(config: TRegistry): {
        [K in keyof TRegistry]: SpriteManager<TRegistry[K] extends SpriteManagerConfig<infer TData> ? TData : never>;
    };
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
    /**
     * Create a StateDrivenSpawner for automatic sprite spawning from state collections
     *
     * Eliminates the manual "check for new players/bullets" loop.
     * Watches a state collection and automatically creates/removes sprites.
     *
     * @example
     * ```ts
     * // Players (uses object keys)
     * const playerSpawner = adapter.createStateDrivenSpawner({
     *   stateKey: 'players',
     *   spriteManager: this.spriteManager,
     *   keyPrefix: 'player-'
     * });
     *
     * // Bullets (uses array with id field)
     * const bulletSpawner = adapter.createStateDrivenSpawner({
     *   stateKey: 'bullets',
     *   spriteManager: this.bulletManager,
     *   keyPrefix: 'bullet-',
     *   keyField: 'id'
     * });
     *
     * // In update():
     * playerSpawner.update(); // HOST only
     * ```
     */
    createStateDrivenSpawner(config: StateDrivenSpawnerConfig): StateDrivenSpawner;
    /**
     * Create a HealthBarManager for automatic health bar management
     *
     * Auto-creates, positions, scales, and colors health bars for all sprites.
     *
     * @example
     * ```ts
     * const healthBars = adapter.createHealthBarManager({
     *   spriteManager: this.spriteManager,
     *   healthKey: 'health',
     *   maxHealth: 100,
     *   offset: { x: 0, y: -30 },
     *   width: 50,
     *   height: 5
     * });
     *
     * // In update():
     * healthBars.update();
     * ```
     */
    createHealthBarManager(config: HealthBarConfig): HealthBarManager;
    /**
     * Create a CameraFollower for automatic camera tracking
     *
     * Eliminates manual camera positioning and fixes initialization timing bugs.
     * Automatically waits for player state, then follows smoothly.
     *
     * @example
     * ```ts
     * // Simplest usage - auto-follows local player
     * this.cameraFollower = adapter.createCameraFollower({
     *   target: 'myPlayer'
     * });
     *
     * // With smooth lerp following
     * this.cameraFollower = adapter.createCameraFollower({
     *   target: 'myPlayer',
     *   mode: 'lerp',
     *   lerpFactor: 0.1
     * });
     *
     * // With world bounds
     * this.cameraFollower = adapter.createCameraFollower({
     *   target: 'myPlayer',
     *   bounds: { width: 1600, height: 1200 }
     * });
     *
     * // No manual camera code needed in update()!
     * // Camera automatically follows and handles all edge cases.
     * ```
     */
    createCameraFollower(config?: import('./helpers/CameraFollower.js').CameraFollowerConfig): import('./helpers/CameraFollower.js').CameraFollower;
    /**
     * Submit action ONLY when input changes (10x devtools improvement!)
     *
     * Automatically tracks previous input and only submits when changed.
     * Prevents flooding devtools with 60 identical actions per second.
     *
     * @param actionName - Name of the action to submit
     * @param input - Current input state
     * @param targetId - Optional target player ID
     *
     * @example
     * ```ts
     * // In scene.update()
     * const input = {
     *   left: keys.left.isDown,
     *   right: keys.right.isDown,
     *   up: keys.up.isDown
     * };
     * adapter.submitActionOnChange('move', input); // Only sends when input changes!
     * ```
     */
    submitActionOnChange(actionName: string, input: any, targetId?: string): void;
}
//# sourceMappingURL=PhaserAdapter.d.ts.map