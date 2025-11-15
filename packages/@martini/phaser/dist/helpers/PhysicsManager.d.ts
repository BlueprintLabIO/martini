/**
 * PhysicsManager - Automates physics behavior based on inputs
 *
 * Eliminates manual physics loops by automatically reading inputs from state
 * and applying pre-defined or custom physics behaviors.
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
export interface CustomBehaviorConfig {
    apply: (sprite: any, input: any, body: Phaser.Physics.Arcade.Body) => void;
}
export type BehaviorConfig = PlatformerBehaviorConfig | TopDownBehaviorConfig | CustomBehaviorConfig;
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
    constructor(runtime: GameRuntime, config: PhysicsManagerConfig);
    /**
     * Add a physics behavior
     *
     * @param type - Behavior type ('platformer', 'topDown', 'custom')
     * @param config - Behavior configuration
     */
    addBehavior(type: 'platformer', config?: PlatformerBehaviorConfig): void;
    addBehavior(type: 'topDown', config?: TopDownBehaviorConfig): void;
    addBehavior(type: 'custom', config: CustomBehaviorConfig): void;
    /**
     * Update physics for all sprites (call in scene.update())
     * Only runs on host.
     */
    update(): void;
    private applyPlatformerBehavior;
    private applyTopDownBehavior;
}
//# sourceMappingURL=PhysicsManager.d.ts.map