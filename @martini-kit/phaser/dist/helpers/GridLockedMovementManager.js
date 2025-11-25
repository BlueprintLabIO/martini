/**
 * GridLockedMovementManager - True grid-locked movement for Bomberman-style games
 *
 * This helper provides CELL-TO-CELL committed movement where:
 * - Entities align to grid cell centers
 * - Movement commits to one full cell at a time
 * - Direction can only change when aligned to a cell
 * - Smooth animation interpolates between cells
 *
 * ⚠️ NOTE: This is different from GridCollisionManager:
 * - GridLockedMovementManager: Cell-locked movement (Bomberman classic, Pacman, Sokoban)
 * - GridCollisionManager: Smooth movement with grid collision (Zelda, modern Bomberman)
 *
 * ✅ CORRECT USAGE:
 * ```ts
 * // In scene.create()
 * this.gridLocked = this.adapter.createGridLockedMovementManager({
 *   tileSize: 52,
 *   gridWidth: 13,
 *   gridHeight: 13,
 *   collisionCheck: createMultiCollisionCheck(
 *     { name: 'blocks', fn: (x, y) => hasBlock(x, y) },
 *     { name: 'bombs', fn: (x, y) => hasBomb(x, y) }
 *   )
 * });
 *
 * // In tick action:
 * tick: createTickAction((state, delta) => {
 *   for (const [playerId, player] of Object.entries(state.players)) {
 *     const input = state.inputs[playerId];
 *     if (!input) continue;
 *     this.gridLocked.moveEntity(player, input, delta);
 *   }
 * })
 * ```
 *
 * @see GridCollisionManager for smooth movement with grid-aligned collision
 */
export class GridLockedMovementManager {
    config;
    debugGraphics; // Phaser.GameObjects.Graphics
    adapter;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = {
            baseSpeed: 3.0,
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
     * Move an entity with grid-locked behavior
     *
     * The entity will:
     * 1. Continue moving to targetCell if already in motion
     * 2. Accept new direction input only when aligned to a cell
     * 3. Smoothly interpolate position between cells
     *
     * @param entity - Entity with grid position state
     * @param input - Input with up/down/left/right flags
     * @param delta - Time delta in milliseconds
     */
    moveEntity(entity, input, delta) {
        // Initialize entity grid state if needed
        if (!entity.currentCell) {
            const gridPos = this.worldToGrid(entity.x, entity.y);
            entity.currentCell = { x: gridPos.gridX, y: gridPos.gridY };
            entity.targetCell = null;
            entity.moveProgress = 0;
        }
        const speedMultiplier = entity.speed ?? 1.0;
        const cellsPerSecond = this.config.baseSpeed * speedMultiplier;
        const progressDelta = (cellsPerSecond * delta) / 1000;
        // If currently moving, continue to target
        if (entity.targetCell && entity.moveProgress !== undefined) {
            entity.moveProgress += progressDelta;
            if (entity.moveProgress >= 1.0) {
                // Reached target cell - snap to center
                entity.currentCell = { ...entity.targetCell };
                entity.targetCell = null;
                entity.moveProgress = 0;
                // Update world position to exact cell center
                const worldPos = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
                entity.x = worldPos.x;
                entity.y = worldPos.y;
            }
            else {
                // Interpolate position
                const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
                const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
                entity.x = this.lerp(currentWorld.x, targetWorld.x, entity.moveProgress);
                entity.y = this.lerp(currentWorld.y, targetWorld.y, entity.moveProgress);
            }
        }
        else {
            // Aligned to cell - can start new move
            const direction = this.getDirection(input);
            if (direction.dx !== 0 || direction.dy !== 0) {
                const nextCell = {
                    x: entity.currentCell.x + direction.dx,
                    y: entity.currentCell.y + direction.dy
                };
                // Check if next cell is walkable
                if (this.isWalkable(nextCell.x, nextCell.y)) {
                    entity.targetCell = nextCell;
                    entity.moveProgress = 0;
                }
            }
        }
        // Update debug visualization
        if (this.config.debug && this.debugGraphics) {
            this.updateDebugVisualization(entity);
        }
    }
    /**
     * Snap entity to nearest grid cell center
     */
    snapToGrid(entity) {
        const gridPos = this.worldToGrid(entity.x, entity.y);
        const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
        entity.x = worldPos.x;
        entity.y = worldPos.y;
        entity.currentCell = { x: gridPos.gridX, y: gridPos.gridY };
        entity.targetCell = null;
        entity.moveProgress = 0;
    }
    /**
     * Check if entity is aligned to a grid cell
     */
    isAligned(entity) {
        return !entity.targetCell && entity.moveProgress === 0;
    }
    /**
     * Get entity's current grid position
     */
    getGridPosition(entity) {
        if (entity.currentCell) {
            return { ...entity.currentCell };
        }
        const gridPos = this.worldToGrid(entity.x, entity.y);
        return { x: gridPos.gridX, y: gridPos.gridY };
    }
    /**
     * Convert world coordinates to grid coordinates
     */
    worldToGrid(x, y) {
        const gridX = Math.floor(x / this.config.tileSize);
        const gridY = Math.floor(y / this.config.tileSize);
        // Check if position is aligned to cell center
        const centerX = gridX * this.config.tileSize + this.config.tileSize / 2;
        const centerY = gridY * this.config.tileSize + this.config.tileSize / 2;
        const threshold = this.config.tileSize * 0.1;
        const isAligned = Math.abs(x - centerX) < threshold && Math.abs(y - centerY) < threshold;
        return { gridX, gridY, isAligned };
    }
    /**
     * Convert grid coordinates to world position (center of cell)
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.config.tileSize + this.config.tileSize / 2,
            y: gridY * this.config.tileSize + this.config.tileSize / 2
        };
    }
    /**
     * Check if a grid cell is walkable
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
     * Extract direction from input
     */
    getDirection(input) {
        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        // Grid-locked movement doesn't allow diagonal - pick strongest direction
        if (dx !== 0 && dy !== 0) {
            // Prioritize the most recent input (could be enhanced with input buffering)
            // For now, prioritize horizontal
            return { dx, dy: 0 };
        }
        return { dx, dy };
    }
    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    }
    /**
     * Render debug grid overlay
     */
    renderDebugGrid() {
        if (!this.debugGraphics)
            return;
        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(1, this.config.debugColor, 0.3);
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
     * Update debug visualization for an entity
     */
    updateDebugVisualization(entity) {
        if (!this.debugGraphics)
            return;
        this.renderDebugGrid();
        // Highlight current cell
        if (entity.currentCell) {
            const worldPos = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
            this.debugGraphics.fillStyle(this.config.debugColor, 0.2);
            this.debugGraphics.fillRect(worldPos.x - this.config.tileSize / 2, worldPos.y - this.config.tileSize / 2, this.config.tileSize, this.config.tileSize);
        }
        // Highlight target cell
        if (entity.targetCell) {
            const worldPos = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
            this.debugGraphics.fillStyle(this.config.debugColor, 0.4);
            this.debugGraphics.fillRect(worldPos.x - this.config.tileSize / 2, worldPos.y - this.config.tileSize / 2, this.config.tileSize, this.config.tileSize);
            // Draw arrow from current to target
            if (entity.currentCell) {
                const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
                const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
                this.debugGraphics.lineStyle(2, this.config.debugColor, 0.8);
                this.debugGraphics.lineBetween(currentWorld.x, currentWorld.y, targetWorld.x, targetWorld.y);
            }
        }
        // Show entity position
        this.debugGraphics.fillStyle(0xffffff, 1.0);
        this.debugGraphics.fillCircle(entity.x, entity.y, 3);
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
/**
 * Factory function for creating a GridLockedMovementManager
 * Called from PhaserAdapter.createGridLockedMovementManager()
 */
export function createGridLockedMovementManager(adapter, config) {
    return new GridLockedMovementManager(adapter, config);
}
//# sourceMappingURL=GridLockedMovementManager.js.map