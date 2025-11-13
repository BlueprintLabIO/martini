/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
export { defineGame } from './defineGame';
export type { GameDefinition, ActionDefinition, ActionContext, SetupContext } from './defineGame';
export { GameRuntime } from './GameRuntime';
export type { GameRuntimeConfig } from './GameRuntime';
export type { Transport, WireMessage, RuntimeConfig, TransportMetrics, ConnectionState, MessageStats } from './transport';
export { generateDiff, applyPatch } from './sync';
export type { Patch } from './sync';
export { SeededRandom } from './SeededRandom';
export { Logger, logger } from './Logger';
export type { LogLevel, LogEntry, LogListener } from './Logger';
//# sourceMappingURL=index.d.ts.map