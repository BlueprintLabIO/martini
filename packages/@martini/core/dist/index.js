/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
// Core API
export { defineGame } from './defineGame';
// Runtime
export { GameRuntime } from './GameRuntime';
// Utilities (kept from v1 for state sync)
export { generateDiff, applyPatch } from './sync';
// Deterministic Random
export { SeededRandom } from './SeededRandom';
// Logger
export { Logger, logger } from './Logger';
//# sourceMappingURL=index.js.map