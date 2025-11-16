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
export { PhysicsManager } from './helpers/PhysicsManager.js';
export type { PhysicsManagerConfig, PlatformerBehaviorConfig, TopDownBehaviorConfig, RacingBehaviorConfig, CustomBehaviorConfig } from './helpers/PhysicsManager.js';
export { CollisionManager } from './helpers/CollisionManager.js';
export type { CollisionManagerConfig, CollisionRule } from './helpers/CollisionManager.js';
export { PlayerUIManager } from './helpers/PlayerUIManager.js';
export type { PlayerUIManagerConfig, TextUIConfig, BarUIConfig } from './helpers/PlayerUIManager.js';

// Input Profiles
export { registerProfile, getProfile, listProfiles, BUILT_IN_PROFILES } from './helpers/InputProfiles.js';
export type { InputProfile, ProfileOptions } from './helpers/InputProfiles.js';

// HUD Helper
export { createPlayerHUD } from './helpers/HUDHelper.js';
export type { PlayerHUD, PlayerHUDConfig, HUDLayout, HUDTextStyle } from './helpers/HUDHelper.js';

// Speed Display Helper
export { createSpeedDisplay } from './helpers/SpeedDisplay.js';
export type { SpeedDisplay, SpeedDisplayConfig } from './helpers/SpeedDisplay.js';

// Directional Indicator Helper
export { attachDirectionalIndicator } from './helpers/DirectionalIndicator.js';
export type { DirectionalIndicator, DirectionalIndicatorConfig } from './helpers/DirectionalIndicator.js';

// Runtime initialization (transport abstraction)
export { initializeGame } from './runtime.js';
export type { MartiniConfig, GameConfig } from './runtime.js';

// Re-export core types for convenience
export type { GameDefinition, Transport, GameRuntime } from '@martini/core';
