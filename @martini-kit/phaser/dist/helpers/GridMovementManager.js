/**
 * GridMovementManager - Grid-based keyboard movement helper
 *
 * Solves the common pattern in grid-based games (Bomberman, Pacman, Snake, Sokoban)
 * where entities move with keyboard input but must snap to grid cells.
 *
 * Features:
 * - Smooth pixel movement with grid-aligned collision
 * - Automatic grid snapping for object placement
 * - Configurable collision checking
 * - Handles diagonal movement normalization
 *
 * Usage:
 * ```ts
 * const gridMovement = adapter.createGridMovementManager({
 *   tileSize: 52,
 *   gridWidth: 13,
 *   gridHeight: 13,
 *   collisionCheck: (x, y) => state.blocks.some(b => b.x === x && b.y === y)
 * });
 *
 * // In tick action:
 * tick: createTickAction((state, delta) => {
 *   for (const [playerId, player] of Object.entries(state.players)) {
 *     const input = state.inputs[playerId];
 *     if (!input) continue;
 *     gridMovement.moveEntity(player, input, delta);
 *   }
 * })
 * ```
 */
export class GridMovementManager {
    config;
    constructor(adapter, config) {
        this.config = {
            baseSpeed: 150,
            normalizeDiagonal: true,
            ...config
        };
    }
    /**
     * Move an entity based on input
     * Handles collision detection and grid alignment
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
}
/**
 * Factory function for creating a GridMovementManager
 * Called from PhaserAdapter.createGridMovementManager()
 */
export function createGridMovementManager(adapter, config) {
    return new GridMovementManager(adapter, config);
}
//# sourceMappingURL=GridMovementManager.js.map