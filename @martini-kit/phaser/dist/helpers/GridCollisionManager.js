/**
 * GridCollisionManager - Grid-based collision detection for smooth movement
 *
 * ⚠️ NOTE: This does NOT lock entities to grid cells like classic Bomberman.
 * It provides smooth pixel movement with grid-aligned collision checks.
 *
 * For true grid-locked movement (cell-to-cell committed movement), use
 * GridLockedMovementManager instead.
 *
 * Features:
 * - Smooth pixel-by-pixel movement
 * - Grid-aligned collision detection
 * - Supports diagonal movement with normalization
 * - Optional debug visualization
 *
 * ⚠️ COMMON MISTAKES:
 * ❌ Only checking blocks → Also check bombs, enemies, hazards
 * ❌ Creating in tick action → Create in scene.create() instead
 * ❌ Expecting grid-locking → Use GridLockedMovementManager for that
 *
 * ✅ CORRECT USAGE:
 * ```ts
 * // scene.create()
 * this.gridCollision = this.adapter.createGridCollisionManager({
 *   tileSize: 52,
 *   gridWidth: 13,
 *   gridHeight: 13,
 *   collisionCheck: createMultiCollisionCheck(
 *     { name: 'blocks', fn: (x, y) => hasBlock(state.blocks, x, y) },
 *     { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
 *   ),
 *   debug: false // Enable to see grid overlay
 * });
 *
 * // game.ts tick action
 * tick: createTickAction((state, delta) => {
 *   forEachPlayerInput(state, (player, input) => {
 *     this.gridCollision.moveEntity(player, input, delta);
 *   });
 * })
 * ```
 *
 * @see GridLockedMovementManager for Bomberman-style grid locking
 * @see createMultiCollisionCheck for combining multiple collision types
 */
export class GridCollisionManager {
    config;
    debugGraphics; // Phaser.GameObjects.Graphics
    adapter;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = {
            baseSpeed: 150,
            normalizeDiagonal: true,
            debug: false,
            debugColor: 0xff0000,
            ...config
        };
        // Setup debug visualization
        if (this.config.debug) {
            this.debugGraphics = adapter.getScene().add.graphics();
            this.renderDebugGrid();
        }
    }
    /**
     * Move an entity based on input
     * Handles collision detection and smooth movement
     *
     * @param entity - Entity with x, y, and optional speed multiplier
     * @param input - Input with up/down/left/right flags
     * @param delta - Time delta in milliseconds
     */
    moveEntity(entity, input, delta) {
        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        if (dx === 0 && dy === 0)
            return;
        // Calculate speed
        const speedMultiplier = entity.speed ?? 1.0;
        let speed = this.config.baseSpeed * speedMultiplier * (delta / 1000);
        // Normalize diagonal movement
        if (this.config.normalizeDiagonal && dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            speed /= length;
        }
        // Calculate next position
        const nextX = entity.x + dx * speed;
        const nextY = entity.y + dy * speed;
        // Check collision at next position
        const gridPos = this.worldToGrid(nextX, nextY);
        const hasCollision = this.config.collisionCheck(gridPos.gridX, gridPos.gridY);
        // Check bounds
        const worldSize = {
            width: this.config.gridWidth * this.config.tileSize,
            height: this.config.gridHeight * this.config.tileSize
        };
        const outOfBounds = nextX < 0 ||
            nextX >= worldSize.width ||
            nextY < 0 ||
            nextY >= worldSize.height;
        // Update position if valid
        if (!hasCollision && !outOfBounds) {
            entity.x = nextX;
            entity.y = nextY;
        }
        // Update debug visualization
        if (this.config.debug && this.debugGraphics) {
            this.updateDebugVisualization(entity, hasCollision ? gridPos : null);
        }
    }
    /**
     * Convert world position to grid coordinates
     *
     * @param x - World X position in pixels
     * @param y - World Y position in pixels
     * @returns Grid coordinates and alignment status
     */
    worldToGrid(x, y) {
        const gridX = Math.floor(x / this.config.tileSize);
        const gridY = Math.floor(y / this.config.tileSize);
        // Check if position is aligned to grid (within threshold)
        const threshold = this.config.tileSize * 0.1;
        const offsetX = Math.abs(x - (gridX * this.config.tileSize + this.config.tileSize / 2));
        const offsetY = Math.abs(y - (gridY * this.config.tileSize + this.config.tileSize / 2));
        const isAligned = offsetX < threshold && offsetY < threshold;
        return { gridX, gridY, isAligned };
    }
    /**
     * Convert grid coordinates to world position (center of cell)
     *
     * @param gridX - Grid X coordinate
     * @param gridY - Grid Y coordinate
     * @returns World position in pixels (center of cell)
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.config.tileSize + this.config.tileSize / 2,
            y: gridY * this.config.tileSize + this.config.tileSize / 2
        };
    }
    /**
     * Snap an entity to the nearest grid cell center
     *
     * @param entity - Entity to snap
     */
    snapToGrid(entity) {
        const gridPos = this.worldToGrid(entity.x, entity.y);
        const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
        entity.x = worldPos.x;
        entity.y = worldPos.y;
    }
    /**
     * Check if a grid cell is walkable (not blocked)
     *
     * @param gridX - Grid X coordinate
     * @param gridY - Grid Y coordinate
     * @returns True if cell is walkable
     */
    isWalkable(gridX, gridY) {
        // Check bounds
        if (gridX < 0 || gridX >= this.config.gridWidth)
            return false;
        if (gridY < 0 || gridY >= this.config.gridHeight)
            return false;
        // Check collision
        return !this.config.collisionCheck(gridX, gridY);
    }
    /**
     * Get the current grid cell of an entity
     *
     * @param entity - Entity with x, y position
     * @returns Grid position with alignment status
     */
    getEntityGridPosition(entity) {
        return this.worldToGrid(entity.x, entity.y);
    }
    /**
     * Render debug grid overlay
     */
    renderDebugGrid() {
        if (!this.debugGraphics)
            return;
        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(1, this.config.debugColor, 0.2);
        // Draw grid lines
        const worldWidth = this.config.gridWidth * this.config.tileSize;
        const worldHeight = this.config.gridHeight * this.config.tileSize;
        for (let i = 0; i <= this.config.gridWidth; i++) {
            const x = i * this.config.tileSize;
            this.debugGraphics.lineBetween(x, 0, x, worldHeight);
        }
        for (let i = 0; i <= this.config.gridHeight; i++) {
            const y = i * this.config.tileSize;
            this.debugGraphics.lineBetween(0, y, worldWidth, y);
        }
    }
    /**
     * Update debug visualization
     */
    updateDebugVisualization(entity, blockedCell) {
        if (!this.debugGraphics)
            return;
        this.renderDebugGrid();
        // Show entity position
        this.debugGraphics.fillStyle(0x00ff00, 0.8);
        this.debugGraphics.fillCircle(entity.x, entity.y, 4);
        // Highlight current cell
        const gridPos = this.worldToGrid(entity.x, entity.y);
        const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
        this.debugGraphics.lineStyle(2, 0x00ff00, 0.6);
        this.debugGraphics.strokeRect(worldPos.x - this.config.tileSize / 2, worldPos.y - this.config.tileSize / 2, this.config.tileSize, this.config.tileSize);
        // Highlight blocked cell if collision detected
        if (blockedCell) {
            const blockedWorld = this.gridToWorld(blockedCell.gridX, blockedCell.gridY);
            this.debugGraphics.fillStyle(this.config.debugColor, 0.4);
            this.debugGraphics.fillRect(blockedWorld.x - this.config.tileSize / 2, blockedWorld.y - this.config.tileSize / 2, this.config.tileSize, this.config.tileSize);
        }
    }
    /**
     * Cleanup debug graphics
     */
    destroy() {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = undefined;
        }
    }
}
/** @deprecated Use GridCollisionManager instead */
export const GridMovementManager = GridCollisionManager;
/**
 * Factory function for creating a GridCollisionManager
 * Called from PhaserAdapter.createGridCollisionManager()
 */
export function createGridCollisionManager(adapter, config) {
    return new GridCollisionManager(adapter, config);
}
// Backward compatibility
/** @deprecated Use createGridCollisionManager instead */
export const createGridMovementManager = createGridCollisionManager;
//# sourceMappingURL=GridCollisionManager.js.map