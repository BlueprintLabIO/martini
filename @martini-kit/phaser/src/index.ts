/**
 * @martini-kit/phaser - Phaser 3 adapter for multiplayer games
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
export { StateDrivenSpawner } from './helpers/StateDrivenSpawner.js';
export type { StateDrivenSpawnerConfig } from './helpers/StateDrivenSpawner.js';
export { HealthBarManager } from './helpers/HealthBarManager.js';
export type { HealthBarConfig } from './helpers/HealthBarManager.js';
export { GridClickHelper } from './helpers/GridClickHelper.js';
export type { GridClickConfig } from './helpers/GridClickHelper.js';
export { GridCollisionManager, GridMovementManager } from './helpers/GridCollisionManager.js';
export type { GridCollisionConfig, GridMovementConfig, GridEntity, MovementInput, GridPosition } from './helpers/GridCollisionManager.js';
export { GridLockedMovementManager } from './helpers/GridLockedMovementManager.js';
export type { GridLockedMovementConfig, GridLockedEntity } from './helpers/GridLockedMovementManager.js';

// Input Profiles
export { registerProfile, getProfile, listProfiles, BUILT_IN_PROFILES } from './helpers/InputProfiles.js';
export type { InputProfile, ProfileOptions } from './helpers/InputProfiles.js';

// HUD Helper
export { createPlayerHUD } from './helpers/HUDHelper.js';
export type { PlayerHUD, PlayerHUDConfig, HUDLayout, HUDTextStyle } from './helpers/HUDHelper.js';

// Player Stats Panel Helper
export { createPlayerStatsPanel } from './helpers/PlayerStatsPanel.js';
export type { PlayerStatsPanel, PlayerStatsPanelConfig, StatConfig, StatPosition } from './helpers/PlayerStatsPanel.js';

// Collectible Manager Helper
export { createCollectibleManager } from './helpers/CollectibleManager.js';
export type { CollectibleManager, CollectibleManagerConfig, CollectibleConfig, CollisionType } from './helpers/CollectibleManager.js';

// Round Manager Helper
export { createRoundManager } from './helpers/RoundManager.js';
export type { RoundManager, RoundManagerConfig, TimerUIConfig, AnnouncementUIConfig, ScoreboardUIConfig } from './helpers/RoundManager.js';


// Speed Display Helper
export { createSpeedDisplay } from './helpers/SpeedDisplay.js';
export type { SpeedDisplay, SpeedDisplayConfig } from './helpers/SpeedDisplay.js';

// Sprite Attachment System (Generic)
export { createSpriteAttachment, createSpriteAttachments, createCompositeAttachment } from './helpers/SpriteAttachment.js';
export type { SpriteAttachment, SpriteAttachmentConfig } from './helpers/SpriteAttachment.js';

// Directional Indicator Helper
export { attachDirectionalIndicator } from './helpers/DirectionalIndicator.js';
export type { DirectionalIndicator, DirectionalIndicatorConfig } from './helpers/DirectionalIndicator.js';

// Camera Follower Helper
export { createCameraFollower } from './helpers/CameraFollower.js';
export type { CameraFollower, CameraFollowerConfig, CameraFollowerTarget } from './helpers/CameraFollower.js';

// Dual Runtime Factory
export { createDualRuntimePreview } from './helpers/DualRuntimeFactory.js';
export type { DualRuntimePreview, DualRuntimePreviewConfig } from './helpers/DualRuntimeFactory.js';

// Runtime initialization (transport abstraction)
export { initializeGame } from './runtime.js';
export type { MartiniKitConfig, GameConfig } from './runtime.js';

// Re-export core types for convenience
export type { GameDefinition, Transport, GameRuntime } from '@martini-kit/core';
