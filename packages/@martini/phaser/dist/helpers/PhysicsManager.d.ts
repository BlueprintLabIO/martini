/**
 * PhysicsManager - Automates physics behavior based on inputs
 *
 * Eliminates manual physics loops by automatically reading inputs from state
 * and applying pre-defined or custom physics behaviors.
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
 *   inputKey: 'inputs'
 * });
 *
 * this.physicsManager.addBehavior('platformer', {
 *   speed: 200,
 *   jumpPower: 350
 * });
 *
 * // Option 1: Use helper (handles both events + state sync)
 * this.speedDisplay = createSpeedDisplay(this.physicsManager, this.adapter, this);
 *
 * // Option 2: Subscribe to events manually (host-only)
 * this.physicsManager.onVelocityChange((playerId, velocity) => {
 *   console.log(`Player ${playerId} speed: ${velocity}`);
 * });
 *
 * // In scene.update()
 * this.physicsManager.update();
 * ```
 */
import type { GameRuntime } from '@martini/core';
import type { SpriteManager } from './SpriteManager.js';
export interface PlatformerBehaviorConfig {
    speed?: number;
    jumpPower?: number;
    keys?: {
        left?: string;
        right?: string;
        jump?: string;
    };
}
export interface TopDownBehaviorConfig {
    speed?: number;
    keys?: {
        left?: string;
        right?: string;
        up?: string;
        down?: string;
    };
}
export interface RacingBehaviorConfig {
    /** Acceleration rate when accelerating (default: 5) */
    acceleration?: number;
    /** Maximum speed (default: 200) */
    maxSpeed?: number;
    /** Turn speed in radians per frame (default: 0.05) */
    turnSpeed?: number;
    /** Friction/decay multiplier per frame (default: 0.98) */
    friction?: number;
    /** Keys for controls */
    keys?: {
        left?: string;
        right?: string;
        accelerate?: string;
    };
}
export interface CustomBehaviorConfig {
    apply: (sprite: any, input: any, body: Phaser.Physics.Arcade.Body) => void;
}
export type BehaviorConfig = PlatformerBehaviorConfig | TopDownBehaviorConfig | RacingBehaviorConfig | CustomBehaviorConfig;
export interface PhysicsManagerConfig {
    /** SpriteManager to get sprites from */
    spriteManager: SpriteManager;
    /** Key in state to read inputs from (e.g., 'inputs') */
    inputKey?: string;
    /** Key prefix for sprite keys (defaults to 'player-') */
    spriteKeyPrefix?: string;
}
export declare class PhysicsManager {
    private runtime;
    private spriteManager;
    private inputKey;
    private spriteKeyPrefix;
    private behaviorType;
    private behaviorConfig;
    private velocities;
    private velocityEmitter;
    constructor(runtime: GameRuntime, config: PhysicsManagerConfig);
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
    getVelocity(playerId: string): number;
    /**
     * Get readonly access to all velocities (for debugging/UI)
     * Returns a readonly map of player IDs to their current velocities
     */
    getVelocities(): ReadonlyMap<string, number>;
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
    onVelocityChange(callback: (playerId: string, velocity: number) => void): () => void;
    /**
     * Add a physics behavior
     *
     * @param type - Behavior type ('platformer', 'topDown', 'racing', 'custom')
     * @param config - Behavior configuration
     */
    addBehavior(type: 'platformer', config?: PlatformerBehaviorConfig): void;
    addBehavior(type: 'topDown', config?: TopDownBehaviorConfig): void;
    addBehavior(type: 'racing', config?: RacingBehaviorConfig): void;
    addBehavior(type: 'custom', config: CustomBehaviorConfig): void;
    /**
     * Update physics for all sprites (call in scene.update())
     * Only runs on host.
     */
    update(): void;
    private applyPlatformerBehavior;
    private applyTopDownBehavior;
    private applyRacingBehavior;
}
//# sourceMappingURL=PhysicsManager.d.ts.map