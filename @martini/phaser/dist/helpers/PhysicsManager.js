/**
 * PhysicsManager - Automates physics behavior based on inputs
 *
 * Eliminates manual physics loops by automatically reading inputs from state
 * and applying pre-defined or custom physics behaviors.
 *
 * ## Position Syncing (PIT OF SUCCESS!)
 *
 * **NEW:** PhysicsManager now automatically syncs sprite positions BACK to state
 * (enabled by default). This prevents the "bullets spawn from starting position" bug
 * where actions reading `state.players[id].x/y` get stale data.
 *
 * **How it works:**
 * 1. PhysicsManager moves sprites via Phaser physics bodies
 * 2. After each physics update, sprite.x/y/rotation → state.players[id].x/y/rotation
 * 3. Actions can now read current positions from state reliably
 *
 * **When to disable:**
 * - Performance optimization for 100+ entities
 * - You're manually syncing positions elsewhere
 * - Set `syncPositionToState: false` in config
 *
 * ## Velocity Updates (Racing Behavior)
 *
 * PhysicsManager provides velocity data through TWO channels:
 *
 * 1. **Local Events** (`onVelocityChange`) - Host only, no network overhead
 *    - Fast, synchronous updates
 *    - Use for: Host-only displays, debug overlays, analytics
 *    - Example: Dev tools showing real-time physics metrics
 *
 * 2. **State Sync** (`state.players[id].velocity`) - Synced across network
 *    - Automatically written to game state
 *    - Use for: Client HUDs, multiplayer displays
 *    - Example: Speed display visible to all players
 *
 * Helpers like `createSpeedDisplay` use BOTH:
 * - Host: Fast event updates (instant feedback)
 * - Clients: State sync (receives velocity from host)
 *
 * @example
 * ```ts
 * // In scene.create()
 * this.physicsManager = this.adapter.createPhysicsManager({
 *   spriteManager: this.spriteManager,
 *   inputKey: 'inputs',
 *   stateKey: 'players', // optional, defaults to 'players'
 *   syncPositionToState: true // optional, defaults to true (PIT OF SUCCESS!)
 * });
 *
 * this.physicsManager.addBehavior('topDown', {
 *   speed: 200
 * });
 *
 * // Now actions can read current positions from state!
 * // shoot action: bullet.x = state.players[id].x ✅ (always up to date)
 *
 * // In scene.update()
 * this.physicsManager.update();
 * ```
 */
/**
 * Simple event emitter for velocity changes
 */
class VelocityEmitter {
    listeners = [];
    on(callback) {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    emit(playerId, velocity) {
        for (const listener of this.listeners) {
            listener(playerId, velocity);
        }
    }
}
export class PhysicsManager {
    runtime;
    spriteManager;
    inputKey;
    spriteKeyPrefix;
    syncPositionToState;
    stateKey;
    behaviorType = null;
    behaviorConfig = null;
    velocities = new Map(); // Track velocity for racing behavior
    velocityEmitter = new VelocityEmitter(); // Event emitter for velocity changes
    constructor(runtime, config) {
        this.runtime = runtime;
        this.spriteManager = config.spriteManager;
        this.inputKey = config.inputKey || 'inputs';
        this.spriteKeyPrefix = config.spriteKeyPrefix || 'player-';
        this.syncPositionToState = config.syncPositionToState !== false; // default true
        this.stateKey = config.stateKey || 'players';
    }
    /**
     * Get velocity for a specific player (racing behavior only)
     * Useful for displaying speed in HUD
     *
     * @param playerId - The player ID to get velocity for
     * @returns Current velocity, or 0 if not found
     *
     * @example
     * ```ts
     * const speed = physicsManager.getVelocity(adapter.getLocalPlayerId());
     * ```
     */
    getVelocity(playerId) {
        return this.velocities.get(playerId) || 0;
    }
    /**
     * Get readonly access to all velocities (for debugging/UI)
     * Returns a readonly map of player IDs to their current velocities
     */
    getVelocities() {
        return this.velocities;
    }
    /**
     * Subscribe to velocity changes (racing behavior only)
     *
     * **Important:** This is a LOCAL event that only fires on the HOST.
     * Events do NOT cross the network boundary.
     *
     * Use cases:
     * - Host-only displays (debug overlays, dev tools)
     * - Performance-critical updates (no network overhead)
     * - Analytics/telemetry (host-side tracking)
     *
     * For client displays, use `createSpeedDisplay()` helper which automatically
     * handles both events (host) and state sync (clients).
     *
     * Alternatively, read `state.players[playerId].velocity` which is automatically
     * synced across the network by PhysicsManager.
     *
     * @param callback - Called whenever a player's velocity changes (host only)
     * @returns Unsubscribe function
     *
     * @example
     * ```ts
     * // Host-only analytics
     * const unsubscribe = physicsManager.onVelocityChange((playerId, velocity) => {
     *   if (velocity > 250) {
     *     trackAchievement('speed_demon', playerId);
     *   }
     * });
     *
     * // Later, cleanup
     * unsubscribe();
     * ```
     */
    onVelocityChange(callback) {
        return this.velocityEmitter.on(callback);
    }
    addBehavior(type, config) {
        this.behaviorType = type;
        this.behaviorConfig = config || {};
    }
    /**
     * Update physics for all sprites (call in scene.update())
     * Only runs on host.
     */
    update() {
        // Only host applies physics
        const transport = this.runtime.getTransport();
        if (!transport.isHost())
            return;
        const state = this.runtime.getState();
        const inputs = state[this.inputKey];
        if (!inputs)
            return;
        // Apply physics to each player based on their input
        for (const [playerId, playerInput] of Object.entries(inputs)) {
            const sprite = this.spriteManager.get(`${this.spriteKeyPrefix}${playerId}`);
            if (!sprite || !sprite.body)
                continue;
            const body = sprite.body;
            if (this.behaviorType === 'platformer') {
                this.applyPlatformerBehavior(body, playerInput, this.behaviorConfig);
            }
            else if (this.behaviorType === 'topDown') {
                this.applyTopDownBehavior(body, playerInput, this.behaviorConfig);
            }
            else if (this.behaviorType === 'racing') {
                this.applyRacingBehavior(sprite, body, playerInput, playerId, this.behaviorConfig);
            }
            else if (this.behaviorType === 'custom' && this.behaviorConfig) {
                const customConfig = this.behaviorConfig;
                customConfig.apply(sprite, playerInput, body);
            }
            // Sync sprite position back to state (PIT OF SUCCESS!)
            // This ensures actions reading from state (e.g., shoot) get current positions
            if (this.syncPositionToState) {
                this.syncPositionToStateForPlayer(playerId, sprite);
            }
        }
    }
    applyPlatformerBehavior(body, input, config) {
        const speed = config.speed || 200;
        const jumpPower = config.jumpPower || 350;
        const keys = config.keys || { left: 'left', right: 'right', jump: 'up' };
        // Horizontal movement
        if (input[keys.left]) {
            body.setVelocityX(-speed);
        }
        else if (input[keys.right]) {
            body.setVelocityX(speed);
        }
        else {
            body.setVelocityX(0);
        }
        // Jumping (only if on ground)
        if (input[keys.jump] && body.touching.down) {
            body.setVelocityY(-jumpPower);
        }
    }
    applyTopDownBehavior(body, input, config) {
        const speed = config.speed || 200;
        const keys = config.keys || { left: 'left', right: 'right', up: 'up', down: 'down' };
        let vx = 0;
        let vy = 0;
        if (input[keys.left])
            vx = -speed;
        if (input[keys.right])
            vx = speed;
        if (input[keys.up])
            vy = -speed;
        if (input[keys.down])
            vy = speed;
        body.setVelocity(vx, vy);
    }
    applyRacingBehavior(sprite, body, input, playerId, config) {
        const acceleration = config.acceleration ?? 5;
        const maxSpeed = config.maxSpeed ?? 200;
        const turnSpeed = config.turnSpeed ?? 0.05;
        const friction = config.friction ?? 0.98;
        const keys = config.keys || { left: 'left', right: 'right', accelerate: 'up' };
        // Get or initialize velocity for this player
        const prevVelocity = this.velocities.get(playerId) || 0;
        let velocity = prevVelocity;
        // Rotation (turning)
        if (input[keys.left]) {
            sprite.rotation -= turnSpeed;
        }
        if (input[keys.right]) {
            sprite.rotation += turnSpeed;
        }
        // Acceleration
        if (input[keys.accelerate]) {
            velocity = Math.min(velocity + acceleration, maxSpeed);
        }
        else {
            // Apply friction when not accelerating
            velocity *= friction;
            // Snap to zero when very slow (avoid asymptotic decay)
            if (velocity < 0.5) {
                velocity = 0;
            }
        }
        // Store velocity locally
        this.velocities.set(playerId, velocity);
        // Sync velocity to state so clients can display it
        this.runtime.mutateState((state) => {
            if (state.players && state.players[playerId]) {
                state.players[playerId].velocity = velocity;
            }
        });
        // Emit event for local reactive displays (host only)
        this.velocityEmitter.emit(playerId, velocity);
        // Apply velocity in the direction of rotation
        const vx = Math.cos(sprite.rotation) * velocity;
        const vy = Math.sin(sprite.rotation) * velocity;
        body.setVelocity(vx, vy);
    }
    /**
     * Sync sprite position and rotation back to state
     * Called automatically after physics updates when syncPositionToState is enabled
     */
    syncPositionToStateForPlayer(playerId, sprite) {
        this.runtime.mutateState((state) => {
            const entities = state[this.stateKey];
            if (entities && entities[playerId]) {
                // Always sync position (this is what PhysicsManager controls)
                entities[playerId].x = sprite.x;
                entities[playerId].y = sprite.y;
                // Only sync rotation for racing behavior, where sprite.rotation is modified by physics
                // For topDown/platformer, rotation is typically managed by actions/game logic
                if (this.behaviorType === 'racing' && sprite.rotation !== undefined) {
                    entities[playerId].rotation = sprite.rotation;
                }
            }
        });
    }
}
//# sourceMappingURL=PhysicsManager.js.map