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
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface GridCollisionConfig {
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
     *
     * ⚠️ Remember to check ALL obstacle types: blocks, bombs, enemies, etc.
     * Consider using createMultiCollisionCheck() helper.
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
    /**
     * Enable debug visualization (default: false)
     * Shows grid lines, collision cells, entity positions
     */
    debug?: boolean;
    /**
     * Debug color (default: 0xff0000 red)
     */
    debugColor?: number;
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
export declare class GridCollisionManager {
    private config;
    private debugGraphics?;
    private adapter;
    constructor(adapter: PhaserAdapter, config: GridCollisionConfig);
    /**
     * Move an entity based on input
     * Handles collision detection and smooth movement
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
    /**
     * Render debug grid overlay
     */
    private renderDebugGrid;
    /**
     * Update debug visualization
     */
    private updateDebugVisualization;
    /**
     * Cleanup debug graphics
     */
    destroy(): void;
}
/** @deprecated Use GridCollisionConfig instead */
export type GridMovementConfig = GridCollisionConfig;
/** @deprecated Use GridCollisionManager instead */
export declare const GridMovementManager: typeof GridCollisionManager;
/**
 * Factory function for creating a GridCollisionManager
 * Called from PhaserAdapter.createGridCollisionManager()
 */
export declare function createGridCollisionManager(adapter: PhaserAdapter, config: GridCollisionConfig): GridCollisionManager;
/** @deprecated Use createGridCollisionManager instead */
export declare const createGridMovementManager: typeof createGridCollisionManager;
//# sourceMappingURL=GridCollisionManager.d.ts.map