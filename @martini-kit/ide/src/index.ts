/**
 * @martini-kit/ide - Main exports
 */

import MartiniIDEComponent from './lib/MartiniIDE.svelte';
import CodeEditor from './lib/components/CodeEditor.svelte';
import GamePreview from './lib/components/GamePreview.svelte';
import { VirtualFileSystem } from './lib/core/VirtualFS.js';

// Components
export { MartiniIDEComponent as MartiniIDE, CodeEditor, GamePreview };
export default MartiniIDEComponent; // Default export for convenience

// Core
export { VirtualFileSystem };

// Types
export type { MartiniKitIDEConfig, GameError } from './lib/types.js';
