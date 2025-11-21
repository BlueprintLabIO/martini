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
export class GridClickHelper {
    config;
    scene;
    highlights = [];
    debugGraphics;
    debugTexts = [];
    constructor(adapter, scene, config) {
        this.scene = scene;
        // Fill in defaults
        this.config = {
            ...config,
            canClick: config.canClick ?? (() => true),
            canHighlight: config.canHighlight ?? (() => true),
            highlightColor: config.highlightColor ?? 0xffffff,
            highlightAlpha: config.highlightAlpha ?? 0.15,
            useHandCursor: config.useHandCursor ?? true,
            origin: config.origin ?? 'top-left',
            clickMode: config.clickMode ?? 'down',
            debug: config.debug ?? false
        };
        this.setupHighlights();
        this.setupInputHandlers();
        if (this.config.debug) {
            this.setupDebugVisualization();
        }
    }
    /**
     * Create highlight rectangles for visual feedback
     */
    setupHighlights() {
        const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, highlightColor, origin } = this.config;
        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const x = offsetX + col * cellWidth + cellWidth / 2;
                // Handle different origin modes
                const y = origin === 'bottom-left'
                    ? offsetY + (rows - 1 - row) * cellHeight + cellHeight / 2
                    : offsetY + row * cellHeight + cellHeight / 2;
                const highlight = this.scene.add.rectangle(x, y, cellWidth, cellHeight, highlightColor, 0 // Start invisible
                );
                // Store index for easy lookup
                highlight.gridCol = col;
                highlight.gridRow = row;
                this.highlights.push(highlight);
            }
        }
    }
    /**
     * Setup pointer event handlers using worldX/worldY for accurate mapping
     */
    setupInputHandlers() {
        const { useHandCursor, clickMode } = this.config;
        // Handle pointer move for hover highlights
        this.scene.input.on('pointermove', (pointer) => {
            const cell = this.pointerToCell(pointer);
            // Hide all highlights
            this.highlights.forEach(h => h.setAlpha(0));
            // Show highlight for hovered cell if valid
            if (cell && this.config.canHighlight(cell.col, cell.row)) {
                const highlight = this.getHighlight(cell.col, cell.row);
                if (highlight) {
                    highlight.setAlpha(this.config.highlightAlpha);
                }
            }
            // Update cursor
            if (useHandCursor) {
                const canClick = cell && this.config.canClick(cell.col, cell.row);
                this.scene.input.setDefaultCursor(canClick ? 'pointer' : 'default');
            }
        });
        // Handle clicks
        const eventName = clickMode === 'down' ? 'pointerdown' : 'pointerup';
        this.scene.input.on(eventName, (pointer) => {
            const cell = this.pointerToCell(pointer);
            if (cell && this.config.canClick(cell.col, cell.row)) {
                this.config.onCellClick(cell.col, cell.row);
                // Flash the highlight for feedback
                const highlight = this.getHighlight(cell.col, cell.row);
                if (highlight) {
                    this.scene.tweens.add({
                        targets: highlight,
                        alpha: this.config.highlightAlpha * 2,
                        duration: 100,
                        yoyo: true
                    });
                }
            }
        });
        // Reset cursor when pointer leaves
        this.scene.input.on('pointerout', () => {
            this.highlights.forEach(h => h.setAlpha(0));
            if (useHandCursor) {
                this.scene.input.setDefaultCursor('default');
            }
        });
    }
    /**
     * Convert pointer coordinates to grid cell
     * Uses worldX/worldY for accurate mapping in any scale mode
     */
    pointerToCell(pointer) {
        const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, origin } = this.config;
        // Use worldX/worldY to account for camera transforms and scaling
        const col = Math.floor((pointer.worldX - offsetX) / cellWidth);
        const rowFromTop = Math.floor((pointer.worldY - offsetY) / cellHeight);
        // Convert to grid coordinates based on origin
        const row = origin === 'bottom-left' ? rows - 1 - rowFromTop : rowFromTop;
        // Validate bounds
        if (col < 0 || col >= columns || row < 0 || row >= rows) {
            return null;
        }
        return { col, row };
    }
    /**
     * Get highlight rectangle for a specific cell
     */
    getHighlight(col, row) {
        return this.highlights.find(h => h.gridCol === col && h.gridRow === row);
    }
    /**
     * Setup debug visualization (grid lines and coordinates)
     */
    setupDebugVisualization() {
        const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, origin } = this.config;
        // Draw grid lines
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.lineStyle(1, 0xff00ff, 0.5);
        // Vertical lines
        for (let col = 0; col <= columns; col++) {
            const x = offsetX + col * cellWidth;
            this.debugGraphics.lineBetween(x, offsetY, x, offsetY + rows * cellHeight);
        }
        // Horizontal lines
        for (let row = 0; row <= rows; row++) {
            const y = offsetY + row * cellHeight;
            this.debugGraphics.lineBetween(offsetX, y, offsetX + columns * cellWidth, y);
        }
        // Draw cell coordinates
        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const x = offsetX + col * cellWidth + 5;
                // Handle different origin modes
                const y = origin === 'bottom-left'
                    ? offsetY + (rows - 1 - row) * cellHeight + 5
                    : offsetY + row * cellHeight + 5;
                const text = this.scene.add.text(x, y, `${col},${row}`, {
                    fontSize: '10px',
                    color: '#ff00ff',
                    backgroundColor: '#000000'
                });
                this.debugTexts.push(text);
            }
        }
    }
    /**
     * Manually trigger a highlight (useful for showing valid moves, etc.)
     */
    showHighlight(col, row, alpha) {
        const highlight = this.getHighlight(col, row);
        if (highlight) {
            highlight.setAlpha(alpha ?? this.config.highlightAlpha);
        }
    }
    /**
     * Hide a specific cell's highlight
     */
    hideHighlight(col, row) {
        const highlight = this.getHighlight(col, row);
        if (highlight) {
            highlight.setAlpha(0);
        }
    }
    /**
     * Hide all highlights
     */
    hideAllHighlights() {
        this.highlights.forEach(h => h.setAlpha(0));
    }
    /**
     * Update highlight color for a specific cell
     */
    setHighlightColor(col, row, color) {
        const highlight = this.getHighlight(col, row);
        if (highlight) {
            highlight.setFillStyle(color);
        }
    }
    /**
     * Destroy the helper and clean up resources
     */
    destroy() {
        this.highlights.forEach(h => h.destroy());
        this.debugGraphics?.destroy();
        this.debugTexts.forEach(t => t.destroy());
        this.highlights = [];
        this.debugTexts = [];
        // Remove input listeners
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointerup');
        this.scene.input.off('pointerout');
    }
}
/**
 * Factory function for creating a GridClickHelper
 * Called from PhaserAdapter.createClickableGrid()
 */
export function createClickableGrid(adapter, scene, config) {
    return new GridClickHelper(adapter, scene, config);
}
//# sourceMappingURL=GridClickHelper.js.map