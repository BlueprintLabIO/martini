/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */

// Core API
export { defineGame } from './defineGame';
export type { GameDefinition, StateSchema, ActionDefinition } from './defineGame';

// Runtime
export { GameRuntime } from './GameRuntime';
export type { Transport, WireMessage, RuntimeConfig } from './transport';

// Utilities (kept from v1 for state sync)
export { generateDiff, applyPatch } from './sync';
export type { Patch } from './sync';
