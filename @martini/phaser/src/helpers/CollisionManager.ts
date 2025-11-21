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
  a: string | SpriteManager | any; // Phaser.Physics.Arcade.Group or sprite
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

export class CollisionManager {
  private adapter: PhaserAdapter;
  private scene: any; // Phaser.Scene
  private config: CollisionManagerConfig;
  private rules: CollisionRule[] = [];
  private colliders: any[] = []; // Phaser.Physics.Arcade.Collider instances
  private namedSprites: Map<string, any> = new Map(); // key -> sprite
  private spriteToColliders: WeakMap<any, Set<any>> = new WeakMap(); // sprite -> Set of colliders

  constructor(adapter: PhaserAdapter, scene: any, config?: CollisionManagerConfig) {
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
  registerSprite(key: string, sprite: any): void {
    this.namedSprites.set(key, sprite);
    // Re-apply all rules to create colliders for this newly registered sprite
    for (const rule of this.rules) {
      this.applyRule(rule);
    }
  }

  /**
   * Unregister a sprite by name
   */
  unregisterSprite(key: string): void {
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
  addCollision(
    a: string | SpriteManager | any,
    b: string | SpriteManager | any,
    options?: {
      onCollide?: (obj1: any, obj2: any) => void;
    }
  ): void {
    const rule: CollisionRule = {
      a,
      b,
      handler: options?.onCollide
    };

    this.rules.push(rule);

    // Apply rule immediately
    // Note: If either side is a SpriteManager, resolveToObjects() will return
    // the manager's Phaser Group, which automatically handles all sprites
    // (both current and future) without needing lifecycle hooks
    this.applyRule(rule);
  }

  /**
   * Remove collision rule
   */
  removeCollision(a: string | SpriteManager | any, b: string | SpriteManager | any): void {
    const ruleIndex = this.rules.findIndex(r =>
      (r.a === a && r.b === b) || (r.a === b && r.b === a)
    );

    if (ruleIndex !== -1) {
      this.rules.splice(ruleIndex, 1);
      // Note: We don't remove existing colliders, just stop creating new ones
    }
  }

  /**
   * Cleanup all colliders
   */
  destroy(): void {
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
   * Apply a single collision rule (create colliders)
   */
  private applyRule(rule: CollisionRule): void {
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
   * Resolve a rule target to an array of Phaser objects
   */
  private resolveToObjects(target: string | SpriteManager | any): any[] {
    if (typeof target === 'string') {
      // It's a named sprite
      const sprite = this.namedSprites.get(target);
      return sprite ? [sprite] : [];
    }

    if (this.isSpriteManager(target)) {
      // It's a SpriteManager - return its Phaser Group
      // The group automatically handles all sprites (early and late-joining)
      return [(target as SpriteManager).group];
    }

    // It's a raw Phaser object (sprite or group)
    return [target];
  }

  /**
   * Check if target is a SpriteManager
   */
  private isSpriteManager(target: any): boolean {
    return target && typeof target === 'object' && 'getAll' in target && 'add' in target;
  }

  /**
   * Check if a collider already exists between two objects
   */
  private hasCollider(objA: any, objB: any): boolean {
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
  private trackCollider(sprite: any, collider: any): void {
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
  private removeCollidersForSprite(sprite: any): void {
    const colliders = this.spriteToColliders.get(sprite);
    if (!colliders) return;

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
