/**
 * @martini-kit/phaser - Phaser 3 adapter for multiplayer games
 *
 * Provides high-level helpers for syncing sprites and handling multiplayer in Phaser.
 *
 * @packageDocumentation
 */
export { PhaserAdapter } from './PhaserAdapter.js';
export type { SpriteTrackingOptions, PhaserAdapterConfig } from './PhaserAdapter.js';
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
export { registerProfile, getProfile, listProfiles, BUILT_IN_PROFILES } from './helpers/InputProfiles.js';
export type { InputProfile, ProfileOptions } from './helpers/InputProfiles.js';
export { createPlayerHUD } from './helpers/HUDHelper.js';
export type { PlayerHUD, PlayerHUDConfig, HUDLayout, HUDTextStyle } from './helpers/HUDHelper.js';
export { createSpeedDisplay } from './helpers/SpeedDisplay.js';
export type { SpeedDisplay, SpeedDisplayConfig } from './helpers/SpeedDisplay.js';
export { createSpriteAttachment, createSpriteAttachments, createCompositeAttachment } from './helpers/SpriteAttachment.js';
export type { SpriteAttachment, SpriteAttachmentConfig } from './helpers/SpriteAttachment.js';
export { attachDirectionalIndicator } from './helpers/DirectionalIndicator.js';
export type { DirectionalIndicator, DirectionalIndicatorConfig } from './helpers/DirectionalIndicator.js';
export { createCameraFollower } from './helpers/CameraFollower.js';
export type { CameraFollower, CameraFollowerConfig, CameraFollowerTarget } from './helpers/CameraFollower.js';
export { createDualRuntimePreview } from './helpers/DualRuntimeFactory.js';
export type { DualRuntimePreview, DualRuntimePreviewConfig } from './helpers/DualRuntimeFactory.js';
export { initializeGame } from './runtime.js';
export type { martini-kitConfig, GameConfig } from './runtime.js';
export type { GameDefinition, Transport, GameRuntime } from '@martini-kit/core';
//# sourceMappingURL=index.d.ts.map