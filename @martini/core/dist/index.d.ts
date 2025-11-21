/**
 * @martini-kit/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
export { defineGame } from '../src/defineGame.js';
export type { GameDefinition, ActionDefinition, ActionContext, SetupContext } from '../src/defineGame.js';
export { GameRuntime } from '../src/GameRuntime.js';
export type { GameRuntimeConfig } from '../src/GameRuntime.js';
export type { Transport, WireMessage, RuntimeConfig, TransportMetrics, ConnectionState, MessageStats } from '../src/transport.js';
export { generateDiff, applyPatch } from '../src/sync.js';
export type { Patch } from '../src/sync.js';
export { SeededRandom } from '../src/SeededRandom.js';
export { Logger, logger } from '../src/Logger.js';
export type { LogLevel, LogEntry, LogListener } from '../src/Logger.js';
export { createPlayerManager } from '../src/PlayerManager.js';
export type { PlayerManager, PlayerManagerConfig, PlayerFactory } from '../src/PlayerManager.js';
export { createPlayers, createInputAction, createTickAction } from '../src/helpers.js';
//# sourceMappingURL=index.d.ts.map