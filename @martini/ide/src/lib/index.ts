/**
 * @martini-kit/ide - Main exports
 */

// Components
export { default as martini-kitIDE } from './martini-kitIDE.svelte';
export { default } from './martini-kitIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './components/CodeEditor.svelte';
export { default as GamePreview } from './components/GamePreview.svelte';

// Core
export { VirtualFileSystem } from './core/VirtualFS';
export { SandpackManager } from './core/SandpackManager';
export { TypeScriptEnvironment } from './core/TypeScriptEnv';

// Types
export type { martini-kitIDEConfig, GameError, TypeDiagnostic } from './types';
