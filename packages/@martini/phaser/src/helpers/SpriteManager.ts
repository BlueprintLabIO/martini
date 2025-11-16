/**
 * SpriteManager - Automatic sprite synchronization helper
 *
 * Handles all the complexity of host/client sprite management:
 * - Host: Creates sprites, enables physics, tracks for sync
 * - Client: Creates visual sprites, registers for interpolation
 * - Automatic cleanup when sprites are removed
 *
 * Usage:
 * ```ts
 * const spriteManager = adapter.createSpriteManager({
 *   onCreate: (key, data) => {
 *     const sprite = this.add.sprite(data.x, data.y, 'player');
 *     if (this.adapter.isHost()) {
 *       this.physics.add.existing(sprite);
 *     }
 *     return sprite;
 *   }
 * });
 *
 * // Add sprites (works on both host and client)
 * spriteManager.add('player-1', { x: 100, y: 100 });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';

export interface SpriteData {
  x: number;
  y: number;
  [key: string]: any; // Allow custom properties
}

export interface SpriteManagerConfig<TData extends SpriteData = SpriteData> {
  /**
   * Factory function to create a sprite
   * Called on both host and client
   *
   * @example
   * ```ts
   * onCreate: (key, data) => {
   *   return this.add.sprite(data.x, data.y, 'player');
   * }
   * ```
   */
  onCreate: (key: string, data: TData) => any;

  /**
   * Optional: Setup physics (HOST ONLY - automatic)
   * Use this to add physics, colliders, and other host-authoritative logic
   * Framework automatically ensures this ONLY runs on host
   *
   * @example
   * ```ts
   * onCreatePhysics: (sprite, key, data) => {
   *   this.physics.add.existing(sprite);
   *   sprite.body.setCollideWorldBounds(true);
   *   sprite.body.setBounce(0.2);
   *   this.physics.add.collider(sprite, this.platforms);
   * }
   * ```
   */
  onCreatePhysics?: (sprite: any, key: string, data: TData) => void;

  /**
   * Optional: Update sprite properties when data changes (client only)
   * Useful for syncing non-position properties like color, scale, etc.
   */
  onUpdate?: (sprite: any, data: TData) => void;

  /**
   * Optional: Cleanup when sprite is removed
   */
  onDestroy?: (sprite: any, key: string) => void;

  /**
   * Optional: Keys from the initial data object to sync exactly once
   * Useful for metadata like player roles that should be available on clients.
   */
  staticProperties?: (keyof TData & string)[];

  /**
   * Properties to sync (default: x, y, rotation, alpha)
   */
  syncProperties?: string[];

  /**
   * Sync interval in ms (default: 50ms / 20 FPS)
   */
  syncInterval?: number;

  /**
   * Optional label configuration. When provided, SpriteManager renders labels above sprites.
   */
  label?: {
    getText: (data: TData) => string;
    offset?: { x?: number; y?: number };
    style?: Phaser.Types.GameObjects.Text.TextStyle;
  };
}

export class SpriteManager<TData extends SpriteData = SpriteData> {
  private sprites = new Map<string, any>();
  private spriteData = new Map<string, TData>();
  private labels = new Map<
    string,
    { text: Phaser.GameObjects.Text; offset?: { x?: number; y?: number } }
  >();
  private config: SpriteManagerConfig<TData>;
  private adapter: PhaserAdapter;
  private unsubscribe?: () => void;

  constructor(adapter: PhaserAdapter, config: SpriteManagerConfig<TData>) {
    this.adapter = adapter;
    this.config = config;

    // If client, listen for sprite data from state
    if (!adapter.isHost()) {
      this.unsubscribe = adapter.onChange((state: any) => {
        this.syncFromState(state);
      });
    }
  }

  /**
   * Add a sprite (call this on HOST only)
   * The sprite will automatically sync to clients
   */
  add(key: string, data: TData): any {
    if (!this.adapter.isHost()) {
      console.warn('[SpriteManager] add() should only be called on host. Use state sync on clients.');
      return null;
    }

    // Don't recreate if already exists
    if (this.sprites.has(key)) {
      return this.sprites.get(key);
    }

    // Create sprite
    const sprite = this.config.onCreate(key, data);
    this.sprites.set(key, sprite);
    this.spriteData.set(key, data);
    this.createLabel(key, data, sprite);

    // Setup physics (HOST ONLY - automatic)
    if (this.config.onCreatePhysics) {
      this.config.onCreatePhysics(sprite, key, data);
    }

    if (this.config.staticProperties?.length) {
      const staticData: Partial<TData> = {};
      for (const prop of this.config.staticProperties) {
        if (prop in data) {
          staticData[prop] = data[prop];
        }
      }
      if (Object.keys(staticData).length > 0) {
        this.adapter.setSpriteStaticData(key, staticData);
      }
    }

    // Track for automatic sync (host only)
    this.adapter.trackSprite(sprite, key, {
      properties: this.config.syncProperties || ['x', 'y', 'rotation', 'alpha'],
      syncInterval: this.config.syncInterval
    });

    return sprite;
  }

  /**
   * Remove a sprite
   */
  remove(key: string): void {
    const sprite = this.sprites.get(key);
    if (!sprite) return;

    // Cleanup callback
    this.config.onDestroy?.(sprite, key);

    // Destroy sprite
    if (sprite.destroy) {
      sprite.destroy();
    }
    const label = this.labels.get(key);
    if (label) {
      label.text.destroy();
      this.labels.delete(key);
    }
    this.spriteData.delete(key);

    // Stop tracking
    if (this.adapter.isHost()) {
      this.adapter.untrackSprite(key);
    } else {
      this.adapter.unregisterRemoteSprite(key);
    }

    this.sprites.delete(key);
  }

  /**
   * Get a sprite by key
   */
  get(key: string): any {
    return this.sprites.get(key);
  }

  /**
   * Get all sprites
   */
  getAll(): Map<string, any> {
    return this.sprites;
  }

  /**
   * Update loop (call this in scene.update() for smooth interpolation on clients)
   */
  update(): void {
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
    this.updateLabels();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Remove all sprites
    for (const key of this.sprites.keys()) {
      this.remove(key);
    }

    // Unsubscribe from state changes
    this.unsubscribe?.();
  }

  /**
   * CLIENT ONLY: Sync sprites from state
   */
  private syncFromState(state: any): void {
    const spriteNamespace = (this.adapter as any).spriteNamespace || '_sprites';
    const spriteData = state[spriteNamespace];

    if (!spriteData) return;

    // Create/update sprites based on state
    for (const [key, data] of Object.entries(spriteData) as [string, any][]) {
      if (!this.sprites.has(key)) {
        // Create new sprite
        const sprite = this.config.onCreate(key, data as TData);
        this.sprites.set(key, sprite);
        this.spriteData.set(key, data as TData);
        this.adapter.registerRemoteSprite(key, sprite);
        this.createLabel(key, data as TData, sprite);
      } else {
        // Update existing sprite (optional)
        if (this.config.onUpdate) {
          const sprite = this.sprites.get(key);
          this.config.onUpdate(sprite, data as TData);
        }
        this.spriteData.set(key, data as TData);
      }

      this.updateLabelText(key);
      this.updateLabelPosition(key);
    }

    // Remove sprites that no longer exist in state
    for (const key of this.sprites.keys()) {
      if (!(key in spriteData)) {
        this.remove(key);
      }
    }
  }

  private createLabel(key: string, data: TData, sprite: any): void {
    const labelConfig = this.config.label;
    if (!labelConfig) return;

    const scene = this.adapter.getScene();
    if (!scene?.add?.text) return;

    const textValue = labelConfig.getText(data);
    const style = labelConfig.style || { fontSize: '12px', color: '#ffffff' };
    const label = scene.add.text(sprite.x, sprite.y, textValue, style).setOrigin(0.5);
    this.labels.set(key, { text: label, offset: labelConfig.offset });
  }

  private updateLabels(): void {
    for (const key of this.labels.keys()) {
      this.updateLabelText(key);
      this.updateLabelPosition(key);
    }
  }

  private updateLabelText(key: string): void {
    const labelConfig = this.config.label;
    if (!labelConfig) return;
    const labelEntry = this.labels.get(key);
    if (!labelEntry) return;
    const data = this.spriteData.get(key);
    if (!data) return;

    const next = labelConfig.getText(data);
    if (labelEntry.text.text !== next) {
      labelEntry.text.setText(next);
    }
  }

  private updateLabelPosition(key: string): void {
    const labelEntry = this.labels.get(key);
    if (!labelEntry) return;
    const sprite = this.sprites.get(key);
    if (!sprite) return;

    const offsetX = labelEntry.offset?.x ?? 0;
    const offsetY = labelEntry.offset?.y ?? -20;
    labelEntry.text.setPosition(sprite.x + offsetX, sprite.y + offsetY);
  }
}
