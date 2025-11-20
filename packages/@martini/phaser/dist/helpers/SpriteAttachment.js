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
 * import { createSpriteAttachment, SpriteAttachment } from '@martini/phaser';
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
export function createSpriteAttachment(scene, sprite, attachment, config = {}) {
    const autoUpdate = config.autoUpdate ?? true;
    // Track destruction state to prevent double-destroy
    let isDestroyed = false;
    // Wrap the original destroy to track state
    const originalDestroy = attachment.destroy;
    const wrappedDestroy = () => {
        if (isDestroyed)
            return;
        isDestroyed = true;
        // Remove event listener if auto-update is enabled
        if (updateHandler) {
            scene.events.off('update', updateHandler);
            updateHandler = null;
        }
        // Call original destroy
        originalDestroy();
    };
    // Auto-update setup
    let updateHandler = null;
    if (autoUpdate) {
        // Initial update
        attachment.update();
        // Create update handler
        updateHandler = () => {
            if (!isDestroyed) {
                attachment.update();
            }
        };
        // Subscribe to scene update event
        scene.events.on('update', updateHandler);
        // Cleanup when sprite is destroyed
        if (sprite.once) {
            sprite.once('destroy', () => {
                wrappedDestroy();
            });
        }
        // Cleanup when scene shuts down
        scene.events.once('shutdown', () => {
            if (updateHandler) {
                scene.events.off('update', updateHandler);
                updateHandler = null;
            }
        });
    }
    else {
        // Manual mode - just do initial update
        attachment.update();
    }
    // Return wrapped attachment
    return {
        update: attachment.update,
        destroy: wrappedDestroy,
        getGameObject: attachment.getGameObject
    };
}
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
export function createSpriteAttachments(scene, sprite, attachments, config = {}) {
    return attachments.map((attachment) => createSpriteAttachment(scene, sprite, attachment, config));
}
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
export function createCompositeAttachment(scene, sprite, children, config = {}) {
    // Create wrapped versions of all children with autoUpdate disabled
    // (the composite will handle updates)
    const wrappedChildren = children.map((child) => createSpriteAttachment(scene, sprite, child, { autoUpdate: false }));
    // Create composite that updates/destroys all children
    return createSpriteAttachment(scene, sprite, {
        update: () => {
            for (const child of wrappedChildren) {
                child.update();
            }
        },
        destroy: () => {
            for (const child of wrappedChildren) {
                child.destroy();
            }
        },
        getGameObject: () => {
            // Return first child's game object (if any)
            return wrappedChildren[0]?.getGameObject?.() ?? null;
        }
    }, config);
}
//# sourceMappingURL=SpriteAttachment.js.map