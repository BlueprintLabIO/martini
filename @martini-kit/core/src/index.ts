/**
 * @martini-kit/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */

// Core API
export { defineGame } from './defineGame.js';
export type { GameDefinition, ActionDefinition, ActionContext, SetupContext } from './defineGame.js';

// Runtime
export { GameRuntime } from './GameRuntime.js';
export type { GameRuntimeConfig } from './GameRuntime.js';
export type {
  Transport,
  WireMessage,
  RuntimeConfig,
  TransportMetrics,
  ConnectionState,
  MessageStats
} from './transport.js';

// Utilities (kept from v1 for state sync)
export { generateDiff, applyPatch } from './sync.js';
export type { Patch } from './sync.js';

// Deterministic Random
export { SeededRandom } from './SeededRandom.js';

// Logger
export { Logger, logger } from './Logger.js';
export type { LogLevel, LogEntry, LogListener } from './Logger.js';

// Lobby System
export type {
  GamePhase,
  PlayerPresence,
  LobbyConfig,
  LobbyState,
  PhaseChangeContext,
  WithLobby
} from './lobby.js';

// Helpers (Phase 1 - Bug Prevention)
export { createPlayerManager } from './PlayerManager.js';
export type { PlayerManager, PlayerManagerConfig, PlayerFactory } from './PlayerManager.js';
export { createPlayers, createMultiCollisionCheck, createInputAction, createTickAction, forEachPlayerInput } from './helpers.js';
