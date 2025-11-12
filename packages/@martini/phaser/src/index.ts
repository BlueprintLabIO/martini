/**
 * @martini/phaser - Phaser 3 adapter for multiplayer games
 *
 * Provides high-level helpers for syncing sprites and handling multiplayer in Phaser.
 *
 * @packageDocumentation
 */

export { PhaserAdapter } from './PhaserAdapter';
export type { SpriteTrackingOptions } from './PhaserAdapter';

// Re-export core types for convenience
export type { GameDefinition, Transport, GameRuntime } from '@martini/core';
