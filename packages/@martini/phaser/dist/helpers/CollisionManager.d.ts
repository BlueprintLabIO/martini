/**
 * CollisionManager - Declarative collision rule system
 *
 * Eliminates "forgot to add collider for late-joining player" bugs by:
 * - Declaring collision rules ONCE
 * - Auto-applying rules to all sprites (early and late-joining)
 * - Supporting sprites, SpriteManagers, and Phaser groups
 *
 * Usage:
 * ```ts
 * const collisionManager = adapter.createCollisionManager();
 *
 * // Register a ball sprite
 * collisionManager.registerSprite('ball', this.ball);
 *
 * // Declare collision rules ONCE
 * collisionManager.addCollision('ball', this.spriteManager);
 * // ☝️ Automatically adds colliders for all current AND future paddles!
 *
 * // With custom handler
 * collisionManager.addCollision(this.bulletGroup, this.enemyGroup, {
 *   onCollide: (bullet, enemy) => {
 *     enemy.takeDamage(bullet.damage);
 *     bullet.destroy();
 *   }
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { SpriteManager } from './SpriteManager.js';
export interface CollisionRule {
    a: string | SpriteManager | any;
    b: string | SpriteManager | any;
    handler?: (objA: any, objB: any) => void;
}
export interface CollisionManagerConfig {
    /**
     * Optional: Global collision handler
     * Called for all collisions if no specific handler provided
     */
    onCollide?: (obj1: any, obj2: any) => void;
}
export declare class CollisionManager {
    private adapter;
    private scene;
    private config;
    private rules;
    private colliders;
    private namedSprites;
    private spriteToColliders;
    constructor(adapter: PhaserAdapter, scene: any, config?: CollisionManagerConfig);
    /**
     * Register a sprite by name (for string-based collision rules)
     *
     * @example
     * ```ts
     * collisionManager.registerSprite('ball', this.ball);
     * collisionManager.addCollision('ball', paddleManager);
     * ```
     */
    registerSprite(key: string, sprite: any): void;
    /**
     * Unregister a sprite by name
     */
    unregisterSprite(key: string): void;
    /**
     * Add collision between sprites/groups/managers
     *
     * Supports:
     * - String keys (via registerSprite)
     * - SpriteManager instances (auto-syncs with new sprites)
     * - Phaser sprites or groups
     */
    addCollision(a: string | SpriteManager | any, b: string | SpriteManager | any, options?: {
        onCollide?: (obj1: any, obj2: any) => void;
    }): void;
    /**
     * Remove collision rule
     */
    removeCollision(a: string | SpriteManager | any, b: string | SpriteManager | any): void;
    /**
     * Cleanup all colliders
     */
    destroy(): void;
    /**
     * Apply a single collision rule (create colliders)
     */
    private applyRule;
    /**
     * Resolve a rule target to an array of Phaser objects
     */
    private resolveToObjects;
    /**
     * Check if target is a SpriteManager
     */
    private isSpriteManager;
    /**
     * Check if a collider already exists between two objects
     */
    private hasCollider;
    /**
     * Track that a collider belongs to a sprite
     */
    private trackCollider;
    /**
     * Remove all colliders associated with a sprite
     */
    private removeCollidersForSprite;
}
//# sourceMappingURL=CollisionManager.d.ts.map