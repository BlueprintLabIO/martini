/**
 * SpriteAttachment - Generic system for attaching auto-updating components to sprites
 *
 * This is the foundation for all sprite attachments (arrows, health bars, name tags, etc.)
 * It provides a unified "pit of success" pattern with automatic updates and cleanup.
 *
 * ## Why Use SpriteAttachment?
 *
 * - **Auto-update by default** - No manual update() calls needed
 * - **Auto-cleanup** - Destroys when sprite/scene is destroyed
 * - **Type-safe** - Full TypeScript support
 * - **Reusable** - One pattern for all attachment types
 * - **Efficient** - Uses Phaser's event system
 *
 * ## Creating Custom Attachments
 *
 * @example Basic attachment
 * ```ts
 * import { createSpriteAttachment, SpriteAttachment } from '@martini-kit/phaser';
 *
 * function createCustomIndicator(
 *   scene: Phaser.Scene,
 *   sprite: any
 * ): SpriteAttachment {
 *   const circle = scene.add.circle(sprite.x, sprite.y, 10, 0xff0000);
 *
 *   return createSpriteAttachment(scene, sprite, {
 *     update: () => {
 *       // Follow the sprite
 *       circle.setPosition(sprite.x, sprite.y + 30);
 *     },
 *     destroy: () => {
 *       circle.destroy();
 *     }
 *   });
 * }
 * ```
 *
 * @example With manual update mode
 * ```ts
 * const attachment = createSpriteAttachment(scene, sprite, {
 *   update: () => { ... },
 *   destroy: () => { ... },
 *   autoUpdate: false  // Disable auto-update
 * });
 *
 * // Then in your scene's update loop:
 * attachment.update();
 * ```
 */
import type Phaser from 'phaser';
/**
 * Core interface for sprite attachments
 *
 * Any component that follows the sprite (arrows, health bars, name tags, etc.)
 * should implement this interface.
 */
export interface SpriteAttachment {
    /**
     * Update the attachment's position, rotation, or other properties
     * based on the parent sprite's current state.
     *
     * Called automatically every frame if autoUpdate is enabled.
     */
    update: () => void;
    /**
     * Clean up resources and destroy the attachment.
     *
     * Called automatically when sprite/scene is destroyed if autoUpdate is enabled.
     */
    destroy: () => void;
    /**
     * Get the underlying Phaser game object (if any)
     *
     * Optional - only needed if the attachment has a visual representation
     */
    getGameObject?: () => Phaser.GameObjects.GameObject | null;
}
/**
 * Configuration for sprite attachment auto-update behavior
 */
export interface SpriteAttachmentConfig {
    /**
     * Automatically update the attachment every frame
     *
     * When true (default), the attachment subscribes to the scene's update event
     * and automatically calls update() each frame.
     *
     * When false, you must manually call attachment.update() in your scene loop.
     *
     * @default true
     */
    autoUpdate?: boolean;
}
/**
 * Create a sprite attachment with automatic updates and cleanup
 *
 * This is the foundation function used by all attachment helpers
 * (attachDirectionalIndicator, createHealthBar, createNameTag, etc.)
 *
 * **Automatic Lifecycle Management:**
 * - Calls `update()` every frame via scene events (if autoUpdate: true)
 * - Calls `destroy()` when sprite is destroyed
 * - Calls `destroy()` when scene shuts down
 * - Prevents double-destroy and memory leaks
 *
 * @param scene - Phaser scene
 * @param sprite - Sprite to attach to
 * @param attachment - Attachment implementation (update + destroy)
 * @param config - Auto-update configuration
 * @returns Enhanced attachment with lifecycle management
 *
 * @example Creating a simple follower circle
 * ```ts
 * const circle = scene.add.circle(sprite.x, sprite.y, 10, 0xff0000);
 *
 * const attachment = createSpriteAttachment(scene, sprite, {
 *   update: () => {
 *     circle.setPosition(sprite.x + 20, sprite.y);
 *   },
 *   destroy: () => {
 *     circle.destroy();
 *   }
 * });
 * // That's it! Circle auto-follows sprite and auto-cleans up
 * ```
 */
export declare function createSpriteAttachment(scene: Phaser.Scene, sprite: any, attachment: SpriteAttachment, config?: SpriteAttachmentConfig): SpriteAttachment;
/**
 * Helper to create multiple attachments at once
 *
 * Useful when you want to attach several components to the same sprite
 * (e.g., arrow + health bar + name tag).
 *
 * @example
 * ```ts
 * createSpriteAttachments(scene, sprite, [
 *   createDirectionalArrow(scene, sprite),
 *   createHealthBar(scene, sprite, { maxHealth: 100 }),
 *   createNameTag(scene, sprite, { text: 'Player 1' })
 * ]);
 * ```
 */
export declare function createSpriteAttachments(scene: Phaser.Scene, sprite: any, attachments: SpriteAttachment[], config?: SpriteAttachmentConfig): SpriteAttachment[];
/**
 * Composite attachment that manages multiple child attachments
 *
 * Useful for complex attachments that have multiple visual components.
 *
 * @example
 * ```ts
 * const composite = createCompositeAttachment(scene, sprite, [
 *   { update: () => updateArrow(), destroy: () => arrow.destroy() },
 *   { update: () => updateGlow(), destroy: () => glow.destroy() }
 * ]);
 * // All children auto-update and auto-destroy together
 * ```
 */
export declare function createCompositeAttachment(scene: Phaser.Scene, sprite: any, children: SpriteAttachment[], config?: SpriteAttachmentConfig): SpriteAttachment;
//# sourceMappingURL=SpriteAttachment.d.ts.map