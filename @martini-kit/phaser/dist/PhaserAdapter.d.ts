/**
 * PhaserAdapter - Bridge between Phaser and @martini-kit/core
 *
 * v2: Fully automatic sprite syncing. Host runs physics, clients mirror.
 * User never has to think about networking - it just works.
 */
import type { GameRuntime } from '@martini-kit/core';
import { SpriteManager, type SpriteManagerConfig } from './helpers/SpriteManager.js';
import { InputManager } from './helpers/InputManager.js';
import { PlayerUIManager, type PlayerUIManagerConfig } from './helpers/PlayerUIManager.js';
import { CollisionManager, type CollisionManagerConfig } from './helpers/CollisionManager.js';
import { PhysicsManager, type PhysicsManagerConfig } from './helpers/PhysicsManager.js';
import { StateDrivenSpawner, type StateDrivenSpawnerConfig } from './helpers/StateDrivenSpawner.js';
import { HealthBarManager, type HealthBarConfig } from './helpers/HealthBarManager.js';
import { GridClickHelper, type GridClickConfig } from './helpers/GridClickHelper.js';
import { GridCollisionManager, type GridCollisionConfig, type GridMovementConfig } from './helpers/GridCollisionManager.js';
import { GridLockedMovementManager, type GridLockedMovementConfig } from './helpers/GridLockedMovementManager.js';
export interface SpriteTrackingOptions {
    /** Sync interval in ms (default: 16ms / 60 FPS) */
    syncInterval?: number;
    /** Properties to sync (default: x, y, rotation, alpha) */
    properties?: string[];
    /** Optional motion profile to tune sync behavior */
    motionProfile?: 'platformer' | 'projectile' | 'prop';
    /** Namespace to write sprite data to (default: uses adapter's spriteNamespace) */
    namespace?: string;
    /** Enable adaptive sync rate (default: false) - syncs faster when moving, slower when idle */
    adaptiveSync?: boolean;
    /** Movement threshold for adaptive sync (default: 1 pixel/frame) */
    adaptiveSyncThreshold?: number;
}
export interface PhaserAdapterConfig {
    /**
     * State namespace for sprite data (default: '_sprites')
     * Allows using a custom property name instead of magic _sprites
     */
    spriteNamespace?: string;
    /**
     * Snapshot buffer size in sync-intervals (optional)
     *
     * Defaults to auto-calculated `ceil(32ms / syncInterval)` so visuals always render
     * ~32ms in the past, regardless of the host's sync rate. Override to trade
     * smoothness vs latency (higher = smoother, more delay).
     */
    snapshotBufferSize?: number;
    /**
     * Automatically call tick action in scene.update() (default: true)
     * When enabled, eliminates need for manual runtime.submitAction('tick', {delta})
     * Set to false only if you need manual tick control.
     */
    autoTick?: boolean;
    /**
     * Name of the tick action to auto-call (default: 'tick')
     * Only used when autoTick is enabled
     */
    tickAction?: string;
}
export declare class PhaserAdapter<TState = any> {
    private runtime;
    private scene;
    private trackedSprites;
    private remoteSprites;
    private syncIntervalId;
    private readonly spriteNamespace;
    private readonly snapshotBufferSizeOverride?;
    private readonly targetInterpolationDelayMs;
    private readonly defaultSyncIntervalMs;
    private spriteManagers;
    private physicsManagedNamespaces;
    private readonly autoTick;
    private readonly tickAction;
    private lastTickTime;
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
     * Convert pointer screen coordinates to world coordinates
     *
     * IMPORTANT: Always use this helper (or pointer.worldX/worldY directly)
     * when handling pointer input for game logic. Using pointer.x/y will break
     * when the camera is scrolled/following a player.
     *
     * @param pointer - Phaser pointer object from input events
     * @returns World coordinates { x: number, y: number }
     *
     * @example
     * ```ts
     * this.input.on('pointerdown', (pointer) => {
     *   const worldPos = adapter.pointerToWorld(pointer);
     *   runtime.submitAction('move', { x: worldPos.x, y: worldPos.y });
     * });
     * ```
     */
    pointerToWorld(pointer: {
        worldX: number;
        worldY: number;
    }): {
        x: number;
        y: number;
    };
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
     * Call this in your Phaser scene's update() loop
     *
     * When autoTick is enabled, this automatically calls the tick action.
     * Always handles remote sprite interpolation (on clients).
     *
     * @param time - Phaser time (total elapsed time in ms)
     * @param delta - Phaser delta (time since last frame in ms)
     *
     * @example
     * ```ts
     * // In your Phaser scene:
     * update(time: number, delta: number) {
     *   adapter.update(time, delta);
     * }
     * ```
     */
    update(time: number, delta: number): void;
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
     * Blend new sync interval measurements with previous estimate for stability
     */
    private smoothSyncInterval;
    /**
     * Number of snapshots we should keep to cover the target render delay window
     */
    private getMaxSnapshots;
    /**
     * Compute delay intervals (in sync steps) for this sprite
     */
    private getDelayIntervals;
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
     * Clients always render between the last 2 received snapshots for buttery smooth motion.
     * This eliminates frame timing jitter while adding ~32ms consistent latency.
     */
    updateInterpolation(_delta?: number): void;
    /**
     * Snapshot buffer interpolation (smoothest, renders in the past)
     */
    private updateSnapshotBufferInterpolation;
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
     * Check if a namespace is already managed by PhysicsManager (for conflict warnings/defaults)
     */
    hasPhysicsManagedNamespace(namespace: string): boolean;
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
     * Create a GridClickHelper for robust grid/board click handling
     *
     * Solves the common problem where interactive rectangles don't scale properly
     * with the canvas. Uses pointer.worldX/worldY for accurate coordinate mapping
     * that works in any scale mode (FIT, RESIZE, etc).
     *
     * Perfect for: Connect Four, Chess, Tic-Tac-Toe, Minesweeper, Battleship, etc.
     *
     * @example
     * ```ts
     * const gridHelper = adapter.createClickableGrid({
     *   columns: 7,
     *   rows: 6,
     *   cellWidth: 80,
     *   cellHeight: 80,
     *   offsetX: 100,
     *   offsetY: 100,
     *   onCellClick: (col, row) => {
     *     runtime.submitAction('dropToken', { col });
     *   },
     *   highlightColor: 0xffffff,
     *   highlightAlpha: 0.15,
     *   origin: 'bottom-left' // For Connect Four
     * });
     * ```
     */
    createClickableGrid(config: GridClickConfig): GridClickHelper;
    /**
     * Create a GridCollisionManager for smooth movement with grid-aligned collision
     *
     * ⚠️ NOTE: This provides SMOOTH movement, not grid-locked movement.
     * For cell-to-cell committed movement (classic Bomberman), use createGridLockedMovementManager().
     *
     * @example
     * ```ts
     * const gridCollision = adapter.createGridCollisionManager({
     *   tileSize: 52,
     *   gridWidth: 13,
     *   gridHeight: 13,
     *   collisionCheck: createMultiCollisionCheck(
     *     { name: 'blocks', fn: (x, y) => hasBlock(state.blocks, x, y) },
     *     { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
     *   ),
     *   debug: false // Enable to see grid overlay
     * });
     *
     * // In tick action:
     * gridCollision.moveEntity(player, input, delta);
     * ```
     */
    createGridCollisionManager(config: GridCollisionConfig): GridCollisionManager;
    /**
     * Create a GridLockedMovementManager for true grid-locked movement
     *
     * Provides cell-to-cell committed movement where entities:
     * - Align to grid cell centers
     * - Commit to moving one full cell at a time
     * - Can only change direction when aligned
     * - Smoothly animate between cells
     *
     * Perfect for: Classic Bomberman, Pacman, Sokoban, turn-based grid games.
     *
     * @example
     * ```ts
     * const gridLocked = adapter.createGridLockedMovementManager({
     *   tileSize: 52,
     *   gridWidth: 13,
     *   gridHeight: 13,
     *   collisionCheck: createMultiCollisionCheck(
     *     { name: 'blocks', fn: (x, y) => hasBlock(state.blocks, x, y) },
     *     { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
     *   ),
     *   baseSpeed: 3.0 // cells per second
     * });
     *
     * // In tick action:
     * gridLocked.moveEntity(player, input, delta);
     * ```
     */
    createGridLockedMovementManager(config: GridLockedMovementConfig): GridLockedMovementManager;
    /**
     * @deprecated Use createGridCollisionManager instead. GridMovementManager has been renamed to GridCollisionManager for clarity.
     */
    createGridMovementManager(config: GridMovementConfig): GridCollisionManager;
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