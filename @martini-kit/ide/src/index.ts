/**
 * @martini-kit/ide - Main exports
 */

// Components
export { default as MartiniIDE } from './lib/MartiniIDE.svelte';
export { default } from './lib/MartiniIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './lib/components/CodeEditor.svelte';
export { default as GamePreview } from './lib/components/GamePreview.svelte';

// Core (Phase 1 exports)
export { VirtualFileSystem } from './lib/core/VirtualFS';
export { SandpackManager as Bundler } from './lib/core/SandpackManager';
export { TypeScriptEnvironment } from './lib/core/TypeScriptEnv';

// Types
export type { MartiniKitIDEConfig, GameError, TypeDiagnostic } from './lib/types';
