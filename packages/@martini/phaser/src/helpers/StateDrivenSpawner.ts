/**
 * StateDrivenSpawner - Automatic sprite spawning from state collections
 *
 * Eliminates the manual "check for new players/bullets" loop in every demo.
 * Watches a state collection (e.g., state.players, state.bullets) and automatically
 * creates/removes sprites as the collection changes.
 *
 * **NEW: Optional position syncing!** Enable `syncProperties` to make sprites
 * automatically follow state changes. Perfect for bullets and non-physics entities.
 *
 * Usage:
 * ```ts
 * // Players with PhysicsManager (NO syncProperties - physics controls position)
 * const playerSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'players',
 *   spriteManager: this.spriteManager,
 *   keyPrefix: 'player-'
 * });
 *
 * // Bullets with automatic movement (PIT OF SUCCESS!)
 * const bulletSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'bullets',
 *   spriteManager: this.bulletManager,
 *   keyPrefix: 'bullet-',
 *   keyField: 'id',
 *   syncProperties: ['x', 'y'] // Sprites auto-follow state!
 * });
 *
 * // In your update loop, just mutate state:
 * bullet.x += bullet.velocityX * deltaSeconds;  // Sprite follows automatically!
 * bullet.y += bullet.velocityY * deltaSeconds;
 * ```
 *
 * This automatically:
 * - Creates sprites when new entries appear in state
 * - **Syncs sprite properties from state (opt-in via syncProperties)**
 * - Removes sprites when entries are deleted
 * - Works on both HOST (initial + late joins) and CLIENT (state sync)
 * - Handles arrays (bullets) and objects (players)
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { SpriteManager } from './SpriteManager.js';

export interface StateDrivenSpawnerConfig {
  /**
   * Path to the collection in state (e.g., 'players', 'bullets', 'powerUps')
   */
  stateKey: string;

  /**
   * The SpriteManager to spawn sprites into
   */
  spriteManager: SpriteManager;

  /**
   * Optional prefix for sprite keys (e.g., 'player-' → 'player-abc123')
   */
  keyPrefix?: string;

  /**
   * For array collections, which field to use as the unique key
   * (e.g., 'id' for bullets)
   * If not provided, assumes state collection is an object and uses its keys
   */
  keyField?: string;

  /**
   * Optional filter function - only spawn if this returns true
   * @example
   * ```ts
   * filter: (data) => data.isAlive // Only spawn living entities
   * ```
   */
  filter?: (data: any) => boolean;

  /**
   * Properties to sync from state to sprites on every update
   * **OPT-IN**: Only syncs if you explicitly provide this array
   *
   * **PIT OF SUCCESS:** This eliminates the "forgot to move the sprite" footgun!
   * Just mutate state.bullets[i].x/y and the sprites automatically follow.
   *
   * **When to use:**
   * - ✅ Bullets/projectiles (state-driven position)
   * - ✅ Non-physics entities (UI elements, indicators)
   * - ❌ Players with PhysicsManager (physics body controls position)
   *
   * @example
   * ```ts
   * // Bullets that move based on state position
   * syncProperties: ['x', 'y', 'rotation']
   *
   * // Players use physics - don't sync position!
   * // (omit syncProperties entirely)
   * ```
   */
  syncProperties?: string[];

  /**
   * Custom update function for more complex sprite syncing
   * If provided, this takes precedence over syncProperties
   *
   * @example
   * ```ts
   * onUpdateSprite: (sprite, data) => {
   *   sprite.x = data.x;
   *   sprite.y = data.y;
   *   sprite.setAlpha(data.health / 100);
   * }
   * ```
   */
  onUpdateSprite?: (sprite: any, data: any) => void;
}

export class StateDrivenSpawner {
  private config: StateDrivenSpawnerConfig;
  private adapter: PhaserAdapter;
  private trackedKeys = new Set<string>();
  private unsubscribe?: () => void;

  constructor(adapter: PhaserAdapter, config: StateDrivenSpawnerConfig) {
    this.adapter = adapter;
    this.config = config;

    // HOST: Poll state every update to spawn new entries
    // CLIENT: React to state changes via onChange
    if (adapter.isHost()) {
      // Host checks state directly (no onChange subscription needed)
      // Just need to call update() from scene
    } else {
      // Client subscribes to state changes
      this.unsubscribe = adapter.onChange((state: any) => {
        this.syncFromState(state);
      });
    }
  }

  /**
   * Call this in scene.update() (HOST ONLY)
   * Checks for new entries in the state collection and spawns sprites
   */
  update(): void {
    if (!this.adapter.isHost()) {
      return; // Client uses onChange subscription instead
    }

    const state = this.adapter.getState();
    this.syncFromState(state);
  }

  /**
   * Manually trigger a sync (useful for initial spawn in create())
   */
  sync(): void {
    const state = this.adapter.getState();
    this.syncFromState(state);
  }

  /**
   * Core sync logic - creates/removes sprites based on state
   */
  private syncFromState(state: any): void {
    const collection = state[this.config.stateKey];
    if (!collection) return;

    const currentKeys = new Set<string>();

    // Determine if collection is array or object
    const isArray = Array.isArray(collection);

    // Extract entries
    const entries: Array<[string, any]> = isArray
      ? collection.map((item: any) => {
          const key = this.config.keyField ? item[this.config.keyField] : item.id;
          return [String(key), item];
        })
      : Object.entries(collection);

    // Create/update sprites for entries
    for (const [rawKey, data] of entries) {
      // Apply filter if provided
      if (this.config.filter && !this.config.filter(data)) {
        continue;
      }

      const spriteKey = this.config.keyPrefix ? `${this.config.keyPrefix}${rawKey}` : rawKey;
      currentKeys.add(spriteKey);

      // If sprite already exists, update its properties
      if (this.trackedKeys.has(spriteKey)) {
        this.updateSpriteFromState(spriteKey, data);
        continue;
      }

      // Create sprite (only on HOST - SpriteManager handles client sync)
      if (this.adapter.isHost()) {
        this.config.spriteManager.add(spriteKey, data);
        this.trackedKeys.add(spriteKey);
      } else {
        // On client, just track that we've seen it (SpriteManager creates it via state sync)
        this.trackedKeys.add(spriteKey);
      }
    }

    // Remove sprites that no longer exist in state
    for (const spriteKey of this.trackedKeys) {
      if (!currentKeys.has(spriteKey)) {
        this.config.spriteManager.remove(spriteKey);
        this.trackedKeys.delete(spriteKey);
      }
    }
  }

  /**
   * Update sprite properties from state data
   * Only runs on HOST (clients get updates via SpriteManager sync)
   */
  private updateSpriteFromState(spriteKey: string, data: any): void {
    // Only update on host - clients rely on SpriteManager's automatic sync
    if (!this.adapter.isHost()) {
      return;
    }

    const sprite = this.config.spriteManager.get(spriteKey);
    if (!sprite) return;

    // Custom update function takes precedence
    if (this.config.onUpdateSprite) {
      this.config.onUpdateSprite(sprite, data);
      return;
    }

    // Sync properties (opt-in only - no default!)
    if (this.config.syncProperties) {
      for (const prop of this.config.syncProperties) {
        if (prop in data && sprite[prop] !== undefined) {
          sprite[prop] = data[prop];
        }
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.unsubscribe?.();
  }
}
