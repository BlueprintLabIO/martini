/**
 * Browser bundle entry point for @martini-kit/devtools
 * Exports StateInspector as a global martini-kit object
 */

import { StateInspector } from './src/StateInspector';

export { StateInspector };

// Export as default for IIFE bundle
export default {
  StateInspector
};
