/**
 * Browser bundle entry point for @martini/devtools
 * Exports StateInspector as a global Martini object
 */

import { StateInspector } from './src/StateInspector';

export { StateInspector };

// Export as default for IIFE bundle
export default {
  StateInspector
};
