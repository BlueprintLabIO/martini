/**
 * Browser bundle entry point for Martini v2
 * Exports all packages as a global MartiniMultiplayer object
 */

import { defineGame, GameRuntime, generateDiff, applyPatch } from '@martini/core';
import { PhaserAdapter } from './src/PhaserAdapter';
import { TrysteroTransport } from '@martini/transport-trystero';

// Export as named exports for ES modules
export {
  defineGame,
  GameRuntime,
  generateDiff,
  applyPatch,
  PhaserAdapter,
  TrysteroTransport
};

// Also export as default for IIFE bundle
export default {
  defineGame,
  GameRuntime,
  generateDiff,
  applyPatch,
  PhaserAdapter,
  TrysteroTransport
};
