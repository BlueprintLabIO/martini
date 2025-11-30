---
title: GridClickHelper
description: Robust grid/board click handling for turn-based and board games
---

# GridClickHelper

The `GridClickHelper` provides robust grid and board click handling that works correctly in any Phaser scale mode. It solves the common problem where interactive rectangles don't scale properly with the canvas, especially in scaled/resized containers like the IDE preview.

## The Problem

When building grid-based games (Connect Four, Chess, Tic-Tac-Toe, etc.), a common approach is to create interactive rectangles for each cell:

```typescript
// ❌ BROKEN: Interactive rectangles don't scale properly
const highlight = this.add.rectangle(x, y, 80, 80, 0xffffff, 0);
highlight.setInteractive({ useHandCursor: true });
highlight.on('pointerdown', () => {
  // Click handler
});
```

**Why this breaks:**
- When Phaser uses `Scale.FIT` mode, the canvas scales but interactive hitboxes don't scale proportionally
- In narrow containers (dual-preview mode), columns misalign and only certain areas register clicks
- Rectangle hitboxes are DOM-based, not canvas-based, causing coordinate drift

## The Solution

`GridClickHelper` uses `pointer.worldX/worldY` for direct coordinate-to-grid mapping, eliminating interactive rectangle hitboxes entirely:

```typescript
// ✅ WORKS: Direct coordinate mapping with worldX/worldY
const gridHelper = adapter.createClickableGrid({
  columns: 7,
  rows: 6,
  cellWidth: 80,
  cellHeight: 80,
  offsetX: 100,
  offsetY: 100,
  onCellClick: (col, row) => {
    runtime.submitAction('dropToken', { col });
  }
});
```

## Basic Usage

### Connect Four Example

```typescript
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
import Phaser from 'phaser';

const COLS = 7;
const ROWS = 6;
const CELL_SIZE = 80;
const BOARD_X = 100;
const BOARD_Y = 100;

export function createScene(runtime: GameRuntime) {
  return class ConnectFourScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private gridHelper: any;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Create clickable grid
      this.gridHelper = this.adapter.createClickableGrid({
        columns: COLS,
        rows: ROWS,
        cellWidth: CELL_SIZE,
        cellHeight: CELL_SIZE,
        offsetX: BOARD_X,
        offsetY: BOARD_Y,
        origin: 'bottom-left', // Row 0 is bottom (gravity!)
        highlightColor: 0xffffff,
        highlightAlpha: 0.15,

        // Handle clicks
        onCellClick: (col, row) => {
          runtime.submitAction('dropToken', { col });
        },

        // Validate if cell can be clicked
        canClick: (col, row) => {
          const state = runtime.getState();
          if (state.gameOver) return false;

          // Check if it's this player's turn
          const playerIds = Object.keys(state.players);
          const currentPlayerId = playerIds[state.currentTurn];
          if (currentPlayerId !== this.adapter.getMyPlayerId()) return false;

          // Check if column is not full
          return state.grid[col][ROWS - 1] === null;
        },

        // Validate if cell can show highlight
        canHighlight: (col, row) => {
          const state = runtime.getState();
          return !state.gameOver && state.grid[col][ROWS - 1] === null;
        }
      });
    }
  };
}
```

### Chess/Checkers Example

```typescript
this.gridHelper = this.adapter.createClickableGrid({
  columns: 8,
  rows: 8,
  cellWidth: 64,
  cellHeight: 64,
  offsetX: 100,
  offsetY: 100,
  origin: 'top-left', // Row 0 is top (standard board orientation)
  highlightColor: 0x44ff44,
  highlightAlpha: 0.3,

  onCellClick: (col, row) => {
    const state = runtime.getState();

    // First click: select piece
    if (!state.selectedPiece) {
      runtime.submitAction('selectPiece', { col, row });
    }
    // Second click: move piece
    else {
      runtime.submitAction('movePiece', { toCol: col, toRow: row });
    }
  },

  canClick: (col, row) => {
    const state = runtime.getState();

    // Can click if no piece selected, or if valid move
    if (!state.selectedPiece) {
      const piece = state.board[row][col];
      return piece?.playerId === this.adapter.getMyPlayerId();
    }

    return state.validMoves?.some(m => m.col === col && m.row === row);
  },

  canHighlight: (col, row) => {
    const state = runtime.getState();

    // Highlight valid moves
    if (state.selectedPiece) {
      return state.validMoves?.some(m => m.col === col && m.row === row);
    }

    // Highlight own pieces
    const piece = state.board[row][col];
    return piece?.playerId === this.adapter.getMyPlayerId();
  }
});
```

### Tic-Tac-Toe Example

```typescript
this.gridHelper = this.adapter.createClickableGrid({
  columns: 3,
  rows: 3,
  cellWidth: 100,
  cellHeight: 100,
  offsetX: 250,
  offsetY: 150,
  highlightColor: 0x4a9eff,
  highlightAlpha: 0.2,

  onCellClick: (col, row) => {
    runtime.submitAction('placeMark', { col, row });
  },

  canClick: (col, row) => {
    const state = runtime.getState();

    // Can't click if game over or not your turn
    if (state.gameOver || state.currentTurn !== this.adapter.getMyPlayerId()) {
      return false;
    }

    // Can only click empty cells
    return state.board[row][col] === null;
  },

  canHighlight: (col, row) => {
    const state = runtime.getState();
    return !state.gameOver && state.board[row][col] === null;
  }
});
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `columns` | `number` | Number of columns in the grid |
| `rows` | `number` | Number of rows in the grid |
| `cellWidth` | `number` | Width of each cell in pixels |
| `cellHeight` | `number` | Height of each cell in pixels |
| `offsetX` | `number` | X offset of grid's top-left corner (world coordinates) |
| `offsetY` | `number` | Y offset of grid's top-left corner (world coordinates) |
| `onCellClick` | `(col, row) => void` | Callback when a cell is clicked |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canClick` | `(col, row) => boolean` | `() => true` | Validate if a cell can be clicked |
| `canHighlight` | `(col, row) => boolean` | `() => true` | Validate if a cell can show highlight |
| `highlightColor` | `number` | `0xffffff` | Highlight color (hex) |
| `highlightAlpha` | `number` | `0.15` | Highlight transparency (0-1) |
| `useHandCursor` | `boolean` | `true` | Show pointer cursor on hover |
| `origin` | `'top-left'` \| `'bottom-left'` | `'top-left'` | Grid coordinate origin |
| `clickMode` | `'down'` \| `'up'` | `'down'` | Fire on pointerdown or pointerup |
| `debug` | `boolean` | `false` | Show grid lines and coordinates |

### Origin Modes

**`'top-left'`** (Default)
- (0, 0) is the top-left corner
- Row numbers increase downward
- Use for: Chess, Checkers, Tic-Tac-Toe, Minesweeper, Sudoku

**`'bottom-left'`**
- (0, 0) is the bottom-left corner
- Row numbers increase upward
- Use for: Connect Four, Tetris, platformers with grids

## API Methods

### Manual Highlight Control

```typescript
// Show a specific cell's highlight
gridHelper.showHighlight(col, row, alpha?);

// Hide a specific cell's highlight
gridHelper.hideHighlight(col, row);

// Hide all highlights
gridHelper.hideAllHighlights();

// Change highlight color for a cell
gridHelper.setHighlightColor(col, row, 0xff0000);
```

### Example: Show Valid Moves

```typescript
// When a piece is selected, highlight valid moves
runtime.onChange((state) => {
  // Hide all highlights first
  gridHelper.hideAllHighlights();

  // Show highlights for valid moves
  if (state.selectedPiece && state.validMoves) {
    state.validMoves.forEach(move => {
      gridHelper.showHighlight(move.col, move.row, 0.4);
      gridHelper.setHighlightColor(move.col, move.row, 0x44ff44);
    });
  }
});
```

### Cleanup

```typescript
// Destroy the helper when scene shuts down
shutdown() {
  this.gridHelper.destroy();
}
```

## Advanced Usage

### Debug Mode

Enable debug visualization to see grid boundaries and cell coordinates:

```typescript
this.gridHelper = this.adapter.createClickableGrid({
  // ... other options
  debug: true // Shows grid lines and (col, row) labels
});
```

### Custom Click Modes

```typescript
// Fire on pointer release instead of press (better for drag operations)
this.gridHelper = this.adapter.createClickableGrid({
  // ... other options
  clickMode: 'up'
});
```

### Hexagonal Grids

For hexagonal grids, you'll need custom coordinate mapping:

```typescript
// Standard rectangular grid approach doesn't work for hex
// Instead, use scene-wide pointer listener with custom hex math

this.input.on('pointerdown', (pointer) => {
  const hexCoord = this.pixelToHex(pointer.worldX, pointer.worldY);
  runtime.submitAction('clickHex', hexCoord);
});

pixelToHex(x, y) {
  // Hex grid math (axial/cube coordinates)
  // See: https://www.redblobgames.com/grids/hexagons/
}
```

## Why This Works

### The Technical Details

1. **Uses `pointer.worldX/worldY`**
   - Accounts for camera position and zoom
   - Automatically adjusts for canvas scaling
   - Works in `Scale.FIT`, `Scale.RESIZE`, `Scale.NONE`, etc.

2. **Direct coordinate mapping**
   - Converts pointer position to grid cell mathematically
   - No interactive rectangles = no hitbox scaling issues
   - Consistent behavior in any container size

3. **Validation callbacks**
   - `canClick` determines if clicks are processed
   - `canHighlight` controls visual feedback
   - Separation allows showing hints even when clicking is disabled

### Comparison

| Approach | Works in scaled containers? | Performance | Flexibility |
|----------|----------------------------|-------------|-------------|
| Interactive Rectangles | ❌ No (hitboxes misalign) | Medium | Low |
| GridClickHelper | ✅ Yes | High | High |
| Manual pointer.worldX | ✅ Yes | High | Medium |

## Common Patterns

### Turn-Based Games

```typescript
canClick: (col, row) => {
  const state = runtime.getState();

  // Block all clicks if game over
  if (state.gameOver) return false;

  // Only allow clicks on your turn
  if (state.currentTurn !== this.adapter.getMyPlayerId()) return false;

  // Game-specific validation
  return isValidMove(state, col, row);
}
```

### Full Column Detection (Connect Four)

```typescript
canClick: (col, row) => {
  const state = runtime.getState();

  // Check if column has space (row index is from bottom due to origin: 'bottom-left')
  return state.grid[col][ROWS - 1] === null;
},

canHighlight: (col, row) => {
  const state = runtime.getState();

  // Still show highlight even on opponent's turn (visual feedback)
  // But check if column is full
  return !state.gameOver && state.grid[col][ROWS - 1] === null;
}
```

### Selected Piece Highlighting

```typescript
canHighlight: (col, row) => {
  const state = runtime.getState();

  // Highlight selected piece
  if (state.selectedPiece?.col === col && state.selectedPiece?.row === row) {
    return true;
  }

  // Highlight valid destination cells
  return state.validMoves?.some(m => m.col === col && m.row === row);
}
```

## Troubleshooting

### Clicks not registering

1. Check if `canClick` is returning `true`
2. Enable `debug: true` to verify grid alignment
3. Verify `offsetX/offsetY` match your visual grid position
4. Check if `origin` matches your coordinate system

### Highlights in wrong position

1. Verify `cellWidth/cellHeight` match your visual grid
2. Check `origin` setting ('top-left' vs 'bottom-left')
3. Enable `debug: true` to see actual cell boundaries

### Performance issues

- The helper is highly optimized and shouldn't cause performance issues
- Only one pointer listener for entire grid (not per-cell)
- Highlights are reused, not recreated each frame

## See Also

- [PhaserAdapter](/docs/latest/api/phaser/adapter) - Main adapter class
- [InputManager](/docs/latest/api/phaser/input-manager) - Keyboard input handling
- [Tile Matcher Demo](/editor/tile-matcher) - Live example using GridClickHelper
