/**
 * @martini/phaser - Phaser 3 adapter for multiplayer games
 *
 * Provides high-level helpers for syncing sprites and handling multiplayer in Phaser.
 *
 * @packageDocumentation
 */

export { PhaserAdapter } from './PhaserAdapter.js';
export type { SpriteTrackingOptions, PhaserAdapterConfig } from './PhaserAdapter.js';

// Helpers
export { SpriteManager } from './helpers/SpriteManager.js';
export type { SpriteManagerConfig, SpriteData } from './helpers/SpriteManager.js';
export { InputManager } from './helpers/InputManager.js';
export type { ActionBinding, KeyBinding, KeyBindings, CursorBindings } from './helpers/InputManager.js';

// Runtime initialization (transport abstraction)
export { initializeGame } from './runtime.js';
export type { MartiniConfig, GameConfig } from './runtime.js';

// Re-export core types for convenience
export type { GameDefinition, Transport, GameRuntime } from '@martini/core';
