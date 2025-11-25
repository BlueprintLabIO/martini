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
import type { PhaserAdapter } from '../PhaserAdapter.js';
export interface GridLockedMovementConfig {
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
     * Base movement speed in cells per second (default: 3.0)
     * Higher = faster movement between cells
     */
    baseSpeed?: number;
    /**
     * Enable debug visualization (default: false)
     * Shows grid lines, current cell, target cell, progress
     */
    debug?: boolean;
    /**
     * Debug visualization color (default: 0xff0000)
     */
    debugColor?: number;
}
export interface GridLockedEntity {
    /** Current grid X position (cell coordinate) */
    currentCell?: {
        x: number;
        y: number;
    };
    /** Target grid position when moving */
    targetCell?: {
        x: number;
        y: number;
    } | null;
    /** Movement progress 0-1 between current and target */
    moveProgress?: number;
    /** Actual world position (pixels) for rendering */
    x: number;
    y: number;
    /** Speed multiplier (default: 1.0) */
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
export declare class GridLockedMovementManager {
    private config;
    private debugGraphics?;
    private adapter;
    constructor(adapter: PhaserAdapter, config: GridLockedMovementConfig);
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
    moveEntity(entity: GridLockedEntity, input: MovementInput, delta: number): void;
    /**
     * Snap entity to nearest grid cell center
     */
    snapToGrid(entity: GridLockedEntity): void;
    /**
     * Check if entity is aligned to a grid cell
     */
    isAligned(entity: GridLockedEntity): boolean;
    /**
     * Get entity's current grid position
     */
    getGridPosition(entity: GridLockedEntity): {
        x: number;
        y: number;
    };
    /**
     * Convert world coordinates to grid coordinates
     */
    worldToGrid(x: number, y: number): {
        gridX: number;
        gridY: number;
        isAligned: boolean;
    };
    /**
     * Convert grid coordinates to world position (center of cell)
     */
    gridToWorld(gridX: number, gridY: number): {
        x: number;
        y: number;
    };
    /**
     * Check if a grid cell is walkable
     */
    private isWalkable;
    /**
     * Extract direction from input
     */
    private getDirection;
    /**
     * Linear interpolation
     */
    private lerp;
    /**
     * Render debug grid overlay
     */
    private renderDebugGrid;
    /**
     * Update debug visualization for an entity
     */
    private updateDebugVisualization;
    /**
     * Cleanup debug graphics
     */
    destroy(): void;
}
/**
 * Factory function for creating a GridLockedMovementManager
 * Called from PhaserAdapter.createGridLockedMovementManager()
 */
export declare function createGridLockedMovementManager(adapter: PhaserAdapter, config: GridLockedMovementConfig): GridLockedMovementManager;
//# sourceMappingURL=GridLockedMovementManager.d.ts.map