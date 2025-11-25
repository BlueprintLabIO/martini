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
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface GridMovementConfig {
    /**
     * Size of each grid cell in pixels
     */
    tileSize: number;
    /**
     * Width of the grid in cells
     */
    gridWidth: number;
    /**
     * Height of the grid in cells
     */
    gridHeight: number;
    /**
     * Collision check function
     * Returns true if there's a blocking obstacle at (gridX, gridY)
     */
    collisionCheck: (gridX: number, gridY: number) => boolean;
    /**
     * Base movement speed in pixels per second (default: 150)
     */
    baseSpeed?: number;
    /**
     * Normalize diagonal movement (default: true)
     * When true, diagonal movement is same speed as cardinal
     */
    normalizeDiagonal?: boolean;
}
export interface GridEntity {
    x: number;
    y: number;
    speed?: number;
    [key: string]: any;
}
export interface MovementInput {
    up?: boolean;
    down?: boolean;
    left?: boolean;
    right?: boolean;
    [key: string]: any;
}
export interface GridPosition {
    gridX: number;
    gridY: number;
    isAligned: boolean;
}
export declare class GridMovementManager {
    private config;
    constructor(adapter: PhaserAdapter, config: GridMovementConfig);
    /**
     * Move an entity based on input
     * Handles collision detection and grid alignment
     *
     * @param entity - Entity with x, y, and optional speed multiplier
     * @param input - Input with up/down/left/right flags
     * @param delta - Time delta in milliseconds
     */
    moveEntity(entity: GridEntity, input: MovementInput, delta: number): void;
    /**
     * Convert world position to grid coordinates
     *
     * @param x - World X position in pixels
     * @param y - World Y position in pixels
     * @returns Grid coordinates and alignment status
     */
    worldToGrid(x: number, y: number): GridPosition;
    /**
     * Convert grid coordinates to world position (center of cell)
     *
     * @param gridX - Grid X coordinate
     * @param gridY - Grid Y coordinate
     * @returns World position in pixels (center of cell)
     */
    gridToWorld(gridX: number, gridY: number): {
        x: number;
        y: number;
    };
    /**
     * Snap an entity to the nearest grid cell center
     *
     * @param entity - Entity to snap
     */
    snapToGrid(entity: GridEntity): void;
    /**
     * Check if a grid cell is walkable (not blocked)
     *
     * @param gridX - Grid X coordinate
     * @param gridY - Grid Y coordinate
     * @returns True if cell is walkable
     */
    isWalkable(gridX: number, gridY: number): boolean;
    /**
     * Get the current grid cell of an entity
     *
     * @param entity - Entity with x, y position
     * @returns Grid position with alignment status
     */
    getEntityGridPosition(entity: GridEntity): GridPosition;
}
/**
 * Factory function for creating a GridMovementManager
 * Called from PhaserAdapter.createGridMovementManager()
 */
export declare function createGridMovementManager(adapter: PhaserAdapter, config: GridMovementConfig): GridMovementManager;
//# sourceMappingURL=GridMovementManager.d.ts.map