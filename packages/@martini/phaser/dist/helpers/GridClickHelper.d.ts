/**
 * GridClickHelper - Robust grid/board click handling
 *
 * Solves the common problem of grid-based games where interactive rectangles
 * don't scale properly with the canvas. Uses pointer.worldX/worldY for
 * accurate coordinate-to-grid mapping that works in any scale mode.
 *
 * Perfect for: Connect Four, Chess, Tic-Tac-Toe, Minesweeper, Battleship,
 * Checkers, Go, Reversi, Sudoku, Bejeweled, etc.
 *
 * Usage:
 * ```ts
 * const gridHelper = adapter.createClickableGrid({
 *   columns: 7,
 *   rows: 6,
 *   cellWidth: 80,
 *   cellHeight: 80,
 *   offsetX: 100,
 *   offsetY: 100,
 *   onCellClick: (col, row) => {
 *     runtime.submitAction('dropToken', { col });
 *   },
 *   highlightColor: 0xffffff,
 *   highlightAlpha: 0.15
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';
export interface GridClickConfig {
    /** Number of columns in the grid */
    columns: number;
    /** Number of rows in the grid */
    rows: number;
    /** Width of each cell in pixels */
    cellWidth: number;
    /** Height of each cell in pixels */
    cellHeight: number;
    /** X offset of the grid's top-left corner (in world coordinates) */
    offsetX: number;
    /** Y offset of the grid's top-left corner (in world coordinates) */
    offsetY: number;
    /** Callback when a cell is clicked - receives (col, row) */
    onCellClick: (col: number, row: number) => void;
    /**
     * Optional: Validate if a cell can be clicked
     * Return true to allow click, false to block
     */
    canClick?: (col: number, row: number) => boolean;
    /**
     * Optional: Validate if a cell can be highlighted on hover
     * Return true to show highlight, false to hide
     */
    canHighlight?: (col: number, row: number) => boolean;
    /** Optional: Highlight color (default: 0xffffff) */
    highlightColor?: number;
    /** Optional: Highlight alpha (default: 0.15) */
    highlightAlpha?: number;
    /** Optional: Show cursor pointer on hover (default: true) */
    useHandCursor?: boolean;
    /**
     * Optional: Grid layout mode
     * - 'top-left': (0,0) is top-left corner (default for most grids)
     * - 'bottom-left': (0,0) is bottom-left corner (for Connect Four, platformers)
     */
    origin?: 'top-left' | 'bottom-left';
    /**
     * Optional: Cell click mode
     * - 'down': Fire on pointerdown (default, feels responsive)
     * - 'up': Fire on pointerup (better for drag operations)
     */
    clickMode?: 'down' | 'up';
    /**
     * Optional: Enable debug visualization
     * Shows grid lines and cell coordinates
     */
    debug?: boolean;
}
export declare class GridClickHelper {
    private config;
    private scene;
    private highlights;
    private debugGraphics?;
    private debugTexts;
    constructor(adapter: PhaserAdapter, scene: Phaser.Scene, config: GridClickConfig);
    /**
     * Create highlight rectangles for visual feedback
     */
    private setupHighlights;
    /**
     * Setup pointer event handlers using worldX/worldY for accurate mapping
     */
    private setupInputHandlers;
    /**
     * Convert pointer coordinates to grid cell
     * Uses worldX/worldY for accurate mapping in any scale mode
     */
    private pointerToCell;
    /**
     * Get highlight rectangle for a specific cell
     */
    private getHighlight;
    /**
     * Setup debug visualization (grid lines and coordinates)
     */
    private setupDebugVisualization;
    /**
     * Manually trigger a highlight (useful for showing valid moves, etc.)
     */
    showHighlight(col: number, row: number, alpha?: number): void;
    /**
     * Hide a specific cell's highlight
     */
    hideHighlight(col: number, row: number): void;
    /**
     * Hide all highlights
     */
    hideAllHighlights(): void;
    /**
     * Update highlight color for a specific cell
     */
    setHighlightColor(col: number, row: number, color: number): void;
    /**
     * Destroy the helper and clean up resources
     */
    destroy(): void;
}
/**
 * Factory function for creating a GridClickHelper
 * Called from PhaserAdapter.createClickableGrid()
 */
export declare function createClickableGrid(adapter: PhaserAdapter, scene: Phaser.Scene, config: GridClickConfig): GridClickHelper;
//# sourceMappingURL=GridClickHelper.d.ts.map