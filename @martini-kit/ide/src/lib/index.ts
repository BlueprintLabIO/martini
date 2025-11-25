/**
 * @martini-kit/ide - Main exports
 */

import MartiniIDEComponent from './MartiniIDE.svelte';
import CodeEditor from './components/CodeEditor.svelte';
import GamePreview from './components/GamePreview.svelte';
import { VirtualFileSystem } from './core/VirtualFS.js';
import { ESBuildManager } from './core/ESBuildManager.js';

// Components
export { MartiniIDEComponent as MartiniIDE, CodeEditor, GamePreview };
export default MartiniIDEComponent; // Default export for convenience

// Core
export { VirtualFileSystem, ESBuildManager };

// Types
export type { MartiniKitIDEConfig, GameError } from './types.js';
