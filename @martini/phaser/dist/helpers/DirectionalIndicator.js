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
 * import { attachDirectionalIndicator } from '@martini-kit/phaser';
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
import { createSpriteAttachment } from './SpriteAttachment';
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
export function attachDirectionalIndicator(scene, sprite, config = {}) {
    const shape = config.shape ?? 'triangle';
    const offset = config.offset ?? 20;
    const color = config.color ?? 0xffffff;
    const size = config.size ?? 1.0;
    const autoUpdate = config.autoUpdate ?? true;
    let indicator;
    // Create the appropriate shape
    switch (shape) {
        case 'triangle': {
            // Triangle pointing UP (negative Y) in default orientation
            // We'll add π/2 rotation offset in update() to match Phaser's convention
            const triangle = scene.add.triangle(sprite.x, sprite.y, 0, -5, // Top point (tip)
            -4, 5, // Bottom left
            4, 5, // Bottom right
            color);
            triangle.setOrigin(0.5);
            if (config.depth !== undefined) {
                triangle.setDepth(config.depth);
            }
            indicator = triangle;
            break;
        }
        case 'arrow': {
            // Longer arrow with distinct head and tail
            const container = scene.add.container(sprite.x, sprite.y);
            // Arrow shaft (horizontal line)
            const shaft = scene.add.rectangle(-3 * size, 0, 10 * size, 2 * size, color);
            shaft.setOrigin(0.5);
            // Arrow head (triangle)
            const head = scene.add.triangle(5 * size, 0, 0, 0, // Point
            -3 * size, -3 * size, // Top
            -3 * size, 3 * size, // Bottom
            color);
            head.setOrigin(0.5);
            container.add([shaft, head]);
            if (config.depth !== undefined) {
                container.setDepth(config.depth);
            }
            indicator = container;
            break;
        }
        case 'chevron': {
            // V-shaped chevron
            const graphics = scene.add.graphics();
            graphics.lineStyle(2 * size, color);
            // Draw > shape (pointing right)
            graphics.beginPath();
            graphics.moveTo(-4 * size, -4 * size);
            graphics.lineTo(4 * size, 0);
            graphics.lineTo(-4 * size, 4 * size);
            graphics.strokePath();
            graphics.setPosition(sprite.x, sprite.y);
            if (config.depth !== undefined) {
                graphics.setDepth(config.depth);
            }
            indicator = graphics;
            break;
        }
    }
    // Update function - positions indicator in front of sprite
    const update = () => {
        // Calculate position in front of sprite (in the direction it's facing)
        const indicatorX = sprite.x + Math.cos(sprite.rotation) * offset;
        const indicatorY = sprite.y + Math.sin(sprite.rotation) * offset;
        indicator.setPosition?.(indicatorX, indicatorY);
        // Add π/2 rotation offset because:
        // - Triangle points UP (negative Y) at rotation 0
        // - Phaser's 0 rotation points RIGHT (positive X)
        // - So we need +90 degrees (π/2 radians) to align them
        indicator.setRotation?.(sprite.rotation + Math.PI / 2);
    };
    // Use generic SpriteAttachment system for lifecycle management
    return createSpriteAttachment(scene, sprite, {
        update,
        destroy: () => {
            indicator.destroy();
        },
        getGameObject: () => indicator
    }, { autoUpdate });
}
//# sourceMappingURL=DirectionalIndicator.js.map