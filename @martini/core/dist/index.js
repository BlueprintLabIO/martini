/**
 * @martini-kit/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
// Core API
export { defineGame } from './defineGame.js';
// Runtime
export { GameRuntime } from './GameRuntime.js';
// Utilities (kept from v1 for state sync)
export { generateDiff, applyPatch } from './sync.js';
// Deterministic Random
export { SeededRandom } from './SeededRandom.js';
// Logger
export { Logger, logger } from './Logger.js';
// Helpers (Phase 1 - Bug Prevention)
export { createPlayerManager } from './PlayerManager.js';
export { createPlayers, createInputAction, createTickAction } from './helpers.js';
//# sourceMappingURL=index.js.map