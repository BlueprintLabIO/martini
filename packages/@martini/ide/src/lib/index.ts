/**
 * @martini/ide - Main exports
 */

// Components
export { default as MartiniIDE } from './MartiniIDE.svelte';
export { default } from './MartiniIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './components/CodeEditor.svelte';
export { default as GamePreview } from './components/GamePreview.svelte';

// Core
export { VirtualFileSystem } from './core/VirtualFS';
export { SandpackManager } from './core/SandpackManager';
export { TypeScriptEnvironment } from './core/TypeScriptEnv';

// Types
export type { MartiniIDEConfig, GameError, TypeDiagnostic } from './types';
