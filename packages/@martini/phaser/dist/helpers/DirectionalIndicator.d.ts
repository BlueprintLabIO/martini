/**
 * DirectionalIndicator - Arrow/indicator that shows sprite direction
 *
 * Automatically handles Phaser's rotation convention (0 = right/+X axis)
 * so you don't have to think about rotation offsets.
 *
 * ## Phaser Rotation Convention
 *
 * Phaser uses a coordinate system where:
 * - 0 radians = pointing RIGHT (positive X axis)
 * - π/2 radians = pointing DOWN (positive Y axis)
 * - π radians = pointing LEFT (negative X axis)
 * - -π/2 radians = pointing UP (negative Y axis)
 *
 * This helper automatically adds a +π/2 offset to triangle/arrow shapes
 * (which naturally point UP) so they align with the sprite's rotation.
 *
 * ## Auto-Update (Pit of Success!)
 *
 * By default, indicators automatically update every frame via scene events.
 * **No manual update() calls needed!** Just attach and forget.
 *
 * @example Automatic updates (recommended - default behavior)
 * ```ts
 * import { attachDirectionalIndicator } from '@martini/phaser';
 *
 * // In SpriteManager onCreate or onAdd:
 * onCreate: (key, data) => {
 *   const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);
 *
 *   // That's it! Arrow auto-updates every frame
 *   attachDirectionalIndicator(this, car, {
 *     shape: 'triangle',
 *     offset: 20,
 *     color: 0xffffff
 *     // autoUpdate: true is the default
 *   });
 *
 *   return car;
 * }
 * ```
 *
 * @example Manual updates (if you need fine control)
 * ```ts
 * onCreate: (key, data) => {
 *   const car = this.add.rectangle(data.x, data.y, 30, 20, data.color);
 *
 *   car.directionArrow = attachDirectionalIndicator(this, car, {
 *     shape: 'triangle',
 *     offset: 20,
 *     color: 0xffffff,
 *     autoUpdate: false  // Disable auto-update
 *   });
 *
 *   return car;
 * },
 *
 * // Then in your scene's update loop:
 * update() {
 *   for (const [, sprite] of this.spriteManager.getAll()) {
 *     sprite.directionArrow?.update();
 *   }
 * }
 * ```
 */
import type Phaser from 'phaser';
import { type SpriteAttachment } from './SpriteAttachment';
export interface DirectionalIndicatorConfig {
    /**
     * Shape of the indicator
     * - 'triangle': Classic arrow shape (default)
     * - 'arrow': Longer arrow with tail
     * - 'chevron': V-shaped chevron
     */
    shape?: 'triangle' | 'arrow' | 'chevron';
    /**
     * Distance from sprite center
     * Default: 20
     */
    offset?: number;
    /**
     * Indicator color
     * Default: 0xffffff (white)
     */
    color?: number;
    /**
     * Indicator size/scale
     * Default: 1.0
     */
    size?: number;
    /**
     * Z-depth for layering
     */
    depth?: number;
    /**
     * Automatically update the indicator every frame
     *
     * When true (default), the indicator subscribes to the scene's update event
     * and automatically follows the sprite's position/rotation each frame.
     * No manual update() calls needed!
     *
     * When false, you must manually call indicator.update() in your scene loop.
     *
     * @default true
     */
    autoUpdate?: boolean;
}
export interface DirectionalIndicator extends SpriteAttachment {
    /**
     * Get the underlying Phaser game object
     *
     * @override Always defined for DirectionalIndicator (not optional)
     */
    getGameObject: () => Phaser.GameObjects.GameObject;
}
/**
 * Attach a directional indicator to a sprite
 *
 * Automatically handles Phaser's rotation convention where:
 * - 0 radians = pointing right (+X axis)
 * - Math.PI/2 = pointing down (+Y axis)
 * - Math.PI = pointing left (-X axis)
 * - -Math.PI/2 = pointing up (-Y axis)
 *
 * By default (autoUpdate: true), the indicator automatically updates every frame.
 * No manual update() calls needed - it "just works"!
 *
 * @param scene - Phaser scene
 * @param sprite - Sprite to attach indicator to
 * @param config - Indicator configuration
 * @returns DirectionalIndicator instance
 */
export declare function attachDirectionalIndicator(scene: Phaser.Scene, sprite: any, config?: DirectionalIndicatorConfig): DirectionalIndicator;
//# sourceMappingURL=DirectionalIndicator.d.ts.map