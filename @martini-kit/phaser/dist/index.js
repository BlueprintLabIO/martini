/**
 * @martini-kit/phaser - Phaser 3 adapter for multiplayer games
 *
 * Provides high-level helpers for syncing sprites and handling multiplayer in Phaser.
 *
 * @packageDocumentation
 */
export { PhaserAdapter } from './PhaserAdapter.js';
// Helpers
export { SpriteManager } from './helpers/SpriteManager.js';
export { InputManager } from './helpers/InputManager.js';
export { PhysicsManager } from './helpers/PhysicsManager.js';
export { CollisionManager } from './helpers/CollisionManager.js';
export { PlayerUIManager } from './helpers/PlayerUIManager.js';
export { StateDrivenSpawner } from './helpers/StateDrivenSpawner.js';
export { HealthBarManager } from './helpers/HealthBarManager.js';
export { GridClickHelper } from './helpers/GridClickHelper.js';
export { GridCollisionManager, GridMovementManager } from './helpers/GridCollisionManager.js';
export { GridLockedMovementManager } from './helpers/GridLockedMovementManager.js';
// Input Profiles
export { registerProfile, getProfile, listProfiles, BUILT_IN_PROFILES } from './helpers/InputProfiles.js';
// HUD Helper
export { createPlayerHUD } from './helpers/HUDHelper.js';
// Player Stats Panel Helper
export { createPlayerStatsPanel } from './helpers/PlayerStatsPanel.js';
// Collectible Manager Helper
export { createCollectibleManager } from './helpers/CollectibleManager.js';
// Round Manager Helper
export { createRoundManager } from './helpers/RoundManager.js';
// Speed Display Helper
export { createSpeedDisplay } from './helpers/SpeedDisplay.js';
// Sprite Attachment System (Generic)
export { createSpriteAttachment, createSpriteAttachments, createCompositeAttachment } from './helpers/SpriteAttachment.js';
// Directional Indicator Helper
export { attachDirectionalIndicator } from './helpers/DirectionalIndicator.js';
// Camera Follower Helper
export { createCameraFollower } from './helpers/CameraFollower.js';
// Dual Runtime Factory
export { createDualRuntimePreview } from './helpers/DualRuntimeFactory.js';
// Lobby UI Helper
export { LobbyUI, attachLobbyUI } from './helpers/LobbyUI.js';
// Runtime initialization (transport abstraction)
export { initializeGame } from './runtime.js';
//# sourceMappingURL=index.js.map