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
export class CollisionManager {
    adapter;
    scene; // Phaser.Scene
    config;
    rules = [];
    colliders = []; // Phaser.Physics.Arcade.Collider instances
    namedSprites = new Map(); // key -> sprite
    spriteToColliders = new WeakMap(); // sprite -> Set of colliders
    constructor(adapter, scene, config) {
        this.adapter = adapter;
        this.scene = scene;
        this.config = config || {};
    }
    /**
     * Register a sprite by name (for string-based collision rules)
     *
     * @example
     * ```ts
     * collisionManager.registerSprite('ball', this.ball);
     * collisionManager.addCollision('ball', paddleManager);
     * ```
     */
    registerSprite(key, sprite) {
        this.namedSprites.set(key, sprite);
        this.reapplyRules();
    }
    /**
     * Unregister a sprite by name
     */
    unregisterSprite(key) {
        const sprite = this.namedSprites.get(key);
        if (sprite) {
            this.removeCollidersForSprite(sprite);
        }
        this.namedSprites.delete(key);
    }
    /**
     * Add collision between sprites/groups/managers
     *
     * Supports:
     * - String keys (via registerSprite)
     * - SpriteManager instances (auto-syncs with new sprites)
     * - Phaser sprites or groups
     */
    addCollision(a, b, options) {
        const rule = {
            a,
            b,
            handler: options?.onCollide
        };
        this.rules.push(rule);
        // If either side is a SpriteManager, install onAdd hooks
        if (this.isSpriteManager(a)) {
            this.hookSpriteManager(a);
        }
        if (this.isSpriteManager(b)) {
            this.hookSpriteManager(b);
        }
        // Apply rule immediately for existing sprites
        this.applyRule(rule);
    }
    /**
     * Remove collision rule
     */
    removeCollision(a, b) {
        const ruleIndex = this.rules.findIndex(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
        if (ruleIndex !== -1) {
            this.rules.splice(ruleIndex, 1);
            // Note: We don't remove existing colliders, just stop creating new ones
        }
    }
    /**
     * Cleanup all colliders
     */
    destroy() {
        for (const collider of this.colliders) {
            if (collider && collider.destroy) {
                collider.destroy();
            }
        }
        this.colliders.length = 0;
        this.rules.length = 0;
        this.namedSprites.clear();
    }
    /**
     * Install onAdd hook on a SpriteManager to re-apply rules when sprites are added
     */
    hookSpriteManager(manager) {
        // Check if already hooked
        if (manager._collisionManagerHooked) {
            return;
        }
        manager._collisionManagerHooked = true;
        // Store original config
        const originalConfig = manager.config;
        const originalOnAdd = originalConfig.onAdd;
        // Wrap onAdd to re-apply collision rules
        originalConfig.onAdd = (sprite, key, data, context) => {
            // Call original onAdd if it exists
            if (originalOnAdd) {
                originalOnAdd(sprite, key, data, context);
            }
            // Re-apply all collision rules involving this manager
            this.reapplyRules();
        };
    }
    /**
     * Apply a single collision rule (create colliders)
     */
    applyRule(rule) {
        const objectsA = this.resolveToObjects(rule.a);
        const objectsB = this.resolveToObjects(rule.b);
        if (objectsA.length === 0 || objectsB.length === 0) {
            // One or both sides have no objects yet
            return;
        }
        const handler = rule.handler || this.config.onCollide;
        // Create colliders for each combination
        for (const objA of objectsA) {
            for (const objB of objectsB) {
                // Skip if collider already exists
                if (this.hasCollider(objA, objB)) {
                    continue;
                }
                // Create the collider
                const collider = this.scene.physics.add.collider(objA, objB, handler);
                this.colliders.push(collider);
                // Track colliders per sprite
                this.trackCollider(objA, collider);
                this.trackCollider(objB, collider);
            }
        }
    }
    /**
     * Re-apply all collision rules (called when sprites are added)
     */
    reapplyRules() {
        for (const rule of this.rules) {
            this.applyRule(rule);
        }
    }
    /**
     * Resolve a rule target to an array of Phaser objects
     */
    resolveToObjects(target) {
        if (typeof target === 'string') {
            // It's a named sprite
            const sprite = this.namedSprites.get(target);
            return sprite ? [sprite] : [];
        }
        if (this.isSpriteManager(target)) {
            // It's a SpriteManager - get all sprites
            const sprites = Array.from(target.getAll().values());
            return sprites;
        }
        // It's a raw Phaser object (sprite or group)
        return [target];
    }
    /**
     * Check if target is a SpriteManager
     */
    isSpriteManager(target) {
        return target && typeof target === 'object' && 'getAll' in target && 'add' in target;
    }
    /**
     * Check if a collider already exists between two objects
     */
    hasCollider(objA, objB) {
        const collidersA = this.spriteToColliders.get(objA);
        const collidersB = this.spriteToColliders.get(objB);
        if (!collidersA || !collidersB) {
            return false;
        }
        // Check if any collider is shared
        for (const collider of collidersA) {
            if (collidersB.has(collider)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Track that a collider belongs to a sprite
     */
    trackCollider(sprite, collider) {
        let colliders = this.spriteToColliders.get(sprite);
        if (!colliders) {
            colliders = new Set();
            this.spriteToColliders.set(sprite, colliders);
        }
        colliders.add(collider);
    }
    /**
     * Remove all colliders associated with a sprite
     */
    removeCollidersForSprite(sprite) {
        const colliders = this.spriteToColliders.get(sprite);
        if (!colliders)
            return;
        for (const collider of colliders) {
            if (collider && collider.destroy) {
                collider.destroy();
            }
            const index = this.colliders.indexOf(collider);
            if (index !== -1) {
                this.colliders.splice(index, 1);
            }
        }
        this.spriteToColliders.delete(sprite);
    }
}
//# sourceMappingURL=CollisionManager.js.map