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
  currentCell?: { x: number; y: number };
  
  /** Target grid position when moving */
  targetCell?: { x: number; y: number } | null;
  
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

export class GridLockedMovementManager {
  private config: Required<GridLockedMovementConfig>;
  private debugGraphics?: any; // Phaser.GameObjects.Graphics
  private adapter: PhaserAdapter;

  constructor(adapter: PhaserAdapter, config: GridLockedMovementConfig) {
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
  moveEntity(entity: GridLockedEntity, input: MovementInput, delta: number): void {
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
      } else {
        // Interpolate position
        const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
        const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
        
        entity.x = this.lerp(currentWorld.x, targetWorld.x, entity.moveProgress);
        entity.y = this.lerp(currentWorld.y, targetWorld.y, entity.moveProgress);
      }
    } else {
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
  snapToGrid(entity: GridLockedEntity): void {
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
  isAligned(entity: GridLockedEntity): boolean {
    return !entity.targetCell && entity.moveProgress === 0;
  }

  /**
   * Get entity's current grid position
   */
  getGridPosition(entity: GridLockedEntity): { x: number; y: number } {
    if (entity.currentCell) {
      return { ...entity.currentCell };
    }
    const gridPos = this.worldToGrid(entity.x, entity.y);
    return { x: gridPos.gridX, y: gridPos.gridY };
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(x: number, y: number): { gridX: number; gridY: number; isAligned: boolean } {
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
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.config.tileSize + this.config.tileSize / 2,
      y: gridY * this.config.tileSize + this.config.tileSize / 2
    };
  }

  /**
   * Check if a grid cell is walkable
   */
  private isWalkable(gridX: number, gridY: number): boolean {
    // Check bounds
    if (gridX < 0 || gridX >= this.config.gridWidth) return false;
    if (gridY < 0 || gridY >= this.config.gridHeight) return false;

    // Check collision
    return !this.config.collisionCheck(gridX, gridY);
  }

  /**
   * Extract direction from input
   */
  private getDirection(input: MovementInput): { dx: number; dy: number } {
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
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Render debug grid overlay
   */
  private renderDebugGrid(): void {
    if (!this.debugGraphics) return;

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
  private updateDebugVisualization(entity: GridLockedEntity): void {
    if (!this.debugGraphics) return;

    this.renderDebugGrid();

    // Highlight current cell
    if (entity.currentCell) {
      const worldPos = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
      this.debugGraphics.fillStyle(this.config.debugColor, 0.2);
      this.debugGraphics.fillRect(
        worldPos.x - this.config.tileSize / 2,
        worldPos.y - this.config.tileSize / 2,
        this.config.tileSize,
        this.config.tileSize
      );
    }

    // Highlight target cell
    if (entity.targetCell) {
      const worldPos = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
      this.debugGraphics.fillStyle(this.config.debugColor, 0.4);
      this.debugGraphics.fillRect(
        worldPos.x - this.config.tileSize / 2,
        worldPos.y - this.config.tileSize / 2,
        this.config.tileSize,
        this.config.tileSize
      );

      // Draw arrow from current to target
      if (entity.currentCell) {
        const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
        const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
        this.debugGraphics.lineStyle(2, this.config.debugColor, 0.8);
        this.debugGraphics.lineBetween(
          currentWorld.x,
          currentWorld.y,
          targetWorld.x,
          targetWorld.y
        );
      }
    }

    // Show entity position
    this.debugGraphics.fillStyle(0xffffff, 1.0);
    this.debugGraphics.fillCircle(entity.x, entity.y, 3);
  }

  /**
   * Cleanup debug graphics
   */
  destroy(): void {
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
export function createGridLockedMovementManager(
  adapter: PhaserAdapter,
  config: GridLockedMovementConfig
): GridLockedMovementManager {
  return new GridLockedMovementManager(adapter, config);
}
