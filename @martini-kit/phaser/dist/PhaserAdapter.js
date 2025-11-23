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
export class PhaserAdapter {
    runtime;
    scene;
    trackedSprites = new Map();
    remoteSprites = new Map();
    syncIntervalId = null;
    spriteNamespace;
    autoInterpolate;
    lerpFactor;
    interpolationMode;
    interpolationSpeed;
    snapshotBufferSize;
    enableDeadReckoning;
    deadReckoningMaxDuration;
    spriteManagers = new Set(); // Track all registered SpriteManagers
    lastUpdateTime = Date.now();
    constructor(runtime, scene, // Phaser.Scene
    config = {}) {
        this.runtime = runtime;
        this.scene = scene;
        this.spriteNamespace = config.spriteNamespace || '_sprites';
        this.autoInterpolate = config.autoInterpolate !== false; // default true
        this.lerpFactor = config.lerpFactor ?? 0.3;
        this.interpolationMode = config.interpolationMode || 'time-based';
        this.interpolationSpeed = config.interpolationSpeed ?? 400; // pixels per second
        this.snapshotBufferSize = config.snapshotBufferSize ?? 3;
        this.enableDeadReckoning = config.enableDeadReckoning !== false; // default true
        this.deadReckoningMaxDuration = config.deadReckoningMaxDuration ?? 200; // ms
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
        this.trackedSprites.set(key, { sprite, options, lastPosition: { x: sprite.x, y: sprite.y } });
        // Start sync loop if not already running (host only)
        if (this.isHost() && !this.syncIntervalId) {
            const interval = options.syncInterval || 50;
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
            // Adaptive sync: skip if sprite hasn't moved much
            if (options.adaptiveSync && lastPosition) {
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
            // Store target positions for interpolation
            const now = Date.now();
            for (const [key, spriteData] of Object.entries(sprites)) {
                // Skip if this is our own sprite
                if (this.trackedSprites.has(key))
                    continue;
                // If we have a remote sprite for this key, store target position
                const remoteSpriteData = this.remoteSprites.get(key);
                if (remoteSpriteData && remoteSpriteData.namespace === namespace) {
                    const sprite = remoteSpriteData.sprite;
                    const data = spriteData;
                    // Calculate velocity for dead reckoning
                    if (this.enableDeadReckoning && remoteSpriteData.lastUpdateTime) {
                        const dt = (now - remoteSpriteData.lastUpdateTime) / 1000; // seconds
                        if (dt > 0 && sprite._targetX !== undefined) {
                            remoteSpriteData.velocityX = (data.x - sprite._targetX) / dt;
                            remoteSpriteData.velocityY = (data.y - sprite._targetY) / dt;
                        }
                    }
                    // Snapshot buffer mode: Store snapshot instead of direct target
                    if (this.interpolationMode === 'snapshot-buffer') {
                        if (!remoteSpriteData.snapshots) {
                            remoteSpriteData.snapshots = [];
                        }
                        // Add new snapshot
                        remoteSpriteData.snapshots.push({
                            x: data.x,
                            y: data.y,
                            rotation: data.rotation,
                            timestamp: now
                        });
                        // Keep only last N snapshots
                        if (remoteSpriteData.snapshots.length > this.snapshotBufferSize) {
                            remoteSpriteData.snapshots.shift();
                        }
                        // First update - snap to position immediately
                        if (sprite.x === undefined) {
                            sprite.x = data.x;
                            sprite.y = data.y;
                            sprite.rotation = data.rotation || 0;
                        }
                    }
                    else {
                        // Legacy lerp / time-based mode: Store target positions
                        sprite._targetX = data.x;
                        sprite._targetY = data.y;
                        sprite._targetRotation = data.rotation;
                        // First update - snap to position immediately
                        if (sprite._targetX !== undefined && sprite.x === undefined) {
                            sprite.x = sprite._targetX;
                            sprite.y = sprite._targetY;
                            sprite.rotation = sprite._targetRotation || 0;
                        }
                    }
                    remoteSpriteData.lastUpdateTime = now;
                }
            }
        }
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
            namespace: namespace || this.spriteNamespace
        });
    }
    /**
     * Call this in your Phaser update() loop to smoothly interpolate remote sprites
     * This should be called every frame (60 FPS) for smooth movement
     *
     * Note: If autoInterpolate is enabled in config, you don't need to call this manually.
     *
     * Supports three interpolation modes:
     * - 'lerp': Exponential smoothing (legacy, frame-rate dependent)
     * - 'time-based': Linear interpolation at constant speed (frame-rate independent)
     * - 'snapshot-buffer': Buffered interpolation (smoothest, adds latency)
     */
    updateInterpolation(delta) {
        if (this.isHost())
            return; // Only clients interpolate
        const now = Date.now();
        const dt = delta ? delta / 1000 : (now - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = now;
        for (const [key, remoteSpriteData] of this.remoteSprites.entries()) {
            const sprite = remoteSpriteData.sprite;
            if (this.interpolationMode === 'snapshot-buffer') {
                // Snapshot buffer mode: Interpolate between buffered snapshots
                this.updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now);
            }
            else if (this.interpolationMode === 'time-based') {
                // Time-based mode: Linear interpolation at constant speed
                this.updateTimeBasedInterpolation(sprite, remoteSpriteData, dt, now);
            }
            else {
                // Legacy lerp mode: Exponential smoothing
                this.updateLerpInterpolation(sprite, remoteSpriteData);
            }
        }
    }
    /**
     * Legacy exponential lerp interpolation (frame-rate dependent)
     */
    updateLerpInterpolation(sprite, remoteSpriteData) {
        if (sprite._targetX !== undefined) {
            sprite.x += (sprite._targetX - sprite.x) * this.lerpFactor;
            sprite.y += (sprite._targetY - sprite.y) * this.lerpFactor;
            if (sprite._targetRotation !== undefined) {
                sprite.rotation += (sprite._targetRotation - sprite.rotation) * this.lerpFactor;
            }
        }
    }
    /**
     * Time-based linear interpolation (frame-rate independent)
     */
    updateTimeBasedInterpolation(sprite, remoteSpriteData, dt, now) {
        if (sprite._targetX === undefined)
            return;
        // Calculate distance to target
        const dx = sprite._targetX - sprite.x;
        const dy = sprite._targetY - sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 0.1) {
            // Snap to target if very close
            sprite.x = sprite._targetX;
            sprite.y = sprite._targetY;
            if (sprite._targetRotation !== undefined) {
                sprite.rotation = sprite._targetRotation;
            }
            return;
        }
        // Dead reckoning: Extrapolate if no recent updates
        const timeSinceUpdate = now - (remoteSpriteData.lastUpdateTime || now);
        if (this.enableDeadReckoning &&
            timeSinceUpdate > 0 &&
            timeSinceUpdate < this.deadReckoningMaxDuration &&
            remoteSpriteData.velocityX !== undefined) {
            // Use velocity to extrapolate position
            sprite.x += remoteSpriteData.velocityX * dt;
            sprite.y += remoteSpriteData.velocityY * dt;
        }
        else {
            // Normal interpolation: Move at constant speed towards target
            const moveDistance = this.interpolationSpeed * dt;
            const t = Math.min(moveDistance / distance, 1); // Clamp to 1 to prevent overshoot
            sprite.x += dx * t;
            sprite.y += dy * t;
            // Rotation interpolation
            if (sprite._targetRotation !== undefined) {
                const dr = sprite._targetRotation - sprite.rotation;
                sprite.rotation += dr * t;
            }
        }
    }
    /**
     * Snapshot buffer interpolation (smoothest, renders in the past)
     */
    updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now) {
        const snapshots = remoteSpriteData.snapshots;
        if (!snapshots || snapshots.length < 2)
            return;
        // Render 100ms in the past (or buffer size * sync interval)
        const renderTime = now - 100;
        // Find two snapshots to interpolate between
        let snapshot0 = null;
        let snapshot1 = null;
        for (let i = 0; i < snapshots.length - 1; i++) {
            if (snapshots[i].timestamp <= renderTime && snapshots[i + 1].timestamp >= renderTime) {
                snapshot0 = snapshots[i];
                snapshot1 = snapshots[i + 1];
                break;
            }
        }
        // Fallback to latest two snapshots
        if (!snapshot0 || !snapshot1) {
            snapshot0 = snapshots[snapshots.length - 2];
            snapshot1 = snapshots[snapshots.length - 1];
        }
        // Interpolate between snapshots
        const t0 = snapshot0.timestamp;
        const t1 = snapshot1.timestamp;
        const t = (renderTime - t0) / (t1 - t0);
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