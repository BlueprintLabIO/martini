/**
 * @martini/phaser - Phaser 3 adapter for multiplayer games
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
// Input Profiles
export { registerProfile, getProfile, listProfiles, BUILT_IN_PROFILES } from './helpers/InputProfiles.js';
// HUD Helper
export { createPlayerHUD } from './helpers/HUDHelper.js';
// Runtime initialization (transport abstraction)
export { initializeGame } from './runtime.js';
//# sourceMappingURL=index.js.map