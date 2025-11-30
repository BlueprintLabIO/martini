/**
 * PhaserAdapter - Bridge between Phaser and @martini-kit/core
 *
 * v2: Fully automatic sprite syncing. Host runs physics, clients mirror.
 * User never has to think about networking - it just works.
 */
import { SpriteManager } from './helpers/SpriteManager.js';
import { InputManager } from './helpers/InputManager.js';
import { PlayerUIManager } from './helpers/PlayerUIManager.js';
import { CollisionManager } from './helpers/CollisionManager.js';
import { PhysicsManager } from './helpers/PhysicsManager.js';
import { StateDrivenSpawner } from './helpers/StateDrivenSpawner.js';
import { HealthBarManager } from './helpers/HealthBarManager.js';
import { GridClickHelper } from './helpers/GridClickHelper.js';
import { GridCollisionManager } from './helpers/GridCollisionManager.js';
import { GridLockedMovementManager } from './helpers/GridLockedMovementManager.js';
export class PhaserAdapter {
    runtime;
    scene;
    trackedSprites = new Map();
    remoteSprites = new Map();
    syncIntervalId = null;
    spriteNamespace;
    snapshotBufferSizeOverride;
    targetInterpolationDelayMs = 32;
    defaultSyncIntervalMs = 13;
    spriteManagers = new Set(); // Track all registered SpriteManagers
    physicsManagedNamespaces = new Set(); // Track namespaces driven by PhysicsManager
    autoTick;
    tickAction;
    lastTickTime = Date.now();
    constructor(runtime, scene, // Phaser.Scene
    config = {}) {
        this.runtime = runtime;
        this.scene = scene;
        this.spriteNamespace = config.spriteNamespace || '_sprites';
        this.snapshotBufferSizeOverride = config.snapshotBufferSize ?? 4;
        this.autoTick = config.autoTick !== false; // default true
        this.tickAction = config.tickAction || 'tick';
        // Ensure state has sprites object
        this.runtime.mutateState((state) => {
            if (!state[this.spriteNamespace]) {
                state[this.spriteNamespace] = {};
            }
        });
        // Listen for state changes to update sprites (clients only)
        this.runtime.onChange((state) => {
            if (!this.isHost()) {
                this.updateSpritesFromState(state);
            }
        });
    }
    /**
     * Get my player ID
     */
    get myId() {
        return this.runtime.getTransport().getPlayerId();
    }
    /**
     * Get the local player's ID
     * More discoverable alias for {@link myId}
     */
    getLocalPlayerId() {
        return this.myId;
    }
    /**
     * Backwards-compatible helper - alias for {@link myId}
     * @deprecated Use {@link getLocalPlayerId} instead for better discoverability
     */
    getMyPlayerId() {
        return this.myId;
    }
    /**
     * Get the current player's state object from the runtime
     *
     * @param playersKey Key in the state where player records are stored (default: 'players')
     */
    getMyPlayer(playersKey = 'players') {
        const state = this.runtime.getState();
        const players = state?.[playersKey];
        if (!players)
            return undefined;
        return players[this.getMyPlayerId()];
    }
    /**
     * Subscribe to changes in the current player's state
     *
     * @param callback Invoked whenever the local player's record changes
     * @param playersKey Key in the state where player records are stored (default: 'players')
     */
    onMyPlayerChange(callback, playersKey = 'players') {
        let lastValue = this.getMyPlayer(playersKey);
        callback(lastValue);
        return this.runtime.onChange((state) => {
            const players = state?.[playersKey];
            const nextValue = players ? players[this.getMyPlayerId()] : undefined;
            if (nextValue === lastValue) {
                return;
            }
            lastValue = nextValue;
            callback(nextValue);
        });
    }
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
    watchMyPlayer(selector, callback, options) {
        const playersKey = options?.playersKey || 'players';
        const equals = options?.equals || Object.is;
        // Get initial value and fire callback
        let lastSelected = selector(this.getMyPlayer(playersKey));
        callback(lastSelected, undefined);
        // Subscribe to all state changes
        return this.runtime.onChange((state) => {
            const players = state?.[playersKey];
            const player = players ? players[this.getMyPlayerId()] : undefined;
            const nextSelected = selector(player);
            // Only fire callback if selected value changed
            if (!equals(nextSelected, lastSelected)) {
                const prev = lastSelected;
                lastSelected = nextSelected;
                callback(nextSelected, prev);
            }
        });
    }
    /**
     * Check if this peer is the host
     */
    isHost() {
        return this.runtime.getTransport().isHost();
    }
    /**
     * Expose the underlying Phaser scene
     */
    getScene() {
        return this.scene;
    }
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
    pointerToWorld(pointer) {
        return {
            x: pointer.worldX,
            y: pointer.worldY
        };
    }
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
    waitForMetadata(stateKey, entityId, requiredProperties, callback) {
        // Helper to check if all required properties exist
        const hasAllProperties = (data) => {
            if (!data)
                return false;
            return requiredProperties.every(prop => prop in data && data[prop] !== undefined);
        };
        // Check current state immediately
        const state = this.runtime.getState();
        const collection = this.getNestedProperty(state, stateKey);
        const currentData = collection?.[entityId];
        if (hasAllProperties(currentData)) {
            // All properties already present - fire immediately
            callback(currentData);
            return () => { }; // No-op unsubscribe
        }
        // Properties not ready yet - subscribe to state changes
        return this.runtime.onChange((state) => {
            const collection = this.getNestedProperty(state, stateKey);
            const data = collection?.[entityId];
            if (hasAllProperties(data)) {
                callback(data);
            }
        });
    }
    /**
     * Helper to get nested property from state (e.g., '__sprites__.players')
     * @internal
     */
    getNestedProperty(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current == null)
                return undefined;
            current = current[part];
        }
        return current;
    }
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
    trackSprite(sprite, key, options = {}) {
        this.trackedSprites.set(key, {
            sprite,
            options,
            lastPosition: { x: sprite.x, y: sprite.y },
            lastGrounded: undefined
        });
        // Start sync loop if not already running (host only)
        if (this.isHost() && !this.syncIntervalId) {
            const interval = options.syncInterval || 16;
            this.syncIntervalId = setInterval(() => this.syncAllSprites(), interval);
        }
        // FIX #3 & #4: Do immediate first sync to guarantee ordering
        // Previously, the first sync happened 50ms later via interval, which created
        // a race condition where static data (from setSpriteStaticData) could arrive
        // at clients before or after position data.
        //
        // Now we sync immediately, which guarantees the order:
        // 1. setSpriteStaticData() writes static properties (e.g., role: 'fire')
        // 2. trackSprite() immediately writes position (e.g., x, y)
        // Both broadcasts happen synchronously in the correct order!
        if (this.isHost()) {
            this.syncSpriteToState(key, sprite, options);
        }
    }
    /**
     * Stop tracking a sprite
     *
     * @param key - Sprite key
     * @param namespace - Optional namespace (defaults to spriteNamespace from config)
     */
    untrackSprite(key, namespace) {
        const tracked = this.trackedSprites.get(key);
        this.trackedSprites.delete(key);
        // Use namespace from tracked options, parameter, or default
        const ns = namespace || tracked?.options.namespace || this.spriteNamespace;
        // Remove from state
        this.runtime.mutateState((state) => {
            const sprites = state[ns];
            if (sprites && sprites[key]) {
                delete sprites[key];
            }
        });
        // Stop sync loop if no more sprites
        if (this.trackedSprites.size === 0 && this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
    /**
     * Broadcast a custom event
     */
    broadcast(eventName, payload) {
        this.runtime.broadcastEvent(eventName, payload);
    }
    /**
     * Listen for custom events
     */
    on(eventName, callback) {
        return this.runtime.onEvent(eventName, (senderId, _eventName, payload) => {
            callback(senderId, payload);
        });
    }
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
    update(time, delta) {
        // Auto-tick: Automatically submit tick action (host only)
        if (this.autoTick && this.isHost()) {
            const now = Date.now();
            const tickDelta = now - this.lastTickTime;
            this.lastTickTime = now;
            this.runtime.submitAction(this.tickAction, { delta: tickDelta });
        }
        // Always update interpolation on clients
        if (!this.isHost()) {
            this.updateInterpolation(delta);
        }
    }
    /**
     * Cleanup
     */
    destroy() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        this.trackedSprites.clear();
        this.remoteSprites.clear();
    }
    // ============================================================================
    // Private methods
    // ============================================================================
    /**
     * Sync all tracked sprites to state (host only)
     */
    syncAllSprites() {
        if (!this.isHost())
            return;
        for (const [key, tracked] of this.trackedSprites.entries()) {
            const { sprite, options, lastPosition } = tracked;
            const motionProfile = options.motionProfile;
            // Detect ground contact for platformers to force an immediate sync
            let forceSync = false;
            if (motionProfile === 'platformer' && sprite?.body) {
                const body = sprite.body;
                const grounded = !!(body.blocked?.down || body.touching?.down);
                if (grounded && tracked.lastGrounded === false) {
                    forceSync = true; // landing transition
                }
                tracked.lastGrounded = grounded;
            }
            // Adaptive sync: skip if sprite hasn't moved much
            if (!forceSync && options.adaptiveSync && lastPosition) {
                const threshold = options.adaptiveSyncThreshold ?? 1;
                const dx = Math.abs(sprite.x - lastPosition.x);
                const dy = Math.abs(sprite.y - lastPosition.y);
                if (dx < threshold && dy < threshold) {
                    continue; // Skip sync for idle sprite
                }
            }
            this.syncSpriteToState(key, sprite, options);
            // Update last position for adaptive sync
            if (options.adaptiveSync) {
                tracked.lastPosition = { x: sprite.x, y: sprite.y };
            }
        }
    }
    /**
     * Sync a single sprite to state
     */
    syncSpriteToState(key, sprite, options) {
        const properties = options.properties || ['x', 'y', 'rotation', 'alpha'];
        const updates = {};
        for (const prop of properties) {
            if (prop in sprite) {
                updates[prop] = sprite[prop];
            }
        }
        // Use namespace from options or default
        const namespace = options.namespace || this.spriteNamespace;
        // Directly mutate state (host only)
        this.runtime.mutateState((state) => {
            if (!state[namespace]) {
                state[namespace] = {};
            }
            const sprites = state[namespace];
            sprites[key] = { ...sprites[key], ...updates };
        });
    }
    /**
     * Set static metadata for a tracked sprite (host only)
     *
     * @param key - Sprite key
     * @param data - Static data to set
     * @param namespace - Optional namespace (defaults to spriteNamespace from config)
     */
    setSpriteStaticData(key, data, namespace) {
        if (!this.isHost())
            return;
        const ns = namespace || this.spriteNamespace;
        this.runtime.mutateState((state) => {
            if (!state[ns]) {
                state[ns] = {};
            }
            const sprites = state[ns];
            sprites[key] = { ...data, ...sprites[key] };
        });
    }
    /**
     * Update sprites from state (clients only)
     *
     * MULTI-NAMESPACE SUPPORT: This method now handles sprites from all registered
     * namespaces, including both the default namespace and custom namespaces from
     * createSpriteRegistry(). This fixes the bug where sprites in custom namespaces
     * (like __sprites__.players) weren't getting interpolation targets on clients.
     */
    updateSpritesFromState(state) {
        if (this.isHost())
            return;
        // Collect all namespaces to check
        const namespacesToCheck = new Set();
        // Add default namespace
        namespacesToCheck.add(this.spriteNamespace);
        // Add all registered SpriteManager namespaces
        for (const manager of this.spriteManagers) {
            namespacesToCheck.add(manager.namespace);
        }
        // Update sprites in each namespace
        for (const namespace of namespacesToCheck) {
            const sprites = state[namespace];
            if (!sprites)
                continue; // Skip if this namespace doesn't exist in state
            // Update tracked sprites (sprites that exist on this client)
            for (const [key, tracked] of this.trackedSprites.entries()) {
                const spriteData = sprites[key];
                if (spriteData) {
                    this.applySpriteData(tracked.sprite, spriteData);
                }
            }
            // Update remote sprites (sprites from other players)
            // Store snapshot for interpolation
            const now = Date.now();
            for (const [key, spriteData] of Object.entries(sprites)) {
                // Skip if this is our own sprite
                if (this.trackedSprites.has(key))
                    continue;
                const remoteSpriteData = this.remoteSprites.get(key);
                if (!remoteSpriteData || remoteSpriteData.namespace !== namespace)
                    continue;
                const data = spriteData;
                const snapshots = remoteSpriteData.snapshots;
                snapshots.push({
                    x: data.x,
                    y: data.y,
                    rotation: data.rotation,
                    timestamp: now
                });
                // Update estimated sync interval for adaptive buffering
                if (snapshots.length >= 2) {
                    const latest = snapshots[snapshots.length - 1].timestamp;
                    const previous = snapshots[snapshots.length - 2].timestamp;
                    const interval = latest - previous;
                    if (interval > 0) {
                        remoteSpriteData.estimatedSyncInterval = this.smoothSyncInterval(remoteSpriteData.estimatedSyncInterval, interval);
                    }
                }
                // Keep only the snapshots needed to cover the target delay window
                const maxSnapshots = this.getMaxSnapshots(remoteSpriteData);
                while (snapshots.length > maxSnapshots) {
                    snapshots.shift();
                }
                // First update - snap to position immediately
                const sprite = remoteSpriteData.sprite;
                if (sprite.x === undefined || Number.isNaN(sprite.x)) {
                    sprite.x = data.x;
                    sprite.y = data.y;
                    sprite.rotation = data.rotation || 0;
                }
            }
        }
    }
    /**
     * Blend new sync interval measurements with previous estimate for stability
     */
    smoothSyncInterval(previous, next) {
        if (!previous)
            return next;
        const alpha = 0.2; // simple EMA to avoid jitter in delay calculation
        return previous * (1 - alpha) + next * alpha;
    }
    /**
     * Number of snapshots we should keep to cover the target render delay window
     */
    getMaxSnapshots(remoteSpriteData) {
        const delayIntervals = this.getDelayIntervals(remoteSpriteData);
        // Need one more snapshot than delay intervals to bracket the render time
        return Math.max(2, delayIntervals + 1);
    }
    /**
     * Compute delay intervals (in sync steps) for this sprite
     */
    getDelayIntervals(remoteSpriteData) {
        if (this.snapshotBufferSizeOverride) {
            remoteSpriteData.delayIntervals = Math.max(1, this.snapshotBufferSizeOverride);
            return remoteSpriteData.delayIntervals;
        }
        const syncInterval = remoteSpriteData.estimatedSyncInterval ?? this.defaultSyncIntervalMs;
        const autoSize = Math.max(1, Math.ceil(this.targetInterpolationDelayMs / syncInterval));
        remoteSpriteData.delayIntervals = autoSize;
        return autoSize;
    }
    /**
     * Apply sprite data to a sprite
     */
    applySpriteData(sprite, data) {
        if ('x' in data)
            sprite.x = data.x;
        if ('y' in data)
            sprite.y = data.y;
        if ('rotation' in data)
            sprite.rotation = data.rotation;
        if ('alpha' in data)
            sprite.alpha = data.alpha;
        if ('scaleX' in data)
            sprite.scaleX = data.scaleX;
        if ('scaleY' in data)
            sprite.scaleY = data.scaleY;
        if ('visible' in data)
            sprite.visible = data.visible;
    }
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
    registerRemoteSprite(key, sprite, namespace) {
        this.remoteSprites.set(key, {
            sprite,
            namespace: namespace || this.spriteNamespace,
            snapshots: []
        });
    }
    /**
     * Call this in your Phaser update() loop to smoothly interpolate remote sprites
     * This should be called every frame (60 FPS) for smooth movement
     *
     * Clients always render between the last 2 received snapshots for buttery smooth motion.
     * This eliminates frame timing jitter while adding ~32ms consistent latency.
     */
    updateInterpolation(_delta) {
        if (this.isHost())
            return; // Only clients interpolate
        const now = Date.now();
        for (const [key, remoteSpriteData] of this.remoteSprites.entries()) {
            const sprite = remoteSpriteData.sprite;
            // Snapshot buffer interpolation: Render between last 2 snapshots
            this.updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now);
        }
    }
    /**
     * Snapshot buffer interpolation (smoothest, renders in the past)
     */
    updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now) {
        const snapshots = remoteSpriteData.snapshots;
        if (!snapshots || snapshots.length < 2)
            return;
        const syncInterval = remoteSpriteData.estimatedSyncInterval ?? this.defaultSyncIntervalMs;
        const delayIntervals = this.getDelayIntervals(remoteSpriteData);
        const renderDelay = delayIntervals * syncInterval;
        const renderTime = now - renderDelay;
        // Find two snapshots to interpolate between
        let snapshot0 = snapshots[0];
        let snapshot1 = snapshots[snapshots.length - 1];
        for (let i = 0; i < snapshots.length - 1; i++) {
            const current = snapshots[i];
            const next = snapshots[i + 1];
            if (current.timestamp <= renderTime && next.timestamp >= renderTime) {
                snapshot0 = current;
                snapshot1 = next;
                break;
            }
        }
        // Clamp to earliest/latest if renderTime is outside buffered window
        if (renderTime <= snapshots[0].timestamp) {
            snapshot0 = snapshots[0];
            snapshot1 = snapshots[1] ?? snapshots[0];
        }
        else if (renderTime >= snapshots[snapshots.length - 1].timestamp) {
            snapshot0 = snapshots[snapshots.length - 2];
            snapshot1 = snapshots[snapshots.length - 1];
        }
        // Interpolate between snapshots
        const t0 = snapshot0.timestamp;
        const t1 = snapshot1.timestamp;
        const denom = t1 - t0;
        const t = denom === 0 ? 1 : (renderTime - t0) / denom;
        const clamped = Math.max(0, Math.min(1, t));
        sprite.x = snapshot0.x + (snapshot1.x - snapshot0.x) * clamped;
        sprite.y = snapshot0.y + (snapshot1.y - snapshot0.y) * clamped;
        if (snapshot0.rotation !== undefined && snapshot1.rotation !== undefined) {
            sprite.rotation = snapshot0.rotation + (snapshot1.rotation - snapshot0.rotation) * clamped;
        }
    }
    /**
     * Unregister a remote sprite
     */
    unregisterRemoteSprite(key) {
        const remoteSpriteData = this.remoteSprites.get(key);
        if (remoteSpriteData?.sprite && remoteSpriteData.sprite.destroy) {
            remoteSpriteData.sprite.destroy();
        }
        this.remoteSprites.delete(key);
    }
    /**
     * Listen for state changes (convenience wrapper)
     */
    onChange(callback) {
        return this.runtime.onChange(callback);
    }
    /**
     * Get the current game state (typed)
     */
    getState() {
        return this.runtime.getState();
    }
    // ============================================================================
    // Lobby System Helpers (Pit of Success)
    // ============================================================================
    /**
     * Register a callback that only runs once when transitioning to 'playing' phase
     *
     * ✅ Pit of success: Prevents creating game objects during lobby phase
     *
     * @example
     * ```ts
     * create() {
     *   // Static setup (background, lobby UI)
     *   this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
     *
     *   // ✅ Game objects only created when playing starts
     *   this.adapter.onPlaying((state) => {
     *     this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
     *     this.physics.add.existing(this.ball);
     *   });
     * }
     * ```
     */
    onPlaying(callback) {
        let hasStarted = false;
        return this.runtime.onChange((state) => {
            // If no lobby system, run immediately
            if (!state.__lobby) {
                if (!hasStarted) {
                    hasStarted = true;
                    callback(state);
                }
                return;
            }
            // With lobby: only run when transitioning to 'playing'
            if (!hasStarted && state.__lobby.phase === 'playing') {
                hasStarted = true;
                callback(state);
            }
        });
    }
    /**
     * Register a callback that only runs while in 'playing' phase
     *
     * Runs every state update during gameplay, stops when game ends.
     *
     * @example
     * ```ts
     * this.adapter.whilePlaying((state) => {
     *   // Physics updates, collision checks, etc.
     *   this.handleGameLogic(state);
     * });
     * ```
     */
    whilePlaying(callback) {
        return this.runtime.onChange((state) => {
            // If no lobby system, always run
            if (!state.__lobby) {
                callback(state);
                return;
            }
            // With lobby: only run during 'playing' phase
            if (state.__lobby.phase === 'playing') {
                callback(state);
            }
        });
    }
    /**
     * Register a callback that runs when game ends
     *
     * @example
     * ```ts
     * this.adapter.onEnded((state) => {
     *   this.showResults(state);
     * });
     * ```
     */
    onEnded(callback) {
        let hasEnded = false;
        return this.runtime.onChange((state) => {
            if (!state.__lobby)
                return; // No lobby system
            if (!hasEnded && state.__lobby.phase === 'ended') {
                hasEnded = true;
                callback(state);
            }
        });
    }
    /**
     * Check if game is currently in lobby phase
     */
    isInLobby() {
        const state = this.runtime.getState();
        return state.__lobby?.phase === 'lobby';
    }
    /**
     * Check if game is currently playing
     */
    isPlaying() {
        const state = this.runtime.getState();
        if (!state.__lobby)
            return true; // No lobby = always playing
        return state.__lobby.phase === 'playing';
    }
    /**
     * Get the runtime (for advanced usage)
     */
    getRuntime() {
        return this.runtime;
    }
    // ============================================================================
    // Helper Factories
    // ============================================================================
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
    createSpriteManager(config) {
        const manager = new SpriteManager(this, config);
        // Register the namespace for multi-namespace interpolation support
        this.registerSpriteManager(manager);
        return manager;
    }
    /**
     * Register a SpriteManager with this adapter for multi-namespace support
     * Internal method - automatically called by createSpriteManager
     */
    registerSpriteManager(manager) {
        this.spriteManagers.add(manager);
    }
    /**
     * Check if a namespace is already managed by PhysicsManager (for conflict warnings/defaults)
     */
    hasPhysicsManagedNamespace(namespace) {
        return this.physicsManagedNamespaces.has(namespace);
    }
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
    createSpriteRegistry(config) {
        const registry = {};
        for (const [name, managerConfig] of Object.entries(config)) {
            const manager = new SpriteManager(this, {
                ...managerConfig,
                namespace: `__sprites__.${name}`
            });
            // Register the namespace for multi-namespace interpolation support
            this.registerSpriteManager(manager);
            registry[name] = manager;
        }
        return registry;
    }
    /**
     * Create a PlayerUIManager for automatically managed player HUD elements
     */
    createPlayerUIManager(config) {
        return new PlayerUIManager(this, this.scene, config);
    }
    /**
     * Create a CollisionManager for declarative collision rules
     */
    createCollisionManager(config) {
        return new CollisionManager(this, this.scene, config);
    }
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
    createInputManager() {
        return new InputManager(this, this.scene);
    }
    /**
     * Create a PhysicsManager for automatic physics behaviors
     */
    createPhysicsManager(config) {
        if (config.spriteManager?.namespace && config.syncPositionToState !== false) {
            this.physicsManagedNamespaces.add(config.spriteManager.namespace);
        }
        return new PhysicsManager(this.runtime, config);
    }
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
    createStateDrivenSpawner(config) {
        return new StateDrivenSpawner(this, config);
    }
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
    createClickableGrid(config) {
        return new GridClickHelper(this, this.scene, config);
    }
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
    createGridCollisionManager(config) {
        return new GridCollisionManager(this, config);
    }
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
    createGridLockedMovementManager(config) {
        return new GridLockedMovementManager(this, config);
    }
    /**
     * @deprecated Use createGridCollisionManager instead. GridMovementManager has been renamed to GridCollisionManager for clarity.
     */
    createGridMovementManager(config) {
        return new GridCollisionManager(this, config);
    }
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
    createHealthBarManager(config) {
        return new HealthBarManager(this, config);
    }
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
    createCameraFollower(config = {}) {
        const { createCameraFollower } = require('./helpers/CameraFollower.js');
        return createCameraFollower(this, this.scene, config);
    }
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
    submitActionOnChange(actionName, input, targetId) {
        // Use a private map to track previous inputs per action
        if (!this._previousInputs) {
            this._previousInputs = new Map();
        }
        const key = targetId ? `${actionName}:${targetId}` : actionName;
        const inputJson = JSON.stringify(input);
        const previousJson = this._previousInputs.get(key);
        // Only submit if input changed
        if (inputJson !== previousJson) {
            this._previousInputs.set(key, inputJson);
            this.runtime.submitAction(actionName, input, targetId);
        }
    }
}
//# sourceMappingURL=PhaserAdapter.js.map