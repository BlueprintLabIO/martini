/**
 * @martini/core v2 - Engine-agnostic multiplayer SDK
 *
 * Host-authoritative state synchronization. Simple, clean, works with any engine.
 *
 * @packageDocumentation
 */
export { defineGame } from './defineGame';
export type { GameDefinition, StateSchema, ActionDefinition, ActionContext } from './defineGame';
export { GameRuntime } from './GameRuntime';
export type { Transport, WireMessage, RuntimeConfig } from './transport';
export { generateDiff, applyPatch } from './sync';
export type { Patch } from './sync';
//# sourceMappingURL=index.d.ts.map