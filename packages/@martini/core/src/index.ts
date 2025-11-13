/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */

// Core API
export { defineGame } from './defineGame';
export type { GameDefinition, ActionDefinition, ActionContext, SetupContext } from './defineGame';

// Runtime
export { GameRuntime } from './GameRuntime';
export type { GameRuntimeConfig } from './GameRuntime';
export type {
  Transport,
  WireMessage,
  RuntimeConfig,
  TransportMetrics,
  ConnectionState,
  MessageStats
} from './transport';

// Utilities (kept from v1 for state sync)
export { generateDiff, applyPatch } from './sync';
export type { Patch } from './sync';

// Deterministic Random
export { SeededRandom } from './SeededRandom';

// Logger
export { Logger, logger } from './Logger';
export type { LogLevel, LogEntry, LogListener } from './Logger';
