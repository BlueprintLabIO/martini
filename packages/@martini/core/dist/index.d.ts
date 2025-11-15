/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
export { defineGame } from './defineGame.js';
export type { GameDefinition, ActionDefinition, ActionContext, SetupContext } from './defineGame.js';
export { GameRuntime } from './GameRuntime.js';
export type { GameRuntimeConfig } from './GameRuntime.js';
export type { Transport, WireMessage, RuntimeConfig, TransportMetrics, ConnectionState, MessageStats } from './transport.js';
export { generateDiff, applyPatch } from './sync.js';
export type { Patch } from './sync.js';
export { SeededRandom } from './SeededRandom.js';
export { Logger, logger } from './Logger.js';
export type { LogLevel, LogEntry, LogListener } from './Logger.js';
export { createPlayerManager } from './PlayerManager.js';
export type { PlayerManager, PlayerManagerConfig, PlayerFactory } from './PlayerManager.js';
export { createPlayers, createInputAction, createTickAction } from './helpers.js';
//# sourceMappingURL=index.d.ts.map