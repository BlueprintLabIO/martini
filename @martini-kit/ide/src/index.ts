/**
 * @martini-kit/ide - Main exports
 */

// Components
export { default as MartiniIDE } from './lib/MartiniIDE.svelte';
export { default } from './lib/MartiniIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './lib/components/CodeEditor.svelte';
export { default as GamePreview } from './lib/components/GamePreview.svelte';

// Core
export { VirtualFileSystem } from './lib/core/VirtualFS';
export { SandpackManager } from './lib/core/SandpackManager';

// Types
export type { MartiniKitIDEConfig, GameError } from './lib/types';
