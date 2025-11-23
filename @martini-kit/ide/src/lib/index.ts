/**
 * @martini-kit/ide - Main exports
 */

// Components
export { default as MartiniIDE } from './MartiniIDE.svelte';
export { default } from './MartiniIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './components/CodeEditor.svelte';
export { default as GamePreview } from './components/GamePreview.svelte';

// Core
export { VirtualFileSystem } from './core/VirtualFS';
export { ESBuildManager } from './core/ESBuildManager';

// Types
export type { MartiniKitIDEConfig, GameError } from './types';
