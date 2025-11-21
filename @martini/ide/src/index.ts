/**
 * @martini-kit/ide - Main exports
 */

// Components
export { default as martini-kitIDE } from './lib/martini-kitIDE.svelte';
export { default } from './lib/martini-kitIDE.svelte'; // Default export for convenience
export { default as CodeEditor } from './lib/components/CodeEditor.svelte';
export { default as GamePreview } from './lib/components/GamePreview.svelte';

// Core
export { VirtualFileSystem } from './core/VirtualFS';
export { Bundler } from './core/Bundler';
export { TypeScriptEnvironment } from './core/TypeScriptEnv';
export { Sandbox } from './core/Sandbox';

// Types
export type { martini-kitIDEConfig, GameError, TypeDiagnostic } from './types';
