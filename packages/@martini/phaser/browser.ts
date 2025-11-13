/**
 * Browser bundle entry point for Martini v2
 * Exports all packages as a global MartiniMultiplayer object
 */

import { defineGame, GameRuntime, generateDiff, applyPatch } from '@martini/core';
import { PhaserAdapter } from './src/PhaserAdapter';
import { initializeGame } from './src/runtime';
import { TrysteroTransport } from '@martini/transport-trystero';
import { LocalTransport } from '@martini/transport-local';
import { IframeBridgeTransport, IframeBridgeRelay } from '@martini/transport-iframe-bridge';

// Export as named exports for ES modules
export {
  defineGame,
  GameRuntime,
  generateDiff,
  applyPatch,
  PhaserAdapter,
  initializeGame,
  TrysteroTransport,
  LocalTransport,
  IframeBridgeTransport,
  IframeBridgeRelay
};

// Also export as default for IIFE bundle
export default {
  defineGame,
  GameRuntime,
  generateDiff,
  applyPatch,
  PhaserAdapter,
  initializeGame,
  TrysteroTransport,
  LocalTransport,
  IframeBridgeTransport,
  IframeBridgeRelay
};
